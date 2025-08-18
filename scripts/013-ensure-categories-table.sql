-- Ensure categories table exists with proper structure
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Insert sample categories if table is empty
INSERT INTO categories (name, description, is_active) 
SELECT * FROM (VALUES 
  ('Hair Care', 'Hair care products and treatments', true),
  ('Skin Care', 'Facial and skin care products', true),
  ('Nail Care', 'Nail polish, treatments and tools', true),
  ('Makeup', 'Cosmetics and beauty products', true),
  ('Tools & Equipment', 'Professional salon tools', true)
) AS sample_data(name, description, is_active)
WHERE NOT EXISTS (SELECT 1 FROM categories LIMIT 1);

-- Insert subcategories
INSERT INTO categories (name, description, parent_id, is_active)
SELECT sample_data.name, sample_data.description, c.id, sample_data.is_active
FROM (VALUES 
  ('Shampoo', 'Hair cleansing products', 'Hair Care', true),
  ('Conditioner', 'Hair conditioning products', 'Hair Care', true),
  ('Hair Color', 'Hair coloring products', 'Hair Care', true),
  ('Moisturizers', 'Face and body moisturizers', 'Skin Care', true),
  ('Cleansers', 'Facial cleansing products', 'Skin Care', true),
  ('Base Makeup', 'Foundation, concealer, primer', 'Makeup', true),
  ('Eye Makeup', 'Eyeshadow, mascara, eyeliner', 'Makeup', true)
) AS sample_data(name, description, parent_name, is_active)
JOIN categories c ON c.name = sample_data.parent_name
WHERE NOT EXISTS (
  SELECT 1 FROM categories sub 
  WHERE sub.name = sample_data.name AND sub.parent_id = c.id
);
