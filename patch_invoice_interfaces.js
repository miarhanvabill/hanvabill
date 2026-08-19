const fs = require('fs');

function patchFile(filename) {
  let code = fs.readFileSync(filename, 'utf8');
  code = code.replace(
    /  total: number\n  payment_method: string/,
    `  total: number
  couponDiscount?: number
  loyaltyDiscount?: number
  giftCardDiscount?: number
  share_token?: string
  payment_method: string`
  );
  fs.writeFileSync(filename, code);
}

patchFile('components/invoice-screen.tsx');
patchFile('components/checkout-screen.tsx');
