const fs = require('fs');

let code = fs.readFileSync('app/onboarding/page.tsx', 'utf8');
code = code.replace(
  /<CardTitle className="text-2xl">Welcome to Hanva Billing!<\/CardTitle>/,
  '<div className="flex justify-center mb-4"><img src="/logo-full.png" alt="Hanva Technologies Pvt. Ltd." className="h-12 object-contain" /></div>\n          <CardTitle className="text-2xl">Welcome to Hanva Billing!</CardTitle>'
).replace(
  /Let's set up your salon management system/g,
  "Let's set up your Hanva Billing workspace"
).replace(
  /<Label htmlFor="salonName">Salon Name \*<\/Label>/,
  '<Label htmlFor="salonName">Business Name *</Label>'
).replace(
  /placeholder="Enter your salon name"/,
  'placeholder="Enter your business name"'
).replace(
  /placeholder="Enter salon address"/,
  'placeholder="Enter business address"'
);

fs.writeFileSync('app/onboarding/page.tsx', code);
