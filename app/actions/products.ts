// app/actions/products.ts
"use server"

import { withTenantAuth } from '@/lib/withTenantAuth'

const FALLBACK_PRODUCTS = [
  { id: 101, name: "Shampoo 250ml", description: "Cleansing shampoo", category_id: null, category_name: "Hair", price: 299, cost: 120, stock_quantity: 24, min_stock_level: 5, barcode: "SHAMP-250", is_active: true, created_at: new Date().toISOString() },
  { id: 102, name: "Face Serum 30ml", description: "Vitamin C serum", category_id: null, category_name: "Skincare", price: 799, cost: 300, stock_quantity: 10, min_stock_level: 3, barcode: "SERUM-30", is_active: true, created_at: new Date().toISOString() },
  { id: 103, name: "Nail Polish", description: "Long-lasting color", category_id: null, category_name: "Beauty", price: 199, cost: 80, stock_quantity: 20, min_stock_level: 5, barcode: "NAIL-001", is_active: true, created_at: new Date().toISOString() },
]

const FALLBACK_CATEGORIES = [
  { id: 1, name: "Hair" },
  { id: 2, name: "Skincare" },
  { id: 3, name: "Beauty" },
]

function isUndefinedTable(err: any) {
  return err?.code === "42P01" || /relation .* does not exist/i.test(err?.message || "")
}

let productsSchemaEnsured = false;
async function ensureProductsSchema(sql: any) {
  if (productsSchemaEnsured) return;
  try {
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS tenant_id TEXT`.catch(() => {});
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(100)`.catch(() => {});
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT`.catch(() => {});
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS cost NUMERIC(10,2) DEFAULT 0`.catch(() => {});
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT 0`.catch(() => {});
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER`.catch(() => {});
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100)`.catch(() => {});
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100)`.catch(() => {});
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'piece'`.catch(() => {});
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0`.catch(() => {});
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock_level INTEGER DEFAULT 0`.catch(() => {});
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`.catch(() => {});
    
    // Drop global unique constraints so products are tenant-scoped
    await sql`ALTER TABLE products DROP CONSTRAINT IF EXISTS products_barcode_key`.catch(() => {});
    await sql`ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_key`.catch(() => {});

    productsSchemaEnsured = true;
  } catch (err) {
    console.warn("ensureProductsSchema warning:", err);
  }
}

export async function getProducts() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureProductsSchema(sql);
      const rows = await sql`
        SELECT p.*, c.name as category_name,
        (
          SELECT COALESCE(SUM(CAST(item->>'quantity' AS INTEGER)), 0)
          FROM invoices i, 
          jsonb_array_elements(
            CASE 
              WHEN i.product_details IS NULL THEN '[]'::jsonb 
              WHEN jsonb_typeof(i.product_details::jsonb) = 'array' THEN i.product_details::jsonb 
              ELSE '[]'::jsonb 
            END
          ) AS item
          WHERE item->>'id' = p.id::text AND i.tenant_id = ${tenantId}
        ) as sales_count
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id AND c.tenant_id = ${tenantId}
        WHERE p.tenant_id = ${tenantId}
        ORDER BY sales_count DESC, p.created_at DESC
      `
      return rows
    } catch (error: any) {
      if (isUndefinedTable(error)) {
        console.warn("getProducts: products table missing – returning fallback")
        return FALLBACK_PRODUCTS
      }
      console.error("Error fetching products:", error)
      throw new Error("Failed to fetch products")
    }
  })
}

