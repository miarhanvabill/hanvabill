const fs = require('fs');
let code = fs.readFileSync('components/AppShell.tsx', 'utf8');

code = code.replace(
  /<main className="flex-1 overflow-y-auto">\n\s*<ErrorBoundary/g,
  '<main className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900 print:bg-white print:p-0 print:overflow-visible">\n          <ErrorBoundary'
);

fs.writeFileSync('components/AppShell.tsx', code);
