const fs = require('fs');

function patchFile(filename) {
  let code = fs.readFileSync(filename, 'utf8');
  if (!code.includes('loyaltyPointsAvailable?: number')) {
    code = code.replace(
      /  share_token\?: string/,
      `  share_token?: string
  loyaltyPointsAvailable?: number
  loyaltyPointsEarned?: number`
    );
    fs.writeFileSync(filename, code);
  }
}

patchFile('components/invoice-screen.tsx');
patchFile('components/checkout-screen.tsx');
patchFile('app/new-sale/page.tsx');
