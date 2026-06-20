const API_BASE = process.env.API_BASE || 'http://localhost:8080/api/v1';

export async function acceptOrder(orderId, token, idempotencyKey) {
  const response = await fetch(`${API_BASE}/orders/accept-store`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ orderId }),
  });

  if (!response.ok) throw new Error('Failed to accept order');
  return response.json();
}

export async function toggleProduct(productId, isAvailable, token, idempotencyKey) {
  const response = await fetch(`${API_BASE}/products/${productId}`, {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ isAvailable }),
  });

  if (!response.ok) throw new Error('Failed to update product');
  return response.json();
}
