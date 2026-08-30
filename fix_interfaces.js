const fs = require('fs');
let code = fs.readFileSync('components/service-selection-screen.tsx', 'utf8');

// We only want to match `  name: string\n`
code = code.replace(/interface Service \{\n  id: number\n  name: string\n/g, 'interface Service {\n  id: number\n  name: string\n  image_url?: string\n');
code = code.replace(/interface Product \{\n  id: number\n  name: string\n/g, 'interface Product {\n  id: number\n  name: string\n  image_url?: string\n');
code = code.replace(/interface Pkg \{\n  id: number\n  name: string\n/g, 'interface Pkg {\n  id: number\n  name: string\n  image_url?: string\n');
code = code.replace(/interface Membership \{\n  id: number\n  name: string\n/g, 'interface Membership {\n  id: number\n  name: string\n  image_url?: string\n');

fs.writeFileSync('components/service-selection-screen.tsx', code);
