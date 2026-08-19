const fs = require('fs');

let preview = fs.readFileSync('app/preview/page.tsx', 'utf8');
preview = preview.replace(
  /<div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">[\s\S]*?<Scissors className="w-4 h-4 text-white" \/>[\s\S]*?<\/div>/,
  '<img src="/logo-icon.png" alt="Hanva Logo" className="w-8 h-8 object-contain" />'
);
fs.writeFileSync('app/preview/page.tsx', preview);

let login = fs.readFileSync('app/login/page.tsx', 'utf8');
login = login.replace(
  /<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900\/20">[\s\S]*?<Scissors className="h-8 w-8 text-blue-600" \/>[\s\S]*?<\/div>/,
  '<img src="/logo-icon.png" alt="Hanva Logo" className="h-16 w-16 object-contain" />'
);
fs.writeFileSync('app/login/page.tsx', login);

