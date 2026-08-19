const fs = require('fs');
let code = fs.readFileSync('app/bookings/details/[id]/page.tsx', 'utf8');

// 1. Add imports
code = code.replace(
  /import \{ CheckoutScreen \} from "@\/components\/checkout-screen"/,
  `import { CheckoutScreen } from "@/components/checkout-screen"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { InvoiceTemplate } from "@/components/invoice-template"
import { getBusinessSettings } from "@/app/actions/settings"
import { Printer as Print } from "lucide-react"`
);

// 2. Add state for modal and settings
code = code.replace(
  /const \[showCheckout, setShowCheckout\] = useState\(false\)/,
  `const [showCheckout, setShowCheckout] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [bizSettings, setBizSettings] = useState<any>(null)`
);

// 3. Add useEffect for settings
code = code.replace(
  /fetchData\(\)\n  \}, \[id\]\)/,
  `fetchData()
    getBusinessSettings().then(setBizSettings).catch(console.error)
  }, [id])`
);

// 4. Update handleGenerateInvoice
code = code.replace(
  /const handleGenerateInvoice = \(\) => \{[\s\S]*?window\.URL\.revokeObjectURL\(url\)\n  \}/,
  `const handleGenerateInvoice = () => {
    setShowInvoiceModal(true)
  }`
);

// 5. Add the Dialog at the end of the return statement
const newDialog = `
      <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-8 print:w-full print:max-w-none print:m-0 print:p-0 print:border-none print:shadow-none bg-slate-50">
          <div className="flex justify-end mb-4 print:hidden gap-2">
            <Button variant="outline" onClick={() => setShowInvoiceModal(false)}>Cancel</Button>
            <Button onClick={() => window.print()} className="gap-2">
              <Print className="w-4 h-4" />
              Print / Save PDF
            </Button>
          </div>
          {booking && customer && bizSettings && (
            <div className="print:block w-full bg-white shadow-xl rounded-xl border border-slate-100 overflow-hidden">
              <InvoiceTemplate 
                data={{
                  invoiceNumber: booking.booking_number,
                  invoiceDate: booking.created_at,
                  dueDate: booking.created_at,
                  customerName: customer.full_name || "Walk-in Customer",
                  customerPhone: customer.phone_number || "",
                  customerEmail: customer.email || "",
                  items: bookingServices.map((bs, i) => ({
                    id: i + 1,
                    description: bs.service_name,
                    quantity: bs.quantity,
                    rate: bs.price,
                    amount: bs.price * bs.quantity
                  })),
                  subtotal: bookingServices.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0),
                  discount: bookingServices.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0) - booking.total_amount + (booking.total_amount * 0.18), // Math fallback
                  gstRate: 18,
                  isInterState: false,
                  placeOfSupply: "Karnataka",
                  businessLogo: bizSettings.profile?.logo || "",
                  businessName: bizSettings.profile?.salonName || "Hanva Salon",
                  businessAddress: bizSettings.profile?.address || "",
                  businessPhone: bizSettings.profile?.phone || "",
                  businessEmail: bizSettings.profile?.email || "",
                  businessGSTIN: bizSettings.profile?.gstNumber || "",
                  businessPAN: "",
                  sacCode: "999599"
                }}
                className="shadow-none border-none rounded-none"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
`;

code = code.replace(/    <\/div>\n  \)\n\}\n*$/, newDialog);

fs.writeFileSync('app/bookings/details/[id]/page.tsx', code);
