const fs = require('fs');
let code = fs.readFileSync('app/inv/[token]/page.tsx', 'utf8');

code = code.replace(
  /    amount: \(item\.price \|\| item\.rate \|\| 0\) \* \(item\.quantity \|\| 1\),\n  \}\)\)/,
  `    amount: (item.price || item.rate || 0) * (item.quantity || 1),
    staffName: item.staff_name,
  }))`
);

fs.writeFileSync('app/inv/[token]/page.tsx', code);
