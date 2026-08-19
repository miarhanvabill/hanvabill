const fs = require('fs');
let code = fs.readFileSync('app/inv/[token]/page.tsx', 'utf8');

const parseLogic = `
  // Parse notes to extract discount breakdown
  let couponCode = undefined;
  let couponDiscount = 0;
  let loyaltyDiscount = 0;
  let giftCardDiscount = 0;
  let loyaltyPointsEarned = undefined;
  let loyaltyPointsAvailable = undefined;
  
  if (inv.booking_notes) {
    const noteParts = inv.booking_notes.split(' | ');
    for (const part of noteParts) {
      if (part.startsWith('Coupon: ')) {
        const match = part.match(/Coupon: (.*) \\(-\\d+(\\.\\d+)?\\)/);
        if (match) {
          couponCode = match[1];
          couponDiscount = parseFloat(part.match(/\\(-(\\d+(\\.\\d+)?)\\)/)[1] || '0');
        } else {
          couponCode = part.replace('Coupon: ', '');
        }
      } else if (part.startsWith('Loyalty Redeemed: ₹')) {
        loyaltyDiscount = parseFloat(part.replace('Loyalty Redeemed: ₹', ''));
      } else if (part.startsWith('Gift Card Redeemed: ₹')) {
        giftCardDiscount = parseFloat(part.replace('Gift Card Redeemed: ₹', ''));
      } else if (part.startsWith('Points Earned: ')) {
        loyaltyPointsEarned = parseInt(part.replace('Points Earned: ', ''));
      } else if (part.startsWith('Points Balance: ')) {
        loyaltyPointsAvailable = parseInt(part.replace('Points Balance: ', ''));
      }
    }
  }
  
  const genericDiscount = Math.max(0, (inv.discount_amount || 0) - couponDiscount - loyaltyDiscount - giftCardDiscount);
`;

code = code.replace(
  /  const data = \{/,
  `${parseLogic}\n  const data = {`
);

code = code.replace(
  /    discount: inv\.discount_amount \|\| 0,/,
  `    discount: genericDiscount,
    couponCode,
    couponDiscount,
    loyaltyDiscount,
    giftCardDiscount,
    loyaltyPointsEarned,
    loyaltyPointsAvailable,`
);

fs.writeFileSync('app/inv/[token]/page.tsx', code);
