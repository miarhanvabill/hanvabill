const fs = require('fs');
let code = fs.readFileSync('app/actions/checkout.ts', 'utf8');

code = code.replace(
  'const gstAmount = (subtotal * 18) / 100',
  'const gstAmount = ((subtotal - couponDiscount) * 18) / 100'
);

fs.writeFileSync('app/actions/checkout.ts', code);

let uiCode = fs.readFileSync('components/checkout-screen.tsx', 'utf8');
uiCode = uiCode.replace(
  'const gstAmount = (subtotal * 18) / 100',
  'const gstAmount = ((subtotal - (appliedCoupon ? couponDiscount : manualDiscount)) * 18) / 100'
);
fs.writeFileSync('components/checkout-screen.tsx', uiCode);
