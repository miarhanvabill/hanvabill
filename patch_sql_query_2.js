const fs = require('fs');
let code = fs.readFileSync('app/actions/invoices.ts', 'utf8');

code = code.replace(
  'SELECT setting_key, setting_value, setting_type',
  '/* cache bust ${Math.random()} */ SELECT setting_key, setting_value, setting_type'
);

code = code.replace(
  'SELECT i.*, c.full_name as customer_name',
  '/* cache bust ${Math.random()} */ SELECT i.*, c.full_name as customer_name'
);

fs.writeFileSync('app/actions/invoices.ts', code);
