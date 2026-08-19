const fs = require('fs');
let code = fs.readFileSync('components/invoice-screen.tsx', 'utf8');

// 1. Add imports for getBusinessSettings and InvoiceTemplate
code = code.replace(
  /import \{ downloadInvoicePDF \} from "@\/lib\/invoice-actions"/,
  `import { downloadInvoicePDF } from "@/lib/invoice-actions"
import { getBusinessSettings } from "@/app/actions/settings"
import { InvoiceTemplate } from "@/components/invoice-template"
import { useEffect } from "react"`
);

// 2. Add business settings state and effect to InvoiceScreen
const newComponentStart = `
export function InvoiceScreen({ invoice, onStartNewSale }: InvoiceScreenProps) {
  const [downloading, setDownloading] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [bizSettings, setBizSettings] = useState<any>(null)

  useEffect(() => {
    getBusinessSettings().then(setBizSettings).catch(console.error)
  }, [])

  const bizProfile = bizSettings?.profile || {}
`;
code = code.replace(
  /export function InvoiceScreen\(\{ invoice, onStartNewSale \}: InvoiceScreenProps\) \{[\s\S]*?const \[printing, setPrinting\] = useState\(false\)/,
  newComponentStart.trim()
);

// 3. Update the main return block to render InvoiceTemplate instead of the hardcoded Card
const oldReturnStart = /<div className="lg:col-span-2">[\s\S]*?<\/Card>\s*<\/div>/;
const newReturnStart = `
        <div className="lg:col-span-2 overflow-x-auto print:col-span-3">
          <div className="min-w-[800px]">
            <InvoiceTemplate 
              data={{
                invoiceNumber: \`\${invoice.id}\`,
                invoiceDate: invoice.created_at,
                dueDate: invoice.created_at,
                customerName: invoice.customer.name || "Walk-in Customer",
                customerAddress: invoice.customer.address || "",
                customerPhone: invoice.customer.phone || "",
                customerEmail: invoice.customer.email || "",
                items: invoice.items.map((item, index) => ({
                  id: index + 1,
                  description: item.name,
                  quantity: item.quantity,
                  rate: item.price,
                  amount: item.price * item.quantity,
                })),
                subtotal: invoice.subtotal,
                discount: invoice.discount,
                gstRate: 18,
                isInterState: false,
                placeOfSupply: "Karnataka",
                businessName: bizProfile.salonName || "Hanva Salon",
                businessAddress: bizProfile.address || "Business Address",
                businessPhone: bizProfile.phone || "",
                businessEmail: bizProfile.email || "",
                businessGSTIN: bizProfile.gstNumber || "",
                businessPAN: "",
                sacCode: "999599"
              }} 
            />
          </div>
        </div>
`;
code = code.replace(oldReturnStart, newReturnStart.trim());

// We should also hide the Actions Card when printing!
code = code.replace(
  /<Card>/,
  '<Card className="print:hidden">'
);

fs.writeFileSync('components/invoice-screen.tsx', code);
