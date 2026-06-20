import { Router } from 'express';
import { db } from '../services/db';

const router = Router();

router.get('/nearby', async (req, res) => {
  const latitude = Number(req.query.latitude);
  const longitude = Number(req.query.longitude);
  const radiusMeters = Number(req.query.radiusMeters ?? 3000);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return res.status(400).json({ error: 'latitude and longitude query params required' });
  }

  const result = await db.query(
    `SELECT id, store_name, contact_phone,
            ST_Distance(location::geometry, ST_SetSRID(ST_MakePoint($1,$2),4326)::geometry) AS distance_m
     FROM merchants
     WHERE ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, $3)
     ORDER BY distance_m ASC
     LIMIT 50`,
    [longitude, latitude, radiusMeters],
  );

  return res.json(result.rows);
});

export default router;
