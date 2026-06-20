import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { env } from './config/env';
import { authenticate, authorize } from './middleware/auth';
import { enforceIdempotency } from './middleware/idempotency';
import { rateLimit } from './middleware/rateLimit';
import merchantRoutes from './routes/merchants';
import orderRoutes from './routes/orders';
import productRoutes from './routes/products';
import telemetryRoutes from './routes/telemetry';
import { redisSubscriber } from './services/redis';

const app = express();
app.use(express.json());
app.use(rateLimit);

app.get('/healthz', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/v1/merchants', merchantRoutes);
app.use('/api/v1/orders', authenticate, enforceIdempotency, orderRoutes);
app.use('/api/v1/telemetry', authenticate, authorize('AGENT'), enforceIdempotency, telemetryRoutes);
app.use('/api/v1/products', authenticate, authorize('MERCHANT'), enforceIdempotency, productRoutes);

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (socket, request) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
  const orderId = url.searchParams.get('orderId');

  const listener = (channel: string, message: string) => {
    if (channel !== 'order_updates') {
      return;
    }

    const event = JSON.parse(message) as { orderId: string };
    if (!orderId || event.orderId === orderId) {
      socket.send(message);
    }
  };

  redisSubscriber.on('message', listener);

  socket.on('close', () => {
    redisSubscriber.off('message', listener);
  });
});

redisSubscriber.subscribe('order_updates').catch((error) => {
  console.error('Failed to subscribe to order updates', error);
});

server.listen(env.port, () => {
  console.log(`Gateway API listening on ${env.port}`);
});
