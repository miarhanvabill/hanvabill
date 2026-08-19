"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Download, Printer as Print, Share, Plus, User, CreditCard } from "lucide-react"
import { downloadInvoicePDF } from "@/lib/invoice-actions"
import { getBusinessSettings } from "@/app/actions/settings"
import { InvoiceTemplate } from "@/components/invoice-template"
import { useEffect } from "react"

interface Customer {
  id: number
  name: string
  email: string
  phone: string
  address: string
}

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  type: "service" | "product" | "package" | "membership"
  staff_id?: number
  staff_name?: string
  duration?: number
  validityDays?: number
}

interface Invoice {
  id: number
  customer: Customer
  items: CartItem[]
  subtotal: number
  discount: number
  gst: number
  total: number
  couponCode?: string
  couponDiscount?: number
  loyaltyDiscount?: number
  giftCardDiscount?: number
  share_token?: string
  loyaltyPointsAvailable?: number
  loyaltyPointsEarned?: number
  payment_method: string
  notes?: string
  created_at: string
}

interface InvoiceScreenProps {
  invoice: Invoice
  onStartNewSale: () => void
}

export function InvoiceScreen({ invoice, onStartNewSale }: InvoiceScreenProps) {
  const [downloading, setDownloading] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [bizSettings, setBizSettings] = useState<any>(null)

  useEffect(() => {
    getBusinessSettings().then(setBizSettings).catch(console.error)
  }, [])

  const bizProfile = bizSettings?.profile || {}

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const invoiceData = {
        invoiceNumber: invoice.id.toString(),
        invoiceDate: invoice.created_at,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        customerName: invoice.customer.name,
        customerAddress: invoice.customer.address,
        customerPhone: invoice.customer.phone,
        customerEmail: invoice.customer.email,
        items: invoice.items.map((item, index) => ({
          id: index + 1,
          description: item.name,
          quantity: item.quantity,
          rate: item.price,
          amount: item.price * item.quantity,
        })),
        subtotal: invoice.subtotal,
                discount: invoice.discount,
                couponCode: invoice.couponCode,
                couponDiscount: invoice.couponDiscount,
                loyaltyDiscount: invoice.loyaltyDiscount,
                giftCardDiscount: invoice.giftCardDiscount,
                loyaltyPointsAvailable: invoice.loyaltyPointsAvailable,
                loyaltyPointsEarned: invoice.loyaltyPointsEarned,
        placeOfSupply: "Karnataka",
      }


      // Capture the invoice template DOM element
      // Use native print dialog which has a "Save as PDF" option and supports modern CSS
      window.print();

    } catch (error) {
      console.error("Error downloading invoice:", error)
      alert("Failed to download invoice. Please try again.")
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = async () => {
    setPrinting(true)
    try {
      // Simulate print preparation
      await new Promise((resolve) => setTimeout(resolve, 1000))
      window.print()
    } catch (error) {
      console.error("Error printing invoice:", error)
    } finally {
      setPrinting(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice #${invoice.id}`,
          text: `Invoice for ${invoice.customer.name} - Total: ₹${Number(invoice.total).toFixed(2)}`,
          url: invoice.share_token ? `${window.location.origin}/inv/${invoice.share_token}` : window.location.href,
        })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      const urlToShare = invoice.share_token ? `${window.location.origin}/inv/${invoice.share_token}` : window.location.href;
      navigator.clipboard.writeText(urlToShare)
      alert("Invoice link copied to clipboard!")
    }
  }

  const generateInvoiceText = () => {
    return `
INVOICE #${invoice.id}
Date: ${new Date(invoice.created_at).toLocaleDateString()}

CUSTOMER:
${invoice.customer.name}
${invoice.customer.phone}
${invoice.customer.email}

ITEMS:
${invoice.items
  .map((item) => `${item.name} x${item.quantity} - ₹${(item.price * item.quantity).toFixed(2)}`)
  .join("\n")}

SUMMARY:
Subtotal: ₹${invoice.subtotal.toFixed(2)}
Discount: ₹${invoice.discount.toFixed(2)}
GST: ₹${invoice.gst.toFixed(2)}
Total: ₹${invoice.total.toFixed(2)}

Payment Method: ${invoice.payment_method.toUpperCase()}
${invoice.notes ? `Notes: ${invoice.notes}` : ""}

Thank you for your business!
    `.trim()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case "card":
        return <CreditCard className="w-4 h-4" />
      case "cash":
        return <span className="w-4 h-4 text-center">💵</span>
      case "upi":
        return <span className="w-4 h-4 text-center">📱</span>
      default:
        return <CreditCard className="w-4 h-4" />
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Success Header */}
      <Card className="border-green-200 bg-green-50 print:hidden">
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-green-800 mb-2">Payment Successful!</h1>
          <p className="text-green-700">Invoice #{invoice.id} has been generated successfully</p>
        </CardContent>
      </Card>

      {/* Invoice Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Content */}
        <div className="lg:col-span-2 overflow-x-auto print:col-span-3">
          <div className="w-full" id="invoice-template-wrapper">
            <InvoiceTemplate 
              data={{
                invoiceNumber: `${invoice.id}`,
                invoiceDate: invoice.created_at,
                dueDate: invoice.created_at,
                customerName: invoice.customer.name || "Walk-in Customer",
                customerAddress: invoice.customer.address || "",
                customerPhone: invoice.customer.phone || "",
                customerEmail: invoice.customer.email || "",
                items: invoice.items.map((item, index) => ({
                  id: index + 1,
                  description: item.name,
                  quantity: item.quantity,
                  rate: item.price,
                  amount: item.price * item.quantity,
                  staffName: item.staff_name,
                })),
                subtotal: invoice.subtotal,
                discount: invoice.discount,
                couponDiscount: invoice.couponDiscount,
                loyaltyDiscount: invoice.loyaltyDiscount,
                giftCardDiscount: invoice.giftCardDiscount,
                loyaltyPointsAvailable: invoice.loyaltyPointsAvailable,
                loyaltyPointsEarned: invoice.loyaltyPointsEarned,
                gstRate: 18,
                isInterState: false,
                placeOfSupply: "Karnataka",
                businessLogo: bizProfile.logo || "",
                businessName: bizProfile.salonName || "Hanva Salon",
                businessAddress: bizProfile.address || "Business Address",
                businessPhone: bizProfile.phone || "",
                businessEmail: bizProfile.email || "",
                businessGSTIN: bizProfile.gstNumber || "",
                businessPAN: "",
                sacCode: "999599"
              }} 
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Bill Summary */}
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle>Bill Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>

                {invoice.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Manual Discount:</span>
                    <span>-{formatCurrency(invoice.discount)}</span>
                  </div>
                )}
                {(invoice.couponDiscount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Coupon {invoice.couponCode ? `(${invoice.couponCode})` : ''}:</span>
                    <span>-{formatCurrency(invoice.couponDiscount!)}</span>
                  </div>
                )}
                {(invoice.loyaltyDiscount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Loyalty Redeemed:</span>
                    <span>-{formatCurrency(invoice.loyaltyDiscount!)}</span>
                  </div>
                )}
                {(invoice.giftCardDiscount || 0) > 0 && (
                  <div className="flex justify-between text-purple-600">
                    <span>Gift Card:</span>
                    <span>-{formatCurrency(invoice.giftCardDiscount!)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>GST (18%):</span>
                  <span>{formatCurrency(invoice.gst)}</span>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Paid:</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleDownload} disabled={downloading} className="w-full gap-2">
                <Download className="w-4 h-4" />
                {downloading ? "Preparing..." : "Print / Save PDF"}
              </Button>

              <Button
                onClick={handlePrint}
                disabled={printing}
                variant="outline"
                className="w-full gap-2 bg-transparent"
              >
                <Print className="w-4 h-4" />
                {printing ? "Preparing..." : "Print Invoice"}
              </Button>

              <Button onClick={handleShare} variant="outline" className="w-full gap-2 bg-transparent">
                <Share className="w-4 h-4" />
                Share Invoice
              </Button>

              <Separator />

              <Button onClick={onStartNewSale} className="w-full gap-2 bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4" />
                Start New Sale
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice ID:</span>
                <span className="font-mono">#{invoice.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Items Count:</span>
                <span>{invoice.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method:</span>
                <span className="capitalize">{invoice.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Transaction Time:</span>
                <span>{new Date(invoice.created_at).toLocaleTimeString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
