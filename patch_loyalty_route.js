const fs = require('fs');
let code = fs.readFileSync('app/api/loyalty/customer/route.ts', 'utf8');

code = code.replace(
  'console.error("[v0] Loyalty API error:", e)',
  'console.error("[v0] Loyalty API error:", e); console.error(e.stack);'
);

fs.writeFileSync('app/api/loyalty/customer/route.ts', code);
