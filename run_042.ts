import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';

async function run() {
  const sql = neon('postgresql://neondb_owner:npg_1Ith8nUxyoDS@ep-long-scene-a19t43g8-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');
  try {
    const query = fs.readFileSync('scripts/042-create-notification-tables.sql', 'utf8');
    // Using simple template tag
    await sql(query);
    console.log("Migration successful");
  } catch(e) {
    console.error("Migration failed:", e);
  }
}
run();
