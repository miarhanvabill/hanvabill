const fs = require('fs');
let code = fs.readFileSync('components/checkout-screen.tsx', 'utf8');

code = code.replace(
  /        share_token: data\.invoice\.share_token,/,
  `        share_token: data.invoice.share_token,
        loyaltyPointsAvailable: (customerLoyalty?.points || 0) - (redeemEnabled ? loyaltyRedeemPoints : 0),
        loyaltyPointsEarned: pointsEarned,`
);

fs.writeFileSync('components/checkout-screen.tsx', code);
