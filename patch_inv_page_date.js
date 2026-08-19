const fs = require('fs');
let code = fs.readFileSync('app/inv/[token]/page.tsx', 'utf8');

code = code.replace(
  /invoiceDate: inv\.invoice_date,/,
  `invoiceDate: inv.invoice_date instanceof Date ? inv.invoice_date.toISOString() : (inv.invoice_date || new Date().toISOString()),`
);

fs.writeFileSync('app/inv/[token]/page.tsx', code);
