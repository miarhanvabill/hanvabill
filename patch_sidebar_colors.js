const fs = require('fs');
let code = fs.readFileSync('components/sidebar.tsx', 'utf8');

code = code.replace(
  /"bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md"/g,
  '"bg-slate-800 text-white shadow-sm"'
);

code = code.replace(
  /"bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-3 text-white"/g,
  '"bg-slate-800 rounded-lg p-3 text-white border border-slate-700 shadow-sm"'
);

fs.writeFileSync('components/sidebar.tsx', code);
