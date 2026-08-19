const fs = require('fs');

// 1. Revert invoice-screen.tsx
let screen = fs.readFileSync('components/invoice-screen.tsx', 'utf8');
const html2pdfLogicScreen = /const element = document\.getElementById\('invoice-template-wrapper'\);[\s\S]*?await html2pdf\(\)\.from\(element\)\.set\(opt\)\.save\(\);/;

screen = screen.replace(
  html2pdfLogicScreen,
  `// Use native print dialog which has a "Save as PDF" option and supports modern CSS
      window.print();`
);
fs.writeFileSync('components/invoice-screen.tsx', screen);

// 2. Revert bookings/details/[id]/page.tsx
let details = fs.readFileSync('app/bookings/details/[id]/page.tsx', 'utf8');
const html2pdfLogicDetails = /const element = document\.getElementById\('invoice-template-wrapper-booking'\);[\s\S]*?await html2pdf\(\)\.from\(element\)\.set\(opt\)\.save\(\);/;

details = details.replace(
  html2pdfLogicDetails,
  `window.print();`
);
fs.writeFileSync('app/bookings/details/[id]/page.tsx', details);
