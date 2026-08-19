const fs = require('fs');
let code = fs.readFileSync('app/inv/[token]/page.tsx', 'utf8');

code = code.replace(
  /<div className="max-w-4xl mx-auto px-4 print:px-0 print:max-w-none">/,
  `<div className="max-w-4xl mx-auto px-4 print:px-0 print:max-w-none" id="invoice-template-wrapper">`
);

fs.writeFileSync('app/inv/[token]/page.tsx', code);
