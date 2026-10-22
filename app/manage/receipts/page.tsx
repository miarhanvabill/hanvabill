"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Eye, FileText, TrendingUp, Package, CheckCircle2, XCircle, Trash2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { getReceipts, createReceipt, getVendors, getProducts, receiveReceipt, cancelReceipt } from "@/app/actions/receipts"
import { formatCurrency } from "@/lib/currency"
import { PageHeader } from "@/components/page-header"

interface Receipt {
  id: number
  receipt_number: string
  vendor_id: number
  vendor_name: string
  total_amount: number
  status: "pending" | "received" | "cancelled"
  received_date: string
  created_at: string
  items: ReceiptItem[]
}

interface ReceiptItem {
  id: number
  product_id: number
  product_name: string
  quantity: number
  unit_cost: number
  total_cost: number
}

interface Vendor {
  id: number
  name: string
}

interface Product {
  id: number
  name: string
  cost: number
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null)
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    vendor_id: "",
    items: [{ product_id: "", quantity: "", unit_cost: "" }],
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [receiptsData, vendorsData, productsData] = await Promise.all([getReceipts(), getVendors(), getProducts()])
      setReceipts(receiptsData)
      setVendors(vendorsData)
      setProducts(productsData)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load receipts",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createReceipt({
        vendor_id: Number.parseInt(formData.vendor_id),
        items: formData.items.map((item) => ({
          product_id: Number.parseInt(item.product_id),
          quantity: Number.parseInt(item.quantity),
          unit_cost: Number.parseFloat(item.unit_cost),
        })),
      })
      toast({
        title: "Success",
        description: "Receipt created successfully",
      })
      setIsDialogOpen(false)
      resetForm()
      loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create receipt",
        variant: "destructive",
      })
    }
  }

  const handleReceiveReceipt = async (receiptId: number) => {
    try {
      const res = await receiveReceipt(receiptId)
      toast({
        title: "Receipt Received",
        description: res.message || "Stock has been incremented.",
      })
      loadData()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to receive receipt",
        variant: "destructive",
      })
    }
  }

  const handleCancelReceipt = async (receiptId: number) => {
    if (confirm("Are you sure you want to cancel this receipt?")) {
      try {
        await cancelReceipt(receiptId)
        toast({
          title: "Receipt Cancelled",
          description: "Receipt status updated to cancelled.",
        })
        loadData()
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message || "Failed to cancel receipt",
          variant: "destructive",
        })
      }
    }
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: "", quantity: "", unit_cost: "" }],
    })
  }

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    })
  }

  const updateItem = (index: number, field: string, value: string) => {
    const updatedItems = [...formData.items]
    if (field === "product_id") {
      const selectedProduct = products.find((p) => p.id.toString() === value)
      updatedItems[index] = {
        ...updatedItems[index],
        product_id: value,
        unit_cost: selectedProduct?.cost ? String(selectedProduct.cost) : updatedItems[index].unit_cost,
      }
    } else {
      updatedItems[index] = { ...updatedItems[index], [field]: value }
    }
    setFormData({ ...formData, items: updatedItems })
  }

  const resetForm = () => {
    setFormData({
      vendor_id: "",
      items: [{ product_id: "", quantity: "", unit_cost: "" }],
    })
  }

  const filteredReceipts = receipts.filter((receipt) => {
    const matchesSearch =
      receipt.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || receipt.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalReceipts = receipts.length
  const pendingReceipts = receipts.filter((r) => r.status === "pending").length
  const totalValue = receipts.reduce((sum, r) => {
    const amount = Number(r.total_amount) || 0
    return sum + amount
  }, 0)

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader
          title="Inventory Receipts"
          subtitle="Track incoming inventory from vendors"
          showBackButton
          backHref="/manage"
          className="mb-0"
        />
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              New Receipt
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Create New Receipt</DialogTitle>
              <DialogDescription>Record incoming inventory from a vendor</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="vendor" className="font-medium text-sm">Vendor</Label>
                <Select
                  value={formData.vendor_id}
                  onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}
                  required
                >
                  <SelectTrigger id="vendor" className="w-full">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id.toString()}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <Label className="text-sm font-semibold">Receipt Items</Label>
                    <p className="text-xs text-muted-foreground">Select products, received quantities, and unit costs</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1.5 h-8">
                    <Plus className="h-3.5 w-3.5" />
                    Add Item
                  </Button>
                </div>

                {/* Column Headers (Desktop/Tablet) */}
                <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50 rounded-md">
                  <div className="sm:col-span-5">Product</div>
                  <div className="sm:col-span-2 text-center">Quantity</div>
                  <div className="sm:col-span-2 text-right">Unit Cost (₹)</div>
                  <div className="sm:col-span-2 text-right">Subtotal</div>
                  <div className="sm:col-span-1 text-center">Action</div>
                </div>

                {/* Items List */}
                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {formData.items.map((item, index) => {
                    const qty = Number(item.quantity) || 0
                    const cost = Number(item.unit_cost) || 0
                    const subtotal = qty * cost

                    return (
                      <div
                        key={index}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3 items-center bg-card border rounded-lg p-3 sm:px-3 sm:py-2.5 transition-colors hover:border-slate-300"
                      >
                        {/* Product Column */}
                        <div className="sm:col-span-5 min-w-0">
                          <Label className="sm:hidden text-xs text-muted-foreground mb-1 block">Product</Label>
                          <Select
                            value={item.product_id}
                            onValueChange={(value) => updateItem(index, "product_id", value)}
                          >
                            <SelectTrigger className="w-full min-w-0 truncate text-left">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60 max-w-[380px]">
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id.toString()}>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate">{product.name}</span>
                                    {product.cost > 0 && (
                                      <span className="text-xs text-muted-foreground shrink-0">
                                        ₹{product.cost}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Quantity Column */}
                        <div className="sm:col-span-2 min-w-0">
                          <Label className="sm:hidden text-xs text-muted-foreground mb-1 block">Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", e.target.value)}
                            required
                            className="w-full text-center"
                          />
                        </div>

                        {/* Unit Cost Column */}
                        <div className="sm:col-span-2 min-w-0">
                          <Label className="sm:hidden text-xs text-muted-foreground mb-1 block">Unit Cost (₹)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Cost"
                            value={item.unit_cost}
                            onChange={(e) => updateItem(index, "unit_cost", e.target.value)}
                            required
                            className="w-full text-right"
                          />
                        </div>

                        {/* Subtotal Column */}
                        <div className="sm:col-span-2 min-w-0 flex sm:justify-end items-center justify-between">
                          <span className="sm:hidden text-xs text-muted-foreground">Subtotal:</span>
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {formatCurrency(subtotal)}
                          </span>
                        </div>

                        {/* Action Column */}
                        <div className="sm:col-span-1 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeItem(index)}
                            disabled={formData.items.length === 1}
                            title="Remove Item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Total Summary Footer Bar */}
                <div className="flex items-center justify-between p-3 bg-muted/30 border rounded-lg">
                  <span className="text-sm text-muted-foreground font-medium">
                    Total: {formData.items.length} {formData.items.length === 1 ? "Item" : "Items"}
                  </span>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground mr-2 font-medium">Grand Total:</span>
                    <span className="text-base font-bold text-green-600">
                      {formatCurrency(
                        formData.items.reduce((sum, item) => {
                          const q = Number(item.quantity) || 0
                          const c = Number(item.unit_cost) || 0
                          return sum + q * c
                        }, 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Create Receipt
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReceipts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Receipts</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingReceipts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Receipts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Receipts</CardTitle>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search receipts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell className="font-medium">{receipt.receipt_number}</TableCell>
                  <TableCell>{receipt.vendor_name}</TableCell>
                  <TableCell>{formatCurrency(Number(receipt.total_amount) || 0)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        receipt.status === "received"
                          ? "default"
                          : receipt.status === "pending"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {receipt.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(receipt.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => setViewingReceipt(receipt)} title="View Details">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {receipt.status === "pending" && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 bg-green-600 hover:bg-green-700 text-white gap-1 px-2.5 text-xs font-medium"
                            onClick={() => handleReceiveReceipt(receipt.id)}
                            title="Mark Received & Add Stock"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Receive
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-red-500 hover:text-red-700 p-1"
                            onClick={() => handleCancelReceipt(receipt.id)}
                            title="Cancel Receipt"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Receipt Dialog */}
      <Dialog open={!!viewingReceipt} onOpenChange={() => setViewingReceipt(null)}>
        <DialogContent className="sm:max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
            <DialogDescription>Receipt #{viewingReceipt?.receipt_number}</DialogDescription>
          </DialogHeader>
          {viewingReceipt && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Vendor</Label>
                  <p className="font-medium">{viewingReceipt.vendor_name}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge
                    variant={
                      viewingReceipt.status === "received"
                        ? "default"
                        : viewingReceipt.status === "pending"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {viewingReceipt.status}
                  </Badge>
                </div>
              </div>
              <div>
                <Label>Items</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingReceipt.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.unit_cost)}</TableCell>
                        <TableCell>{formatCurrency(item.total_cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">Total: {formatCurrency(Number(viewingReceipt.total_amount) || 0)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
