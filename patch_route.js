const fs = require('fs');
let code = fs.readFileSync('app/api/export/bookings/route.ts', 'utf8');

code = code.replace(
  /      \},(?=\s*\n  \} catch \(error\) \{)/,
  `      },
    })`
);

fs.writeFileSync('app/api/export/bookings/route.ts', code);
