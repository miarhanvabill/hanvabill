const fs = require('fs');
let code = fs.readFileSync('components/invoice-template.tsx', 'utf8');

code = code.replace(
  /export interface InvoiceItem {\n  id: number\n  description: string\n  quantity: number\n  rate: number\n  amount: number\n}/,
  `export interface InvoiceItem {
  id: number
  description: string
  quantity: number
  rate: number
  amount: number
  staffName?: string
}`
);

// Where does it render items? Let's check table headers
code = code.replace(
  /<th className="py-4 text-left font-semibold text-slate-700">Description<\/th>/,
  `<th className="py-4 text-left font-semibold text-slate-700">Description</th>` // Wait, I'll render the staff name INSIDE the description column as a subtitle!
);

code = code.replace(
  /<td className="py-4 text-slate-800 font-medium">\{item\.description\}<\/td>/,
  `<td className="py-4">
                  <div className="text-slate-800 font-medium">{item.description}</div>
                  {item.staffName && <div className="text-xs text-slate-500 mt-1">with {item.staffName}</div>}
                </td>`
);

fs.writeFileSync('components/invoice-template.tsx', code);
