const fs = require('fs');
let code = fs.readFileSync('app/actions/invoices.ts', 'utf8');

if (!code.includes('unstable_noStore')) {
  code = code.replace(
    'import { neon } from "@neondatabase/serverless"',
    'import { neon } from "@neondatabase/serverless"\nimport { unstable_noStore as noStore } from "next/cache"'
  );
  
  code = code.replace(
    'export async function getInvoiceByShareToken(token: string) {',
    'export async function getInvoiceByShareToken(token: string) {\n  noStore();'
  );
}

fs.writeFileSync('app/actions/invoices.ts', code);
