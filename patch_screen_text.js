const fs = require('fs');
let code = fs.readFileSync('components/invoice-screen.tsx', 'utf8');

code = code.replace(/invoice\.discount\.toFixed\(2\)/g, 'Number(invoice.discount).toFixed(2)');
code = code.replace(/invoice\.gst\.toFixed\(2\)/g, 'Number(invoice.gst).toFixed(2)');
code = code.replace(/invoice\.total\.toFixed\(2\)/g, 'Number(invoice.total).toFixed(2)');
code = code.replace(/\(item\.price \* item\.quantity\)\.toFixed\(2\)/g, '(Number(item.price) * Number(item.quantity)).toFixed(2)');

fs.writeFileSync('components/invoice-screen.tsx', code);
