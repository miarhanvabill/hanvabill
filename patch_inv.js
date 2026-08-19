const fs = require('fs');

let code = fs.readFileSync('app/inv/[token]/page.tsx', 'utf8');

code = code.replace(
  'const res = await getInvoiceByShareToken(params.token)',
  'const res = await getInvoiceByShareToken(resolvedParams.token)'
);

fs.writeFileSync('app/inv/[token]/page.tsx', code);
