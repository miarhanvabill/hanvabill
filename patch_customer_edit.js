const fs = require('fs');

let code = fs.readFileSync('app/customers/[id]/edit/page.tsx', 'utf8');

code = code.replace(
  'export default async function EditCustomerPage({ params }: { params: { id: string } }) {',
  'export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {'
);

code = code.replace(
  'const customerId = params.id',
  'const resolvedParams = await params;\n  const customerId = resolvedParams.id'
);

fs.writeFileSync('app/customers/[id]/edit/page.tsx', code);
