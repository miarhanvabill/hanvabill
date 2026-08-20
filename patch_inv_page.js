const fs = require('fs');
let code = fs.readFileSync('app/inv/[token]/page.tsx', 'utf8');

code = "export const dynamic = 'force-dynamic';\n\n" + code;

fs.writeFileSync('app/inv/[token]/page.tsx', code);
