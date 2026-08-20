const fs = require('fs');
let code = fs.readFileSync('app/inv/[token]/page.tsx', 'utf8');

if (!code.includes('force-no-store')) {
  code = "export const fetchCache = 'force-no-store';\n" + code;
}
if (!code.includes('revalidate')) {
  code = "export const revalidate = 0;\n" + code;
}

fs.writeFileSync('app/inv/[token]/page.tsx', code);
