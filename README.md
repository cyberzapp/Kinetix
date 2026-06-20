# Kinetix

Production-ready hyperlocal open-network commerce engine with:
- **Gateway API** (Node.js + TypeScript + Redis + PostgreSQL/PostGIS)
- **Worker Engine** (Python background matcher and payout calculator)
- **Database Ledger** (PostgreSQL/PostGIS + RLS)
- **Client Modules** (Customer, Merchant, Driver integration modules)

## Repository Layout

- `apps/gateway-api` – API ingestion, idempotency, auth, matching orchestration, WebSocket updates
- `apps/worker-engine` – Redis stream consumer and batched DB candidate writer
- `database/architecture.sql` – schema, enums, indexes, and RLS policies
- `apps/customer-app` – customer integration module
- `apps/merchant-app` – merchant integration module
- `apps/driver-app` – driver integration module with geofence helper

## Core Capabilities

- JWT auth and role-based authorization
- Distributed idempotency (`X-Idempotency-Key`)
- Redis geospatial driver index (`drivers:locations`)
- Atomic order claiming lock (`lock:order:{order_id}`)
- Pub/Sub matching stream (`order_matching_stream`)
- Batched candidate upsert + order state progression
- WebSocket order tracking updates (`/ws?orderId=<id>`)
- PostgreSQL Row-Level Security for merchant/agent isolation

## Quick Start (Docker)

```bash
cd Kinetix
docker compose up --build
```

Gateway health:

```bash
curl http://localhost:8080/healthz
```

## Local Development

### Gateway API

```bash
cd apps/gateway-api
npm install
npm run build
npm test
npm run dev
```

### Worker Engine

```bash
cd apps/worker-engine
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest
python main.py
```

## API Endpoints

- `GET /api/v1/merchants/nearby`
- `POST /api/v1/orders/create` (CUSTOMER)
- `POST /api/v1/orders/accept-store` (MERCHANT)
- `POST /api/v1/orders/claim-agent` (AGENT)
- `GET /api/v1/orders/opportunities` (AGENT)
- `POST /api/v1/telemetry/location` (AGENT)
- `PATCH /api/v1/products/:id` (MERCHANT)

## Matching & Payout Flow

1. Customer creates order.
2. Merchant accepts order.
3. Gateway finds nearby available drivers (Redis GEOSEARCH) and publishes candidate events.
4. Worker computes payout range and upserts candidate rows in batch.
5. Agent claims order with Redis lock and DB transaction.
6. Gateway publishes order update events over Redis/WebSocket.

## Production Notes

- Apply `database/architecture.sql` before running services.
- Set a strong `JWT_SECRET` in environment.
- Keep Redis + Postgres on private network boundaries.
- Use per-request DB session settings (`app.current_merchant_id`, `app.current_agent_id`) when enabling strict RLS in runtime connections.
