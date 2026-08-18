import { InvoicePreview } from "@/components/invoice-template"

export default function InvoicePreviewPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Invoice Template Preview</h1>
        <p className="text-gray-600">Multi-tenant invoice template matching the provided design</p>
      </div>
      <InvoicePreview />
    </div>
  )
}
