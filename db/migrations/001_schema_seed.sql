CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'GERANT',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('CENTRAL','OUTLET')),
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id),
  name TEXT NOT NULL,
  brand TEXT,
  flavor TEXT,
  volume TEXT,
  package_label TEXT NOT NULL,
  base_unit TEXT NOT NULL,
  package_equivalence NUMERIC(14,3) NOT NULL CHECK (package_equivalence > 0),
  alert_threshold NUMERIC(14,3) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, flavor, volume, package_label)
);

CREATE TABLE item_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id),
  purchase_price_xaf NUMERIC(14,2) NOT NULL DEFAULT 0,
  sale_price_standard_xaf NUMERIC(14,2) NOT NULL DEFAULT 0,
  sale_price_vip_xaf NUMERIC(14,2) NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to TIMESTAMPTZ
);

CREATE TABLE stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  quantity_base NUMERIC(14,3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id, location_id)
);

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_group_id UUID,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('SUPPLIER_IN','TRANSFER_OUT','TRANSFER_IN','SALE','RATION','AVARY','RETURN','ADJUSTMENT','CANCEL')),
  item_id UUID NOT NULL REFERENCES items(id),
  source_location_id UUID REFERENCES locations(id),
  destination_location_id UUID REFERENCES locations(id),
  quantity_input NUMERIC(14,3) NOT NULL,
  unit_input TEXT NOT NULL,
  quantity_base NUMERIC(14,3) NOT NULL,
  unit_price_xaf NUMERIC(14,2),
  amount_xaf NUMERIC(14,2),
  operation_date DATE NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retrospective BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'VALIDATED' CHECK (status IN ('VALIDATED','CANCELLED')),
  reason TEXT,
  created_by UUID REFERENCES users(id)
);

CREATE TABLE finance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('PAYMENT','EXPENSE','LOSS','VARIANCE')),
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  amount_xaf NUMERIC(14,2) NOT NULL,
  operation_date DATE NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

CREATE TABLE closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  theoretical_amount_xaf NUMERIC(14,2) NOT NULL DEFAULT 0,
  counted_amount_xaf NUMERIC(14,2) NOT NULL DEFAULT 0,
  variance_xaf NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'LOCKED' CHECK (status IN ('LOCKED','REOPENED')),
  justification TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO users (username, password_hash, full_name, role) VALUES
('gerant', '$2a$10$VpuJoLO1GMusuG92H/.UoOZ.zDhN.GKZg10SEqL2PMmqO9iURJ1ce', 'Gérant Principal', 'GERANT');

INSERT INTO locations (code, name, type) VALUES
('CENTRAL', 'Magasin central', 'CENTRAL'),
('STANDARD', 'Comptoir standard', 'OUTLET'),
('VIP', 'Comptoir VIP', 'OUTLET');

INSERT INTO categories (name) VALUES
('Bières casiers'), ('Jus TOP 1L'), ('Canettes'), ('Whiskys'), ('Vins'), ('Eaux minérales');

WITH c AS (SELECT id, name FROM categories), ins AS (
  INSERT INTO items (category_id, name, brand, flavor, volume, package_label, base_unit, package_equivalence, alert_threshold)
  VALUES
  ((SELECT id FROM c WHERE name='Bières casiers'), 'Castel Beer', 'Castel', NULL, '65cl', 'Casier 24', 'bouteille', 24, 24),
  ((SELECT id FROM c WHERE name='Bières casiers'), 'Beaufort', 'SABC', NULL, '65cl', 'Casier 12', 'bouteille', 12, 24),
  ((SELECT id FROM c WHERE name='Jus TOP 1L'), 'TOP Orange 1L', 'TOP', 'Orange', '1L', 'Carton 12', 'bouteille', 12, 24),
  ((SELECT id FROM c WHERE name='Jus TOP 1L'), 'TOP Ananas 1L', 'TOP', 'Ananas', '1L', 'Carton 12', 'bouteille', 12, 24),
  ((SELECT id FROM c WHERE name='Canettes'), 'Guinness Smooth Canette', 'Guinness', NULL, '33cl', 'Pack 24', 'canette', 24, 48),
  ((SELECT id FROM c WHERE name='Whiskys'), 'Black Label', 'Johnnie Walker', NULL, '70cl', 'Bouteille', 'bouteille', 1, 3),
  ((SELECT id FROM c WHERE name='Vins'), 'Vin Rouge Maison', 'Maison', NULL, '75cl', 'Carton 6', 'bouteille', 6, 12),
  ((SELECT id FROM c WHERE name='Eaux minérales'), 'Eau minérale 1.5L', 'Source', NULL, '1.5L', 'Pack 12', 'bouteille', 12, 48)
  RETURNING id, name
)
INSERT INTO item_prices (item_id, purchase_price_xaf, sale_price_standard_xaf, sale_price_vip_xaf)
SELECT id,
  CASE WHEN name LIKE '%Black%' THEN 12000 WHEN name LIKE '%Vin%' THEN 2500 ELSE 500 END,
  CASE WHEN name LIKE '%Black%' THEN 18000 WHEN name LIKE '%Vin%' THEN 5000 ELSE 1000 END,
  CASE WHEN name LIKE '%Black%' THEN 22000 WHEN name LIKE '%Vin%' THEN 7000 ELSE 1500 END
FROM ins;

INSERT INTO stocks (item_id, location_id, quantity_base)
SELECT i.id, l.id,
  CASE WHEN l.code='CENTRAL' THEN
    CASE WHEN i.name LIKE '%Black%' THEN 8 WHEN i.name LIKE '%Vin%' THEN 36 ELSE 120 END
  ELSE 0 END
FROM items i CROSS JOIN locations l;

INSERT INTO audit_logs (action, entity, details) VALUES ('SEED', 'DATABASE', '{"message":"Données de démonstration chargées"}');


