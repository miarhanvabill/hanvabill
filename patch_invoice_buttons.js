const fs = require('fs');
let code = fs.readFileSync('components/invoice-screen.tsx', 'utf8');

code = code.replace(
  /\{downloading \? "Generating PDF\.\.\." : "Download PDF"\}/,
  `{downloading ? "Preparing..." : "Print / Save PDF"}`
);

fs.writeFileSync('components/invoice-screen.tsx', code);
