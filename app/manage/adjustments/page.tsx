"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
import { Plus, Search, TrendingUp, TrendingDown, AlertCircle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { getAdjustments, createAdjustment, getProducts } from "@/app/actions/adjustments"

interface Adjustment {
  id: number
  product_id: number
  product_name: string
  adjustment_type: "increase" | "decrease"
  quantity: number
  reason: string
  notes: string
  created_by: string
  created_at: string
}

interface Product {
  id: number
  name: string
  stock_quantity: number
}

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    product_id: "",
    adjustment_type: "increase" as "increase" | "decrease",
    quantity: "",
    reason: "",
    notes: "",
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [adjustmentsData, productsData] = await Promise.all([getAdjustments(), getProducts()])
      setAdjustments(adjustmentsData)
      setProducts(productsData)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load adjustments",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createAdjustment({
        product_id: Number.parseInt(formData.product_id),
        adjustment_type: formData.adjustment_type,
        quantity: Number.parseInt(formData.quantity),
        reason: formData.reason,
        notes: formData.notes,
      })
      toast({
        title: "Success",
        description: "Inventory adjustment created successfully",
      })
      setIsDialogOpen(false)
      resetForm()
      loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create adjustment",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      product_id: "",
      adjustment_type: "increase",
      quantity: "",
      reason: "",
      notes: "",
    })
  }

  const filteredAdjustments = adjustments.filter((adjustment) => {
    const matchesSearch =
      adjustment.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adjustment.reason.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "all" || adjustment.adjustment_type === typeFilter
    return matchesSearch && matchesType
  })

  const totalAdjustments = adjustments.length
  const increases = adjustments.filter((a) => a.adjustment_type === "increase").length
  const decreases = adjustments.filter((a) => a.adjustment_type === "decrease").length

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory Adjustments</h1>
          <p className="text-muted-foreground">Track and manage inventory corrections</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              New Adjustment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Inventory Adjustment</DialogTitle>
              <DialogDescription>Adjust product stock levels with proper documentation</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="product">Product</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name} (Current: {product.stock_quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Adjustment Type</Label>
                  <Select
                    value={formData.adjustment_type}
                    onValueChange={(value: "increase" | "decrease") =>
                      setFormData({ ...formData, adjustment_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase">Increase Stock</SelectItem>
                      <SelectItem value="decrease">Decrease Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Select value={formData.reason} onValueChange={(value) => setFormData({ ...formData, reason: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damaged">Damaged Goods</SelectItem>
                    <SelectItem value="expired">Expired Products</SelectItem>
                    <SelectItem value="theft">Theft/Loss</SelectItem>
                    <SelectItem value="found">Found Stock</SelectItem>
                    <SelectItem value="correction">Stock Count Correction</SelectItem>
                    <SelectItem value="return">Customer Return</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional details about this adjustment..."
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Adjustment</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Adjustments</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAdjustments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Increases</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{increases}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Decreases</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{decreases}</div>
          </CardContent>
        </Card>
      </div>

      {/* Adjustments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Adjustments</CardTitle>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search adjustments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="increase">Increases</SelectItem>
                <SelectItem value="decrease">Decreases</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdjustments.map((adjustment) => (
                <TableRow key={adjustment.id}>
                  <TableCell className="font-medium">{adjustment.product_name}</TableCell>
                  <TableCell>
                    <Badge variant={adjustment.adjustment_type === "increase" ? "default" : "destructive"}>
                      <div className="flex items-center gap-1">
                        {adjustment.adjustment_type === "increase" ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {adjustment.adjustment_type}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={adjustment.adjustment_type === "increase" ? "text-green-600" : "text-red-600"}>
                      {adjustment.adjustment_type === "increase" ? "+" : "-"}
                      {adjustment.quantity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium capitalize">{adjustment.reason}</div>
                      {adjustment.notes && <div className="text-sm text-muted-foreground">{adjustment.notes}</div>}
                    </div>
                  </TableCell>
                  <TableCell>{adjustment.created_by}</TableCell>
                  <TableCell>{new Date(adjustment.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
