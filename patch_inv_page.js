const fs = require('fs');
let code = fs.readFileSync('app/inv/[token]/page.tsx', 'utf8');

// Fix booking_notes to notes
code = code.replace(/inv\.booking_notes/g, 'inv.notes');

// Fix dueDate parsing safely
const oldDueDate = `dueDate: inv.due_date || new Date(new Date(inv.invoice_date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),`;
const newDueDate = `dueDate: inv.due_date || (inv.invoice_date ? new Date(new Date(inv.invoice_date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : new Date().toISOString()),`;

code = code.replace(oldDueDate, newDueDate);

fs.writeFileSync('app/inv/[token]/page.tsx', code);
