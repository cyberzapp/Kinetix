const API_BASE = process.env.API_BASE || 'http://localhost:8080/api/v1';

export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function sendTelemetry(payload, token, idempotencyKey) {
  const response = await fetch(`${API_BASE}/telemetry/location`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error('Failed to publish telemetry');
  return response.json();
}

export async function claimOrder(orderId, token, idempotencyKey) {
  const response = await fetch(`${API_BASE}/orders/claim-agent`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ orderId }),
  });

  if (!response.ok) throw new Error('Failed to claim order');
  return response.json();
}

export function isGeofenceUnlocked(driverCoords, customerCoords, thresholdMeters = 30) {
  const distance = calculateHaversineDistance(
    driverCoords.latitude,
    driverCoords.longitude,
    customerCoords.latitude,
    customerCoords.longitude,
  );

  return {
    distanceMeters: Math.round(distance),
    unlocked: distance <= thresholdMeters,
  };
}
