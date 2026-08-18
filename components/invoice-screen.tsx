"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Download, Printer as Print, Share, Plus, User, CreditCard } from "lucide-react"
import { downloadInvoicePDF } from "@/lib/invoice-actions"

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
        placeOfSupply: "Karnataka",
      }

      await downloadInvoicePDF(invoiceData)
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
          text: `Invoice for ${invoice.customer.name} - Total: ₹${invoice.total}`,
          url: window.location.href,
        })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href)
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
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-green-800 mb-2">Payment Successful!</h1>
          <p className="text-green-700">Invoice #{invoice.id} has been generated successfully</p>
        </CardContent>
      </Card>

      {/* Invoice Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Content */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Invoice #{invoice.id}</CardTitle>
                  <p className="text-gray-600">
                    Generated on{" "}
                    {new Date(invoice.created_at).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <Badge className="bg-green-600">Paid</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Customer Information */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer Information
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium">{invoice.customer.name}</p>
                  <p className="text-sm text-gray-600">{invoice.customer.phone}</p>
                  {invoice.customer.email && <p className="text-sm text-gray-600">{invoice.customer.email}</p>}
                  {invoice.customer.address && <p className="text-sm text-gray-600">{invoice.customer.address}</p>}
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold mb-3">Items & Services</h3>
                <div className="space-y-3">
                  {invoice.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {item.type}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatCurrency(item.price)} × {item.quantity}
                          {item.staff_name && <span className="ml-2">• Staff: {item.staff_name}</span>}
                          {item.duration && <span className="ml-2">• {item.duration} min</span>}
                        </div>
                      </div>
                      <span className="font-semibold">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Information */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Payment Information
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    {getPaymentMethodIcon(invoice.payment_method)}
                    <span className="font-medium capitalize">{invoice.payment_method} Payment</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Paid on {new Date(invoice.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div>
                  <h3 className="font-semibold mb-3">Notes</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm">{invoice.notes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Bill Summary */}
          <Card>
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
                    <span>Discount:</span>
                    <span>-{formatCurrency(invoice.discount)}</span>
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
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleDownload} disabled={downloading} className="w-full gap-2">
                <Download className="w-4 h-4" />
                {downloading ? "Generating PDF..." : "Download PDF"}
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
