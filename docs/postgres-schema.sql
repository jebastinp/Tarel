-- Tarel local PostgreSQL schema
-- Run with: psql -d Tarel -f docs/postgres-schema.sql

BEGIN;

-- Clean slate for development (comment out if you need to keep data)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS site_settings CASCADE;
DROP TABLE IF EXISTS support_messages CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS role_enum CASCADE;
DROP TYPE IF EXISTS order_status_enum CASCADE;
DROP TYPE IF EXISTS support_status_enum CASCADE;

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE role_enum AS ENUM ('user', 'admin');
CREATE TYPE order_status_enum AS ENUM (
  'pending',
  'paid',
  'processing',
  'out_for_delivery',
  'delivered',
  'cancelled'
);
CREATE TYPE support_status_enum AS ENUM ('open', 'pending', 'closed');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  role role_enum NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL UNIQUE,
  slug VARCHAR(140) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  description TEXT,
  price_per_kg DOUBLE PRECISION NOT NULL,
  image_url VARCHAR(500),
  stock_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
  is_dry BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_amount DOUBLE PRECISION NOT NULL,
  status order_status_enum NOT NULL DEFAULT 'pending',
  delivery_slot VARCHAR(50),
  address_line VARCHAR(255) NOT NULL,
  city VARCHAR(120) NOT NULL DEFAULT 'Edinburgh',
  postcode VARCHAR(12) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty_kg DOUBLE PRECISION NOT NULL CHECK (qty_kg > 0),
  price_per_kg DOUBLE PRECISION NOT NULL CHECK (price_per_kg > 0)
);

CREATE TABLE site_settings (
  key VARCHAR(120) PRIMARY KEY,
  value VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  response TEXT,
  status support_status_enum NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Analytics helper views
CREATE OR REPLACE VIEW sales_by_month AS
  SELECT to_char(created_at, 'YYYY-MM') AS month,
         COALESCE(SUM(total_amount), 0) AS sales
  FROM orders
  GROUP BY 1
  ORDER BY 1;

CREATE OR REPLACE VIEW order_status_counts AS
  SELECT status, COUNT(*)::BIGINT AS count
  FROM orders
  GROUP BY status
  ORDER BY status;

CREATE OR REPLACE VIEW top_products AS
  SELECT p.id,
         p.name,
         COUNT(oi.id)::BIGINT AS orders,
         COALESCE(SUM(oi.qty_kg * oi.price_per_kg), 0) AS revenue
  FROM products p
  JOIN order_items oi ON oi.product_id = p.id
  JOIN orders o ON o.id = oi.order_id
  GROUP BY p.id, p.name
  ORDER BY revenue DESC
  LIMIT 10;

COMMIT;
