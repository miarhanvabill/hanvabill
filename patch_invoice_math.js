const fs = require('fs');
let code = fs.readFileSync('components/invoice-template.tsx', 'utf8');

code = code.replace(
  'const gstAmount = (data.subtotal - data.discount) * (data.gstRate / 100)',
  'const gstAmount = (data.subtotal - data.discount - (data.couponDiscount || 0) - (data.loyaltyDiscount || 0) - (data.giftCardDiscount || 0)) * (data.gstRate / 100)'
);

fs.writeFileSync('components/invoice-template.tsx', code);
