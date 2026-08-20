const fs = require('fs');
let code = fs.readFileSync('app/actions/invoices.ts', 'utf8');

code = code.replace(
  /\/\/ Handle legacy flat JSON[\s\S]*?continue;\n\s*}/,
  ''
);

fs.writeFileSync('app/actions/invoices.ts', code);
