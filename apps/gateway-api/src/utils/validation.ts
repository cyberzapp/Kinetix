import { z } from 'zod';

export const pointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const createOrderSchema = z.object({
  customerPhone: z.string().min(8).max(20),
  basketValue: z.number().positive(),
  dropoffLocation: pointSchema,
  merchantId: z.string().uuid().optional(),
});

export const acceptStoreSchema = z.object({
  orderId: z.string().uuid(),
});

export const claimOrderSchema = z.object({
  orderId: z.string().uuid(),
});

export const telemetrySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  status: z.enum(['AVAILABLE', 'ASSIGNED']),
});

export const updateProductSchema = z.object({
  isAvailable: z.boolean(),
});
