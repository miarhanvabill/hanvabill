const fs = require('fs');
let code = fs.readFileSync('app/actions/invoices.ts', 'utf8');

code = code.replace(
  /SELECT i\.\*, c\.full_name as customer_name, c\.phone_number as customer_phone, c\.email as customer_email/,
  `SELECT i.*, c.full_name as customer_name, c.phone_number as customer_phone, c.email as customer_email, b.notes as booking_notes`
);

code = code.replace(
  /FROM invoices i\n\s*LEFT JOIN customers c ON i\.customer_id = c\.id/,
  `FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN bookings b ON i.booking_id = b.id`
);

fs.writeFileSync('app/actions/invoices.ts', code);
