const fs = require('fs');
let code = fs.readFileSync('app/actions/checkout.ts', 'utf8');

code = code.replace(
  /const total = Math\.max\([\s\S]*?loyaltyDiscount\),\n\s*\),\n\s*\)/,
  `const totalRaw = Math.max(
        0,
        Math.max(
          0,
          Math.min(Number.MAX_SAFE_INTEGER, subtotal + gstAmount - couponDiscount - giftCardDiscount - loyaltyDiscount),
        ),
      )
      const total = Math.round(totalRaw * 100) / 100`
);

fs.writeFileSync('app/actions/checkout.ts', code);
