const fs = require('fs');
let code = fs.readFileSync('components/invoice-template.tsx', 'utf8');

// Update interface
code = code.replace(
  /  subtotal: number\n  discount: number/,
  `  subtotal: number
  discount: number
  couponDiscount?: number
  loyaltyDiscount?: number
  giftCardDiscount?: number`
);

// Update GST calculation logic
code = code.replace(
  /  const gstAmount = \(data\.subtotal - data\.discount\) \* \(data\.gstRate \/ 100\)\n  const totalAmount = data\.subtotal - data\.discount \+ gstAmount/,
  `  const gstAmount = (data.subtotal - data.discount) * (data.gstRate / 100)
  const totalAmount = data.subtotal - data.discount - (data.couponDiscount || 0) - (data.loyaltyDiscount || 0) - (data.giftCardDiscount || 0) + gstAmount`
);

// Add display lines for coupons, loyalty, giftcards
const totalsBlock = `          {data.discount > 0 && (
            <div className="flex justify-between text-sm text-slate-600 px-2">
              <span>Discount</span>
              <span className="font-medium text-emerald-600">-₹{data.discount.toFixed(2)}</span>
            </div>
          )}
          {(data.couponDiscount || 0) > 0 && (
            <div className="flex justify-between text-sm text-slate-600 px-2">
              <span>Coupon Applied</span>
              <span className="font-medium text-emerald-600">-₹{data.couponDiscount!.toFixed(2)}</span>
            </div>
          )}
          {(data.loyaltyDiscount || 0) > 0 && (
            <div className="flex justify-between text-sm text-slate-600 px-2">
              <span>Loyalty Redeemed</span>
              <span className="font-medium text-emerald-600">-₹{data.loyaltyDiscount!.toFixed(2)}</span>
            </div>
          )}
          {(data.giftCardDiscount || 0) > 0 && (
            <div className="flex justify-between text-sm text-slate-600 px-2">
              <span>Gift Card</span>
              <span className="font-medium text-purple-600">-₹{data.giftCardDiscount!.toFixed(2)}</span>
            </div>
          )}`;

code = code.replace(
  /          \{data\.discount > 0 && \([\s\S]*?<\/div>\n          \)\}/,
  totalsBlock
);

fs.writeFileSync('components/invoice-template.tsx', code);
