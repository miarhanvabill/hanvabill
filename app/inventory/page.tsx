"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/currency"
import { BulkInventoryUploadModal } from "@/components/inventory/bulk-inventory-upload-modal"
import { AdjustStockModal } from "@/components/inventory/adjust-stock-modal"
import { type InventoryItem } from "@/app/actions/inventory"
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
  FileSpreadsheet,
  Download,
  LayoutGrid,
  List,
  Sparkles,
  AlertTriangle,
  Beaker,
  CheckCircle2,
  Calendar,
  Layers,
  SlidersHorizontal,
} from "lucide-react"

const SALON_CATEGORIES = [
  { id: "Hair Care", name: "Hair Care Products", color: "bg-blue-500" },
  { id: "Chemicals & Colors", name: "Chemicals & Colors", color: "bg-orange-500" },
  { id: "Skin Care", name: "Skin Care & Facials", color: "bg-pink-500" },
  { id: "Spa & Body", name: "Spa & Body Care", color: "bg-teal-500" },
  { id: "Nail & Lash", name: "Nails & Lash Care", color: "bg-purple-500" },
  { id: "Tools & Equipment", name: "Tools & Equipment", color: "bg-indigo-500" },
  { id: "Consumables", name: "Consumables & Liquids", color: "bg-amber-500" },
  { id: "Disposables", name: "Disposables (Gloves/Sheets)", color: "bg-slate-500" },
  { id: "Accessories", name: "Accessories", color: "bg-green-500" },
]

