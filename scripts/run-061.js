const { Pool } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function run() {
  const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_zL01wFmKjDce@ep-muddy-pine-a1a7s3e4-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
  });
  
  const sqlContent = fs.readFileSync(path.join(__dirname, '061-add-composite-indexes.sql'), 'utf-8');
  
  const statements = sqlContent.split(';').filter(s => s.trim().length > 0);
  
  for (const statement of statements) {
    console.log('Running:', statement.trim());
    try {
      await pool.query(statement);
      console.log('Success');
    } catch (err) {
      console.error('Error:', err);
    }
  }
  await pool.end();
}

run().catch(console.error);
