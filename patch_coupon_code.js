const fs = require('fs');

function patchFile(filename, search, replacement) {
  let code = fs.readFileSync(filename, 'utf8');
  code = code.replace(search, replacement);
  fs.writeFileSync(filename, code);
}

// 1. Add couponCode to Invoice interface in checkout-screen.tsx
patchFile(
  'components/checkout-screen.tsx',
  /  couponDiscount\?: number/,
  `  couponCode?: string\n  couponDiscount?: number`
);

// 2. Map appliedCoupon.code in onComplete
patchFile(
  'components/checkout-screen.tsx',
  /        couponDiscount: appliedCoupon \? couponDiscount : 0,/,
  `        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        couponDiscount: appliedCoupon ? couponDiscount : 0,`
);

// 3. Add couponCode to Invoice interface in invoice-screen.tsx
patchFile(
  'components/invoice-screen.tsx',
  /  couponDiscount\?: number/,
  `  couponCode?: string\n  couponDiscount?: number`
);

// 4. Pass couponCode to InvoiceTemplate
patchFile(
  'components/invoice-screen.tsx',
  /                couponDiscount: invoice\.couponDiscount,/,
  `                couponCode: invoice.couponCode,
                couponDiscount: invoice.couponDiscount,`
);

// 5. Add couponCode to InvoiceData interface in invoice-template.tsx
patchFile(
  'components/invoice-template.tsx',
  /  couponDiscount\?: number/,
  `  couponCode?: string\n  couponDiscount?: number`
);

// 6. Display couponCode in InvoiceTemplate
patchFile(
  'components/invoice-template.tsx',
  /              <span>Coupon Applied<\/span>/,
  `              <span>Coupon Applied {data.couponCode ? \`(\${data.couponCode})\` : ''}</span>`
);

