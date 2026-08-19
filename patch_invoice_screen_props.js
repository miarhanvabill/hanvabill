const fs = require('fs');
let code = fs.readFileSync('components/invoice-screen.tsx', 'utf8');

code = code.replace(
  /subtotal: invoice\.subtotal,\n\s*discount: invoice\.discount,/,
  `subtotal: invoice.subtotal,
                discount: invoice.discount,
                couponDiscount: invoice.couponDiscount,
                loyaltyDiscount: invoice.loyaltyDiscount,
                giftCardDiscount: invoice.giftCardDiscount,`
);

code = code.replace(
  /await downloadInvoicePDF\(invoiceData\)/,
  `// Force window.print() for download as well to get the perfect Tailwind layout
      window.print()`
);

fs.writeFileSync('components/invoice-screen.tsx', code);
