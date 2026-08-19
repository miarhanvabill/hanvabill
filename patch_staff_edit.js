const fs = require('fs');

let code = fs.readFileSync('app/staff/[id]/edit/page.tsx', 'utf8');

code = code.replace(
  'import { notFound } from "next/navigation"',
  'import { notFound, useParams } from "next/navigation"'
);

code = code.replace(
  'export default function EditStaffPage({ params }: EditStaffPageProps) {',
  'export default function EditStaffPage() {\n  const params = useParams()'
);

fs.writeFileSync('app/staff/[id]/edit/page.tsx', code);
