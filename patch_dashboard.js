const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

// Add import if needed
if (!code.includes('getBusinessSettings')) {
  code = code.replace(
    /import \{ getDashboardStats \} from "@\/app\/actions\/dashboard"/,
    `import { getDashboardStats } from "@/app/actions/dashboard"\nimport { getBusinessSettings } from "@/app/actions/settings"`
  );
}

// Make DashboardPage async and fetch settings
const oldDecl = `export default function DashboardPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to Hanva Billing</p>`;

const newDecl = `export default async function DashboardPage() {
  const settings = await getBusinessSettings();
  const salonName = settings?.profile?.salonName || "Hanva Billing";
  
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to {salonName}</p>`;

code = code.replace(oldDecl, newDecl);

fs.writeFileSync('app/page.tsx', code);
