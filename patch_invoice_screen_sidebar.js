const fs = require('fs');
let code = fs.readFileSync('components/invoice-screen.tsx', 'utf8');

code = code.replace(
  /                \{invoice\.discount > 0 && \(\n                  <div className="flex justify-between text-green-600">\n                    <span>Discount:<\/span>\n                    <span>-\{formatCurrency\(invoice\.discount\)\}<\/span>\n                  <\/div>\n                \)\}/,
  `                {invoice.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Manual Discount:</span>
                    <span>-{formatCurrency(invoice.discount)}</span>
                  </div>
                )}
                {(invoice.couponDiscount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Coupon {invoice.couponCode ? \`(\${invoice.couponCode})\` : ''}:</span>
                    <span>-{formatCurrency(invoice.couponDiscount!)}</span>
                  </div>
                )}
                {(invoice.loyaltyDiscount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Loyalty Redeemed:</span>
                    <span>-{formatCurrency(invoice.loyaltyDiscount!)}</span>
                  </div>
                )}
                {(invoice.giftCardDiscount || 0) > 0 && (
                  <div className="flex justify-between text-purple-600">
                    <span>Gift Card:</span>
                    <span>-{formatCurrency(invoice.giftCardDiscount!)}</span>
                  </div>
                )}`
);

fs.writeFileSync('components/invoice-screen.tsx', code);
