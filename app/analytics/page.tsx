"use client"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Users,
  Calendar,
  Clock,
  BarChart3,
  PieChart,
  LineChart,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Wifi,
  WifiOff,
} from "lucide-react"
import { useState, useEffect, useCallback, useRef } from "react"
import type { AnalyticsData } from "@/app/actions/analytics"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from "recharts"

interface ConnectionStatus {
  isOnline: boolean
  lastSync: Date | null
  syncStatus: "syncing" | "synced" | "error" | "offline"
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState("30")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isOnline: true,
    lastSync: null,
    syncStatus: "syncing",
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchAnalyticsData = useCallback(
    async (isRetry = false) => {
      if (!isRetry) {
        setLoading(true)
      }
      setConnectionStatus((prev) => ({ ...prev, syncStatus: "syncing" }))

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

        const response = await fetch(`/api/analytics?dateRange=${dateRange}`, {
          signal: controller.signal,
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data: AnalyticsData = await response.json()

        // Validate data structure
        if (!data || typeof data !== "object") {
          throw new Error("Invalid data format received")
        }

        setAnalytics(data)
        setLastUpdated(new Date())
        setError(null)
        setRetryCount(0)
        setConnectionStatus({
          isOnline: true,
          lastSync: new Date(),
          syncStatus: "synced",
        })
      } catch (error: any) {
        console.error("Error fetching analytics:", error)

        const errorMessage =
          error.name === "AbortError"
            ? "Request timed out. Please check your connection."
            : error.message || "Failed to fetch analytics data"

        setError(errorMessage)
        setConnectionStatus((prev) => ({
          ...prev,
          isOnline: false,
          syncStatus: "error",
        }))

        // Implement exponential backoff for retries
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
          setRetryCount((prev) => prev + 1)

          retryTimeoutRef.current = setTimeout(() => {
            fetchAnalyticsData(true)
          }, delay)
        } else {
          // Fallback to cached/default data after max retries
          setAnalytics({
            totalRevenue: 0,
            revenueGrowth: 0,
            totalCustomers: 0,
            customerGrowth: 0,
            totalBookings: 0,
            bookingGrowth: 0,
            avgServiceTime: 0,
            serviceTimeImprovement: 0,
            avgTransactionValue: 0,
            repeatCustomerRate: 0,
            monthlyRecurringRevenue: 0,
            revenueByCategory: [],
            customerAcquisition: [],
            customerDemographics: { male: 0, female: 0, others: 0 },
            topServices: [],
            staffPerformance: [],
            staffUtilization: [],
          })
        }
      } finally {
        setLoading(false)
      }
    },
    [dateRange, retryCount],
  )