export async function createProduct(data: {
  name: string
  description?: string
  category_id?: number | null
  price: number
  cost: number
  stock_quantity: number
  min_stock_level: number
  barcode?: string
  sku?: string
  image_url?: string
  is_active: boolean
}): Promise<any> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureProductsSchema(sql);

      if (!data.name || !data.name.trim()) {
        return { success: false, error: "Product name is required" }
      }

      const barcode = data.barcode && data.barcode.trim() ? data.barcode.trim() : null
      const sku = data.sku && data.sku.trim() ? data.sku.trim() : barcode
      const categoryId = data.category_id && !isNaN(Number(data.category_id)) ? Number(data.category_id) : null
      const price = Math.max(0, Number(data.price) || 0)
      const cost = Math.max(0, Number(data.cost) || 0)
      const stockQuantity = Math.max(0, Number(data.stock_quantity) || 0)
      const minStockLevel = Math.max(0, Number(data.min_stock_level) || 5)

      // Check SKU / Barcode uniqueness per tenant
      if (sku && barcode) {
        const existing = await sql`
          SELECT id, name FROM products 
          WHERE tenant_id = ${tenantId} AND (sku = ${sku} OR barcode = ${barcode})
          LIMIT 1
        `.catch(() => [])
        if (existing.length > 0) {
          return { success: false, error: `A product with SKU or Barcode "${sku || barcode}" already exists (${existing[0].name}).` }
        }
      } else if (sku) {
        const existing = await sql`
          SELECT id, name FROM products 
          WHERE tenant_id = ${tenantId} AND sku = ${sku}
          LIMIT 1
        `.catch(() => [])
        if (existing.length > 0) {
          return { success: false, error: `A product with SKU "${sku}" already exists (${existing[0].name}).` }
        }
      } else if (barcode) {
        const existing = await sql`
          SELECT id, name FROM products 
          WHERE tenant_id = ${tenantId} AND barcode = ${barcode}
          LIMIT 1
        `.catch(() => [])
        if (existing.length > 0) {
          return { success: false, error: `A product with Barcode "${barcode}" already exists (${existing[0].name}).` }
        }
      }

      let catName = "General"
      if (categoryId) {
        const cat = await sql`SELECT name FROM categories WHERE id = ${categoryId} LIMIT 1`.catch(() => [])
        if (cat.length > 0) catName = cat[0].name
      }

      const result = await sql`
        INSERT INTO products (
          tenant_id, name, description, category_id, category, price, cost, cost_price,
          stock_quantity, min_stock_level, barcode, sku, is_active, image_url, unit,
          created_at, updated_at
        )
        VALUES (
          ${tenantId}, ${data.name.trim()}, ${data.description || null}, ${categoryId}, ${catName},
          ${price}, ${cost}, ${cost},
          ${stockQuantity}, ${minStockLevel}, ${barcode}, ${sku}, ${data.is_active ?? true}, ${data.image_url || null}, 'piece',
          NOW(), NOW()
        )
        RETURNING *
      `

      // Cross-sync into inventory table for unified stock management
      try {
        let invStatus = "active"
        if (stockQuantity === 0) invStatus = "out_of_stock"
        else if (stockQuantity <= minStockLevel) invStatus = "low_stock"

        await sql`
          INSERT INTO inventory (
            tenant_id, name, item_name, category, sku, barcode, quantity, unit,
            cost_price, selling_price, unit_price, min_stock_level, reorder_level,
            description, status, image_url, created_at, updated_at
          ) VALUES (
            ${tenantId}, ${data.name.trim()}, ${data.name.trim()}, ${catName},
            ${sku}, ${barcode}, ${stockQuantity}, 'pcs',
            ${cost}, ${price}, ${price}, ${minStockLevel}, ${minStockLevel},
            ${data.description || null}, ${invStatus}, ${data.image_url || null}, NOW(), NOW()
          )
        `.catch(() => {})
      } catch {}

      return { success: true, ...result[0], id: result[0]?.id }
    } catch (e: any) {
      console.error("Error creating product:", e)
      return { success: false, error: e?.message || "Failed to create product" }
    }
  })
}

