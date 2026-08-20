const fs = require('fs');
let code = fs.readFileSync('app/actions/checkout.ts', 'utf8');

const oldNotes = `\${input.notes || null},`;
const newNotes = `\${[
            input.notes,
            input.coupon_code ? \`Coupon: \${input.coupon_code} (-\${couponDiscount})\` : null,
            input.manual_discount > 0 ? \`Manual Discount: -\${input.manual_discount}\` : null,
            loyaltyDiscount > 0 ? \`Loyalty Redeemed: ₹\${loyaltyDiscount}\` : null,
            giftCardDiscount > 0 ? \`Gift Card Redeemed: ₹\${giftCardDiscount}\` : null,
            input.points_earned_client > 0 ? \`Points Earned: \${input.points_earned_client}\` : null,
          ].filter(Boolean).join(' | ')},`;

code = code.replace(oldNotes, newNotes);

fs.writeFileSync('app/actions/checkout.ts', code);
