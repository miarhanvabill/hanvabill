-- scripts/062-enhance-salon-inventory-and-deductions.sql
-- Adds salon-specific inventory tracking: units (ml, gm, pcs), volume per unit, usage types (retail/professional),
-- smart SKU auto-updates, and product consumption logging during checkout.

-- Ensure columns exist on inventory table
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS item_name VARCHAR(255);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS brand VARCHAR(100);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'pcs';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS volume_per_unit NUMERIC DEFAULT 1;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS volume_unit VARCHAR(50) DEFAULT 'ml';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS usage_type VARCHAR(50) DEFAULT 'both'; -- 'professional', 'retail', 'both'
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS selling_price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS supplier VARCHAR(255);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS min_stock_level NUMERIC DEFAULT 5;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS reorder_level NUMERIC DEFAULT 5;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill name/item_name and unit_price/selling_price if either is null
UPDATE inventory SET name = item_name WHERE name IS NULL AND item_name IS NOT NULL;
UPDATE inventory SET item_name = name WHERE item_name IS NULL AND name IS NOT NULL;
UPDATE inventory SET unit_price = selling_price WHERE (unit_price IS NULL OR unit_price = 0) AND selling_price > 0;
UPDATE inventory SET selling_price = unit_price WHERE (selling_price IS NULL OR selling_price = 0) AND unit_price > 0;

-- Create index on inventory tenant + sku
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_sku ON inventory(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_status ON inventory(tenant_id, status);

-- Ensure columns exist on products table as well
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'piece';
ALTER TABLE products ADD COLUMN IF NOT EXISTS usage_type VARCHAR(50) DEFAULT 'both';
ALTER TABLE products ADD COLUMN IF NOT EXISTS volume_per_unit NUMERIC DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS volume_unit VARCHAR(50) DEFAULT 'ml';

-- Create table for salon service/checkout product consumptions
CREATE TABLE IF NOT EXISTS product_consumptions (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  invoice_id INTEGER,
  booking_id INTEGER,
  inventory_id INTEGER,
  product_id INTEGER,
  product_name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  quantity_deducted NUMERIC(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL DEFAULT 'ml',
  service_name VARCHAR(255),
  staff_name VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_consumptions_tenant ON product_consumptions(tenant_id, invoice_id);
