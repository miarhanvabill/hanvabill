"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
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
  DollarSign,
  FileText,
  Download,
  Filter,
  RefreshCw,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react"
import { formatCurrency } from "@/lib/currency"
import type { DateRange } from "react-day-picker"

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

export default function AdvancedReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(2024, 0, 1),
    to: new Date(),
  })
  const [selectedReport, setSelectedReport] = useState("revenue")
  const [loading, setLoading] = useState(false)
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [paymentMethodData, setPaymentMethodData] = useState<PaymentMethodData[]>([])
  const [customerSegmentData, setCustomerSegmentData] = useState<CustomerSegmentData[]>([])
  const [outstandingData, setOutstandingData] = useState<OutstandingData[]>([])

  useEffect(() => {
    // Mock data for advanced reports
    const mockRevenueData: RevenueData[] = [
      { month: "Jan", revenue: 125000, invoices: 45, payments: 42 },
      { month: "Feb", revenue: 138000, invoices: 52, payments: 48 },
      { month: "Mar", revenue: 142000, invoices: 48, payments: 46 },
      { month: "Apr", revenue: 155000, invoices: 58, payments: 55 },
      { month: "May", revenue: 168000, invoices: 62, payments: 59 },
      { month: "Jun", revenue: 175000, invoices: 65, payments: 62 },
      { month: "Jul", revenue: 182000, invoices: 68, payments: 65 },
      { month: "Aug", revenue: 195000, invoices: 72, payments: 68 },
      { month: "Sep", revenue: 188000, invoices: 69, payments: 66 },
      { month: "Oct", revenue: 205000, invoices: 75, payments: 71 },
      { month: "Nov", revenue: 218000, invoices: 78, payments: 74 },
      { month: "Dec", revenue: 235000, invoices: 82, payments: 78 },
    ]

    const mockPaymentMethodData: PaymentMethodData[] = [
      { method: "Cash", amount: 850000, count: 245, percentage: 42.5 },
      { method: "Card", amount: 650000, count: 189, percentage: 32.5 },
      { method: "UPI", amount: 380000, count: 156, percentage: 19.0 },
      { method: "Bank Transfer", amount: 120000, count: 34, percentage: 6.0 },
    ]

    const mockCustomerSegmentData: CustomerSegmentData[] = [
      { segment: "VIP Customers", revenue: 450000, customers: 25, avgSpending: 18000 },
      { segment: "Regular Customers", revenue: 680000, customers: 85, avgSpending: 8000 },
      { segment: "Occasional Customers", revenue: 520000, customers: 145, avgSpending: 3586 },
      { segment: "New Customers", revenue: 350000, customers: 95, avgSpending: 3684 },
    ]

    const mockOutstandingData: OutstandingData[] = [
      { ageGroup: "0-30 days", amount: 125000, count: 15 },
      { ageGroup: "31-60 days", amount: 85000, count: 8 },
      { ageGroup: "61-90 days", amount: 45000, count: 5 },
      { ageGroup: "90+ days", amount: 25000, count: 3 },
    ]

    setRevenueData(mockRevenueData)
    setPaymentMethodData(mockPaymentMethodData)
    setCustomerSegmentData(mockCustomerSegmentData)
    setOutstandingData(mockOutstandingData)
  }, [])

  const handleGenerateReport = () => {
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      setLoading(false)
    }, 2000)
  }

  const handleExportReport = (format: "pdf" | "excel" | "csv") => {
    // Simulate export functionality
    console.log(`Exporting ${selectedReport} report as ${format}`)
  }

  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0)
  const totalInvoices = revenueData.reduce((sum, item) => sum + item.invoices, 0)
  const totalPayments = revenueData.reduce((sum, item) => sum + item.payments, 0)
  const totalOutstanding = outstandingData.reduce((sum, item) => sum + item.amount, 0)

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"]

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Advanced Billing Reports"
        subtitle="Comprehensive analytics and insights for your billing operations"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleExportReport("pdf")} className="gap-2 bg-transparent">
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
            <Button variant="outline" onClick={() => handleExportReport("excel")} className="gap-2 bg-transparent">
              <Download className="w-4 h-4" />
              Export Excel
            </Button>
            <Button onClick={handleGenerateReport} disabled={loading} className="gap-2">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              Generate Report
            </Button>
          </div>
        }
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Report Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Report Type</Label>
                  <Select value={selectedReport} onValueChange={setSelectedReport}>
                    <SelectTrigger>
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
                  <Label>Date Range</Label>
                  <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleGenerateReport} disabled={loading} className="w-full gap-2">
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
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
                    <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div className="mt-2">
                  <Badge variant="outline" className="text-green-600">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +12.5%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                    <p className="text-2xl font-bold">{totalInvoices}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div className="mt-2">
                  <Badge variant="outline" className="text-blue-600">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +8.2%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Payments Received</p>
                    <p className="text-2xl font-bold">{totalPayments}</p>
                  </div>
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
                <div className="mt-2">
                  <Badge variant="outline" className="text-purple-600">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +15.3%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Outstanding</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</p>
                  </div>
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-orange-600" />
                  </div>
                </div>
                <div className="mt-2">
                  <Badge variant="outline" className="text-orange-600">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    -5.8%
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
                    <CardTitle>Monthly Revenue Trend</CardTitle>
                    <CardDescription>Revenue performance over the past 12 months</CardDescription>
                  </CardHeader>
                  <CardContent>
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
                          <YAxis tickFormatter={(value) => `₹${value / 1000}K`} />
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
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Invoice vs Payment Comparison</CardTitle>
                    <CardDescription>Monthly invoice generation vs payment collection</CardDescription>
                  </CardHeader>
                  <CardContent>
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
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Bar dataKey="invoices" fill="var(--color-invoices)" name="Invoices" />
                          <Bar dataKey="payments" fill="var(--color-payments)" name="Payments" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="payments" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method Distribution</CardTitle>
                    <CardDescription>Breakdown of payments by method</CardDescription>
                  </CardHeader>
                  <CardContent>
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
                            label={({ method, percentage }) => `${method} (${percentage}%)`}
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
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method Details</CardTitle>
                    <CardDescription>Detailed breakdown with transaction counts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {paymentMethodData.map((method, index) => (
                        <div key={method.method} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            ></div>
                            <div>
                              <p className="font-medium">{method.method}</p>
                              <p className="text-sm text-gray-500">{method.count} transactions</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(method.amount)}</p>
                            <p className="text-sm text-gray-500">{method.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="customers" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Segment Revenue</CardTitle>
                    <CardDescription>Revenue contribution by customer segments</CardDescription>
                  </CardHeader>
                  <CardContent>
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
                          <XAxis type="number" tickFormatter={(value) => `₹${value / 1000}K`} />
                          <YAxis dataKey="segment" type="category" width={120} />
                          <ChartTooltip
                            content={<ChartTooltipContent />}
                            formatter={(value: any) => [formatCurrency(value), "Revenue"]}
                          />
                          <Bar dataKey="revenue" fill="var(--color-revenue)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Customer Segment Analysis</CardTitle>
                    <CardDescription>Detailed customer segment metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {customerSegmentData.map((segment, index) => (
                        <div key={segment.segment} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{segment.segment}</h4>
                            <Badge variant="outline">{segment.customers} customers</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Total Revenue</p>
                              <p className="font-semibold">{formatCurrency(segment.revenue)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Avg. Spending</p>
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
                    <CardDescription>Aging analysis of unpaid invoices</CardDescription>
                  </CardHeader>
                  <CardContent>
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
                          <YAxis tickFormatter={(value) => `₹${value / 1000}K`} />
                          <ChartTooltip
                            content={<ChartTooltipContent />}
                            formatter={(value: any) => [formatCurrency(value), "Outstanding Amount"]}
                          />
                          <Bar dataKey="amount" fill="var(--color-amount)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Outstanding Summary</CardTitle>
                    <CardDescription>Detailed breakdown of outstanding payments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {outstandingData.map((item, index) => (
                        <div key={item.ageGroup} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-4 h-4 rounded ${
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
                              <p className="font-medium">{item.ageGroup}</p>
                              <p className="text-sm text-gray-500">{item.count} invoices</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(item.amount)}</p>
                            <p className="text-sm text-gray-500">
                              {((item.amount / totalOutstanding) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Outstanding</span>
                        <span className="font-bold text-lg">{formatCurrency(totalOutstanding)}</span>
                      </div>
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
