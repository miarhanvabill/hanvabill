const fs = require('fs');
let code = fs.readFileSync('app/actions/checkout.ts', 'utf8');

code = code.replace(
  '${input.notes || null},',
  "          ${[\n            input.notes,\n            input.coupon_code ? `Coupon: ${input.coupon_code} (-${couponDiscount})` : null,\n            input.manual_discount && input.manual_discount > 0 ? `Manual Discount: -${input.manual_discount}` : null,\n            loyaltyDiscount > 0 ? `Loyalty Redeemed: ₹${loyaltyDiscount}` : null,\n            giftCardDiscount > 0 ? `Gift Card Redeemed: ₹${giftCardDiscount}` : null,\n            input.points_earned_client && input.points_earned_client > 0 ? `Points Earned: ${input.points_earned_client}` : null,\n          ].filter(Boolean).join(' | ')},"
);

fs.writeFileSync('app/actions/checkout.ts', code);