export async function updateProduct(
  id: number,
  data: {
    name: string
    description?: string
    category_id?: number | null
    price: number
    cost: number
    stock_quantity: number
    min_stock_level: number
    barcode?: string
    sku?: string
    image_url?: string
    is_active: boolean
  },
): Promise<any> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      await ensureProductsSchema(sql);

      if (!data.name || !data.name.trim()) {
        return { success: false, error: "Product name is required" }
      }

      const barcode = data.barcode && data.barcode.trim() ? data.barcode.trim() : null
      const sku = data.sku && data.sku.trim() ? data.sku.trim() : barcode
      const categoryId = data.category_id && !isNaN(Number(data.category_id)) ? Number(data.category_id) : null
      const price = Math.max(0, Number(data.price) || 0)
      const cost = Math.max(0, Number(data.cost) || 0)
      const stockQuantity = Math.max(0, Number(data.stock_quantity) || 0)
      const minStockLevel = Math.max(0, Number(data.min_stock_level) || 5)

      // Check SKU / Barcode uniqueness per tenant (excluding self)
      if (sku && barcode) {
        const existing = await sql`
          SELECT id, name FROM products 
          WHERE tenant_id = ${tenantId} AND id != ${id} AND (sku = ${sku} OR barcode = ${barcode})
          LIMIT 1
        `.catch(() => [])
        if (existing.length > 0) {
          return { success: false, error: `Another product with SKU or Barcode "${sku || barcode}" already exists (${existing[0].name}).` }
        }
      } else if (sku) {
        const existing = await sql`
          SELECT id, name FROM products 
          WHERE tenant_id = ${tenantId} AND id != ${id} AND sku = ${sku}
          LIMIT 1
        `.catch(() => [])
        if (existing.length > 0) {
          return { success: false, error: `Another product with SKU "${sku}" already exists (${existing[0].name}).` }
        }
      } else if (barcode) {
        const existing = await sql`
          SELECT id, name FROM products 
          WHERE tenant_id = ${tenantId} AND id != ${id} AND barcode = ${barcode}
          LIMIT 1
        `.catch(() => [])
        if (existing.length > 0) {
          return { success: false, error: `Another product with Barcode "${barcode}" already exists (${existing[0].name}).` }
        }
      }

      let catName = "General"
      if (categoryId) {
        const cat = await sql`SELECT name FROM categories WHERE id = ${categoryId} LIMIT 1`.catch(() => [])
        if (cat.length > 0) catName = cat[0].name
      }

      const result = await sql`
        UPDATE products
        SET
          name = ${data.name.trim()},
          description = ${data.description || null},
          category_id = ${categoryId},
          category = ${catName},
          price = ${price},
          cost = ${cost},
          cost_price = ${cost},
          stock_quantity = ${stockQuantity},
          min_stock_level = ${minStockLevel},
          barcode = ${barcode},
          sku = ${sku},
          is_active = ${data.is_active ?? true},
          image_url = ${data.image_url || null},
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `

      // Cross-sync updated stock and prices to inventory table
      try {
        let invStatus = "active"
        if (stockQuantity === 0) invStatus = "out_of_stock"
        else if (stockQuantity <= minStockLevel) invStatus = "low_stock"

        await sql`
          UPDATE inventory SET
            name = ${data.name.trim()},
            item_name = ${data.name.trim()},
            quantity = ${stockQuantity},
            cost_price = ${cost},
            selling_price = ${price},
            unit_price = ${price},
            min_stock_level = ${minStockLevel},
            reorder_level = ${minStockLevel},
            sku = ${sku},
            barcode = ${barcode},
            status = ${invStatus},
            image_url = ${data.image_url || null},
            updated_at = NOW()
          WHERE tenant_id = ${tenantId} 
            AND (
              id = ${id}
              OR (sku IS NOT NULL AND sku = ${sku})
              OR (barcode IS NOT NULL AND barcode = ${barcode})
              OR LOWER(name) = LOWER(${data.name.trim()})
            )
        `.catch(() => {})
      } catch {}

      return { success: true, ...result[0], id: result[0]?.id }
    } catch (e: any) {
      console.error("Error updating product:", e)
      return { success: false, error: e?.message || "Failed to update product" }
    }
  })
}

export async function deleteProduct(id: number) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    // Delete from products
    await sql`DELETE FROM products WHERE id = ${id} AND tenant_id = ${tenantId}`

    // Also delete/soft-delete matching record in inventory table
    await sql`DELETE FROM inventory WHERE id = ${id} AND tenant_id = ${tenantId}`.catch(() => {})
    
    return { success: true }
  })
}

export async function getCategories() {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const categories = await sql`
        SELECT id, name 
        FROM categories 
        WHERE is_active = true AND tenant_id = ${tenantId}
        ORDER BY name
      `
      return categories
    } catch (error: any) {
      if (isUndefinedTable(error)) {
        console.warn("getCategories: categories table missing – returning fallback")
        return FALLBACK_CATEGORIES
      }
      console.error("Error fetching categories:", error)
      throw new Error("Failed to fetch categories")
    }
  })
}
