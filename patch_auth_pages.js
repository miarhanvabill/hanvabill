const fs = require('fs');

const signInCode = fs.readFileSync('app/sign-in/[[...sign-in]]/page.tsx', 'utf8');
const newSignInCode = signInCode.replace(
  /<h1 className="text-3xl font-bold text-gray-900 dark:text-white">Hanva Billing<\/h1>/,
  '<div className="flex justify-center mb-4"><img src="/logo-full.png" alt="Hanva Technologies Pvt. Ltd." className="h-16 object-contain" /></div>'
).replace(
  /Sign in to your salon dashboard/,
  'Sign in to your Hanva Billing dashboard'
);
fs.writeFileSync('app/sign-in/[[...sign-in]]/page.tsx', newSignInCode);

const signUpCode = fs.readFileSync('app/sign-up/[[...sign-up]]/page.tsx', 'utf8');
const newSignUpCode = signUpCode.replace(
  /<h1 className="text-3xl font-bold text-gray-900 dark:text-white">Hanva Billing<\/h1>/,
  '<div className="flex justify-center mb-4"><img src="/logo-full.png" alt="Hanva Technologies Pvt. Ltd." className="h-16 object-contain" /></div>'
).replace(
  /Create an account for your salon/,
  'Create your Hanva Billing account'
);
fs.writeFileSync('app/sign-up/[[...sign-up]]/page.tsx', newSignUpCode);

