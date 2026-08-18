// app/inv/[token]/page.tsx
import { notFound } from "next/navigation"
import { getInvoiceByShareToken } from "@/app/actions/invoices"
import { InvoiceTemplate } from "@/components/invoice-template"

export default async function PublicInvoicePage({ params }: { params: { token: string } }) {
  const res = await getInvoiceByShareToken(params.token)
  if (!res.success || !res.invoice) return notFound()

  const inv = res.invoice
  
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

  // Business data should come from tenant settings in production
  const data = {
    invoiceNumber: inv.invoice_number,
    invoiceDate: inv.invoice_date,
    dueDate: inv.due_date,
    customerName: inv.customer_name || "Customer",
    customerAddress: "", // Would come from customer record
    customerPhone: inv.customer_phone || "",
    customerEmail: inv.customer_email || "",
    customerGSTIN: "", // Would come from customer record
    items,
    subtotal: inv.subtotal || (inv.amount - inv.gst_amount) || 0,
    discount: inv.discount_amount || 0,
    gstRate: 18, // Should be configurable
    isInterState: false,
    placeOfSupply: "Karnataka", // Should be configurable
    businessName: process.env.BUSINESS_NAME || "Your Business",
    businessAddress: process.env.BUSINESS_ADDRESS || "Business Address",
    businessPhone: process.env.BUSINESS_PHONE || "+91 00000 00000",
    businessEmail: process.env.BUSINESS_EMAIL || "info@business.com",
    businessGSTIN: process.env.BUSINESS_GSTIN || "29ABCDE1234F1Z5",
    businessPAN: process.env.BUSINESS_PAN || "ABCDE1234F",
    sacCode: "999599",
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <InvoiceTemplate data={data} className="bg-white shadow-sm" />
      </div>
    </div>
  )
}
