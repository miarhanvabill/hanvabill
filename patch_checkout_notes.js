const fs = require('fs');
let code = fs.readFileSync('app/actions/checkout.ts', 'utf8');

code = code.replace(
  /const notes = \[\]\n      if \(appliedCoupon\) notes\.push\(\`Coupon: \$\{appliedCoupon\.code\}\`\)\n      if \(redeemEnabled && loyaltyDiscount > 0\) notes\.push\(\`Loyalty Redeemed: ₹\$\{loyaltyDiscount\}\`\)\n      if \(giftCardDiscount > 0\) notes\.push\(\`Gift Card Redeemed: ₹\$\{giftCardDiscount\}\`\)\n      const notesStr = notes\.length > 0 \? notes\.join\(" \| "\) : input\.notes/,
  `const notes = []
      if (appliedCoupon) notes.push(\`Coupon: \${appliedCoupon.code} (-\${couponDiscount})\`)
      if (redeemEnabled && loyaltyDiscount > 0) notes.push(\`Loyalty Redeemed: ₹\${loyaltyDiscount}\`)
      if (giftCardDiscount > 0) notes.push(\`Gift Card Redeemed: ₹\${giftCardDiscount}\`)
      if (pointsEarned > 0) notes.push(\`Points Earned: \${pointsEarned}\`)
      if (customerLoyalty) notes.push(\`Points Balance: \${customerLoyalty.points - (redeemEnabled ? loyaltyRedeemPoints : 0)}\`)
      if (input.notes) notes.push(\`Notes: \${input.notes}\`)
      const notesStr = notes.length > 0 ? notes.join(" | ") : null`
);

fs.writeFileSync('app/actions/checkout.ts', code);
