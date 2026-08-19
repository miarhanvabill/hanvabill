const fs = require('fs');
let code = fs.readFileSync('components/invoice-screen.tsx', 'utf8');

code = code.replace(
  /url: window\.location\.href,/,
  `url: invoice.share_token ? \`\${window.location.origin}/inv/\${invoice.share_token}\` : window.location.href,`
);

code = code.replace(
  /navigator\.clipboard\.writeText\(window\.location\.href\)/,
  `const urlToShare = invoice.share_token ? \`\${window.location.origin}/inv/\${invoice.share_token}\` : window.location.href;
      navigator.clipboard.writeText(urlToShare)`
);

fs.writeFileSync('components/invoice-screen.tsx', code);
