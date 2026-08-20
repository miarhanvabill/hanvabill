const fs = require('fs');
let code = fs.readFileSync('app/bookings/details/[id]/page.tsx', 'utf8');

code = code.replace(
  /\} else if \(part\.startsWith\('Loyalty Redeemed: ₹'\)\) \{/,
  `} else if (part.startsWith('Manual Discount: -')) {
        couponDiscount += parseFloat(part.replace('Manual Discount: -', ''));
      } else if (part.startsWith('Loyalty Redeemed: ₹')) {`
);

fs.writeFileSync('app/bookings/details/[id]/page.tsx', code);
