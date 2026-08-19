const fs = require('fs');
let code = fs.readFileSync('components/invoice-template.tsx', 'utf8');

// Update Interface
if (!code.includes('staffName?: string')) {
  code = code.replace(
    /  amount: number/,
    `  amount: number\n  staffName?: string`
  );
}

// Update Table Render
code = code.replace(
  /<td className="py-4 px-4 font-medium text-slate-800">\{item\.description\}<\/td>/,
  `<td className="py-4 px-4 font-medium text-slate-800">
                  {item.description}
                  {item.staffName && <span className="block text-xs text-slate-500 font-normal mt-0.5">Staff: {item.staffName}</span>}
                </td>`
);

fs.writeFileSync('components/invoice-template.tsx', code);
