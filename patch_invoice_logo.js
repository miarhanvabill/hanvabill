const fs = require('fs');
let code = fs.readFileSync('components/invoice-template.tsx', 'utf8');

// 1. Update interface
code = code.replace(
  /  businessName: string/,
  `  businessLogo?: string
  businessName: string`
);

// 2. Render logo in the template Header section
code = code.replace(
  /<div className="space-y-2">\s*<h2 className="text-3xl font-bold text-slate-800 tracking-tight">\{data\.businessName\}<\/h2>/,
  `<div className="space-y-2">
          {data.businessLogo && (
            <img src={data.businessLogo} alt="Business Logo" className="h-16 w-auto object-contain mb-4" />
          )}
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">{data.businessName}</h2>`
);

fs.writeFileSync('components/invoice-template.tsx', code);
