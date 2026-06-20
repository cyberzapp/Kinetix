CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE order_status AS ENUM (
    'PENDING_STORE',
    'STORE_ACCEPTED',
    'DRIVER_MATCHING',
    'DISPATCHED',
    'ARRIVED_DROP',
    'COMPLETED'
);

CREATE TYPE agent_status AS ENUM ('OFFLINE', 'AVAILABLE', 'ASSIGNED');
CREATE TYPE candidate_status AS ENUM ('OPEN', 'CLAIMED', 'CLOSED');

CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delivery_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    vehicle_id VARCHAR(64),
    current_status agent_status DEFAULT 'OFFLINE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    delivery_agent_id UUID REFERENCES delivery_agents(id),
    customer_phone VARCHAR(20) NOT NULL,
    dropoff_location GEOGRAPHY(Point, 4326) NOT NULL,
    basket_value DECIMAL(10,2) NOT NULL CHECK (basket_value >= 0),
    estimated_distance_meters INT NOT NULL CHECK (estimated_distance_meters >= 0),
    min_payout DECIMAL(10,2) NOT NULL,
    max_payout DECIMAL(10,2) NOT NULL,
    status order_status DEFAULT 'PENDING_STORE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CHECK (max_payout >= min_payout)
);

CREATE TABLE IF NOT EXISTS order_match_candidates (
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    delivery_agent_id UUID NOT NULL REFERENCES delivery_agents(id) ON DELETE CASCADE,
    min_payout DECIMAL(10,2) NOT NULL CHECK (min_payout >= 0),
    max_payout DECIMAL(10,2) NOT NULL CHECK (max_payout >= min_payout),
    distance_meters DECIMAL(10,2) NOT NULL CHECK (distance_meters >= 0),
    status candidate_status NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (order_id, delivery_agent_id)
);

CREATE INDEX IF NOT EXISTS idx_merchants_location ON merchants USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_orders_dropoff ON orders USING GIST (dropoff_location);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status) WHERE status != 'COMPLETED';
CREATE INDEX IF NOT EXISTS idx_candidates_agent_status ON order_match_candidates(delivery_agent_id, status);

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_match_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS merchant_isolation ON merchants;
CREATE POLICY merchant_isolation ON merchants
    FOR ALL USING (id = current_setting('app.current_merchant_id', true)::UUID);

DROP POLICY IF EXISTS product_isolation ON products;
CREATE POLICY product_isolation ON products
    FOR ALL USING (merchant_id = current_setting('app.current_merchant_id', true)::UUID);

DROP POLICY IF EXISTS order_access_isolation ON orders;
CREATE POLICY order_access_isolation ON orders
    FOR ALL USING (
        merchant_id = current_setting('app.current_merchant_id', true)::UUID OR
        delivery_agent_id = current_setting('app.current_agent_id', true)::UUID
    );

DROP POLICY IF EXISTS order_candidate_isolation ON order_match_candidates;
CREATE POLICY order_candidate_isolation ON order_match_candidates
    FOR ALL USING (delivery_agent_id = current_setting('app.current_agent_id', true)::UUID);
