import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("Starting multi-tenant database migration...");

  try {
    // 1. Create tenants table
    await sql`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log("✅ Created tenants table");

    // 2. Insert a default tenant
    const defaultTenant = await sql`
      INSERT INTO tenants (name) 
      VALUES ('Default Salon') 
      ON CONFLICT DO NOTHING 
      RETURNING id;
    `;
    
    // If we didn't insert (conflict), let's just get the first one
    const tenantIdResult = await sql`SELECT id FROM tenants ORDER BY id ASC LIMIT 1;`;
    const defaultTenantId = tenantIdResult[0].id;
    console.log(`✅ Default tenant ID: ${defaultTenantId}`);

    // 3. List of tables to migrate
    const tablesToMigrate = [
      'customers',
      'staff',
      'bookings',
      'invoices',
      'services',
      // Add other tables as necessary
    ];

    for (const table of tablesToMigrate) {
      try {
        // Check if table exists
        const tableExists = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${table}
          );
        `;

        if (tableExists[0].exists) {
          // Check if tenant_id column already exists
          const columnExists = await sql`
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = ${table} 
              AND column_name = 'tenant_id'
            );
          `;

          if (!columnExists[0].exists) {
            console.log(`Migrating table: ${table}...`);
            await sql`ALTER TABLE ${sql(table)} ADD COLUMN tenant_id INTEGER REFERENCES tenants(id)`;
            await sql`UPDATE ${sql(table)} SET tenant_id = ${defaultTenantId}`;
            await sql`ALTER TABLE ${sql(table)} ALTER COLUMN tenant_id SET NOT NULL`;
            console.log(`✅ Added tenant_id to ${table}`);
          } else {
             console.log(`⏭️ Table ${table} already has tenant_id`);
          }
        } else {
           console.log(`⏭️ Table ${table} does not exist yet.`);
        }
      } catch (err) {
        console.error(`❌ Error migrating table ${table}:`, err);
      }
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

migrate();
