const fs = require('fs');

const files = [
  'app/page.tsx',
  'app/services/page.tsx',
  'app/inventory/page.tsx',
  'app/preview/page.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');

  // Replace pastel card wrappers
  code = code.replace(/className="bg-gradient-to-br from-[a-z]+-50 to-[a-z]+-100 border-[a-z]+-200(?: hover:shadow-lg transition-all duration-200)?"/g, 'className="shadow-sm"');
  code = code.replace(/<Card className="bg-gradient-to-br from-[a-z]+-50 to-[a-z]+-100 border-[a-z]+-200(?: hover:shadow-lg transition-all duration-200)?">/g, '<Card className="shadow-sm">');

  // Replace text colors
  code = code.replace(/className="text-sm font-medium text-[a-z]+-700"/g, 'className="text-sm font-medium"');
  code = code.replace(/className="text-2xl font-bold text-[a-z]+-900"/g, 'className="text-2xl font-bold"');
  code = code.replace(/className="text-xs text-[a-z]+-600"/g, 'className="text-xs text-muted-foreground"');
  
  // Replace icon colors in the header
  code = code.replace(/className="h-4 w-4 text-[a-z]+-600"/g, 'className="h-4 w-4 text-muted-foreground"');

  // Replace progress bar gradients
  code = code.replace(/className="bg-gradient-to-r from-blue-500 to-purple-500/g, 'className="bg-slate-800');
  code = code.replace(/className="bg-gradient-to-r from-green-500 to-blue-500/g, 'className="bg-slate-800');

  fs.writeFileSync(file, code);
});
