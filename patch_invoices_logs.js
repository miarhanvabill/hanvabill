const fs = require('fs');
let code = fs.readFileSync('app/actions/invoices.ts', 'utf8');
code = code.replace(
  'catch (err) {',
  'catch (err) {\n    console.error("DEBUG ERROR:", err);'
);
fs.writeFileSync('app/actions/invoices.ts', code);
