const fs = require('fs');
let code = fs.readFileSync('components/invoice-screen.tsx', 'utf8');

code = code.replace(
  /\`Invoice for \$\{invoice\.customer\.name\} - Total: ₹\$\{invoice\.total\}\`/,
  `\`Invoice for \${invoice.customer.name} - Total: ₹\${Number(invoice.total).toFixed(2)}\``
);

fs.writeFileSync('components/invoice-screen.tsx', code);
