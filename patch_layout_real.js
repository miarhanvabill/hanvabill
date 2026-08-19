const fs = require('fs');
let code = fs.readFileSync('app/layout.tsx', 'utf8');

code = code.replace(
  /<div className="flex h-screen bg-gray-50 dark:bg-gray-900">/,
  `<div className="flex h-screen bg-gray-50 dark:bg-gray-900">
              <div className="print:hidden h-full">`
);

code = code.replace(
  /<\/ErrorBoundary>\n\n              <div className="flex-1 flex flex-col">/,
  `</ErrorBoundary>\n              </div>\n\n              <div className="flex-1 flex flex-col">`
);

code = code.replace(
  /<div className="flex-1 flex flex-col">\n                <ErrorBoundary/,
  `<div className="flex-1 flex flex-col">
                <div className="print:hidden w-full">
                <ErrorBoundary`
);

code = code.replace(
  /<\/ErrorBoundary>\n\n                <main className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900 print:bg-white print:p-0 print:overflow-visible">/,
  `</ErrorBoundary>\n                </div>\n\n                <main className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900 print:bg-white print:p-0 print:overflow-visible">`
);

fs.writeFileSync('app/layout.tsx', code);
