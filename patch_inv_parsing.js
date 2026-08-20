const fs = require('fs');
let code = fs.readFileSync('app/inv/[token]/page.tsx', 'utf8');

code = code.replace(
  /\} else if \(part\.startsWith\('Loyalty Redeemed: ₹'\)\) \{/,
  `} else if (part.startsWith('Manual Discount: -')) {
        couponDiscount += parseFloat(part.replace('Manual Discount: -', ''));
      } else if (part.startsWith('Loyalty Redeemed: ₹')) {`
);

fs.writeFileSync('app/inv/[token]/page.tsx', code);
