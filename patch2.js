const fs = require('fs');
const file = 'app/actions/checkout.ts';
let content = fs.readFileSync(file, 'utf8');

const replaceStr = `        // Create booking_services entries for services only
        for (const item of serviceItems) {
          await sql\`
            INSERT INTO booking_services (booking_id, service_id, quantity, price, tenant_id) 
            VALUES (\${bookingId}, \${item.id}, \${item.quantity}, \${item.price}, \${tenantId})
          \`
        }

        // Increment membership usage
        await sql\`
          UPDATE customer_memberships
          SET bookings_used = bookings_used + 1, updated_at = NOW()
          WHERE customer_id = \${customerId}
          AND tenant_id = \${tenantId}
          AND status = 'active'
          AND end_date > CURRENT_DATE
        \``;

content = content.replace(
  /        \/\/ Create booking_services entries for services only\s+for \(const item of serviceItems\) \{\s+await sql`\s+INSERT INTO booking_services \(booking_id, service_id, quantity, price, tenant_id\) \s+VALUES \(\$\{bookingId\}, \$\{item.id\}, \$\{item.quantity\}, \$\{item.price\}, \$\{tenantId\}\)\s+`\s+\}/,
  replaceStr
);

fs.writeFileSync(file, content);
