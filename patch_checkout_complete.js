const fs = require('fs');
let code = fs.readFileSync('components/checkout-screen.tsx', 'utf8');

code = code.replace(
  /const invoice: Invoice = \{\n\s*id: data\.invoice\.id \|\| Math\.floor\(Math\.random\(\) \* 10000\),\n\s*customer,\n\s*items: cartItems,\n\s*subtotal: serverTotals\.subtotal,\n\s*discount: serverTotals\.couponDiscount,\n\s*gst: serverTotals\.gstAmount,\n\s*total: serverTotals\.total,\n\s*payment_method: paymentMethod,\n\s*notes,\n\s*created_at: new Date\(\)\.toISOString\(\),\n\s*\}/,
  `const invoice: Invoice = {
        id: data.invoice.id || Math.floor(Math.random() * 10000),
        customer,
        items: cartItems,
        subtotal: serverTotals.subtotal,
        discount: manualDiscount,
        couponDiscount: appliedCoupon ? couponDiscount : 0,
        loyaltyDiscount: serverTotals.loyaltyDiscount,
        giftCardDiscount: serverTotals.giftCardDiscount,
        gst: serverTotals.gstAmount,
        total: serverTotals.total,
        share_token: data.invoice.share_token,
        payment_method: paymentMethod,
        notes,
        created_at: new Date().toISOString(),
      }`
);

fs.writeFileSync('components/checkout-screen.tsx', code);
