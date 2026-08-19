import { notFound } from "next/navigation"
import { getInvoiceByShareToken } from "@/app/actions/invoices"
import { InvoiceTemplate } from "@/components/invoice-template"

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = await params;
  const res = await getInvoiceByShareToken(resolvedParams.token)
  if (!res.success || !res.invoice) return notFound()

  const inv = res.invoice
  const bizProfile = res.businessSettings?.profile || {}
  
  // Flatten all item types into a single array
  const items = [
    ...(Array.isArray(inv.service_details) ? inv.service_details : []),
    ...(Array.isArray(inv.product_details) ? inv.product_details : []),
  ].map((item: any, idx: number) => ({
    id: idx + 1,
    description: item.name || item.description || "Item",
    quantity: item.quantity || 1,
    rate: item.price || item.rate || 0,
    amount: (item.price || item.rate || 0) * (item.quantity || 1),
  }))

  const data = {
    invoiceNumber: inv.invoice_number,
    invoiceDate: inv.invoice_date,
    dueDate: inv.due_date || new Date(new Date(inv.invoice_date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    customerName: inv.customer_name || "Walk-in Customer",
    customerAddress: "",
    customerPhone: inv.customer_phone || "",
    customerEmail: inv.customer_email || "",
    customerGSTIN: "",
    items,
    subtotal: inv.subtotal || (inv.amount - inv.gst_amount) || 0,
    discount: inv.discount_amount || 0,
    gstRate: 18,
    isInterState: false,
    placeOfSupply: "Karnataka",
    businessLogo: bizProfile.logo || "",
    businessName: bizProfile.salonName || process.env.BUSINESS_NAME || "Hanva Salon",
    businessAddress: bizProfile.address || process.env.BUSINESS_ADDRESS || "Business Address",
    businessPhone: bizProfile.phone || process.env.BUSINESS_PHONE || "",
    businessEmail: bizProfile.email || process.env.BUSINESS_EMAIL || "",
    businessGSTIN: bizProfile.gstNumber || process.env.BUSINESS_GSTIN || "",
    businessPAN: process.env.BUSINESS_PAN || "",
    sacCode: "999599",
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 print:py-0 print:bg-white">
      <div className="max-w-4xl mx-auto px-4 print:px-0 print:max-w-none">
        <InvoiceTemplate data={data} className="bg-white shadow-xl mx-auto print:shadow-none" />
      </div>
    </div>
  )
}
