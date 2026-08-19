const fs = require('fs');
let code = fs.readFileSync('components/invoice-screen.tsx', 'utf8');

code = code.replace(
  /                giftCardDiscount: invoice\.giftCardDiscount,/,
  `                giftCardDiscount: invoice.giftCardDiscount,
                loyaltyPointsAvailable: invoice.loyaltyPointsAvailable,
                loyaltyPointsEarned: invoice.loyaltyPointsEarned,`
);

fs.writeFileSync('components/invoice-screen.tsx', code);
