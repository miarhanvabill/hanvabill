const fs = require('fs');
let code = fs.readFileSync('app/bookings/details/[id]/page.tsx', 'utf8');

// 1. Fetch biz settings on load
code = code.replace(
  /        const servicesResult = await getBookingServices\(bookingId\)\n        if \(servicesResult\.success && servicesResult\.services\) \{\n          setBookingServices\(servicesResult\.services\)\n        \}/,
  `        const servicesResult = await getBookingServices(bookingId)
        if (servicesResult.success && servicesResult.services) {
          setBookingServices(servicesResult.services)
        }
        const bizRes = await getBusinessSettings()
        if (bizRes.success && bizRes.settings) {
          setBizSettings(bizRes.settings.profile || {})
        }`
);

// 2. Change handleGenerateInvoice to just open the modal!
code = code.replace(
  /  const handleGenerateInvoice = \(\) => \{\n    const invoiceData = \{\n      bookingNumber: booking\.booking_number,[\s\S]*?document\.body\.removeChild\(link\)\n  \}/,
  `  const handleGenerateInvoice = () => {
    setShowInvoiceModal(true);
  }`
);

// 3. Add the Modal UI at the end of the return
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

  // Calculate generic discount if any remains unaccounted for
  const subtotalAmt = bookingServices.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
  const genericDiscount = Math.max(0, subtotalAmt - (booking.total_amount / 1.18) - couponDiscount - loyaltyDiscount - giftCardDiscount);
`;

const modalUI = `
      {/* Invoice Modal */}
      <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible print:border-none print:shadow-none print:p-0">
          <div className="flex justify-between items-center mb-4 print:hidden">
            <h2 className="text-xl font-bold text-gray-800">Invoice #{booking?.booking_number}</h2>
            <Button onClick={() => window.print()} className="gap-2">
              <Print className="w-4 h-4" />
              Print / Save PDF
            </Button>
          </div>
          {booking && (() => {${parseLogic} return (
            <div className="w-full">
              <InvoiceTemplate 
                data={{
                  invoiceNumber: booking.booking_number,
                  invoiceDate: booking.created_at,
                  dueDate: booking.created_at,
                  customerName: customer?.full_name || "Walk-in Customer",
                  customerAddress: customer?.address || "",
                  customerPhone: customer?.phone_number || "",
                  customerEmail: customer?.email || "",
                  items: bookingServices.map((item, index) => ({
                    id: index + 1,
                    description: item.service_name,
                    quantity: item.quantity,
                    rate: item.price,
                    amount: item.price * item.quantity,
                    staffName: item.staff_name || staff?.name
                  })),
                  subtotal: subtotalAmt,
                  discount: genericDiscount,
                  couponCode: couponCode,
                  couponDiscount: couponDiscount,
                  loyaltyDiscount: loyaltyDiscount,
                  giftCardDiscount: giftCardDiscount,
                  loyaltyPointsEarned: loyaltyPointsEarned,
                  loyaltyPointsAvailable: loyaltyPointsAvailable,
                  gstRate: 18,
                  isInterState: false,
                  placeOfSupply: "Karnataka",
                  businessLogo: bizSettings?.logo || "",
                  businessName: bizSettings?.salonName || "Hanva Salon",
                  businessAddress: bizSettings?.address || "Business Address",
                  businessPhone: bizSettings?.phone || "",
                  businessEmail: bizSettings?.email || "",
                  businessGSTIN: bizSettings?.gstNumber || "",
                  businessPAN: "",
                  sacCode: "999599"
                }} 
              />
            </div>
          ); })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
`;

code = code.replace(/    <\/div>\n  \)\n\}/, modalUI);

fs.writeFileSync('app/bookings/details/[id]/page.tsx', code);
