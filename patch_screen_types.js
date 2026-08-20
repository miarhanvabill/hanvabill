const fs = require('fs');
let code = fs.readFileSync('components/invoice-screen.tsx', 'utf8');

// Fix inline rendering of subtotal
code = code.replace(/invoice\.subtotal\.toFixed\(2\)/g, 'Number(invoice.subtotal).toFixed(2)');

// Fix InvoiceTemplate data mapping inside invoice-screen.tsx
code = code.replace(
  /quantity: item\.quantity,\n\s*rate: item\.price,\n\s*amount: item\.price \* item\.quantity,/,
  `quantity: Number(item.quantity),
                  rate: Number(item.price),
                  amount: Number(item.price) * Number(item.quantity),`
);

code = code.replace(
  /subtotal: invoice\.subtotal,\n\s*discount: invoice\.discount,\n\s*couponDiscount: invoice\.couponDiscount,\n\s*loyaltyDiscount: invoice\.loyaltyDiscount,\n\s*giftCardDiscount: invoice\.giftCardDiscount,/,
  `subtotal: Number(invoice.subtotal),
                discount: Number(invoice.discount),
                couponDiscount: Number(invoice.couponDiscount),
                loyaltyDiscount: Number(invoice.loyaltyDiscount),
                giftCardDiscount: Number(invoice.giftCardDiscount),`
);

fs.writeFileSync('components/invoice-screen.tsx', code);
