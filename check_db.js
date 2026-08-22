const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function check() {
  try {
    const tenantRes = await sql`SELECT id FROM tenants WHERE slug = 'cnbhongasandra' OR tenant_key = 'cnbhongasandra' LIMIT 1`;
    if (tenantRes.length === 0) {
      console.log("Tenant not found.");
      return;
    }
    const tenantId = tenantRes[0].id;

    console.log("Tenant ID:", tenantId);

    const settings = await sql`SELECT setting_key, setting_value FROM store_settings WHERE tenant_id = \$\{tenantId\}`;
    console.log("\nSettings keys:");
    settings.forEach(s => console.log(s.setting_key + ": " + s.setting_value.substring(0, 30)));

    const packages = await sql`SELECT COUNT(*) FROM packages WHERE tenant_id = \$\{tenantId\}`;
    console.log("\nPackages count:", packages[0].count);

    const pkgsCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'packages'`;
    console.log("Packages Columns:", pkgsCols.map(c => c.column_name).join(", "));
    
    const memCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'memberships'`;
    console.log("Memberships Columns:", memCols.map(c => c.column_name).join(", "));
    
  } catch (e) {
    console.error(e);
  }
}
check();
