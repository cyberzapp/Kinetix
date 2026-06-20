const API_BASE = process.env.API_BASE || 'http://localhost:8080/api/v1';
const WS_BASE = process.env.WS_BASE || API_BASE.replace(/^http/, 'ws').replace('/api/v1', '');

export async function getNearbyMerchants(latitude, longitude) {
  const response = await fetch(`${API_BASE}/merchants/nearby?latitude=${latitude}&longitude=${longitude}`);
  if (!response.ok) throw new Error('Failed to fetch nearby merchants');
  return response.json();
}

export async function createOrder(payload, token, idempotencyKey) {
  const response = await fetch(`${API_BASE}/orders/create`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error('Failed to create order');
  return response.json();
}

export function subscribeOrderTracking(orderId, onEvent) {
  const token = encodeURIComponent(process.env.WS_TOKEN || '');
  const ws = new WebSocket(`${WS_BASE}/ws?orderId=${orderId}&token=${token}`);
  ws.onmessage = (event) => onEvent(JSON.parse(event.data));
  return () => ws.close();
}
