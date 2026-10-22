"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReportDateSelector } from "@/components/reports/report-date-selector"
import { getDefaultCustomDates } from "@/lib/report-dates"
import { downloadCSV } from "@/lib/utils"
import { useRealTimeSync } from "@/lib/websocket"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  FileText,
  Download,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowLeft,
} from "lucide-react"
import { formatCurrency } from "@/lib/currency"
import Link from "next/link"

interface RevenueData {
  month: string
  revenue: number
  invoices: number
  payments: number
}

interface PaymentMethodData {
  method: string
  amount: number
  count: number
  percentage: number
}

interface CustomerSegmentData {
  segment: string
  revenue: number
  customers: number
  avgSpending: number
}

interface OutstandingData {
  ageGroup: string
  amount: number
  count: number
}

interface SummaryStats {
  totalRevenue: number
  totalInvoices: number
  totalPayments: number
  totalOutstanding: number
  revenueGrowth: number
  invoiceGrowth: number
  paymentGrowth: number
  outstandingGrowth: number
}

export default function AdvancedReportsPage() {
  const defaultDates = getDefaultCustomDates()
  const [dateRange, setDateRange] = useState("This Year")
  const [customStartDate, setCustomStartDate] = useState(defaultDates.startDate)
  const [customEndDate, setCustomEndDate] = useState(defaultDates.endDate)
  const [selectedReport, setSelectedReport] = useState("revenue")
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const [summary, setSummary] = useState<SummaryStats>({
    totalRevenue: 0,
    totalInvoices: 0,
    totalPayments: 0,
    totalOutstanding: 0,
    revenueGrowth: 0,
    invoiceGrowth: 0,
    paymentGrowth: 0,
    outstandingGrowth: 0,
  })
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [paymentMethodData, setPaymentMethodData] = useState<PaymentMethodData[]>([])
  const [customerSegmentData, setCustomerSegmentData] = useState<CustomerSegmentData[]>([])
  const [outstandingData, setOutstandingData] = useState<OutstandingData[]>([])

  const { isConnected, subscribe } = useRealTimeSync(["sale_completed", "booking_created", "payment_completed"])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ dateRange })
      if (dateRange === "Custom" && customStartDate && customEndDate) {
        params.set("startDate", customStartDate)
        params.set("endDate", customEndDate)
      }
      const response = await fetch(`/api/billing/advanced-reports?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        if (data.summary) setSummary(data.summary)
        setRevenueData(data.revenueData || [])
        setPaymentMethodData(data.paymentMethodData || [])
        setCustomerSegmentData(data.customerSegmentData || [])
        setOutstandingData(data.outstandingData || [])
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error("Error fetching live advanced reports data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportData()
  }, [dateRange, customStartDate, customEndDate])

  // Real-time updates
  useEffect(() => {
    subscribe("sale_completed", () => fetchReportData())
    subscribe("booking_created", () => fetchReportData())
    subscribe("payment_completed", () => fetchReportData())
  }, [subscribe])

  const handleExportReport = () => {
    const slug = dateRange.toLowerCase().replace(/\s+/g, "_")
    if (selectedReport === "revenue") {
      downloadCSV(revenueData, `revenue_report_${slug}.csv`)
    } else if (selectedReport === "payments") {
      downloadCSV(paymentMethodData, `payment_methods_${slug}.csv`)
    } else if (selectedReport === "customers") {
      downloadCSV(customerSegmentData, `customer_segments_${slug}.csv`)
    } else if (selectedReport === "outstanding") {
      downloadCSV(outstandingData, `outstanding_report_${slug}.csv`)
    }
  }

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"]

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Advanced Billing Reports"
        subtitle="Live analytics and insights for your billing and revenue operations."
        showBackButton
        backHref="/manage"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportReport} className="gap-2 bg-transparent">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button onClick={fetchReportData} disabled={loading} className="gap-2 bg-black text-white hover:bg-gray-800">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Controls & Filters */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Filter className="w-4 h-4" />
                  Report Filters
                </CardTitle>
                <div className="flex items-center gap-4">
                  <Link href="/manage">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      Back to Manage
                    </Button>
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500 animate-pulse"}`}></div>
                    <span>{isConnected ? "Live Data" : "Offline"}</span>
                    <span>•</span>
                    <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <Label className="text-xs text-gray-600 mb-1.5 block">Report Type</Label>
                  <Select value={selectedReport} onValueChange={setSelectedReport}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Revenue Analysis</SelectItem>
                      <SelectItem value="payments">Payment Methods</SelectItem>
                      <SelectItem value="customers">Customer Segments</SelectItem>
                      <SelectItem value="outstanding">Outstanding Payments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs text-gray-600 mb-1.5 block">Date Range</Label>
                  <ReportDateSelector
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    customStartDate={customStartDate}
                    customEndDate={customEndDate}
                    onCustomDateChange={(s, e) => {
                      setCustomStartDate(s)
                      setCustomEndDate(e)
                    }}
                  />
                </div>
                <div>
                  <Button onClick={fetchReportData} disabled={loading} className="w-full gap-2">
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Apply Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <IndianRupee className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div className="mt-2">
                  <Badge variant="outline" className={summary.revenueGrowth >= 0 ? "text-green-600 border-green-200" : "text-red-600 border-red-200"}>
                    {summary.revenueGrowth >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1 inline" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1 inline" />
                    )}
                    {summary.revenueGrowth >= 0 ? `+${summary.revenueGrowth}%` : `${summary.revenueGrowth}%`} vs last period
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                    <p className="text-2xl font-bold">{summary.totalInvoices}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div className="mt-2">
                  <Badge variant="outline" className={summary.invoiceGrowth >= 0 ? "text-blue-600 border-blue-200" : "text-red-600 border-red-200"}>
                    {summary.invoiceGrowth >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1 inline" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1 inline" />
                    )}
                    {summary.invoiceGrowth >= 0 ? `+${summary.invoiceGrowth}%` : `${summary.invoiceGrowth}%`} vs last period
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Payments Received</p>
                    <p className="text-2xl font-bold">{summary.totalPayments}</p>
                  </div>
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
                <div className="mt-2">
                  <Badge variant="outline" className={summary.paymentGrowth >= 0 ? "text-purple-600 border-purple-200" : "text-red-600 border-red-200"}>
                    {summary.paymentGrowth >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1 inline" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1 inline" />
                    )}
                    {summary.paymentGrowth >= 0 ? `+${summary.paymentGrowth}%` : `${summary.paymentGrowth}%`} vs last period
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Outstanding</p>
                    <p className="text-2xl font-bold">{formatCurrency(summary.totalOutstanding)}</p>
                  </div>
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-orange-600" />
                  </div>
                </div>
                <div className="mt-2">
                  <Badge variant="outline" className={summary.totalOutstanding > 0 ? "text-orange-600 border-orange-200" : "text-green-600 border-green-200"}>
                    <AlertCircle className="w-3 h-3 mr-1 inline" />
                    {summary.totalOutstanding > 0 ? "Pending collection" : "All cleared"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Report Content */}
          <Tabs value={selectedReport} onValueChange={setSelectedReport}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
              <TabsTrigger value="payments">Payment Methods</TabsTrigger>
              <TabsTrigger value="customers">Customer Segments</TabsTrigger>
              <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
            </TabsList>

            <TabsContent value="revenue" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trend</CardTitle>
                    <CardDescription>Revenue performance over selected period ({dateRange})</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {revenueData.length === 0 ? (
                      <div className="h-[300px] flex items-center justify-center text-sm text-gray-500">
                        No revenue records found for this period.
                      </div>
                    ) : (
                      <ChartContainer
                        config={{
                          revenue: {
                            label: "Revenue",
                            color: "hsl(var(--chart-1))",
                          },
                        }}
                        className="h-[300px]"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={revenueData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(0) + "K" : value}`} />
                            <ChartTooltip
                              content={<ChartTooltipContent />}
                              formatter={(value: any) => [formatCurrency(value), "Revenue"]}
                            />
                            <Line
                              type="monotone"
                              dataKey="revenue"
                              stroke="var(--color-revenue)"
                              strokeWidth={2}
                              dot={{ fill: "var(--color-revenue)" }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Invoice vs Payment Comparison</CardTitle>
                    <CardDescription>Invoice count vs payment transactions count</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {revenueData.length === 0 ? (
                      <div className="h-[300px] flex items-center justify-center text-sm text-gray-500">
                        No transactions found for this period.
                      </div>
                    ) : (
                      <ChartContainer
                        config={{
                          invoices: {
                            label: "Invoices",
                            color: "hsl(var(--chart-1))",
                          },
                          payments: {
                            label: "Payments",
                            color: "hsl(var(--chart-2))",
                          },
                        }}
                        className="h-[300px]"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={revenueData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis allowDecimals={false} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Legend />
                            <Bar dataKey="invoices" fill="var(--color-invoices)" name="Invoices" />
                            <Bar dataKey="payments" fill="var(--color-payments)" name="Payments" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="payments" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method Distribution</CardTitle>
                    <CardDescription>Live breakdown of payments by method</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {paymentMethodData.length === 0 ? (
                      <div className="h-[300px] flex items-center justify-center text-sm text-gray-500">
                        No payment data recorded in this period.
                      </div>
                    ) : (
                      <ChartContainer
                        config={{
                          amount: {
                            label: "Amount",
                            color: "hsl(var(--chart-1))",
                          },
                        }}
                        className="h-[300px]"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={paymentMethodData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={(entry: any) => `${entry.method || entry.name} (${entry.percentage ?? 0}%)`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="amount"
                            >
                              {paymentMethodData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <ChartTooltip
                              content={<ChartTooltipContent />}
                              formatter={(value: any) => [formatCurrency(value), "Amount"]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method Details</CardTitle>
                    <CardDescription>Detailed breakdown with transaction counts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {paymentMethodData.length === 0 ? (
                      <div className="p-8 text-center text-sm text-gray-500">
                        No payment transactions recorded in this period.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {paymentMethodData.map((method, index) => (
                          <div key={method.method} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              ></div>
                              <div>
                                <p className="font-medium text-sm">{method.method}</p>
                                <p className="text-xs text-gray-500">{method.count} transactions</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-sm">{formatCurrency(method.amount)}</p>
                              <p className="text-xs text-gray-500">{method.percentage}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="customers" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Segment Revenue</CardTitle>
                    <CardDescription>Revenue contribution by customer spend tier</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {customerSegmentData.every((s) => s.revenue === 0) ? (
                      <div className="h-[300px] flex items-center justify-center text-sm text-gray-500">
                        No customer spending records in this period.
                      </div>
                    ) : (
                      <ChartContainer
                        config={{
                          revenue: {
                            label: "Revenue",
                            color: "hsl(var(--chart-1))",
                          },
                        }}
                        className="h-[300px]"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={customerSegmentData} layout="horizontal">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(0) + "K" : value}`} />
                            <YAxis dataKey="segment" type="category" width={130} />
                            <ChartTooltip
                              content={<ChartTooltipContent />}
                              formatter={(value: any) => [formatCurrency(value), "Revenue"]}
                            />
                            <Bar dataKey="revenue" fill="var(--color-revenue)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Customer Segment Analysis</CardTitle>
                    <CardDescription>Real customer metrics based on spend</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {customerSegmentData.map((segment) => (
                        <div key={segment.segment} className="p-4 border rounded-lg bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm">{segment.segment}</h4>
                            <Badge variant="outline">{segment.customers} customers</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-gray-500">Total Revenue</p>
                              <p className="font-semibold">{formatCurrency(segment.revenue)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Avg. Spending</p>
                              <p className="font-semibold">{formatCurrency(segment.avgSpending)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="outstanding" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Outstanding Payments by Age</CardTitle>
                    <CardDescription>Aging analysis of unpaid customer invoices</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {outstandingData.every((item) => item.amount === 0) ? (
                      <div className="h-[300px] flex flex-col items-center justify-center text-sm text-gray-500 gap-2">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                        <p className="font-medium text-gray-700">No Outstanding Payments</p>
                        <p className="text-xs text-gray-400">All customer invoices and bookings have been paid.</p>
                      </div>
                    ) : (
                      <ChartContainer
                        config={{
                          amount: {
                            label: "Amount",
                            color: "hsl(var(--chart-1))",
                          },
                        }}
                        className="h-[300px]"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={outstandingData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="ageGroup" />
                            <YAxis tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(0) + "K" : value}`} />
                            <ChartTooltip
                              content={<ChartTooltipContent />}
                              formatter={(value: any) => [formatCurrency(value), "Outstanding Amount"]}
                            />
                            <Bar dataKey="amount" fill="var(--color-amount)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Outstanding Summary</CardTitle>
                    <CardDescription>Detailed breakdown of pending balances</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {outstandingData.map((item, index) => (
                        <div key={item.ageGroup} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-3.5 h-3.5 rounded ${
                                index === 0
                                  ? "bg-green-500"
                                  : index === 1
                                    ? "bg-yellow-500"
                                    : index === 2
                                      ? "bg-orange-500"
                                      : "bg-red-500"
                              }`}
                            ></div>
                            <div>
                              <p className="font-medium text-sm">{item.ageGroup}</p>
                              <p className="text-xs text-gray-500">{item.count} invoices / bookings</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">{formatCurrency(item.amount)}</p>
                            <p className="text-xs text-gray-500">
                              {summary.totalOutstanding > 0
                                ? ((item.amount / summary.totalOutstanding) * 100).toFixed(1)
                                : "0"}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t flex justify-between items-center">
                      <span className="font-medium text-sm">Total Outstanding</span>
                      <span className="font-bold text-lg text-slate-900">{formatCurrency(summary.totalOutstanding)}</span>
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
