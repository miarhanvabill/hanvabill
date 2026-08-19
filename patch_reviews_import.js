const fs = require('fs');
let code = fs.readFileSync('app/actions/reviews.ts', 'utf8');

code = code.replace(
  /const \{ neon \} = await import\('@neondatabase\/serverless'\);/,
  ``
);

if (!code.includes('import { neon } from "@neondatabase/serverless"')) {
  code = code.replace(
    /"use server"/,
    `"use server"\nimport { neon } from "@neondatabase/serverless"`
  );
}

fs.writeFileSync('app/actions/reviews.ts', code);
