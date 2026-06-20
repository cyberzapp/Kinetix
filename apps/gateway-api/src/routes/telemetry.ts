import { Router } from 'express';
import { redis } from '../services/redis';
import { telemetrySchema } from '../utils/validation';

const router = Router();

router.post('/location', async (req, res) => {
  const parsed = telemetrySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const agentId = req.user?.agentId;
  if (!agentId) {
    return res.status(403).json({ error: 'Agent context missing' });
  }

  const { latitude, longitude, status } = parsed.data;

  await redis.geoadd('drivers:locations', longitude, latitude, agentId);
  await redis.hset(`driver:state:${agentId}`, 'status', status, 'updated_at', new Date().toISOString());

  return res.json({ ok: true });
});

export default router;
