const fs = require('fs');
let code = fs.readFileSync('app/actions/checkout.ts', 'utf8');

// Generate share token using crypto
if (!code.includes('crypto.randomBytes')) {
  code = `import crypto from 'crypto';\n` + code;
}

const oldInsert = `        INSERT INTO invoices (
          invoice_number, customer_id, booking_id, amount, subtotal, discount_amount, gst_amount,
          payment_method, service_details, product_details, invoice_date, due_date,
          notes, tenant_id, created_at, updated_at
        ) VALUES (
          \${invoiceNumber},
          \${customerId},
          \${bookingId},
          \${total},
          \${subtotal},
          \${couponDiscount},
          \${gstAmount},
          \${input.payment_method},
          \${JSON.stringify([...serviceItems, ...packageItems, ...membershipItems])},
          \${JSON.stringify(productItems)},
          \${invoiceDate},
          \${dueDate},
          \${input.notes || null},
          \${tenantId},
          NOW(),
          NOW()
        )
        RETURNING *`;

const newInsert = `
        INSERT INTO invoices (
          invoice_number, customer_id, booking_id, amount, subtotal, discount_amount, gst_amount,
          payment_method, service_details, product_details, invoice_date, due_date,
          notes, tenant_id, share_token, created_at, updated_at
        ) VALUES (
          \${invoiceNumber},
          \${customerId},
          \${bookingId},
          \${total},
          \${subtotal},
          \${couponDiscount},
          \${gstAmount},
          \${input.payment_method},
          \${JSON.stringify([...serviceItems, ...packageItems, ...membershipItems])},
          \${JSON.stringify(productItems)},
          \${invoiceDate},
          \${dueDate},
          \${input.notes || null},
          \${tenantId},
          \${crypto.randomBytes(16).toString("hex")},
          NOW(),
          NOW()
        )
        RETURNING *`;

code = code.replace(oldInsert, newInsert);
fs.writeFileSync('app/actions/checkout.ts', code);
