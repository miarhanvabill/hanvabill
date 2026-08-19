const fs = require('fs');
let code = fs.readFileSync('app/inv/[token]/page.tsx', 'utf8');

// Add import
if (!code.includes('ReviewWidget')) {
  code = code.replace(
    /import \{ InvoiceTemplate \} from "@\/components\/invoice-template"/,
    `import { InvoiceTemplate } from "@/components/invoice-template"\nimport { ReviewWidget } from "@/components/review-widget"`
  );
}

// Add widget
if (!code.includes('<ReviewWidget')) {
  code = code.replace(
    /<InvoiceTemplate data=\{data\} className="bg-white shadow-xl mx-auto print:shadow-none" \/>/,
    `<InvoiceTemplate data={data} className="bg-white shadow-xl mx-auto print:shadow-none" />\n        <ReviewWidget tenantId={inv.tenant_id} bookingId={inv.booking_id} />`
  );
}

fs.writeFileSync('app/inv/[token]/page.tsx', code);
