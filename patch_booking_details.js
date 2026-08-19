const fs = require('fs');
let code = fs.readFileSync('app/bookings/details/[id]/page.tsx', 'utf8');

const parseLogic = `
  // Parse notes to extract discount breakdown
  let couponCode = undefined;
  let couponDiscount = 0;
  let loyaltyDiscount = 0;
  let giftCardDiscount = 0;
  let loyaltyPointsEarned = undefined;
  let loyaltyPointsAvailable = undefined;
  
  if (booking.notes) {
    const noteParts = booking.notes.split(' | ');
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

  // Calculate generic discount if any remains unaccounted for
  const genericDiscount = Math.max(0, bookingServices.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0) - (booking.total_amount / 1.18) - couponDiscount - loyaltyDiscount - giftCardDiscount);
`;

code = code.replace(
  /export default async function BookingDetailsPage\(\{ params \}: \{ params: \{ id: string \} \}\) \{/,
  `export default async function BookingDetailsPage({ params }: { params: { id: string } }) {`
);

code = code.replace(
  /                  subtotal: bookingServices\.reduce\(\(acc, curr\) => acc \+ \(curr\.price \* curr\.quantity\), 0\),\n\s*discount: Math\.max\(0, bookingServices\.reduce\(\(acc, curr\) => acc \+ \(curr\.price \* curr\.quantity\), 0\) - \(booking\.total_amount \/ 1\.18\)\),/,
  `                  subtotal: bookingServices.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0),
                  discount: genericDiscount,
                  couponCode: couponCode,
                  couponDiscount: couponDiscount,
                  loyaltyDiscount: loyaltyDiscount,
                  giftCardDiscount: giftCardDiscount,
                  loyaltyPointsEarned: loyaltyPointsEarned,
                  loyaltyPointsAvailable: loyaltyPointsAvailable,`
);

// We need to inject parseLogic inside the rendering block right before the Dialog
code = code.replace(
  /            \{booking\.status === "completed" && \(\n\s*<Dialog>/,
  `            {booking.status === "completed" && (() => {${parseLogic} return (
                <Dialog>`
);

code = code.replace(
  /                  <\/DialogContent>\n\s*<\/Dialog>\n\s*\)}/,
  `                  </DialogContent>
                </Dialog>
              ); })()}`
);

fs.writeFileSync('app/bookings/details/[id]/page.tsx', code);
