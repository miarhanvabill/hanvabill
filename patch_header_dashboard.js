const fs = require('fs');

let code = fs.readFileSync('components/header.tsx', 'utf8');

// Use a regular expression to completely remove the <Link href="/dashboard/tenants">...</Link>
code = code.replace(
  /<Link\s+href="\/dashboard\/tenants"\s+className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors px-3 py-1\.5 rounded-md hover:bg-gray-100 whitespace-nowrap"\s*>\s*Tenant Dashboard\s*<\/Link>/g,
  ''
);

fs.writeFileSync('components/header.tsx', code);
