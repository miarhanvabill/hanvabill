const fs = require('fs');
let code = fs.readFileSync('app/actions/invoices.ts', 'utf8');

code = code.replace(
  '      SELECT setting_key, setting_value, setting_type\\n        FROM store_settings\\n        WHERE tenant_id = ${tenantId}',
  '      /* cache bust ${Math.random()} */\\n      SELECT setting_key, setting_value, setting_type\\n        FROM store_settings\\n        WHERE tenant_id = ${tenantId}'
);

fs.writeFileSync('app/actions/invoices.ts', code);
