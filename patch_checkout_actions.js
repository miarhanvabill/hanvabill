const fs = require('fs');
let code = fs.readFileSync('app/actions/checkout.ts', 'utf8');

code = code.replace(
  /coupon_code\?: string \| null/,
  `coupon_code?: string | null\n  coupon_discount?: number\n  manual_discount?: number`
);

code = code.replace(
  /const couponDiscount = 0/,
  `const couponDiscount = Number(input.coupon_discount) || Number(input.manual_discount) || 0`
);

fs.writeFileSync('app/actions/checkout.ts', code);
