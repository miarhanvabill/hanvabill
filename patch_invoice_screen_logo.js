const fs = require('fs');
let code = fs.readFileSync('components/invoice-screen.tsx', 'utf8');

code = code.replace(
  /businessName: bizProfile\.salonName \|\| "Hanva Salon",/,
  `businessLogo: bizProfile.logo || "",
                businessName: bizProfile.salonName || "Hanva Salon",`
);

fs.writeFileSync('components/invoice-screen.tsx', code);
