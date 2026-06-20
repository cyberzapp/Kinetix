import { db } from './db';
import { redis } from './redis';

export async function broadcastMatchingCandidates(orderId: string, merchantId: string): Promise<number> {
  const merchantResult = await db.query(
    `SELECT ST_Y(location::geometry) AS latitude, ST_X(location::geometry) AS longitude
     FROM merchants WHERE id = $1`,
    [merchantId],
  );

  if (merchantResult.rowCount === 0) {
    return 0;
  }

  const { latitude, longitude } = merchantResult.rows[0] as { latitude: number; longitude: number };
  const candidates = (await redis.call(
    'GEOSEARCH',
    'drivers:locations',
    'FROMLONLAT',
    longitude,
    latitude,
    'BYRADIUS',
    3000,
    'm',
    'WITHDIST',
    'ASC',
  )) as Array<[string, string]>;

  let published = 0;
  for (const [agentId, distance] of candidates) {
    const driverState = await redis.hgetall(`driver:state:${agentId}`);
    if (driverState.status !== 'AVAILABLE') {
      continue;
    }

    await redis.publish(
      'order_matching_stream',
      JSON.stringify({ order_id: orderId, agent_id: agentId, distance_meters: Number(distance) }),
    );
    published += 1;
  }

  return published;
}
