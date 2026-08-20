const fs = require('fs');
let code = fs.readFileSync('components/checkout-screen.tsx', 'utf8');

code = code.replace(
  /coupon_code: appliedCoupon\?\.code,/,
  `coupon_code: appliedCoupon?.code,
        coupon_discount: appliedCoupon ? couponDiscount : 0,
        manual_discount: !appliedCoupon ? manualDiscount : 0,`
);

fs.writeFileSync('components/checkout-screen.tsx', code);
