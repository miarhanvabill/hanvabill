"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, ArrowLeft, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface InventoryData {
  id: number
  item_name: string
  current_stock: number
  min_stock_level: number
  unit_price: number
  supplier: string
  last_restocked: string
  stock_value: number
  status: "in_stock" | "low_stock" | "out_of_stock"
}

export default function InventoryReportPage() {
  const [inventory, setInventory] = useState<InventoryData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/reports/inventory")
      if (response.ok) {
        const data = await response.json()
        setInventory(data)
      }
    } catch (error) {
      console.error("Error fetching inventory:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
    const interval = setInterval(fetchInventory, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading inventory report...</p>
        </div>
      </div>
    )
  }

  const totalValue = inventory.reduce((sum, item) => sum + item.stock_value, 0)
  const lowStockItems = inventory.filter((item) => item.status === "low_stock" || item.status === "out_of_stock")

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Inventory Report"
        subtitle="Detailed insights into stock levels, inventory value, and restocking requirements."
        showBackButton
        backHref="/reports"
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Controls */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Link href="/reports">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      Back to Reports
                    </Button>
                  </Link>
                  {lowStockItems.length > 0 && (
                    <div className="flex items-center gap-2 text-orange-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">{lowStockItems.length} items need attention</span>
                    </div>
                  )}
                </div>
                <Button className="gap-2 bg-black text-white hover:bg-gray-800">
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-blue-600">{inventory.length}</div>
                <div className="text-sm text-gray-600">Total Items</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-green-600">₹{totalValue.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total Inventory Value</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-orange-600">{lowStockItems.length}</div>
                <div className="text-sm text-gray-600">Low Stock Items</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {inventory.filter((item) => item.status === "out_of_stock").length}
                </div>
                <div className="text-sm text-gray-600">Out of Stock</div>
              </CardContent>
            </Card>
          </div>

          {/* Inventory Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-xl">Inventory Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Item Name</th>
                      <th className="text-center p-3 font-medium">Current Stock</th>
                      <th className="text-center p-3 font-medium">Min Level</th>
                      <th className="text-center p-3 font-medium">Unit Price</th>
                      <th className="text-center p-3 font-medium">Stock Value</th>
                      <th className="text-left p-3 font-medium">Supplier</th>
                      <th className="text-left p-3 font-medium">Last Restocked</th>
                      <th className="text-center p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {inventory.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-gray-50 ${
                          item.status === "out_of_stock"
                            ? "bg-red-50"
                            : item.status === "low_stock"
                              ? "bg-orange-50"
                              : ""
                        }`}
                      >
                        <td className="p-3 font-medium">{item.item_name}</td>
                        <td className="p-3 text-center">{item.current_stock}</td>
                        <td className="p-3 text-center">{item.min_stock_level}</td>
                        <td className="p-3 text-center">₹{item.unit_price.toFixed(2)}</td>
                        <td className="p-3 text-center font-medium">₹{item.stock_value.toFixed(2)}</td>
                        <td className="p-3">{item.supplier}</td>
                        <td className="p-3">{item.last_restocked}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.status === "in_stock"
                                ? "bg-green-100 text-green-800"
                                : item.status === "low_stock"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {item.status.replace("_", " ")}
                          </span>
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
