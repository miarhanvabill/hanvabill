const fs = require('fs');
let code = fs.readFileSync('components/invoice-screen.tsx', 'utf8');

code = code.replace(
  /                subtotal: invoice\.subtotal,\n\s*discount: invoice\.discount,\n\s*gstRate: 18,/,
  `                subtotal: invoice.subtotal,
                discount: invoice.discount,
                couponDiscount: invoice.couponDiscount,
                loyaltyDiscount: invoice.loyaltyDiscount,
                giftCardDiscount: invoice.giftCardDiscount,
                loyaltyPointsAvailable: invoice.loyaltyPointsAvailable,
                loyaltyPointsEarned: invoice.loyaltyPointsEarned,
                gstRate: 18,`
);

fs.writeFileSync('components/invoice-screen.tsx', code);
