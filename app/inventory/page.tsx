"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  TrendingUp,
  ShoppingCart,
  MoreVertical,
  PackagePlus,
  RefreshCw,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface InventoryItem {
  id: number
  item_name: string
  category: string
  brand?: string
  sku?: string
  quantity: number
  unit_price: number
  supplier?: string
  description?: string
  min_stock_level: number
  created_at: string
  updated_at?: string
}

const categories = [
  { id: "hair-care", name: "Hair Care Products", icon: Package, color: "bg-blue-500" },
  { id: "skin-care", name: "Skin Care Products", icon: Package, color: "bg-pink-500" },
  { id: "tools", name: "Tools & Equipment", icon: Package, color: "bg-purple-500" },
  { id: "chemicals", name: "Chemicals & Colors", icon: Package, color: "bg-orange-500" },
  { id: "accessories", name: "Accessories", icon: Package, color: "bg-green-500" },
  { id: "consumables", name: "Consumables", icon: Package, color: "bg-gray-500" },
]

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [addFormData, setAddFormData] = useState({
    item_name: "",
    category: "",
    brand: "",
    sku: "",
    quantity: "",
    unit_price: "",
    supplier: "",
    min_stock_level: "",
    description: "",
  })
  const [addLoading, setAddLoading] = useState(false)

  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    if (!showRefreshing) setLoading(true)

    try {
      const response = await fetch("/api/inventory")
      if (response.ok) {
        const result = await response.json()
        if (result.success && Array.isArray(result.data)) {
          setInventory(result.data)
        } else {
          console.warn("Invalid inventory data format:", result)
          setInventory([])
        }
      } else {
        const errorText = await response.text().catch(() => "Unknown error")
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
    } catch (error) {
      console.error("Error loading inventory:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load inventory data",
        variant: "destructive",
      })
      // Set empty array as fallback instead of keeping loading state
      setInventory([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(() => loadData(true), 30000)
    return () => clearInterval(interval)
  }, [loadData])

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!addFormData.item_name?.trim() || !addFormData.category || !addFormData.quantity || !addFormData.unit_price) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (item_name, Category, Quantity, Unit Price)",
        variant: "destructive",
      })
      return
    }

    const quantity = Number.parseInt(addFormData.quantity)
    const unitPrice = Number.parseFloat(addFormData.unit_price)
    const minStockLevel = Number.parseInt(addFormData.min_stock_level) || 0

    if (isNaN(quantity) || quantity < 0) {
      toast({
        title: "Validation Error",
        description: "Quantity must be a valid non-negative number",
        variant: "destructive",
      })
      return
    }

    if (isNaN(unitPrice) || unitPrice < 0) {
      toast({
        title: "Validation Error",
        description: "Unit price must be a valid non-negative number",
        variant: "destructive",
      })
      return
    }

    setAddLoading(true)
    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          item_name: addFormData.item_name.trim(),
          category: addFormData.category,
          brand: addFormData.brand?.trim() || null,
          sku: addFormData.sku?.trim() || null,
          quantity: quantity,
          unit_price: unitPrice,
          supplier: addFormData.supplier?.trim() || null,
          min_stock_level: minStockLevel,
          description: addFormData.description?.trim() || null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: "Inventory item created successfully!",
        })

        // Reset form
        setAddFormData({
          item_name: "",
          category: "",
          brand: "",
          sku: "",
          quantity: "",
          unit_price: "",
          supplier: "",
          min_stock_level: "",
          description: "",
        })

        setIsAddDialogOpen(false)
        loadData(true)
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to create inventory item",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating inventory item:", error)
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "An unexpected error occurred while creating the inventory item",
        variant: "destructive",
      })
    } finally {
      setAddLoading(false)
    }
  }

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    if (!addFormData.item_name?.trim() || !addFormData.category || !addFormData.quantity || !addFormData.unit_price) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Name, Category, Quantity, Unit Price)",
        variant: "destructive",
      })
      return
    }

    const quantity = Number.parseInt(addFormData.quantity)
    const unitPrice = Number.parseFloat(addFormData.unit_price)
    const minStockLevel = Number.parseInt(addFormData.min_stock_level) || 0

    if (isNaN(quantity) || quantity < 0) {
      toast({
        title: "Validation Error",
        description: "Quantity must be a valid non-negative number",
        variant: "destructive",
      })
      return
    }

    if (isNaN(unitPrice) || unitPrice < 0) {
      toast({
        title: "Validation Error",
        description: "Unit price must be a valid non-negative number",
        variant: "destructive",
      })
      return
    }

    setAddLoading(true)
    try {
      const response = await fetch(`/api/inventory/${editingItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          item_name: addFormData.item_name.trim(),
          category: addFormData.category,
          brand: addFormData.brand?.trim() || null,
          sku: addFormData.sku?.trim() || null,
          quantity: quantity,
          unit_price: unitPrice,
          supplier: addFormData.supplier?.trim() || null,
          min_stock_level: minStockLevel,
          description: addFormData.description?.trim() || null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: "Inventory item updated successfully!",
        })

        setIsEditDialogOpen(false)
        setEditingItem(null)
        resetForm()
        loadData(true)
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to update inventory item",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating inventory item:", error)
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "An unexpected error occurred while updating the inventory item",
        variant: "destructive",
      })
    } finally {
      setAddLoading(false)
    }
  }

  const handleDeleteItem = async (id: number) => {
    if (!confirm("Are you sure you want to delete this inventory item?")) return

    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: "Inventory item deleted successfully!",
        })
        loadData(true)
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to delete inventory item",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting inventory item:", error)
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "An unexpected error occurred while deleting the inventory item",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setAddFormData({
      item_name: item.name || "",
      category: item.category || "",
      brand: item.brand || "",
      sku: item.sku || "",
      quantity: item.quantity?.toString() || "0",
      unit_price: item.unit_price?.toString() || "0",
      supplier: item.supplier || "",
      min_stock_level: item.min_stock_level?.toString() || "0",
      description: item.description || "",
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setAddFormData({
      item_name: "",
      category: "",
      brand: "",
      sku: "",
      quantity: "",
      unit_price: "",
      supplier: "",
      min_stock_level: "",
      description: "",
    })
    setEditingItem(null)
  }

  const handleAddFormChange = (field: string, value: string) => {
    setAddFormData((prev) => ({
      ...prev,
      [field]: value || "",
    }))
  }

  const handleRefresh = () => {
    loadData(true)
  }

  const filteredInventory = inventory.filter((item) => {
    if (!item) return false

    const searchTermLower = (searchTerm || "").toLowerCase()
    const matchesSearch =
      (item.name || "").toLowerCase().includes(searchTermLower) ||
      (item.brand || "").toLowerCase().includes(searchTermLower) ||
      (item.sku || "").toLowerCase().includes(searchTermLower)

    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory

    let matchesStatus = true
    if (selectedStatus !== "all") {
      const quantity = Number(item.quantity) || 0
      const minStock = Number(item.min_stock_level) || 0

      if (selectedStatus === "low-stock") {
        matchesStatus = quantity <= minStock && quantity > 0
      } else if (selectedStatus === "out-of-stock") {
        matchesStatus = quantity === 0
      } else if (selectedStatus === "in-stock") {
        matchesStatus = quantity > minStock
      }
    }

    return matchesSearch && matchesCategory && matchesStatus
  })

  const totalValue = inventory.reduce((sum, item) => {
    if (!item) return sum
    const quantity = Number(item.quantity) || 0
    const price = Number(item.unit_price) || 0
    return sum + quantity * price
  }, 0)

  const lowStockItems = inventory.filter((item) => {
    if (!item) return false
    const quantity = Number(item.quantity) || 0
    const minStock = Number(item.min_stock_level) || 0
    return quantity <= minStock && quantity > 0
  }).length

  const outOfStockItems = inventory.filter((item) => {
    if (!item) return false
    return Number(item.quantity) === 0
  }).length

  const totalItems = inventory.reduce((sum, item) => {
    if (!item) return sum
    return sum + (Number(item.quantity) || 0)
  }, 0)

  const getItemStatus = (item: InventoryItem) => {
    if (!item) return "unknown"
    const quantity = Number(item.quantity) || 0
    const minStock = Number(item.min_stock_level) || 0

    if (quantity === 0) return "out-of-stock"
    if (quantity <= minStock) return "low-stock"
    return "in-stock"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in-stock":
        return "bg-green-100 text-green-800"
      case "low-stock":
        return "bg-yellow-100 text-yellow-800"
      case "out-of-stock":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="content-wrapper">
        <PageHeader title="Inventory Management" subtitle="Track and manage your salon inventory" />
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="content-wrapper">
      <PageHeader title="Inventory Management" subtitle="Track and manage your salon inventory" />

      <div className="p-6 space-y-8">
        {/* Refresh Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Real-time updates</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </Button>
        </div>

        {/* Inventory Overview */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Inventory Overview</h2>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-slate-800 hover:bg-slate-900 text-white shadow-sm">
                  <PackagePlus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Inventory Item</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddItem} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Product Name *</Label>
                      <Input
                        id="name"
                        placeholder="Enter product name"
                        value={addFormData.name}
                        onChange={(e) => handleAddFormChange("name", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={addFormData.category}
                        onValueChange={(value) => handleAddFormChange("category", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="brand">Brand</Label>
                      <Input
                        id="brand"
                        placeholder="Brand name"
                        value={addFormData.brand}
                        onChange={(e) => handleAddFormChange("brand", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="sku">SKU</Label>
                      <Input
                        id="sku"
                        placeholder="Product SKU"
                        value={addFormData.sku}
                        onChange={(e) => handleAddFormChange("sku", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quantity">Current Stock *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={addFormData.quantity}
                        onChange={(e) => handleAddFormChange("quantity", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="unit_price">Unit Price (₹) *</Label>
                      <Input
                        id="unit_price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={addFormData.unit_price}
                        onChange={(e) => handleAddFormChange("unit_price", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="supplier">Supplier</Label>
                      <Input
                        id="supplier"
                        placeholder="Supplier name"
                        value={addFormData.supplier}
                        onChange={(e) => handleAddFormChange("supplier", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="min_stock_level">Min Stock Level</Label>
                      <Input
                        id="min_stock_level"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={addFormData.min_stock_level}
                        onChange={(e) => handleAddFormChange("min_stock_level", e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Product description"
                      value={addFormData.description}
                      onChange={(e) => handleAddFormChange("description", e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddDialogOpen(false)
                        resetForm()
                      }}
                      disabled={addLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-slate-800 hover:bg-slate-900 text-white shadow-sm"
                      disabled={addLoading}
                    >
                      {addLoading ? "Adding..." : "Add Item"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-700">Total Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">{totalItems.toLocaleString()}</div>
                <p className="text-xs text-blue-600">{inventory.length} products</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-700">Inventory Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900">₹{totalValue.toLocaleString()}</div>
                <p className="text-xs text-green-600">Total cost value</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-700">Low Stock Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-900">{lowStockItems}</div>
                <p className="text-xs text-yellow-600">Items need restocking</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-700">Out of Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-900">{outOfStockItems}</div>
                <p className="text-xs text-red-600">Items out of stock</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Inventory Items */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Inventory Items</h2>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInventory.map((item) => {
              if (!item) return null

              const category = categories.find((c) => c.id === item.category)
              const status = getItemStatus(item)
              const quantity = Number(item.quantity) || 0
              const minStock = Number(item.min_stock_level) || 0
              const unitPrice = Number(item.unit_price) || 0

              return (
                <Card key={item.id} className="hover:shadow-lg transition-all duration-200 hover:scale-105">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${category?.color || "bg-gray-500"}`}>
                          <Package className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold">{item.name || "Unnamed Item"}</CardTitle>
                          <p className="text-sm text-gray-600">
                            {item.brand && `${item.brand} - `}
                            {item.sku || "No SKU"}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(item)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Item
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Badge className={getStatusColor(status)}>{status.replace("-", " ")}</Badge>
                        <span className="text-sm text-gray-600">₹{unitPrice.toFixed(2)}</span>
                      </div>

                      {item.description && <p className="text-sm text-gray-600">{item.description}</p>}

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Current Stock</span>
                          <span className="text-lg font-bold text-blue-600">{quantity}</span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Stock Level</span>
                            <span>Min: {minStock}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                quantity > minStock ? "bg-green-500" : quantity > 0 ? "bg-yellow-500" : "bg-red-500"
                              }`}
                              style={{
                                width: `${Math.min((quantity / Math.max(minStock * 2, 1)) * 100, 100)}%`,
                              }}
                            ></div>
                          </div>
                        </div>

                        <div className="space-y-1 text-xs text-gray-500">
                          {item.supplier && (
                            <div className="flex justify-between">
                              <span>Supplier:</span>
                              <span>{item.supplier}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Added:</span>
                            <span>{item.created_at ? new Date(item.created_at).toLocaleDateString() : "Unknown"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filteredInventory.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No inventory items found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedCategory !== "all" || selectedStatus !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by adding your first inventory item"}
              </p>
              {!searchTerm && selectedCategory === "all" && selectedStatus === "all" && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>
              )}
            </div>
          )}
        </section>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Inventory Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter product name"
                    value={addFormData.name}
                    onChange={(e) => handleAddFormChange("name", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={addFormData.category}
                    onValueChange={(value) => handleAddFormChange("category", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    placeholder="Brand name"
                    value={addFormData.brand}
                    onChange={(e) => handleAddFormChange("brand", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    placeholder="Product SKU"
                    value={addFormData.sku}
                    onChange={(e) => handleAddFormChange("sku", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Current Stock *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={addFormData.quantity}
                    onChange={(e) => handleAddFormChange("quantity", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="unit_price">Unit Price (₹) *</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={addFormData.unit_price}
                    onChange={(e) => handleAddFormChange("unit_price", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input
                    id="supplier"
                    placeholder="Supplier name"
                    value={addFormData.supplier}
                    onChange={(e) => handleAddFormChange("supplier", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="min_stock_level">Min Stock Level</Label>
                  <Input
                    id="min_stock_level"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={addFormData.min_stock_level}
                    onChange={(e) => handleAddFormChange("min_stock_level", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Product description"
                  value={addFormData.description}
                  onChange={(e) => handleAddFormChange("description", e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false)
                    resetForm()
                  }}
                  disabled={addLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white shadow-sm" disabled={addLoading}>
                  {addLoading ? "Updating..." : "Update Item"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
