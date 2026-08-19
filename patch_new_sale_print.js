const fs = require('fs');
let code = fs.readFileSync('app/new-sale/page.tsx', 'utf8');

code = code.replace(
  /<div className="min-h-screen bg-gray-50">/,
  `<div className="min-h-screen bg-gray-50 print:bg-white print:min-h-0">`
);

code = code.replace(
  /\{\/\* Header \*\/\}\n\s*<div className="bg-white shadow-sm border-b">/,
  `{/* Header */}
      <div className="bg-white shadow-sm border-b print:hidden">`
);

code = code.replace(
  /\{\/\* Progress Steps \*\/\}\n\s*<div className="bg-white border-b">/,
  `{/* Progress Steps */}
      <div className="bg-white border-b print:hidden">`
);

code = code.replace(
  /\{\/\* Customer Info Bar \*\/\}\n\s*\{selectedCustomer && currentStep !== "customer" && \(\n\s*<div className="bg-blue-50 border-b">/,
  `{/* Customer Info Bar */}
      {selectedCustomer && currentStep !== "customer" && (
        <div className="bg-blue-50 border-b print:hidden">`
);

code = code.replace(
  /\{\/\* Main Content \*\/\}\n\s*<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">/,
  `{/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 print:p-0 print:max-w-none">`
);

fs.writeFileSync('app/new-sale/page.tsx', code);
