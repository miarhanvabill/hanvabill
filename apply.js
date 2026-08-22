const fs = require('fs');
const { Pool } = require('@neondatabase/serverless');

const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_1Ith8nUxyoDS@ep-long-scene-a19t43g8-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' });

async function run() {
  const content = fs.readFileSync('scripts/040-create-mini-website-settings.sql', 'utf8');
  await pool.query(content);
  console.log('Migration applied');
  pool.end();
}
run().catch(console.error);
