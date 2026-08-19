const fs = require('fs');
let code = fs.readFileSync('components/invoice-screen.tsx', 'utf8');

code = code.replace(
  /                  amount: item\.price \* item\.quantity,\n\s*\}/,
  `                  amount: item.price * item.quantity,
                  staffName: item.staff_name,
                }`
);

fs.writeFileSync('components/invoice-screen.tsx', code);
