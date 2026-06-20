import { Router } from 'express';
import { db } from '../services/db';
import { redis } from '../services/redis';
import { broadcastMatchingCandidates } from '../services/orderMatching';
import { acceptStoreSchema, claimOrderSchema, createOrderSchema } from '../utils/validation';

const router = Router();

router.post('/create', async (req, res) => {
  if (req.user?.role !== 'CUSTOMER') {
    return res.status(403).json({ error: 'Only customers can create orders' });
  }

  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { customerPhone, basketValue, dropoffLocation, merchantId } = parsed.data;

  const nearestMerchant = merchantId
    ? await db.query('SELECT id, ST_Distance(location::geometry, ST_SetSRID(ST_MakePoint($1,$2),4326)::geometry) AS dist FROM merchants WHERE id = $3', [dropoffLocation.longitude, dropoffLocation.latitude, merchantId])
    : await db.query(
        `SELECT id,
                ST_Distance(location::geometry, ST_SetSRID(ST_MakePoint($1,$2),4326)::geometry) AS dist
         FROM merchants
         ORDER BY dist ASC
         LIMIT 1`,
        [dropoffLocation.longitude, dropoffLocation.latitude],
      );

  if (nearestMerchant.rowCount === 0) {
    return res.status(404).json({ error: 'No nearby merchant found' });
  }

  const selected = nearestMerchant.rows[0] as { id: string; dist: number };
  const estimatedDistance = Math.round(selected.dist ?? 0);

  const result = await db.query(
    `INSERT INTO orders (merchant_id, customer_phone, dropoff_location, basket_value, estimated_distance_meters, min_payout, max_payout, status)
     VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5, $6, 0, 0, 'PENDING_STORE')
     RETURNING id, merchant_id, status, estimated_distance_meters`,
    [selected.id, customerPhone, dropoffLocation.longitude, dropoffLocation.latitude, basketValue, estimatedDistance],
  );

  return res.status(201).json(result.rows[0]);
});

router.post('/accept-store', async (req, res) => {
  if (req.user?.role !== 'MERCHANT') {
    return res.status(403).json({ error: 'Only merchants can accept store orders' });
  }

  const parsed = acceptStoreSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const merchantId = req.user?.merchantId;
  if (!merchantId) {
    return res.status(403).json({ error: 'Merchant context missing' });
  }

  const update = await db.query(
    `UPDATE orders
     SET status = 'STORE_ACCEPTED'
     WHERE id = $1 AND merchant_id = $2 AND status = 'PENDING_STORE'
     RETURNING id, merchant_id`,
    [parsed.data.orderId, merchantId],
  );

  if (update.rowCount === 0) {
    return res.status(404).json({ error: 'Order not found or already accepted' });
  }

  const row = update.rows[0] as { id: string; merchant_id: string };
  const candidateCount = await broadcastMatchingCandidates(row.id, row.merchant_id);

  await redis.publish('order_updates', JSON.stringify({ orderId: row.id, status: 'STORE_ACCEPTED' }));

  return res.json({ orderId: row.id, candidatesBroadcast: candidateCount });
});

router.post('/claim-agent', async (req, res) => {
  if (req.user?.role !== 'AGENT') {
    return res.status(403).json({ error: 'Only agents can claim orders' });
  }

  const parsed = claimOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const agentId = req.user?.agentId;
  if (!agentId) {
    return res.status(403).json({ error: 'Agent context missing' });
  }

  const orderId = parsed.data.orderId;
  const lockKey = `lock:order:${orderId}`;
  const lock = await redis.set(lockKey, agentId, 'EX', 15, 'NX');
  if (!lock) {
    return res.status(409).json({ error: 'Order is currently being claimed by another agent' });
  }

  const candidate = await db.query(
    `SELECT min_payout, max_payout
     FROM order_match_candidates
     WHERE order_id = $1 AND delivery_agent_id = $2 AND status = 'OPEN'
     LIMIT 1`,
    [orderId, agentId],
  );

  if (candidate.rowCount === 0) {
    return res.status(404).json({ error: 'No open matching offer for this order and agent' });
  }

  const payout = candidate.rows[0] as { min_payout: string; max_payout: string };

  await db.query('BEGIN');
  try {
    const updatedOrder = await db.query(
      `UPDATE orders
       SET status = 'DISPATCHED', delivery_agent_id = $2, min_payout = $3, max_payout = $4
       WHERE id = $1 AND status IN ('STORE_ACCEPTED', 'DRIVER_MATCHING')
       RETURNING id, status, delivery_agent_id`,
      [orderId, agentId, payout.min_payout, payout.max_payout],
    );

    if (updatedOrder.rowCount === 0) {
      await db.query('ROLLBACK');
      return res.status(409).json({ error: 'Order is no longer available for claim' });
    }

    await db.query(
      `UPDATE order_match_candidates
       SET status = CASE WHEN delivery_agent_id = $2 THEN 'CLAIMED' ELSE 'CLOSED' END
       WHERE order_id = $1`,
      [orderId, agentId],
    );

    await db.query('COMMIT');

    await redis.hset(`driver:state:${agentId}`, 'status', 'ASSIGNED', 'current_order_id', orderId);
    await redis.publish('order_updates', JSON.stringify({ orderId, status: 'DISPATCHED', deliveryAgentId: agentId }));

    return res.json(updatedOrder.rows[0]);
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    await redis.del(lockKey);
  }
});

router.get('/opportunities', async (req, res) => {
  if (req.user?.role !== 'AGENT' || !req.user.agentId) {
    return res.status(403).json({ error: 'Only agents can view opportunities' });
  }

  const result = await db.query(
    `SELECT c.order_id, c.min_payout, c.max_payout, c.distance_meters, m.store_name
     FROM order_match_candidates c
     INNER JOIN orders o ON o.id = c.order_id
     INNER JOIN merchants m ON m.id = o.merchant_id
     WHERE c.delivery_agent_id = $1 AND c.status = 'OPEN'
     ORDER BY c.distance_meters ASC
     LIMIT 50`,
    [req.user.agentId],
  );

  return res.json(result.rows);
});

export default router;
