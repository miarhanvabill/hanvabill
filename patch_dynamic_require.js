const fs = require('fs');
let code = fs.readFileSync('app/actions/invoices.ts', 'utf8');

// Remove dynamic require
code = code.replace(
  /const \{ neon \} = require\("@neondatabase\/serverless"\);/,
  ``
);

// Add import at the top if not exists
if (!code.includes('import { neon } from "@neondatabase/serverless"')) {
  code = code.replace(
    /"use server"/,
    `"use server"\nimport { neon } from "@neondatabase/serverless"`
  );
}

fs.writeFileSync('app/actions/invoices.ts', code);
