-- Add tenant_id to products and categories
DO $$ 
BEGIN
    -- Add tenant_id to products
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='tenant_id') THEN
        ALTER TABLE products ADD COLUMN tenant_id TEXT;
    END IF;

    -- Add unit to products
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='unit') THEN
        ALTER TABLE products ADD COLUMN unit VARCHAR(50) DEFAULT 'piece';
    END IF;

    -- Add tenant_id to categories
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='tenant_id') THEN
        ALTER TABLE categories ADD COLUMN tenant_id TEXT;
    END IF;
END $$;
