const fs = require('fs');
let code = fs.readFileSync('app/actions/settings.ts', 'utf8');

code = code.replace(
  /const result = await sql\`\n([\s\S]*?)\`\n\s*const rows = result\.rows/,
  `const rows = await sql\`\n$1\``
);

fs.writeFileSync('app/actions/settings.ts', code);
