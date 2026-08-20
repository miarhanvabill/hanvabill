const fs = require('fs');
let code = fs.readFileSync('app/layout.tsx', 'utf8');

const regex = /<div className="flex h-screen bg-gray-50 dark:bg-gray-900">[\s\S]*?<\/div>\n\s*<\/ClientLayoutWrapper>/;
code = code.replace(regex, '<AppShell>{children}</AppShell>\n          </ClientLayoutWrapper>');

fs.writeFileSync('app/layout.tsx', code);
