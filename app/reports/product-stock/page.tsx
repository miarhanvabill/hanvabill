"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertTriangle, Package, RefreshCw, Search, TrendingDown, TrendingUp } from "lucide-react"
import { useRealTimeSync } from "@/lib/websocket"
import { useToast } from "@/components/ui/use-toast"

interface ProductStock {
  id: number
  name: string
  category: string
  current_stock: number
  min_stock_level: number
  max_stock_level: number
  unit_price: number
  total_value: number
  last_updated: string
  status: "in_stock" | "low_stock" | "out_of_stock"
  supplier: string
  sku: string
}

interface StockStats {
  total_products: number
  in_stock: number
  low_stock: number
  out_of_stock: number
  total_value: number
  last_updated: string
}

export default function ProductStockPage() {
  const [products, setProducts] = useState<ProductStock[]>([])
  const [stats, setStats] = useState<StockStats>({
    total_products: 0,
    in_stock: 0,
    low_stock: 0,
    out_of_stock: 0,
    total_value: 0,
    last_updated: new Date().toISOString(),
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)

  const { toast } = useToast()
  const { isConnected, subscribe, broadcast } = useRealTimeSync([
    "inventory_updated",
    "stock_adjustment",
    "product_sold",
  ])

  const fetchProductStock = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch("/api/reports/product-stock")

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        setProducts(data.products || [])
        setStats(data.stats || stats)
      } else {
        throw new Error(data.message || "Failed to fetch product stock data")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      console.error("Error fetching product stock:", err)
      setError(errorMessage)

      toast({
        title: "Error",
        description: "Failed to load product stock data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast, stats])

  // Real-time updates
  useEffect(() => {
    const handleInventoryUpdate = (event: any) => {
      try {
        if (event.data?.productId && event.data?.newStock !== undefined) {
          setProducts((prevProducts) =>
            prevProducts.map((product) =>
              product.id === event.data.productId
                ? {
                    ...product,
                    current_stock: event.data.newStock,
                    status: getStockStatus(event.data.newStock, product.min_stock_level),
                    last_updated: new Date().toISOString(),
                  }
                : product,
            ),
          )

          // Update stats
          fetchProductStock()
        }
      } catch (error) {
        console.error("Error handling inventory update:", error)
      }
    }

    const handleStockAdjustment = (event: any) => {
      try {
        if (event.data?.adjustment) {
          toast({
            title: "Stock Adjusted",
            description: `${event.data.productName}: ${event.data.adjustment > 0 ? "+" : ""}${event.data.adjustment} units`,
          })
          fetchProductStock()
        }
      } catch (error) {
        console.error("Error handling stock adjustment:", error)
      }
    }

    const handleProductSold = (event: any) => {
      try {
        if (event.data?.productId && event.data?.quantity) {
          setProducts((prevProducts) =>
            prevProducts.map((product) =>
              product.id === event.data.productId
                ? {
                    ...product,
                    current_stock: Math.max(0, product.current_stock - event.data.quantity),
                    last_updated: new Date().toISOString(),
                  }
                : product,
            ),
          )
        }
      } catch (error) {
        console.error("Error handling product sold:", error)
      }
    }

    subscribe("inventory_updated", handleInventoryUpdate)
    subscribe("stock_adjustment", handleStockAdjustment)
    subscribe("product_sold", handleProductSold)
  }, [subscribe, fetchProductStock, toast])

  // Initial data fetch
  useEffect(() => {
    fetchProductStock()
  }, [fetchProductStock])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        fetchProductStock()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchProductStock, isLoading])

  const getStockStatus = (currentStock: number, minLevel: number): "in_stock" | "low_stock" | "out_of_stock" => {
    if (currentStock === 0) return "out_of_stock"
    if (currentStock <= minLevel) return "low_stock"
    return "in_stock"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_stock":
        return "bg-green-100 text-green-800"
      case "low_stock":
        return "bg-yellow-100 text-yellow-800"
      case "out_of_stock":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "in_stock":
        return <TrendingUp className="w-4 h-4" />
      case "low_stock":
        return <AlertTriangle className="w-4 h-4" />
      case "out_of_stock":
        return <TrendingDown className="w-4 h-4" />
      default:
        return <Package className="w-4 h-4" />
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    const matchesStockFilter = !showLowStockOnly || product.status === "low_stock" || product.status === "out_of_stock"

    return matchesSearch && matchesCategory && matchesStockFilter
  })

  const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean)

  const handleRefresh = () => {
    setIsLoading(true)
    fetchProductStock()
  }

  const handleStockAdjustment = async (productId: number, adjustment: number) => {
    try {
      const response = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, adjustment, reason: "Manual adjustment" }),
      })

      if (response.ok) {
        broadcast("stock_adjustment", { productId, adjustment })
        toast({
          title: "Success",
          description: "Stock adjusted successfully",
        })
      } else {
        throw new Error("Failed to adjust stock")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to adjust stock. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (error && products.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Product Stock Summary</h1>
          <Button onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Retry
          </Button>
        </div>

        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to Load Data</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={handleRefresh}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Product Stock Summary</h1>
          <p className="text-gray-600">
            Real-time inventory tracking and stock management
            {isConnected && (
              <Badge variant="outline" className="ml-2 text-green-600 border-green-600">
                Live
              </Badge>
            )}
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_products}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">In Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.in_stock}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.low_stock}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.out_of_stock}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.total_value.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search products or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <Button
              variant={showLowStockOnly ? "default" : "outline"}
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            >
              {showLowStockOnly ? "Show All" : "Low Stock Only"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Inventory</CardTitle>
          <CardDescription>
            Showing {filteredProducts.length} of {products.length} products
            {stats.last_updated && (
              <span className="ml-2 text-xs text-gray-500">
                Last updated: {new Date(stats.last_updated).toLocaleTimeString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && products.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Loading product data...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
              <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Product</th>
                    <th className="text-left py-3 px-4 font-medium">SKU</th>
                    <th className="text-left py-3 px-4 font-medium">Category</th>
                    <th className="text-left py-3 px-4 font-medium">Current Stock</th>
                    <th className="text-left py-3 px-4 font-medium">Min Level</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Unit Price</th>
                    <th className="text-left py-3 px-4 font-medium">Total Value</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-500">{product.supplier}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-sm">{product.sku}</td>
                      <td className="py-3 px-4">{product.category}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            product.current_stock === 0
                              ? "text-red-600"
                              : product.current_stock <= product.min_stock_level
                                ? "text-yellow-600"
                                : "text-green-600"
                          }`}
                        >
                          {product.current_stock}
                        </span>
                      </td>
                      <td className="py-3 px-4">{product.min_stock_level}</td>
                      <td className="py-3 px-4">
                        <Badge className={`${getStatusColor(product.status)} flex items-center gap-1 w-fit`}>
                          {getStatusIcon(product.status)}
                          {product.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">₹{product.unit_price.toLocaleString()}</td>
                      <td className="py-3 px-4">₹{product.total_value.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleStockAdjustment(product.id, 1)}>
                            +1
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStockAdjustment(product.id, -1)}
                            disabled={product.current_stock === 0}
                          >
                            -1
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
