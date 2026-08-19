const fs = require('fs');
let code = fs.readFileSync('middleware.ts', 'utf8');

code = code.replace(
  /\/debug",\n\]\)/,
  `/debug",\n  "/inv/(.*)",\n])`
);

fs.writeFileSync('middleware.ts', code);
