const fs = require('fs');
let code = fs.readFileSync('app/inv/[token]/page.tsx', 'utf8');

code = code.replace(
  /<div className="min-h-screen bg-slate-50 py-12">/,
  `<div className="min-h-screen bg-slate-50 py-12 print:py-0 print:bg-white">`
);

code = code.replace(
  /<div className="max-w-4xl mx-auto px-4">/,
  `<div className="max-w-4xl mx-auto px-4 print:px-0 print:max-w-none">`
);

code = code.replace(
  /className="bg-white shadow-xl mx-auto"/,
  `className="bg-white shadow-xl mx-auto print:shadow-none"`
);

fs.writeFileSync('app/inv/[token]/page.tsx', code);
