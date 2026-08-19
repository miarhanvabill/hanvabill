const fs = require('fs');
let code = fs.readFileSync('app/inv/[token]/page.tsx', 'utf8');

code = code.replace(
  /businessName: bizProfile\.salonName \|\| process\.env\.BUSINESS_NAME \|\| "Hanva Salon",/,
  `businessLogo: bizProfile.logo || "",
    businessName: bizProfile.salonName || process.env.BUSINESS_NAME || "Hanva Salon",`
);

fs.writeFileSync('app/inv/[token]/page.tsx', code);
