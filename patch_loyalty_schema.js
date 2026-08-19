const fs = require('fs');
let code = fs.readFileSync('app/actions/loyalty.ts', 'utf8');

const createTable = `
  // Loyalty transactions table modifications
  try {
    await sql\`
      CREATE TABLE IF NOT EXISTS loyalty_transactions (
        id BIGSERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        customer_id BIGINT NOT NULL,
        points NUMERIC NOT NULL DEFAULT 0,
        transaction_type TEXT NOT NULL,
        amount NUMERIC NOT NULL DEFAULT 0,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        type TEXT,
        invoice_id TEXT
      )
    \`
    await sql\`ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()\`
    await sql\`ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS tenant_id TEXT\`
`;

code = code.replace(
  /\/\/ Loyalty transactions table modifications\n\s*try \{\n\s*await sql`ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`/g,
  createTable
);

fs.writeFileSync('app/actions/loyalty.ts', code);
