// components/invoice-template.tsx
"use client"
import { Card, CardContent } from "@/components/ui/card"

interface InvoiceItem {
  id: number
  description: string
  quantity: number
  rate: number
  amount: number
}

interface InvoiceData {
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
  gstRate: number
  isInterState: boolean
  placeOfSupply: string
  businessName: string
  businessAddress: string
  businessPhone: string
  businessEmail: string
  businessGSTIN: string
  businessPAN: string
  sacCode: string
}

interface Tenant {
  logo: string
  name: string
  address: string
  phone: string
}

interface Customer {
  name: string
  phone: string
}

interface Invoice {
  id: string
  date: string
  subtotal: number
  rounding: number
  total: number
  upi: number
}

interface Package {
  id: string
  service: string
  remaining: string
  expiry: string
  faceNeck: string
}

interface Cashback {
  available: number
  pending: number
}

interface Social {
  instagram: string
  facebook: string
}

interface Appointment {
  link: string
}

interface InvoicePreviewData {
  tenant: Tenant
  customer: Customer
  invoice: Invoice
  items: InvoiceItem[]
  packages: Package[]
  cashback: Cashback
  social: Social
  appointment: Appointment
}

export function InvoiceTemplate({
  data,
  className = "",
}: { data: InvoiceData | InvoicePreviewData; className?: string }) {
  const isInvoicePreview = (data: any): data is InvoicePreviewData =>
    "tenant" in data && "customer" in data && "invoice" in data

  const gstAmount = isInvoicePreview(data) ? 0 : (data.subtotal - data.discount) * (data.gstRate / 100)
  const totalAmount = isInvoicePreview(data) ? data.invoice.total : data.subtotal - data.discount + gstAmount

  return (
    <Card className={`p-8 ${className}`}>
      <CardContent className="space-y-8">
        {/* Header with Logo and Business Info */}
        {isInvoicePreview(data) && (
          <div className="text-center mb-6">
            <div className="mb-4">
              <img
                src={data.tenant.logo || "/placeholder.svg"}
                alt="Business Logo"
                className="mx-auto w-16 h-16 object-contain"
              />
            </div>
            <h1 className="text-xl font-bold mb-2">{data.tenant.name}</h1>
            <p className="text-xs text-gray-700 mb-1">{data.tenant.address}</p>
            <p className="text-xs font-semibold">{data.tenant.phone}</p>
          </div>
        )}

        {/* Customer and Invoice Info */}
        {isInvoicePreview(data) ? (
          <div className="flex justify-between mb-6 text-xs">
            <div>
              <p className="font-semibold">{data.customer.name}</p>
              <p>{data.invoice.id}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{data.customer.phone}</p>
              <p>{data.invoice.date}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{data.businessName}</h1>
              <p className="text-sm whitespace-pre-line text-gray-600">{data.businessAddress}</p>
              <p className="text-sm text-gray-600">Phone: {data.businessPhone}</p>
              <p className="text-sm text-gray-600">Email: {data.businessEmail}</p>
              <p className="text-sm text-gray-600">GSTIN: {data.businessGSTIN}</p>
              <p className="text-sm text-gray-600">PAN: {data.businessPAN}</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-semibold">TAX INVOICE</h2>
              <p className="text-sm">Invoice No: {data.invoiceNumber}</p>
              <p className="text-sm">Invoice Date: {new Date(data.invoiceDate).toLocaleDateString("en-IN")}</p>
              <p className="text-sm">Due Date: {new Date(data.dueDate).toLocaleDateString("en-IN")}</p>
              <p className="text-sm">Place of Supply: {data.placeOfSupply}</p>
            </div>
          </div>
        )}

        {/* Items Table */}
        <table className="w-full border-collapse border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">#</th>
              <th className="border p-2 text-left">Description</th>
              <th className="border p-2 text-right">Qty</th>
              <th className="border p-2 text-right">Rate</th>
              <th className="border p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id}>
                <td className="border p-2">{item.id}</td>
                <td className="border p-2">{item.description}</td>
                <td className="border p-2 text-right">{item.quantity}</td>
                <td className="border p-2 text-right">₹{item.rate.toFixed(2)}</td>
                <td className="border p-2 text-right">₹{item.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{(isInvoicePreview(data) ? data.invoice.subtotal : data.subtotal).toFixed(2)}</span>
            </div>
            {isInvoicePreview(data) ? (
              <>
                <div className="flex justify-between py-1">
                  <span>Rounding</span>
                  <span>₹{data.invoice.rounding.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 font-semibold border-t border-gray-300 pt-2">
                  <span>Total</span>
                  <span>₹{data.invoice.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>UPI</span>
                  <span>₹{data.invoice.upi.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <>
                {data.discount > 0 && (
                  <div className="flex justify-between">
                    <span>Discount</span>
                    <span>-₹{data.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>GST ({data.gstRate}%)</span>
                  <span>₹{gstAmount.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Active Packages */}
        {isInvoicePreview(data) && (
          <div className="mb-6">
            <h3 className="font-semibold text-xs mb-2">Active Packages</h3>
            <div className="text-xs space-y-1">
              {data.packages.map((pkg) => (
                <div key={pkg.id}>
                  <div className="flex justify-between">
                    <span>{pkg.id}</span>
                    <span>{pkg.expiry}</span>
                  </div>
                  <div>{pkg.service}</div>
                  <div>{pkg.remaining}</div>
                  <div>{pkg.faceNeck}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cashback Balance */}
        {isInvoicePreview(data) && (
          <div className="mb-6 text-xs">
            <div className="flex justify-between">
              <span>Your Cashback Balance</span>
              <span>
                Available: ₹{data.cashback.available.toFixed(2)} | Pending: ₹{data.cashback.pending.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Note: Pending balances will be added based on program terms. For more details contact store manager.
            </p>
          </div>
        )}

        {/* Referral Program */}
        {isInvoicePreview(data) && (
          <div className="mb-4 text-xs">
            <p className="font-semibold">
              When you refer your friend, you get 5% and your friend gets 5% cashback for the next service.
            </p>
            <p className="text-gray-600">Disc: Discount, CB: Cashback, Cpn: Coupon, Mmbr: Membership</p>
          </div>
        )}

        {/* Review Section */}
        {isInvoicePreview(data) && (
          <div className="mb-6 text-xs text-center">
            <p className="mb-2">Hey, enjoyed our service?</p>
            <p className="mb-2">Take a minute of your time to review, it means the world to us. ⭐⭐⭐⭐⭐</p>
          </div>
        )}

        {/* Footer */}
        {isInvoicePreview(data) ? (
          <div className="text-center">
            <button className="bg-gray-800 text-white px-6 py-2 rounded text-xs mb-4">
              Book your next appointment
            </button>
            <div className="flex justify-center space-x-4">
              <a href={data.social.instagram} className="text-gray-600">
                📷
              </a>
              <a href={data.social.facebook} className="text-gray-600">
                📘
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center text-xs text-gray-500 pt-6 border-t">
            <p>SAC Code: {data.sacCode}</p>
            <p>This is a system generated invoice. No signature required.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function InvoicePreview() {
  const sampleData: InvoicePreviewData = {
    tenant: {
      logo: "/placeholder.svg?height=64&width=64",
      name: "CHEAP AND BEST GB PALYA",
      address:
        "No.10/35, Raj Arcade 7th Main Road, near Hosur Road, Mica layout, Garvebhavi Palya, Bengaluru, Karnataka, India",
      phone: "+919743434423",
    },
    customer: {
      name: "sanju",
      phone: "+91*****815",
    },
    invoice: {
      id: "#1377161 INV-015138",
      date: "14-Sep-2025 11:19 AM",
      subtotal: 220.0,
      rounding: 0.0,
      total: 220.0,
      upi: 220.0,
    },
    items: [
      {
        id: 1,
        description: "Change Of Style Hair Cut and Beard Trim",
        quantity: 1,
        rate: 220.0,
        amount: 220.0,
      },
    ],
    packages: [
      {
        id: "1. COMBO399",
        service: "Beard Trim - x1 left",
        remaining: "Men Haircut - x1 left",
        expiry: "02-Feb-2026",
        faceNeck: "Face & Neck De-Tan for Men - x1 left",
      },
    ],
    cashback: {
      available: 0.0,
      pending: 22.0,
    },
    social: {
      instagram: "https://instagram.com",
      facebook: "https://facebook.com",
    },
    appointment: {
      link: "https://booking.example.com",
    },
  }

  return <InvoiceTemplate data={sampleData} className="max-w-2xl mx-auto" />
}
