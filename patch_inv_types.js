const fs = require('fs');
let code = fs.readFileSync('app/inv/[token]/page.tsx', 'utf8');

// Fix items mapping numbers
code = code.replace(
  /quantity: item\.quantity \|\| 1,\n\s*rate: item\.price \|\| item\.rate \|\| 0,\n\s*amount: \(item\.price \|\| item\.rate \|\| 0\) \* \(item\.quantity \|\| 1\),/,
  `quantity: Number(item.quantity || 1),
    rate: Number(item.price || item.rate || 0),
    amount: Number(item.price || item.rate || 0) * Number(item.quantity || 1),`
);

// Fix subtotal numbers
code = code.replace(
  /subtotal: inv\.subtotal \|\| \(inv\.amount - inv\.gst_amount\) \|\| 0,/,
  `subtotal: Number(inv.subtotal) || (Number(inv.amount) - Number(inv.gst_amount)) || 0,`
);

// Fix genericDiscount numbers
code = code.replace(
  /const genericDiscount = Math\.max\(0, \(inv\.discount_amount \|\| 0\) - couponDiscount - loyaltyDiscount - giftCardDiscount\);/,
  `const genericDiscount = Math.max(0, (Number(inv.discount_amount) || 0) - couponDiscount - loyaltyDiscount - giftCardDiscount);`
);

fs.writeFileSync('app/inv/[token]/page.tsx', code);
