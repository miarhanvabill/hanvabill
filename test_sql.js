const { neon } = require('@neondatabase/serverless');

async function check() {
  const sql = neon('postgresql://neondb_owner:npg_1Ith8nUxyoDS@ep-long-scene-a19t43g8-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');
  const tenantId = 1; // Assuming tenantId 1 for testing
  try {
    const revenueData = await sql`
        SELECT 
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COUNT(*) as total_bookings
        FROM bookings 
        WHERE status IN ('completed', 'confirmed')
      `;
    console.log("Revenue:", revenueData);
    
    const customerData = await sql`
        SELECT 
          COUNT(*) as total_customers
        FROM customers
      `;
    console.log("Customer:", customerData);

    const inventoryData = await sql`
        SELECT 
          COUNT(*) as total_items,
          COUNT(CASE WHEN stock_quantity <= min_stock_level THEN 1 END) as low_stock,
          COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as out_of_stock,
          COALESCE(SUM(stock_quantity * COALESCE(price, 0)), 0) as total_value
        FROM products
        WHERE is_active = 'true'
      `;
    console.log("Inventory:", inventoryData);

  } catch (e) {
    console.error("Error:", e);
  }
}
check();
