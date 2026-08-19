const fs = require('fs');
let code = fs.readFileSync('app/actions/checkout.ts', 'utf8');

code = code.replace(
  /import crypto from 'crypto';\n"use server"/,
  `"use server"\nimport crypto from 'crypto';`
);

fs.writeFileSync('app/actions/checkout.ts', code);
