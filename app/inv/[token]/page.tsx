// app/inv/[token]/page.tsx
import { notFound } from "next/navigation"
import { getInvoiceByShareToken } from "@/app/actions/invoices"
import { InvoiceTemplate } from "@/components/invoice-template"

export default async function PublicInvoicePage({ params }: { params: { token: string } }) {
  const res = await getInvoiceByShareToken(params.token)
  if (!res.success || !res.invoice) return notFound()

  const inv = res.invoice
  const items = [
    // Flatten your service_details + product_details into template rows
    ...(Array.isArray(inv.service_details) ? inv.service_details : []),
    ...(Array.isArray(inv.product_details) ? inv.product_details : []),
    ...(Array.isArray(inv.package_details) ? inv.package_details : []),
    ...(Array.isArray(inv.membership_details) ? inv.membership_details : []),
  ].map((x: any, idx: number) => ({
    id: idx + 1,
    description: x.name || x.description || "Item",
    quantity: x.quantity || 1,
    rate: x.price || x.rate || 0,
    amount: (x.price || 0) * (x.quantity || 1),
  }))

  const data = {
    invoiceNumber: inv.invoice_number,
    invoiceDate: inv.invoice_date,
    dueDate: inv.due_date,
    customerName: inv.customer_name || "Customer",
    customerAddress: "",
    customerPhone: inv.customer_phone || "",
    customerEmail: inv.customer_email || "",
    items,
    subtotal: inv.subtotal || inv.amount - inv.gst_amount || 0,
    discount: inv.discount_amount || 0,
    gstRate: 18,
    isInterState: false,
    placeOfSupply: "Karnataka",
    businessName: "Your Business Name",
    businessAddress: "Address line 1\nCity, State - Pincode",
    businessPhone: "+91 90000 00000",
    businessEmail: "support@yourbiz.com",
    businessGSTIN: "29ABCDE1234F1Z5",
    businessPAN: "ABCDE1234F",
    sacCode: "999599",
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <InvoiceTemplate data={data} className="bg-white" />
    </div>
  )
}