const SALON_UNITS = [
  { id: "ml", label: "ml (Milliliters)" },
  { id: "gm", label: "gm (Grams)" },
  { id: "pcs", label: "pcs (Pieces)" },
  { id: "bottles", label: "bottles" },
  { id: "tubes", label: "tubes" },
  { id: "sachets", label: "sachets" },
  { id: "boxes", label: "boxes" },
  { id: "litres", label: "litres" },
  { id: "kg", label: "kg (Kilograms)" },
]

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedUsage, setSelectedUsage] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")

  // Modals
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false)
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<InventoryItem | null>(null)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    category: "Hair Care",
    brand: "",
    sku: "",
    barcode: "",
    quantity: "0",
    unit: "pcs",
    volume_per_unit: "1",
    volume_unit: "ml",
    usage_type: "both" as "professional" | "retail" | "both",
    cost_price: "0",
    selling_price: "0",
    supplier: "",
    reorder_level: "5",
    expiry_date: "",
    batch_number: "",
    location: "",
    description: "",
    image_url: "",
  })
  const [formLoading, setFormLoading] = useState(false)

  // Load Inventory Data
  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    if (!showRefreshing) setLoading(true)

    try {
      const response = await fetch("/api/inventory", { cache: "no-store" })
      if (response.ok) {
        const result = await response.json()
        if (result.success && Array.isArray(result.data)) {
          setInventory(result.data)
        } else {
          setInventory([])
        }
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      console.error("Error loading inventory:", error)
      toast({
        title: "Notice",
        description: "Failed to load live inventory, please try refreshing.",
        variant: "destructive",
      })
      setInventory([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Auto-generate unique salon SKU code
  const handleGenerateSku = () => {
    const brandPrefix = (formData.brand || "GEN").slice(0, 3).toUpperCase()
    const catPrefix = (formData.category || "PROD").slice(0, 3).toUpperCase()
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    const generated = `${brandPrefix}-${catPrefix}-${randomNum}`
    setFormData((prev) => ({ ...prev, sku: generated }))
    toast({ title: "SKU Generated", description: `Assigned SKU: ${generated}` })
  }

  // Calculate live profit margin %
  const profitMargin = useMemo(() => {
    const cost = Number(formData.cost_price) || 0
    const sell = Number(formData.selling_price) || 0
    if (sell <= 0) return 0
    return Math.round(((sell - cost) / sell) * 100 * 10) / 10
  }, [formData.cost_price, formData.selling_price])

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      category: "Hair Care",
      brand: "",
      sku: "",
      barcode: "",
      quantity: "0",
      unit: "pcs",
      volume_per_unit: "1",
      volume_unit: "ml",
      usage_type: "both",
      cost_price: "0",
      selling_price: "0",
      supplier: "",
      reorder_level: "5",
      expiry_date: "",
      batch_number: "",
      location: "",
      description: "",
      image_url: "",
    })
    setEditingItem(null)
  }

  // Handle Add Item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name?.trim()) {
      toast({ title: "Validation Error", description: "Product name is required.", variant: "destructive" })
      return
    }

    setFormLoading(true)
    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          category: formData.category,
          brand: formData.brand.trim() || undefined,
          sku: formData.sku.trim() || undefined,
          barcode: formData.barcode.trim() || undefined,
          quantity: Number(formData.quantity) || 0,
          unit: formData.unit,
          volume_per_unit: Number(formData.volume_per_unit) || 1,
          volume_unit: formData.volume_unit,
          usage_type: formData.usage_type,
          cost_price: Number(formData.cost_price) || 0,
          selling_price: Number(formData.selling_price) || 0,
          supplier: formData.supplier.trim() || undefined,
          reorder_level: Number(formData.reorder_level) || 5,
          expiry_date: formData.expiry_date || undefined,
          batch_number: formData.batch_number.trim() || undefined,
          location: formData.location.trim() || undefined,
          description: formData.description.trim() || undefined,
          image_url: formData.image_url.trim() || undefined,
        }),
      })

      const res = await response.json()
      if (res.success) {
        toast({ title: "Product Created", description: `${formData.name} added to inventory.` })
        setIsAddDialogOpen(false)
        resetForm()
        loadData(true)
      } else {
        toast({ title: "Error", description: res.message || "Failed to create product.", variant: "destructive" })
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create product.", variant: "destructive" })
    } finally {
      setFormLoading(false)
    }
  }

  // Populate Edit Modal
  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name || item.item_name || "",
      category: item.category || "Hair Care",
      brand: item.brand || "",
      sku: item.sku || "",
      barcode: item.barcode || "",
      quantity: String(item.quantity || 0),
      unit: item.unit || "pcs",
      volume_per_unit: String(item.volume_per_unit || 1),
      volume_unit: item.volume_unit || "ml",
      usage_type: (item.usage_type as any) || "both",
      cost_price: String(item.cost_price || 0),
      selling_price: String(item.selling_price || item.unit_price || 0),
      supplier: item.supplier || "",
      reorder_level: String(item.reorder_level || item.min_stock_level || 5),
      expiry_date: item.expiry_date ? item.expiry_date.split("T")[0] : "",
      batch_number: item.batch_number || "",
      location: item.location || "",
      description: item.description || "",
      image_url: item.image_url || "",
    })
    setIsEditDialogOpen(true)
  }

  // Handle Edit Submission
  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    setFormLoading(true)
    try {
      const response = await fetch(`/api/inventory/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          category: formData.category,
          brand: formData.brand.trim() || undefined,
          sku: formData.sku.trim() || undefined,
          barcode: formData.barcode.trim() || undefined,
          quantity: Number(formData.quantity) || 0,
          unit: formData.unit,
          volume_per_unit: Number(formData.volume_per_unit) || 1,
          volume_unit: formData.volume_unit,
          usage_type: formData.usage_type,
          cost_price: Number(formData.cost_price) || 0,
          selling_price: Number(formData.selling_price) || 0,
          supplier: formData.supplier.trim() || undefined,
          reorder_level: Number(formData.reorder_level) || 5,
          expiry_date: formData.expiry_date || undefined,
          batch_number: formData.batch_number.trim() || undefined,
          location: formData.location.trim() || undefined,
          description: formData.description.trim() || undefined,
          image_url: formData.image_url.trim() || undefined,
        }),
      })

      const res = await response.json()
      if (res.success) {
        toast({ title: "Product Updated", description: `${formData.name} updated successfully.` })
        setIsEditDialogOpen(false)
        resetForm()
        loadData(true)
      } else {
        toast({ title: "Error", description: res.message || "Failed to update product.", variant: "destructive" })
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update product.", variant: "destructive" })
    } finally {
      setFormLoading(false)
    }
  }

  // Handle Delete
  const handleDeleteItem = async (id: number) => {
    if (!confirm("Are you sure you want to delete this inventory item?")) return

    try {
      const response = await fetch(`/api/inventory/${id}`, { method: "DELETE" })
      const res = await response.json()
      if (res.success) {
        toast({ title: "Item Deleted", description: "Inventory item removed." })
        loadData(true)
      } else {
        toast({ title: "Error", description: res.message || "Failed to delete item.", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete item.", variant: "destructive" })
    }
  }

  // Export Full Inventory to CSV
  const handleExportCsv = () => {
    if (inventory.length === 0) {
      toast({ title: "Empty Inventory", description: "No items to export.", variant: "destructive" })
      return
    }

    const headers = [
      "SKU",
      "Name",
      "Category",
      "Brand",
      "Quantity",
      "Unit",
      "Volume Per Unit",
      "Volume Unit",
      "Usage Type",
      "Cost Price",
      "Selling Price",
      "Reorder Level",
      "Supplier",
      "Location",
      "Expiry Date",
      "Status",
    ]

    const rows = inventory.map((i) => [
      i.sku || "",
      `"${(i.name || i.item_name || "").replace(/"/g, '""')}"`,
      `"${(i.category || "").replace(/"/g, '""')}"`,
      `"${(i.brand || "").replace(/"/g, '""')}"`,
      i.quantity || 0,
      i.unit || "pcs",
      i.volume_per_unit || 1,
      i.volume_unit || "ml",
      i.usage_type || "both",
      i.cost_price || 0,
      i.selling_price || i.unit_price || 0,
      i.reorder_level || i.min_stock_level || 5,
      `"${(i.supplier || "").replace(/"/g, '""')}"`,
      `"${(i.location || "").replace(/"/g, '""')}"`,
      i.expiry_date || "",
      i.status || "active",
    ])

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `hanva_inventory_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast({ title: "Export Ready", description: "Inventory exported to CSV successfully." })
  }

  // Filter Logic
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const search = searchTerm.toLowerCase().trim()
      const name = (item.name || item.item_name || "").toLowerCase()
      const brand = (item.brand || "").toLowerCase()
      const sku = (item.sku || "").toLowerCase()
      const barcode = (item.barcode || "").toLowerCase()
      const supplier = (item.supplier || "").toLowerCase()

      const matchesSearch =
        !search ||
        name.includes(search) ||
        brand.includes(search) ||
        sku.includes(search) ||
        barcode.includes(search) ||
        supplier.includes(search)

      const matchesCategory =
        selectedCategory === "all" ||
        item.category?.toLowerCase() === selectedCategory.toLowerCase()

      const matchesUsage =
        selectedUsage === "all" || item.usage_type === selectedUsage

      const quantity = Number(item.quantity) || 0
      const reorder = Number(item.reorder_level || item.min_stock_level) || 5
      let matchesStatus = true

      if (selectedStatus === "in-stock") matchesStatus = quantity > reorder
      else if (selectedStatus === "low-stock") matchesStatus = quantity <= reorder && quantity > 0
      else if (selectedStatus === "out-of-stock") matchesStatus = quantity === 0
      else if (selectedStatus === "expiring-soon") {
        if (!item.expiry_date) matchesStatus = false
        else {
          const exp = new Date(item.expiry_date).getTime()
          const now = Date.now()
          const diffDays = (exp - now) / (1000 * 60 * 60 * 24)
          matchesStatus = diffDays >= 0 && diffDays <= 45
        }
      }

      return matchesSearch && matchesCategory && matchesUsage && matchesStatus
    })
  }, [inventory, searchTerm, selectedCategory, selectedUsage, selectedStatus])

  // Calculated Top Metrics
  const metrics = useMemo(() => {
    const totalItems = inventory.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
    const totalValue = inventory.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.cost_price) || 0),
      0
    )
    const lowStock = inventory.filter((item) => {
      const q = Number(item.quantity) || 0
      const r = Number(item.reorder_level || item.min_stock_level) || 5
      return q <= r && q > 0
    }).length
    const outOfStock = inventory.filter((item) => Number(item.quantity) === 0).length
    const expiringSoon = inventory.filter((item) => {
      if (!item.expiry_date) return false
      const exp = new Date(item.expiry_date).getTime()
      const diffDays = (exp - Date.now()) / (1000 * 60 * 60 * 24)
      return diffDays >= 0 && diffDays <= 45
    }).length

    return { totalItems, totalValue, lowStock, outOfStock, expiringSoon }
  }, [inventory])

  if (loading) {
    return (
      <div className="content-wrapper p-6 space-y-6">
        <PageHeader title="Salon Inventory Management" subtitle="Stock control, units (ml/gm), and bulk sync" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="content-wrapper">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              Salon Inventory &amp; Stock Control
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Track in-salon professional supplies (ml, gm) and retail products with auto-deduction on checkout.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkUploadOpen(true)}
              className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Bulk Upload (CSV)
            </Button>

            <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <Button
              size="sm"
              onClick={() => {
                resetForm()
                setIsAddDialogOpen(true)
              }}
              className="gap-1.5 bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="shadow-xs border-slate-200/80">
            <CardContent className="p-4">
              <p className="text-xs uppercase font-semibold text-muted-foreground">Total SKUs</p>
              <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">{inventory.length}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{metrics.totalItems} total stock units</p>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-slate-200/80">
            <CardContent className="p-4">
              <p className="text-xs uppercase font-semibold text-muted-foreground">Stock Valuation</p>
              <p className="text-2xl font-bold mt-1 text-primary">{formatCurrency(metrics.totalValue)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">At purchase cost price</p>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-slate-200/80">
            <CardContent className="p-4">
              <p className="text-xs uppercase font-semibold text-amber-600">Low Stock Alerts</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{metrics.lowStock}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Below reorder threshold</p>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-slate-200/80">
            <CardContent className="p-4">
              <p className="text-xs uppercase font-semibold text-red-600">Out of Stock</p>
              <p className="text-2xl font-bold mt-1 text-red-600">{metrics.outOfStock}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Zero stock remaining</p>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-slate-200/80 col-span-2 sm:col-span-1">
            <CardContent className="p-4">
              <p className="text-xs uppercase font-semibold text-purple-600">Expiring Soon</p>
              <p className="text-2xl font-bold mt-1 text-purple-600">{metrics.expiringSoon}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Within next 45 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter and View Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border rounded-xl shadow-xs">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search name, SKU, brand, barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-9 text-xs w-[160px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories ({inventory.length})</SelectItem>
                {SALON_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Usage Filter */}
            <Select value={selectedUsage} onValueChange={setSelectedUsage}>
              <SelectTrigger className="h-9 text-xs w-[150px]">
                <SelectValue placeholder="Usage Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Usage Types</SelectItem>
                <SelectItem value="professional">💈 In-Salon Use Only</SelectItem>
                <SelectItem value="retail">🛍️ Retail Shelf Only</SelectItem>
                <SelectItem value="both">🔄 Both (Service &amp; Retail)</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-9 text-xs w-[140px]">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock Status</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low-stock">⚠️ Low Stock</SelectItem>
                <SelectItem value="out-of-stock">🚫 Out of Stock</SelectItem>
                <SelectItem value="expiring-soon">⏳ Expiring Soon</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 self-end lg:self-auto shrink-0 border rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800">
            <Button
              type="button"
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-7 px-2.5 text-xs gap-1"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grid
            </Button>
            <Button
              type="button"
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="h-7 px-2.5 text-xs gap-1"
            >
              <List className="w-3.5 h-3.5" />
              Table
            </Button>
          </div>
        </div>

        {/* Product Catalog: Grid View */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredInventory.map((item) => {
              const qty = Number(item.quantity) || 0
              const reorder = Number(item.reorder_level || item.min_stock_level) || 5
              const isOutOfStock = qty === 0
              const isLowStock = qty <= reorder && qty > 0

              return (
                <Card
                  key={item.id}
                  className="hover:shadow-md transition border hover:border-slate-300 dark:hover:border-slate-700 flex flex-col justify-between"
                >
                  <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge
                          variant={
                            item.usage_type === "professional"
                              ? "secondary"
                              : item.usage_type === "retail"
                                ? "outline"
                                : "default"
                          }
                          className="text-[10px] font-normal"
                        >
                          {item.usage_type === "professional"
                            ? "💈 In-Salon Use"
                            : item.usage_type === "retail"
                              ? "🛍️ Retail Sale"
                              : "🔄 Dual Use"}
                        </Badge>

                        <Badge
                          className={`text-[10px] font-normal ${
                            isOutOfStock
                              ? "bg-red-100 text-red-800 hover:bg-red-100"
                              : isLowStock
                                ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                                : "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                          }`}
                        >
                          {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
                        </Badge>
                      </div>

                      {/* Title & Brand */}
                      <h3
                        className="font-semibold text-sm text-foreground line-clamp-2 leading-tight"
                        title={item.name}
                      >
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        {item.brand && <span className="font-medium text-slate-700 dark:text-slate-300">{item.brand}</span>}
                        {item.brand && item.sku && <span>•</span>}
                        {item.sku && <span className="font-mono text-[11px]">{item.sku}</span>}
                      </div>

                      {/* Volume & Category */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                          {item.category}
                        </span>
                        {item.volume_per_unit && item.volume_per_unit > 1 && (
                          <span className="text-[11px] font-medium text-primary">
                            {item.volume_per_unit} {item.volume_unit || "ml"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stock & Pricing Footer */}
                    <div className="pt-3 border-t space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Current Stock</span>
                        <span
                          className={`font-bold text-sm ${
                            isOutOfStock ? "text-red-600" : isLowStock ? "text-amber-600" : "text-foreground"
                          }`}
                        >
                          {qty} {item.unit || "pcs"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Price (MRP / Cost)</span>
                        <div className="text-right">
                          <span className="font-semibold text-foreground">
                            {formatCurrency(item.selling_price || item.unit_price || 0)}
                          </span>
                          {item.cost_price > 0 && (
                            <span className="text-[10px] text-muted-foreground block">
                              Cost: {formatCurrency(item.cost_price)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedItemForAdjust(item)
                            setIsAdjustStockOpen(true)
                          }}
                          className="flex-1 h-7 text-xs"
                        >
                          Adjust Stock
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(item)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                          className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          /* Table View */
          <div className="border rounded-xl bg-white dark:bg-slate-900 overflow-x-auto shadow-xs">
            <Table className="text-xs">
              <TableHeader className="bg-slate-50 dark:bg-slate-800">
                <TableRow>
                  <TableHead>Product &amp; SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Usage Type</TableHead>
                  <TableHead>Stock Level</TableHead>
                  <TableHead>Net Volume</TableHead>
                  <TableHead>Cost Price</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => {
                  const qty = Number(item.quantity) || 0
                  const reorder = Number(item.reorder_level || item.min_stock_level) || 5
                  const isOutOfStock = qty === 0
                  const isLowStock = qty <= reorder && qty > 0

                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <TableCell>
                        <div className="font-semibold text-foreground">{item.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {item.brand && `${item.brand} • `}
                          {item.sku || "No SKU"}
                        </div>
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            item.usage_type === "professional"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : item.usage_type === "retail"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : ""
                          }`}
                        >
                          {item.usage_type === "professional"
                            ? "In-Salon"
                            : item.usage_type === "retail"
                              ? "Retail"
                              : "Dual"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-bold ${
                            isOutOfStock ? "text-red-600" : isLowStock ? "text-amber-600" : "text-foreground"
                          }`}
                        >
                          {qty} {item.unit || "pcs"}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">Min: {reorder}</span>
                      </TableCell>
                      <TableCell>
                        {item.volume_per_unit && item.volume_per_unit > 1
                          ? `${item.volume_per_unit} ${item.volume_unit || "ml"}`
                          : "-"}
                      </TableCell>
                      <TableCell>{formatCurrency(item.cost_price || 0)}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(item.selling_price || item.unit_price || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] font-normal ${
                            isOutOfStock
                              ? "bg-red-100 text-red-800"
                              : isLowStock
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedItemForAdjust(item)
                              setIsAdjustStockOpen(true)
                            }}
                            className="h-7 text-xs px-2"
                          >
                            Adjust
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(item)}
                            className="h-7 w-7 text-muted-foreground"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteItem(item.id)}
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {filteredInventory.length === 0 && (
          <Card className="p-12 text-center text-muted-foreground border-dashed">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">No inventory products found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchTerm || selectedCategory !== "all" || selectedStatus !== "all"
                ? "Try adjusting your search criteria or resetting the category filter."
                : "Get started by adding your first product or uploading a bulk CSV catalog."}
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="gap-1.5">
                <Plus className="w-4 h-4" />
                Add First Product
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkUploadOpen(true)}
                className="gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Bulk CSV Upload
              </Button>
            </div>
          </Card>
        )}

        {/* ================= ADD / EDIT PRODUCT DIALOG ================= */}
        <Dialog
          open={isAddDialogOpen || isEditDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsAddDialogOpen(false)
              setIsEditDialogOpen(false)
              resetForm()
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <PackagePlus className="w-5 h-5 text-primary" />
                {editingItem ? "Edit Salon Product" : "Add New Salon Product"}
              </DialogTitle>
              <DialogDescription>
                Configure product specifications, salon measurement units (ml/gm), usage type, and profit margins.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={editingItem ? handleUpdateItem : handleAddItem} className="space-y-4 py-2">
              {/* Row 1: Name & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8 space-y-1">
                  <Label htmlFor="prod_name" className="text-xs font-semibold">
                    Product Name *
                  </Label>
                  <Input
                    id="prod_name"
                    placeholder="e.g. L'Oreal Majirel Hair Color 5.1 / Serie Expert Shampoo"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="sm:col-span-4 space-y-1">
                  <Label htmlFor="prod_brand" className="text-xs font-semibold">
                    Brand / Manufacturer
                  </Label>
                  <Input
                    id="prod_brand"
                    placeholder="e.g. L'Oreal, Matrix, O3+"
                    value={formData.brand}
                    onChange={(e) => setFormData((p) => ({ ...p, brand: e.target.value }))}
                  />
                </div>
              </div>

              {/* Row 2: Category & Usage Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="prod_cat" className="text-xs font-semibold">
                    Category *
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(val) => setFormData((p) => ({ ...p, category: val }))}
                  >
                    <SelectTrigger id="prod_cat">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {SALON_CATEGORIES.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="prod_usage" className="text-xs font-semibold">
                    Usage Type *
                  </Label>
                  <Select
                    value={formData.usage_type}
                    onValueChange={(val: any) => setFormData((p) => ({ ...p, usage_type: val }))}
                  >
                    <SelectTrigger id="prod_usage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">🔄 Dual (In-Salon Use &amp; Retail Sale)</SelectItem>
                      <SelectItem value="professional">💈 In-Salon Professional Use Only</SelectItem>
                      <SelectItem value="retail">🛍️ Retail Shelf Sale Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: SKU & Barcode with Auto-Generate */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-6 space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="prod_sku" className="text-xs font-semibold">
                      Product SKU Code
                    </Label>
                    <button
                      type="button"
                      onClick={handleGenerateSku}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                    >
                      <Sparkles className="w-3 h-3" /> Auto-Generate
                    </button>
                  </div>
                  <Input
                    id="prod_sku"
                    placeholder="e.g. LOR-MAJ-510"
                    value={formData.sku}
                    onChange={(e) => setFormData((p) => ({ ...p, sku: e.target.value }))}
                  />
                </div>

                <div className="sm:col-span-6 space-y-1">
                  <Label htmlFor="prod_barcode" className="text-xs font-semibold">
                    Barcode (EAN / UPC)
                  </Label>
                  <Input
                    id="prod_barcode"
                    placeholder="e.g. 8901234567890"
                    value={formData.barcode}
                    onChange={(e) => setFormData((p) => ({ ...p, barcode: e.target.value }))}
                  />
                </div>
              </div>

              {/* Row 4: Units, Net Volume per Unit */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Beaker className="w-4 h-4 text-primary" />
                  Salon Packaging &amp; Volume Metrics
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Packaging Unit</Label>
                    <Select
                      value={formData.unit}
                      onValueChange={(val) => setFormData((p) => ({ ...p, unit: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SALON_UNITS.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Net Volume / Content per Unit</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0.1"
                      placeholder="e.g. 500 (ml) or 50 (gm)"
                      value={formData.volume_per_unit}
                      onChange={(e) => setFormData((p) => ({ ...p, volume_per_unit: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Volume Measurement Unit</Label>
                    <Select
                      value={formData.volume_unit}
                      onValueChange={(val) => setFormData((p) => ({ ...p, volume_unit: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ml">ml (Milliliters)</SelectItem>
                        <SelectItem value="gm">gm (Grams)</SelectItem>
                        <SelectItem value="litres">litres</SelectItem>
                        <SelectItem value="pcs">pcs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Row 5: Pricing, Cost, and Profit Margin Calculator */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border items-center">
                <div className="sm:col-span-4 space-y-1">
                  <Label htmlFor="prod_cost" className="text-xs font-semibold">
                    Purchase Cost Price (₹)
                  </Label>
                  <Input
                    id="prod_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.cost_price}
                    onChange={(e) => setFormData((p) => ({ ...p, cost_price: e.target.value }))}
                  />
                </div>

                <div className="sm:col-span-4 space-y-1">
                  <Label htmlFor="prod_sell" className="text-xs font-semibold">
                    Selling Price / MRP (₹)
                  </Label>
                  <Input
                    id="prod_sell"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.selling_price}
                    onChange={(e) => setFormData((p) => ({ ...p, selling_price: e.target.value }))}
                  />
                </div>

                <div className="sm:col-span-4 text-center sm:text-right pt-2 sm:pt-0">
                  <span className="text-[11px] text-muted-foreground block">Profit Margin</span>
                  <span
                    className={`text-lg font-bold ${
                      profitMargin > 30 ? "text-emerald-600" : profitMargin > 0 ? "text-blue-600" : "text-slate-500"
                    }`}
                  >
                    {profitMargin}%
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    Profit: ₹
                    {(
                      Math.max(0, Number(formData.selling_price) || 0) - Math.max(0, Number(formData.cost_price) || 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Row 6: Stock Quantity & Reorder Threshold */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="prod_qty" className="text-xs font-semibold">
                    Current Stock Quantity *
                  </Label>
                  <Input
                    id="prod_qty"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData((p) => ({ ...p, quantity: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="prod_reorder" className="text-xs font-semibold">
                    Reorder Alert Level
                  </Label>
                  <Input
                    id="prod_reorder"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="5"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData((p) => ({ ...p, reorder_level: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="prod_loc" className="text-xs font-semibold">
                    Storage Location / Shelf
                  </Label>
                  <Input
                    id="prod_loc"
                    placeholder="e.g. Backwash, Color Bar"
                    value={formData.location}
                    onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
                  />
                </div>
              </div>

              {/* Row 7: Expiry Date, Batch Number, Supplier */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="prod_exp" className="text-xs font-semibold">
                    Expiry Date
                  </Label>
                  <Input
                    id="prod_exp"
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData((p) => ({ ...p, expiry_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="prod_batch" className="text-xs font-semibold">
                    Batch / Lot Number
                  </Label>
                  <Input
                    id="prod_batch"
                    placeholder="e.g. BATCH-2024-X"
                    value={formData.batch_number}
                    onChange={(e) => setFormData((p) => ({ ...p, batch_number: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="prod_supp" className="text-xs font-semibold">
                    Supplier / Vendor
                  </Label>
                  <Input
                    id="prod_supp"
                    placeholder="e.g. L'Oreal Professional Supply"
                    value={formData.supplier}
                    onChange={(e) => setFormData((p) => ({ ...p, supplier: e.target.value }))}
                  />
                </div>
              </div>

              {/* Row 8: Description */}
              <div className="space-y-1">
                <Label htmlFor="prod_desc" className="text-xs">
                  Description / Service Usage Instructions
                </Label>
                <Textarea
                  id="prod_desc"
                  rows={2}
                  placeholder="Notes, chemical mixing ratios, or precautions"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="text-xs"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false)
                    setIsEditDialogOpen(false)
                    resetForm()
                  }}
                  disabled={formLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? "Saving..." : editingItem ? "Update Product" : "Save Product"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ================= BULK UPLOAD MODAL ================= */}
        <BulkInventoryUploadModal
          isOpen={isBulkUploadOpen}
          onClose={() => setIsBulkUploadOpen(false)}
          existingInventory={inventory}
          onSuccess={() => loadData(true)}
        />

        {/* ================= ADJUST STOCK MODAL ================= */}
        <AdjustStockModal
          isOpen={isAdjustStockOpen}
          onClose={() => {
            setIsAdjustStockOpen(false)
            setSelectedItemForAdjust(null)
          }}
          item={selectedItemForAdjust}
          onSuccess={() => loadData(true)}
        />
      </div>
    </div>
  )
}
