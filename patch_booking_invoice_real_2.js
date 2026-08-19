const fs = require('fs');
let code = fs.readFileSync('app/bookings/details/[id]/page.tsx', 'utf8');

// The newDialog content (same as before)
const parseLogic = `
                  // Parse notes to extract discount breakdown
                  let couponCode = undefined;
                  let couponDiscount = 0;
                  let loyaltyDiscount = 0;
                  let giftCardDiscount = 0;
                  let loyaltyPointsEarned = undefined;
                  let loyaltyPointsAvailable = undefined;
                  
                  if (booking.notes) {
                    const noteParts = booking.notes.split(' | ');
                    for (const part of noteParts) {
                      if (part.startsWith('Coupon: ')) {
                        const match = part.match(/Coupon: (.*) \\(-\\d+(\\.\\d+)?\\)/);
                        if (match) {
                          couponCode = match[1];
                          couponDiscount = parseFloat(part.match(/\\(-(\\d+(\\.\\d+)?)\\)/)[1] || '0');
                        } else {
                          couponCode = part.replace('Coupon: ', '');
                        }
                      } else if (part.startsWith('Loyalty Redeemed: ₹')) {
                        loyaltyDiscount = parseFloat(part.replace('Loyalty Redeemed: ₹', ''));
                      } else if (part.startsWith('Gift Card Redeemed: ₹')) {
                        giftCardDiscount = parseFloat(part.replace('Gift Card Redeemed: ₹', ''));
                      } else if (part.startsWith('Points Earned: ')) {
                        loyaltyPointsEarned = parseInt(part.replace('Points Earned: ', ''));
                      } else if (part.startsWith('Points Balance: ')) {
                        loyaltyPointsAvailable = parseInt(part.replace('Points Balance: ', ''));
                      }
                    }
                  }

                  const genericDiscount = Math.max(0, bookingServices.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0) - (booking.total_amount / 1.18) - couponDiscount - loyaltyDiscount - giftCardDiscount);
`;

const newDialog = `      </main>
      <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-8 print:w-full print:max-w-none print:m-0 print:p-0 print:border-none print:shadow-none bg-slate-50">
          <div className="flex justify-end mb-4 print:hidden gap-2">
            <Button variant="outline" onClick={() => setShowInvoiceModal(false)}>Cancel</Button>
            <Button onClick={async () => {
              const element = document.getElementById('invoice-template-wrapper-booking');
              if (!element) return;
              const opt = {
                margin: [0.5, 0.5, 0.5, 0.5],
                filename: \`invoice-\${booking.booking_number}.pdf\`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
              };
              const html2pdf = (await import('html2pdf.js')).default;
              await html2pdf().from(element).set(opt).save();
            }} className="gap-2">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
            <Button onClick={() => window.print()} className="gap-2">
              <Print className="w-4 h-4" />
              Print
            </Button>
          </div>
          {booking && customer && bizSettings && (() => {
            ${parseLogic}
            return (
            <div className="print:block w-full bg-white shadow-xl rounded-xl border border-slate-100 overflow-hidden" id="invoice-template-wrapper-booking">
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
                    amount: bs.price * bs.quantity,
                    staffName: staff?.name
                  })),
                  subtotal: bookingServices.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0),
                  discount: genericDiscount,
                  couponCode,
                  couponDiscount,
                  loyaltyDiscount,
                  giftCardDiscount,
                  loyaltyPointsEarned,
                  loyaltyPointsAvailable,
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
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}`;

code = code.replace(/      <\/main>\n    <\/div>\n  \)\n\}\n*$/, newDialog);

// Fix the imports again to make sure Download is imported
if (!code.includes('Download,')) {
  code = code.replace(/import { Printer as Print } from "lucide-react"/, `import { Printer as Print, Download } from "lucide-react"`);
}

fs.writeFileSync('app/bookings/details/[id]/page.tsx', code);
