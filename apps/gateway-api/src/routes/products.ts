import { Router } from 'express';
import { db } from '../services/db';
import { updateProductSchema } from '../utils/validation';

const router = Router();

router.patch('/:id', async (req, res) => {
  const merchantId = req.user?.merchantId;
  if (!merchantId) {
    return res.status(403).json({ error: 'Merchant context missing' });
  }

  const parsed = updateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const result = await db.query(
    `UPDATE products
     SET is_available = $1
     WHERE id = $2 AND merchant_id = $3
     RETURNING id, merchant_id, is_available`,
    [parsed.data.isAvailable, req.params.id, merchantId],
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Product not found' });
  }

  return res.json(result.rows[0]);
});

export default router;
