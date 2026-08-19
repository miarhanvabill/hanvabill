const fs = require('fs');
let code = fs.readFileSync('components/invoice-screen.tsx', 'utf8');

// Hide Payment Successful header on print
code = code.replace(
  /<Card className="border-green-200 bg-green-50">/,
  '<Card className="border-green-200 bg-green-50 print:hidden">'
);

// Remove the min-w-[800px] which breaks printing
code = code.replace(
  /<div className="min-w-\[800px\]">/,
  '<div className="w-full">'
);

// Hide Actions Card on print
code = code.replace(
  /\{\/\* Actions \*\/\}\s*<Card>/,
  '{/* Actions */}\n          <Card className="print:hidden">'
);

fs.writeFileSync('components/invoice-screen.tsx', code);
