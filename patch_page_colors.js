const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

code = code.replace(
  /bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700/g,
  'bg-slate-800 hover:bg-slate-900 text-white shadow-sm'
);

code = code.replace(
  /bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700/g,
  'bg-slate-800 hover:bg-slate-900 text-white shadow-sm'
);

code = code.replace(
  /bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700/g,
  'bg-slate-800 hover:bg-slate-900 text-white shadow-sm'
);

code = code.replace(
  /bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600/g,
  'bg-slate-800 hover:bg-slate-900 text-white shadow-sm'
);

// also catch any others I might have missed (e.g. orange/red?)
fs.writeFileSync('app/page.tsx', code);
