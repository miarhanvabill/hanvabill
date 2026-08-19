const fs = require('fs');
let code = fs.readFileSync('app/layout.tsx', 'utf8');

code = code.replace(
  /<ErrorBoundary>\s*<Sidebar \/>\s*<\/ErrorBoundary>/,
  '<div className="print:hidden"><ErrorBoundary><Sidebar /></ErrorBoundary></div>'
);

code = code.replace(
  /<ErrorBoundary>\s*<Header \/>\s*<\/ErrorBoundary>/,
  '<div className="print:hidden"><ErrorBoundary><Header /></ErrorBoundary></div>'
);

code = code.replace(
  /<main className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">/,
  '<main className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900 print:bg-white print:p-0 print:overflow-visible">'
);

fs.writeFileSync('app/layout.tsx', code);
