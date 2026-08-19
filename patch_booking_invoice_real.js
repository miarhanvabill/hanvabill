const fs = require('fs');
let code = fs.readFileSync('app/bookings/details/[id]/page.tsx', 'utf8');

// Replace the old handleGenerateInvoice function completely
code = code.replace(
  /const handleGenerateInvoice = \(\) => \{[\s\S]*?window\.URL\.revokeObjectURL\(url\)\n  \}/,
  `const handleGenerateInvoice = () => {
    setShowInvoiceModal(true)
  }`
);

// Add state if not exists
if (!code.includes('showInvoiceModal')) {
  code = code.replace(
    /const \[showCheckout, setShowCheckout\] = useState\(false\)/,
    `const [showCheckout, setShowCheckout] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [bizSettings, setBizSettings] = useState<any>(null)`
  );
  
  code = code.replace(
    /fetchData\(\)\n  \}, \[id\]\)/,
    `fetchData()
    getBusinessSettings().then(setBizSettings).catch(console.error)
  }, [id])`
  );
}

// Add the Dialog before the final </div>
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
          {booking && customer && bizSettings && (() => {
            ${parseLogic}
            return (
            <div className="print:block w-full bg-white shadow-xl rounded-xl border border-slate-100 overflow-hidden" id="invoice-template-wrapper">
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
}
`;

// Replace the old ending with the new Dialog
code = code.replace(/    <\/div>\n  \)\n\}\n*$/, newDialog);

fs.writeFileSync('app/bookings/details/[id]/page.tsx', code);
