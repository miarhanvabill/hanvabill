const fs = require('fs');
let code = fs.readFileSync('components/sidebar.tsx', 'utf8');

code = code.replace(
  /<div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">[\s\S]*?<Scissors className="w-4 h-4 text-white" \/>[\s\S]*?<\/div>/,
  '<img src="/logo-icon.png" alt="Hanva Logo" className="w-8 h-8 object-contain" />'
);

code = code.replace(
  /<p className="text-xs text-gray-600">Salon Management<\/p>/,
  '<p className="text-xs text-gray-600 truncate max-w-[150px]">Hanva Technologies Pvt. Ltd.</p>'
);

fs.writeFileSync('components/sidebar.tsx', code);
