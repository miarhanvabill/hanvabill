"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { downloadCSV } from "@/lib/utils"
import { Download, ArrowLeft, TrendingUp, TrendingDown, AlertCircle, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useRealTimeSync } from "@/lib/websocket"

interface InventoryAdjustment {
  id: number
  product_name: string
  adjustment_type: "increase" | "decrease"
  quantity: number
  reason: string
  notes: string
  created_by: string
  created_at: string
  old_quantity: number
  new_quantity: number
  unit_cost: number
  value_impact: number
}

export default function InventoryAdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([])
  const [dateRange, setDateRange] = useState("Last 30 Days")
  const [typeFilter, setTypeFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const { isConnected, subscribe, broadcast } = useRealTimeSync(["inventory_adjustment", "stock_update"])

  const fetchAdjustments = async () => {
    try {
      const response = await fetch(`/api/reports/inventory-adjustments?dateRange=${dateRange}&type=${typeFilter}`)
      if (response.ok) {
        const data = await response.json()
        setAdjustments(data)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error("Error fetching adjustments:", error)
      // Fallback data
      const mockData: InventoryAdjustment[] = [
        {
          id: 1,
          product_name: "Professional Shampoo",
          adjustment_type: "decrease",
          quantity: 5,
          reason: "damaged",
          notes: "Bottles damaged during delivery",
          created_by: "Admin",
          created_at: "2024-01-15T10:30:00Z",
          old_quantity: 25,
          new_quantity: 20,
          unit_cost: 450,
          value_impact: -2250,
        },
        {
          id: 2,
          product_name: "Hair Conditioner",
          adjustment_type: "increase",
          quantity: 10,
          reason: "found",
          notes: "Found additional stock in storage",
          created_by: "Manager",
          created_at: "2024-01-14T14:20:00Z",
          old_quantity: 15,
          new_quantity: 25,
          unit_cost: 380,
          value_impact: 3800,
        },
        {
          id: 3,
          product_name: "Face Mask",
          adjustment_type: "decrease",
          quantity: 3,
          reason: "expired",
          notes: "Products past expiry date",
          created_by: "Staff",
          created_at: "2024-01-13T09:15:00Z",
          old_quantity: 18,
          new_quantity: 15,
          unit_cost: 250,
          value_impact: -750,
        },
      ]
      setAdjustments(mockData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdjustments()
    const interval = setInterval(fetchAdjustments, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [dateRange, typeFilter])

  // Real-time updates
  useEffect(() => {
    subscribe("inventory_adjustment", (event) => {
      fetchAdjustments() // Refresh data when adjustment is made
    })

    subscribe("stock_update", (event) => {
      fetchAdjustments() // Refresh when stock is updated
    })
  }, [subscribe])

  const filteredAdjustments = adjustments.filter((adj) => {
    if (typeFilter === "all") return true
    return adj.adjustment_type === typeFilter
  })

  const stats = {
    totalAdjustments: adjustments.length,
    increases: adjustments.filter((a) => a.adjustment_type === "increase").length,
    decreases: adjustments.filter((a) => a.adjustment_type === "decrease").length,
    totalValueImpact: adjustments.reduce((sum, a) => sum + a.value_impact, 0),
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading inventory adjustments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Inventory Adjustments"
        subtitle="Track all inventory corrections and adjustments with real-time updates."
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
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
                    <span>{isConnected ? "Live" : "Offline"}</span>
                    <span>•</span>
                    <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Today">Today</SelectItem>
                      <SelectItem value="Yesterday">Yesterday</SelectItem>
                      <SelectItem value="Last 7 Days">Last 7 Days</SelectItem>
                      <SelectItem value="Last 30 Days">Last 30 Days</SelectItem>
                      <SelectItem value="Last 3 Months">Last 3 Months</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="increase">Increases</SelectItem>
                      <SelectItem value="decrease">Decreases</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={fetchAdjustments} className="gap-2 bg-transparent">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </Button>
                  <Button className="gap-2 bg-black text-white hover:bg-gray-800" onClick={() => downloadCSV(adjustments, 'inventory-adjustments-report.csv')}>
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Adjustments</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalAdjustments}</div>
                <p className="text-xs text-muted-foreground">All time adjustments</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stock Increases</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.increases}</div>
                <p className="text-xs text-muted-foreground">Positive adjustments</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stock Decreases</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.decreases}</div>
                <p className="text-xs text-muted-foreground">Negative adjustments</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Value Impact</CardTitle>
                <TrendingUp className={`h-4 w-4 ${stats.totalValueImpact >= 0 ? "text-green-600" : "text-red-600"}`} />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${stats.totalValueImpact >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  ₹{Math.abs(stats.totalValueImpact).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalValueImpact >= 0 ? "Positive" : "Negative"} impact
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Adjustments Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Adjustments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Product</th>
                      <th className="text-center p-3 font-medium">Type</th>
                      <th className="text-center p-3 font-medium">Quantity</th>
                      <th className="text-center p-3 font-medium">Before/After</th>
                      <th className="text-left p-3 font-medium">Reason</th>
                      <th className="text-center p-3 font-medium">Value Impact</th>
                      <th className="text-left p-3 font-medium">Created By</th>
                      <th className="text-left p-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredAdjustments.map((adjustment) => (
                      <tr key={adjustment.id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium">{adjustment.product_name}</td>
                        <td className="p-3 text-center">
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
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={adjustment.adjustment_type === "increase" ? "text-green-600" : "text-red-600"}
                          >
                            {adjustment.adjustment_type === "increase" ? "+" : "-"}
                            {adjustment.quantity}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-gray-600">{adjustment.old_quantity}</span>
                          <span className="mx-1">→</span>
                          <span className="font-medium">{adjustment.new_quantity}</span>
                        </td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium capitalize">{adjustment.reason}</div>
                            {adjustment.notes && <div className="text-xs text-gray-500 mt-1">{adjustment.notes}</div>}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={adjustment.value_impact >= 0 ? "text-green-600" : "text-red-600"}>
                            {adjustment.value_impact >= 0 ? "+" : ""}₹{adjustment.value_impact.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-3">{adjustment.created_by}</td>
                        <td className="p-3">{new Date(adjustment.created_at).toLocaleDateString()}</td>
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
