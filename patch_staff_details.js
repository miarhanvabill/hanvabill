const fs = require('fs');

let code = fs.readFileSync('app/staff/[id]/page.tsx', 'utf8');

// Replace the props and the function signature
code = code.replace(
  'export default function StaffDetailsPage({ params }: StaffDetailsPageProps) {\n  return (\n    <Suspense',
  'export default async function StaffDetailsPage({ params }: { params: Promise<{ id: string }> }) {\n  const resolvedParams = await params;\n  return (\n    <Suspense'
);

code = code.replace(
  '<StaffDetailsContent staffId={params.id} />',
  '<StaffDetailsContent staffId={resolvedParams.id} />'
);

fs.writeFileSync('app/staff/[id]/page.tsx', code);
