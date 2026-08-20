const fs = require('fs');
let code = fs.readFileSync('components/invoice-template.tsx', 'utf8');

code = code.replace(
  /<span className="text-slate-600">Coupon Discount \{data\.couponCode \? \`\(\$\{data\.couponCode\}\)\` : ""\}<\/span>/,
  '<span className="text-slate-600">{data.couponCode ? `Coupon Discount (${data.couponCode})` : "Manual Discount"}</span>'
);

fs.writeFileSync('components/invoice-template.tsx', code);
