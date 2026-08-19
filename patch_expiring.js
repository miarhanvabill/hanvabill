const fs = require('fs');
let code = fs.readFileSync('app/actions/loyalty.ts', 'utf8');

code = code.replace(
  "AND expires_at::timestamp <= NOW() + INTERVAL '${days} days' // Direct parameter usage",
  "AND expires_at::timestamp <= NOW() + (${days}::text || ' days')::interval"
);

fs.writeFileSync('app/actions/loyalty.ts', code);
