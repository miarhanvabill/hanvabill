const fs = require('fs');
let code = fs.readFileSync('middleware.ts', 'utf8');

code = code.replace(
  `  "/debug",
]);`,
  `  "/debug",
  "/inv/(.*)",
]);`
);

fs.writeFileSync('middleware.ts', code);
