import Link from "next/link"
"use client"

import { useState, useEffect, useRef } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { InvoiceTemplate } from "@/components/invoice-template"
import { formatCurrency } from "@/lib/currency"
import { Search, Plus, FileText,  Eye, Download, Send, Printer } from "lucide-react"
import { getInvoices } from "@/app/actions/invoices"

// ⬇️ import helpers
import { downloadInvoicePDF, useInvoicePrint, getInvoiceShareUrl } from "@/lib/invoice-actions"

interface Invoice {
  id: string
  invoice_number: string
  customer_name: string
  amount: number
  status: "draft" | "sent" | "paid" | "overdue"
  invoice_date: string
  due_date: string
  customer_phone?: string
  share_token?: string
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // For preview print
  const previewRef = useRef<HTMLDivElement>(null)
  const handlePreviewPrint = useInvoicePrint(previewRef)

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const result = await getInvoices()
      if (result.success) {
        setInvoices(result.invoices || [])
      } else {
        setError(result.message || "Failed to fetch invoices")
      }
    } catch (err) {
      setError("Failed to fetch invoices")
      console.error("Error fetching invoices:", err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800"
      case "sent":
        return "bg-blue-100 text-blue-800"
      case "overdue":
        return "bg-red-100 text-red-800"
      case "draft":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Sample invoice data for preview
  const sampleInvoiceData = {
    invoiceNumber: "INV-2025-001",
    invoiceDate: "2025-01-15",
    dueDate: "2025-02-14",
    customerName: "Priya Sharma",
    customerAddress: "123, MG Road\nBangalore, Karnataka - 560001",
    customerPhone: "+91 98765 43210",
    customerEmail: "priya.sharma@email.com",
    customerGSTIN: "29ABCDE1234F1Z5",
    items: [
      { id: 1, description: "Hair Cut & Styling", quantity: 1, rate: 800, amount: 800 },
      { id: 2, description: "Facial Treatment", quantity: 1, rate: 1200, amount: 1200 },
      { id: 3, description: "Manicure & Pedicure", quantity: 1, rate: 500, amount: 500 },
    ],
    subtotal: 2500,
    discount: 0,
    gstRate: 18,
    isInterState: false,
    placeOfSupply: "Karnataka",
    businessName: process.env.NEXT_PUBLIC_BUSINESS_NAME || "Your Business",
    businessAddress: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || "Business Address",
    businessPhone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || "+91 00000 00000",
    businessEmail: process.env.NEXT_PUBLIC_BUSINESS_EMAIL || "info@business.com",
    businessGSTIN: process.env.NEXT_PUBLIC_BUSINESS_GSTIN || "29ABCDE1234F1Z5",
    businessPAN: process.env.NEXT_PUBLIC_BUSINESS_PAN || "ABCDE1234F",
    sacCode: "999599",
  }

  const handlePreviewDownload = async () => {
    try {
      await downloadInvoicePDF(sampleInvoiceData)
    } catch (error) {
      console.error("Error downloading preview:", error)
      alert("Failed to download preview. Please try again.")
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading invoices...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error: {error}</p>
          <Button onClick={fetchInvoices} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-6">
      <PageHeader 
        title="Invoices" 
        subtitle="Create, manage and track your salon invoices with GST compliance" 
        action={
          <Link href="/invoices/preview">
            <Button variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />
              Template Preview
            </Button>
          </Link>
        }
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          {/* ... unchanged stats cards ... */}

          {/* Controls */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search invoices..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Dialog open={showPreview} onOpenChange={setShowPreview}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2 bg-transparent">
                        <Eye className="w-4 h-4" />
                        Preview Template
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>Invoice Preview</DialogTitle>
                      </DialogHeader>

                      {/* Hidden printable container */}
                      <div className="hidden">
                        <div ref={previewRef} id="preview-invoice">
                          <InvoiceTemplate data={sampleInvoiceData} />
                        </div>
                      </div>

                      {/* Visible invoice */}
                      <InvoiceTemplate data={sampleInvoiceData} />

                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={handlePreviewDownload}>
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </Button>
                        <Button variant="outline" onClick={handlePreviewPrint}>
                          <Printer className="w-4 h-4 mr-2" />
                          Print Invoice
                        </Button>
                        <Button>
                          <Send className="w-4 h-4 mr-2" />
                          Send Invoice
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    New Invoice
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoices List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium">Invoice No.</th>
                      <th className="text-left p-4 font-medium">Customer</th>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Due Date</th>
                      <th className="text-left p-4 font-medium">Amount</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500">
                          No invoices found
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="p-4 font-mono text-sm font-medium">{invoice.invoice_number}</td>
                          <td className="p-4 font-medium">{invoice.customer_name}</td>
                          <td className="p-4 text-sm">{new Date(invoice.invoice_date).toLocaleDateString("en-IN")}</td>
                          <td className="p-4 text-sm">{new Date(invoice.due_date).toLocaleDateString("en-IN")}</td>
                          <td className="p-4 font-semibold">{formatCurrency(invoice.amount)}</td>
                          <td className="p-4">
                            <Badge className={`${getStatusColor(invoice.status || "draft")} capitalize`}>
                              {invoice.status || "draft"}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  const invoiceData = {
                                    invoiceNumber: invoice.invoice_number,
                                    invoiceDate: invoice.invoice_date,
                                    dueDate: invoice.due_date,
                                    customerName: invoice.customer_name,
                                    customerPhone: invoice.customer_phone,
                                    items: [
                                      {
                                        id: 1,
                                        description: "Service",
                                        quantity: 1,
                                        rate: invoice.amount,
                                        amount: invoice.amount,
                                      },
                                    ],
                                    subtotal: invoice.amount,
                                    discount: 0,
                                    placeOfSupply: "Karnataka",
                                    businessName: process.env.NEXT_PUBLIC_BUSINESS_NAME || "Your Business",
                                    businessAddress: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || "Business Address",
                                    businessPhone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || "+91 00000 00000",
                                    businessEmail: process.env.NEXT_PUBLIC_BUSINESS_EMAIL || "info@business.com",
                                    businessGSTIN: process.env.NEXT_PUBLIC_BUSINESS_GSTIN || "29ABCDE1234F1Z5",
                                    businessPAN: process.env.NEXT_PUBLIC_BUSINESS_PAN || "ABCDE1234F",
                                    sacCode: "999599",
                                  }
                                  try {
                                    await downloadInvoicePDF(invoiceData)
                                  } catch (error) {
                                    console.error("Error downloading invoice:", error)
                                    alert("Failed to download invoice. Please try again.")
                                  }
                                }}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              {invoice.share_token && (
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={getInvoiceShareUrl(invoice.share_token)} target="_blank" rel="noreferrer">
                                    <Send className="w-4 h-4" />
                                  </a>
                                </Button>
                              )}
                            </div>

                            {/* Hidden invoice template for each row (for PDF) */}
                            <div className="hidden">
                              <div id={`invoice-${invoice.id}`}>
                                <InvoiceTemplate data={sampleInvoiceData} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
