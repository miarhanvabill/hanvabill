const { Pool } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const DB_URL = process.env.DATABASE_URL;

async function run() {
  if (!DB_URL) {
    console.error("Please set DATABASE_URL environment variable.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: DB_URL });
  
  const sqlFile = path.join(__dirname, '039-create-billing-tables.sql');
  const sqlContent = fs.readFileSync(sqlFile, 'utf-8');
  
  // Split on semicolons but keep non-empty statements
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`Running ${statements.length} migration statements for billing tables...`);
  
  let success = 0, failed = 0;
  for (const statement of statements) {
    const preview = statement.substring(0, 80).replace(/\n/g, ' ');
    try {
      await pool.query(statement);
      console.log(`✅ ${preview}`);
      success++;
    } catch (err) {
      console.error(`❌ ${preview}`);
      console.error(`   Error: ${err.message}`);
      failed++;
    }
  }

  // Also verify/fix vendors is_active type
  console.log('\nChecking vendors table is_active column...');
  try {
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'vendors' 
            AND column_name = 'is_active' 
            AND data_type IN ('character varying', 'text', 'character')
        ) THEN
          ALTER TABLE vendors ALTER COLUMN is_active DROP DEFAULT;
          ALTER TABLE vendors ALTER COLUMN is_active TYPE BOOLEAN USING (
            CASE 
              WHEN LOWER(TRIM(is_active::text)) IN ('false', '0', 'f', 'inactive', 'no') THEN false 
              ELSE true 
            END
          );
          ALTER TABLE vendors ALTER COLUMN is_active SET DEFAULT true;
        END IF;
      END $$;
    `);
    console.log('✅ vendors.is_active checked and ensured as BOOLEAN');
  } catch (err) {
    console.error('❌ vendors is_active check error:', err.message);
  }
  
  console.log(`\n✅ Completed billing migration!`);
  await pool.end();
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
