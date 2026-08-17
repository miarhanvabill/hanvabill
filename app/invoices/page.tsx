"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { InvoiceTemplate } from "@/components/invoice-template"
import { formatCurrency } from "@/lib/currency"
import { Search, Plus, Eye, Download, Send } from "lucide-react"

interface Invoice {
  id: number
  invoiceNumber: string
  customerName: string
  amount: number
  status: "draft" | "sent" | "paid" | "overdue"
  date: string
  dueDate: string
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data for invoices
    const mockInvoices: Invoice[] = [
      {
        id: 1,
        invoiceNumber: "INV-2025-001",
        customerName: "Priya Sharma",
        amount: 2500,
        status: "paid",
        date: "2025-01-15",
        dueDate: "2025-02-14",
      },
      {
        id: 2,
        invoiceNumber: "INV-2025-002",
        customerName: "Rahul Kumar",
        amount: 1800,
        status: "sent",
        date: "2025-01-20",
        dueDate: "2025-02-19",
      },
      {
        id: 3,
        invoiceNumber: "INV-2025-003",
        customerName: "Anita Patel",
        amount: 3200,
        status: "overdue",
        date: "2024-12-15",
        dueDate: "2025-01-14",
      },
      {
        id: 4,
        invoiceNumber: "INV-2025-004",
        customerName: "Vikram Singh",
        amount: 1500,
        status: "draft",
        date: "2025-01-25",
        dueDate: "2025-02-24",
      },
    ]

    setInvoices(mockInvoices)
    setLoading(false)
  }, [])

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
      invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
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
      {
        id: 1,
        description: "Hair Cut & Styling",
        quantity: 1,
        rate: 800,
        amount: 800,
      },
      {
        id: 2,
        description: "Facial Treatment",
        quantity: 1,
        rate: 1200,
        amount: 1200,
      },
      {
        id: 3,
        description: "Manicure & Pedicure",
        quantity: 1,
        rate: 500,
        amount: 500,
      },
    ],
    subtotal: 2500,
    discount: 0,
    gstRate: 18,
    isInterState: false,
    placeOfSupply: "Karnataka",
    businessName: "Glamour Beauty Salon",
    businessAddress: "456, Brigade Road\nBangalore, Karnataka - 560025",
    businessPhone: "+91 80 1234 5678",
    businessEmail: "info@glamoursalon.com",
    businessGSTIN: "29XYZTE5678G1H9",
    businessPAN: "ABCDE1234F",
    sacCode: "999599",
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

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader title="Invoices" subtitle="Create, manage and track your salon invoices with GST compliance" />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                    <p className="text-2xl font-bold">{invoices.length}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">{invoices.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Paid Amount</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(
                        invoices.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + inv.amount, 0),
                      )}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-semibold text-sm">
                      {invoices.filter((inv) => inv.status === "paid").length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Amount</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(
                        invoices.filter((inv) => inv.status === "sent").reduce((sum, inv) => sum + inv.amount, 0),
                      )}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 font-semibold text-sm">
                      {invoices.filter((inv) => inv.status === "sent").length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Overdue Amount</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(
                        invoices.filter((inv) => inv.status === "overdue").reduce((sum, inv) => sum + inv.amount, 0),
                      )}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 font-semibold text-sm">
                      {invoices.filter((inv) => inv.status === "overdue").length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

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
                      <SelectValue />
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
                      <InvoiceTemplate data={sampleInvoiceData} />
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
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
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <span className="font-mono text-sm font-medium">{invoice.invoiceNumber}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-medium">{invoice.customerName}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm">{new Date(invoice.date).toLocaleDateString("en-IN")}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm">{new Date(invoice.dueDate).toLocaleDateString("en-IN")}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold">{formatCurrency(invoice.amount)}</span>
                        </td>
                        <td className="p-4">
                          <Badge className={`${getStatusColor(invoice.status)} capitalize`}>{invoice.status}</Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
