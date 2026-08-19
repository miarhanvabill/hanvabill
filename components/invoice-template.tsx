// components/invoice-template.tsx
"use client"
import { Card } from "@/components/ui/card"

export interface InvoiceItem {
  id: number
  description: string
  quantity: number
  rate: number
  amount: number
}

export interface InvoiceData {
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  customerName: string
  customerAddress?: string
  customerPhone?: string
  customerEmail?: string
  customerGSTIN?: string
  items: InvoiceItem[]
  subtotal: number
  discount: number
  couponCode?: string
  couponDiscount?: number
  loyaltyDiscount?: number
  giftCardDiscount?: number
  loyaltyPointsAvailable?: number
  loyaltyPointsEarned?: number
  gstRate: number
  isInterState: boolean
  placeOfSupply: string
  businessLogo?: string
  businessName: string
  businessAddress: string
  businessPhone: string
  businessEmail: string
  businessGSTIN: string
  businessPAN: string
  sacCode: string
}

export function InvoiceTemplate({ data, className = "" }: { data: InvoiceData; className?: string }) {
  const gstAmount = (data.subtotal - data.discount) * (data.gstRate / 100)
  const totalAmount = data.subtotal - data.discount - (data.couponDiscount || 0) - (data.loyaltyDiscount || 0) - (data.giftCardDiscount || 0) + gstAmount

  return (
    <Card className={`p-8 md:p-12 overflow-hidden border border-slate-100 shadow-xl bg-white ${className}`}>
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-12">
        <div className="space-y-2">
          {data.businessLogo && (
            <img src={data.businessLogo} alt="Business Logo" className="h-16 w-auto object-contain mb-4" />
          )}
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">{data.businessName}</h2>
          <div className="text-slate-500 text-sm leading-relaxed max-w-xs">
            {data.businessAddress && <p className="whitespace-pre-wrap">{data.businessAddress}</p>}
            <p className="mt-1">
              {data.businessPhone && <span>{data.businessPhone}</span>}
              {data.businessPhone && data.businessEmail && <span> • </span>}
              {data.businessEmail && <span>{data.businessEmail}</span>}
            </p>
            {data.businessGSTIN && <p className="mt-1">GSTIN: <span className="font-medium text-slate-700">{data.businessGSTIN}</span></p>}
          </div>
        </div>
        
        <div className="mt-8 md:mt-0 text-left md:text-right">
          <h1 className="text-4xl font-black tracking-widest text-slate-200 mb-4">INVOICE</h1>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between md:justify-end gap-8">
              <span className="text-slate-500">Invoice No.</span>
              <span className="font-semibold text-slate-800">{data.invoiceNumber}</span>
            </div>
            <div className="flex justify-between md:justify-end gap-8">
              <span className="text-slate-500">Issue Date</span>
              <span className="font-medium text-slate-800">{new Date(data.invoiceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            {data.dueDate && (
              <div className="flex justify-between md:justify-end gap-8">
                <span className="text-slate-500">Due Date</span>
                <span className="font-medium text-slate-800">{new Date(data.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bill To section */}
      <div className="mb-12 border-l-4 border-slate-200 pl-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Billed To</h3>
        <p className="text-lg font-bold text-slate-800">{data.customerName}</p>
        <div className="text-slate-500 text-sm mt-1 space-y-1">
          {data.customerAddress && <p className="whitespace-pre-wrap">{data.customerAddress}</p>}
          {data.customerPhone && <p>{data.customerPhone}</p>}
          {data.customerEmail && <p>{data.customerEmail}</p>}
          {data.customerGSTIN && <p>GSTIN: <span className="font-medium text-slate-700">{data.customerGSTIN}</span></p>}
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8 rounded-lg overflow-hidden border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4 text-center w-24">Qty</th>
              <th className="py-3 px-4 text-right w-32">Rate</th>
              <th className="py-3 px-4 text-right w-32">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.items.map((item, index) => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-4 text-center text-slate-400">{index + 1}</td>
                <td className="py-4 px-4 font-medium text-slate-800">{item.description}</td>
                <td className="py-4 px-4 text-center text-slate-600">{item.quantity}</td>
                <td className="py-4 px-4 text-right text-slate-600">₹{item.rate.toFixed(2)}</td>
                <td className="py-4 px-4 text-right font-medium text-slate-800">₹{item.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals section */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-12">
        <div className="w-full md:w-1/2 text-sm text-slate-500">
          <h4 className="font-semibold text-slate-700 mb-1">Notes / Terms</h4>
          <p className="leading-relaxed">All amounts are in Indian Rupees (INR). Please make the payment within the due date to avoid late fees. Thank you for your business!</p>
        </div>
        
        <div className="w-full md:w-72 space-y-3">
          <div className="flex justify-between text-sm text-slate-600 px-2">
            <span>Subtotal</span>
            <span className="font-medium">₹{data.subtotal.toFixed(2)}</span>
          </div>
          {data.discount > 0 && (
            <div className="flex justify-between text-sm text-slate-600 px-2">
              <span>Discount</span>
              <span className="font-medium text-emerald-600">-₹{data.discount.toFixed(2)}</span>
            </div>
          )}
          {(data.couponDiscount || 0) > 0 && (
            <div className="flex justify-between text-sm text-slate-600 px-2">
              <span>Coupon Applied {data.couponCode ? `(${data.couponCode})` : ''}</span>
              <span className="font-medium text-emerald-600">-₹{data.couponDiscount!.toFixed(2)}</span>
            </div>
          )}
          {(data.loyaltyDiscount || 0) > 0 && (
            <div className="flex justify-between text-sm text-slate-600 px-2">
              <span>Loyalty Redeemed</span>
              <span className="font-medium text-emerald-600">-₹{data.loyaltyDiscount!.toFixed(2)}</span>
            </div>
          )}
          {(data.giftCardDiscount || 0) > 0 && (
            <div className="flex justify-between text-sm text-slate-600 px-2">
              <span>Gift Card</span>
              <span className="font-medium text-purple-600">-₹{data.giftCardDiscount!.toFixed(2)}</span>
            </div>
          )}
          {data.gstRate > 0 && (
            <div className="flex justify-between text-sm text-slate-600 px-2">
              <span>GST ({data.gstRate}%)</span>
              <span className="font-medium">₹{gstAmount.toFixed(2)}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center bg-slate-800 text-white p-4 rounded-lg shadow-sm mt-4">
            <span className="font-bold">Total</span>
            <span className="text-xl font-black tracking-tight">₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>
  
      {/* Loyalty section at bottom */}
      {data.loyaltyPointsAvailable !== undefined && data.loyaltyPointsEarned !== undefined && (data.loyaltyPointsAvailable > 0 || data.loyaltyPointsEarned > 0) && (
        <div className="mt-8 mb-8 bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm print:break-inside-avoid">
          <div>
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              Loyalty Program
            </span>
            <p className="text-slate-500 mt-1">Points earned on this transaction: <span className="text-emerald-600 font-medium">+{data.loyaltyPointsEarned}</span></p>
          </div>
          <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-4 w-full sm:w-auto">
            <span className="block text-slate-500 text-xs uppercase tracking-wider mb-1">New Balance</span>
            <span className="font-bold text-slate-800 text-lg">{data.loyaltyPointsAvailable + data.loyaltyPointsEarned}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-8 border-t border-slate-100 text-center text-xs text-slate-400">
        <p>This is a computer-generated invoice and does not require a physical signature.</p>
        <p className="mt-1 uppercase tracking-widest text-[10px]">Powered by Hanva Billing</p>
      </div>
    </Card>
  )
}

export function InvoicePreview() {
  const sampleData: InvoiceData = {
    invoiceNumber: "INV-2026-001",
    invoiceDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    customerName: "Vinay Kumar",
    customerPhone: "+91 98765 43210",
    customerEmail: "vinay@example.com",
    items: [
      { id: 1, description: "Premium Hair Cut & Styling", quantity: 1, rate: 800, amount: 800 },
      { id: 2, description: "Advanced Facial Treatment", quantity: 1, rate: 1200, amount: 1200 },
      { id: 3, description: "Beard Grooming", quantity: 1, rate: 300, amount: 300 },
    ],
    subtotal: 2300,
    discount: 0,
    gstRate: 18,
    isInterState: false,
    placeOfSupply: "Karnataka",
    businessName: "Hanva Premium Salon",
    businessAddress: "123 Elegance Boulevard\nKoramangala, Bengaluru, Karnataka 560034",
    businessPhone: "+91 99999 88888",
    businessEmail: "hello@hanvasalon.com",
    businessGSTIN: "29ABCDE1234F1Z5",
    businessPAN: "ABCDE1234F",
    sacCode: "999599",
  }

  return <InvoiceTemplate data={sampleData} />
}
