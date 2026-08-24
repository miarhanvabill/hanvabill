const { neon } = require('@neondatabase/serverless');
const sql = neon("postgresql://billing_user:1234@localhost:5432/billing_db");
sql`select count(*) from whatsapp_messages;`.then(console.log).catch(console.error);