  useEffect(() => {
    fetchAnalyticsData()

    // Set up real-time updates every 30 seconds
    intervalRef.current = setInterval(() => {
      fetchAnalyticsData(true)
    }, 30000)

    // Monitor online/offline status
    const handleOnline = () => {
      setConnectionStatus((prev) => ({ ...prev, isOnline: true }))
      fetchAnalyticsData(true)
    }

    const handleOffline = () => {
      setConnectionStatus((prev) => ({ ...prev, isOnline: false, syncStatus: "offline" }))
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [fetchAnalyticsData])

  const handleManualRefresh = () => {
    setRetryCount(0)
    fetchAnalyticsData()
  }

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/analytics/export?dateRange=${dateRange}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `analytics-report-${dateRange}days-${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Export failed:", error)
    }
  }

  if (loading && !analytics) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-gray-500" />
        <p className="mt-4 text-gray-600">Loading analytics data...</p>
        <p className="text-sm text-gray-500">This may take a few moments</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Business Analytics"
        subtitle="Comprehensive insights into your salon's performance, revenue trends, and customer behavior."
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
                <Button variant="link" className="p-0 h-auto ml-2 text-red-600 underline" onClick={handleManualRefresh}>
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Controls */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                      <SelectItem value="365">Last 365 days</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2">
                    {connectionStatus.isOnline ? (
                      <Wifi className="w-4 h-4 text-green-600" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-600" />
                    )}
                    <Badge
                      variant={
                        connectionStatus.syncStatus === "synced"
                          ? "default"
                          : connectionStatus.syncStatus === "error"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {connectionStatus.syncStatus === "syncing" && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                      {connectionStatus.syncStatus === "synced" && <CheckCircle className="w-3 h-3 mr-1" />}
                      {connectionStatus.syncStatus === "error" && <AlertCircle className="w-3 h-3 mr-1" />}
                      {connectionStatus.syncStatus.charAt(0).toUpperCase() + connectionStatus.syncStatus.slice(1)}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {lastUpdated && (
                    <>
                      Last updated: {lastUpdated.toLocaleTimeString()}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleManualRefresh}
                        disabled={loading}
                        title="Refresh data"
                      >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                      </Button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <Filter className="w-4 h-4" />
                    Filter
                  </Button>
                  <Button variant="outline" className="gap-2 bg-transparent" onClick={handleExport}>
                    <Download className="w-4 h-4" />
                    Export Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Revenue */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold">₹{(analytics?.totalRevenue || 0).toLocaleString()}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {(analytics?.revenueGrowth || 0) >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span
                        className={`text-sm ${(analytics?.revenueGrowth || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {(analytics?.revenueGrowth || 0) >= 0 ? "+" : ""}
                        {(analytics?.revenueGrowth || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <IndianRupee className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            {/* Total Customers */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Customers</p>
                    <p className="text-2xl font-bold">{analytics?.totalCustomers || 0}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {(analytics?.customerGrowth || 0) >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span
                        className={`text-sm ${(analytics?.customerGrowth || 0) >= 0 ? "text-blue-600" : "text-red-600"}`}
                      >
                        {(analytics?.customerGrowth || 0) >= 0 ? "+" : ""}
                        {(analytics?.customerGrowth || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            {/* Total Bookings */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                    <p className="text-2xl font-bold">{analytics?.totalBookings || 0}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {(analytics?.bookingGrowth || 0) >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-purple-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span
                        className={`text-sm ${(analytics?.bookingGrowth || 0) >= 0 ? "text-purple-600" : "text-red-600"}`}
                      >
                        {(analytics?.bookingGrowth || 0) >= 0 ? "+" : ""}
                        {(analytics?.bookingGrowth || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <Calendar className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            {/* Avg. Service Time */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg. Service Time</p>
                    <p className="text-2xl font-bold">{(analytics?.avgServiceTime || 0).toFixed(0)}m</p>
                    <div className="flex items-center gap-1 mt-1">
                      {(analytics?.serviceTimeImprovement || 0) >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-orange-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span
                        className={`text-sm ${(analytics?.serviceTimeImprovement || 0) >= 0 ? "text-orange-600" : "text-red-600"}`}
                      >
                        {(analytics?.serviceTimeImprovement || 0) >= 0 ? "+" : ""}
                        {(analytics?.serviceTimeImprovement || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <Clock className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="revenue" className="space-y-6">
            <TabsList>
              <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
              <TabsTrigger value="customers">Customer Insights</TabsTrigger>
              <TabsTrigger value="services">Service Performance</TabsTrigger>
              <TabsTrigger value="staff">Staff Analytics</TabsTrigger>
            </TabsList>

            {/* Revenue Tab */}
            <TabsContent value="revenue" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LineChart className="w-5 h-5" />
                      Revenue Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full pt-4">
                      {analytics?.revenueTrend && analytics.revenueTrend.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics.revenueTrend}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis 
                              dataKey="date" 
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#6b7280', fontSize: 12 }}
                              dy={10}
                            />
                            <YAxis 
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#6b7280', fontSize: 12 }}
                              tickFormatter={(value) => `₹${value}`}
                            />
                            <RechartsTooltip 
                              cursor={{ fill: '#f3f4f6' }}
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                            />
                            <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                          <div className="text-center">
                            <BarChart3 className="w-12 h-12 opacity-50 mx-auto" />
                            <p className="mt-2 text-gray-500">No revenue data available</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5" />
                      Revenue by Service Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(analytics?.revenueByCategory || []).length > 0 ? (
                        <>
                          <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPieChart>
                                <Pie
                                  data={analytics.revenueByCategory}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="revenue"
                                  nameKey="name"
                                >
                                  {analytics.revenueByCategory.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"][index % 5]} />
                                  ))}
                                </Pie>
                                <RechartsTooltip 
                                  formatter={(value: number) => `₹${value.toLocaleString()}`}
                                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-2">
                            {analytics.revenueByCategory.map((cat, idx) => (
                              <div key={cat.name} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{
                                      backgroundColor: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"][idx % 5],
                                    }}
                                  ></span>
                                  <span className="font-medium truncate" title={cat.name}>{cat.name}</span>
                                </div>
                                <div className="text-gray-500 font-medium pl-2">
                                  {cat.percentage.toFixed(0)}%
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <PieChart className="w-8 h-8 mx-auto opacity-50 mb-2" />
                          <p>No revenue data available</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ₹{(analytics?.avgTransactionValue || 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Average Transaction Value</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {(analytics?.repeatCustomerRate || 0).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Repeat Customer Rate</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      ₹{(analytics?.monthlyRecurringRevenue || 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Monthly Recurring Revenue</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Customer Insights Tab */}
            <TabsContent value="customers" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Acquisition</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(analytics?.customerAcquisition || []).length > 0 ? (
                        analytics.customerAcquisition.map((src, idx) => (
                          <div key={src.source} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"][idx % 4] }}
                              ></span>
                              <span className="text-sm font-medium">{src.source}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{src.customers}</div>
                              <div className="text-sm text-gray-500">{src.percentage.toFixed(1)}%</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="w-8 h-8 mx-auto opacity-50 mb-2" />
                          <p>No acquisition data available</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Customer Demographics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(() => {
                        const demo = analytics?.customerDemographics || { male: 0, female: 0, others: 0 }
                        const spend = analytics?.demographicSpending || { male: 0, female: 0, others: 0 }
                        const totalCustomers = demo.male + demo.female + demo.others || 1 // prevent div by zero
                        
                        return [
                          { label: "Male", count: demo.male, spend: spend.male, color: "bg-blue-600" },
                          { label: "Female", count: demo.female, spend: spend.female, color: "bg-pink-600" },
                          { label: "Others", count: demo.others, spend: spend.others, color: "bg-purple-600" },
                        ].map((d) => (
                          <div key={d.label}>
                            <div className="flex justify-between items-end mb-2 text-sm font-medium">
                              <div>
                                <span>{d.label}</span>
                                <span className="text-gray-500 ml-2">({d.count})</span>
                              </div>
                              <span className="text-green-600 font-semibold">₹{d.spend.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`${d.color} h-2 rounded-full transition-all duration-500`}
                                style={{ width: `${(d.count / totalCustomers) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Service Performance Tab */}
            <TabsContent value="services" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Services</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="p-4 text-left font-medium">Service</th>
                          <th className="p-4 text-left font-medium">Bookings</th>
                          <th className="p-4 text-left font-medium">Revenue</th>
                          <th className="p-4 text-left font-medium">Avg. Price</th>
                          <th className="p-4 text-left font-medium">Growth</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(analytics?.topServices || []).length > 0 ? (
                          analytics.topServices.map((s) => (
                            <tr key={s.name} className="hover:bg-gray-50">
                              <td className="p-4 font-medium">{s.name}</td>
                              <td className="p-4">{s.bookings}</td>
                              <td className="p-4">₹{s.revenue.toLocaleString()}</td>
                              <td className="p-4">₹{s.avgPrice.toFixed(2)}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-1">
                                  {s.growth >= 0 ? (
                                    <TrendingUp className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <TrendingDown className="w-4 h-4 text-red-600" />
                                  )}
                                  <span className={`${s.growth >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {s.growth >= 0 ? "+" : ""}
                                    {s.growth}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-gray-500">
                              <BarChart3 className="w-8 h-8 mx-auto opacity-50 mb-2" />
                              <p>No service data available</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Staff Analytics Tab */}
            <TabsContent value="staff" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Staff Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="p-4 text-left font-medium">Staff</th>
                            <th className="p-4 text-left font-medium">Bookings</th>
                            <th className="p-4 text-left font-medium">Revenue</th>
                            <th className="p-4 text-left font-medium">Rating</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(analytics?.staffPerformance || []).length > 0 ? (
                            analytics.staffPerformance.map((s) => (
                              <tr key={s.name} className="hover:bg-gray-50">
                                <td className="p-4 font-medium">{s.name}</td>
                                <td className="p-4">{s.bookings}</td>
                                <td className="p-4">₹{s.revenue.toLocaleString()}</td>
                                <td className="p-4 flex items-center gap-2">
                                  <span>{s.rating.toFixed(1)}</span>
                                  {s.ratingCount > 0 ? (
                                    <span className="text-xs text-gray-500">({s.ratingCount} {s.ratingCount === 1 ? 'rating' : 'ratings'})</span>
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">(No ratings)</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="p-8 text-center text-gray-500">
                                <Users className="w-8 h-8 mx-auto opacity-50 mb-2" />
                                <p>No staff data available</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Staff Utilization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(analytics?.staffUtilization || []).length > 0 ? (
                        analytics.staffUtilization.map((s) => (
                          <div key={s.name}>
                            <div className="flex justify-between mb-2 text-sm font-medium">
                              <span>{s.name}</span>
                              <span>{s.utilization.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(s.utilization, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Clock className="w-8 h-8 mx-auto opacity-50 mb-2" />
                          <p>No utilization data available</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
