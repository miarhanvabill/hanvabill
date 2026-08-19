const fs = require('fs');
let code = fs.readFileSync('components/invoice-template.tsx', 'utf8');

code = code.replace(
  /<h2 className="text-xl font-bold text-gray-900">Hanva Billing<\/h2>/,
  '<img src="/logo-full.png" alt="Hanva Technologies Pvt. Ltd." className="h-10 object-contain ml-auto" />\n                <h2 className="text-xl font-bold text-gray-900 mt-2">Hanva Technologies Pvt. Ltd.</h2>'
);

fs.writeFileSync('components/invoice-template.tsx', code);
