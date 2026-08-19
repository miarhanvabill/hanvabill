const fs = require('fs');

let code = fs.readFileSync('app/services/page.tsx', 'utf8');
code = code.replace(/<PageProgress sections=\{sections\} \/>\n\s*/g, '');
code = code.replace(/import \{ PageProgress \} from "@\/components\/page-progress"\n/g, '');

// also remove the `const sections = [...]` variable definition so we don't get unused variable warnings
code = code.replace(/const sections = \[\s*\{ id: "overview", title: "Service Overview" \},\s*\{ id: "categories", title: "Categories" \},\s*\{ id: "services-list", title: "Services List" \},\s*\{ id: "analytics", title: "Service Analytics" \},\s*\]\n\s*/g, '');

fs.writeFileSync('app/services/page.tsx', code);
