const { Pool } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const DB_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_zL01wFmKjDce@ep-muddy-pine-a1a7s3e4-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function run() {
  const pool = new Pool({ connectionString: DB_URL });
  
  const sqlFile = path.join(__dirname, '064-fix-missing-staff-columns.sql');
  const sqlContent = fs.readFileSync(sqlFile, 'utf-8');
  
  // Split on semicolons but keep non-empty statements
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`Running ${statements.length} migration statements...`);
  
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
  
  console.log(`\n✅ ${success} statements succeeded, ❌ ${failed} failed`);
  await pool.end();
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
