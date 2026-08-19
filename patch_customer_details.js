const fs = require('fs');

let code = fs.readFileSync('app/customers/[id]/page.tsx', 'utf8');

code = code.replace(
  'export default async function CustomerDetailsPage({ params }: { params: { id: string } }) {',
  'export default async function CustomerDetailsPage({ params }: { params: Promise<{ id: string }> }) {\n  const resolvedParams = await params;'
);

code = code.replace(
  '<CustomerDetailsContent id={params.id} />',
  '<CustomerDetailsContent id={resolvedParams.id} />'
);

fs.writeFileSync('app/customers/[id]/page.tsx', code);
