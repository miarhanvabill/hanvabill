"use client"

import React, { useState } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DollarSign, Users, ShoppingBag, TrendingUp, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ReportDateSelector } from "@/components/reports/report-date-selector"
import { parseReportDates, getDefaultCustomDates } from "@/lib/report-dates"
import { getStorePerformanceData } from "@/app/actions/store-performance"
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from "recharts"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function DashboardClient({ initialData }: { initialData: any }) {
  const [data, setData] = useState(initialData)
  const [dateRange, setDateRange] = useState("Last 30 Days")
  const defaultCustom = getDefaultCustomDates()
  const [customStartDate, setCustomStartDate] = useState(defaultCustom.startDate)
  const [customEndDate, setCustomEndDate] = useState(defaultCustom.endDate)
  const [loading, setLoading] = useState(false)

  const handleFetch = async (range: string, start?: string, end?: string) => {
    const s = start !== undefined ? start : customStartDate
    const e = end !== undefined ? end : customEndDate
    const { startIso, endIso } = parseReportDates(range, s, e)

    setLoading(true)
    try {
      const res = await getStorePerformanceData({ startDate: startIso, endDate: endIso })
      if (res.success && res.data) {
        setData(res.data)
      }
    } catch (err) {
      console.error("Failed to fetch store performance data:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDateRangeChange = (newRange: string) => {
    setDateRange(newRange)
    handleFetch(newRange)
  }

  const handleCustomDateChange = (start: string, end: string) => {
    setCustomStartDate(start)
    setCustomEndDate(end)
    handleFetch("Custom", start, end)
  }

  const kpis = data?.kpis || {
    revenue: 0,
    totalVisits: 0,
    avgCustomerRevenue: 0,
    totalUniqueCustomers: 0,
    revenueGrowth: "+0% vs Previous Period",
    visitsGrowth: "+0% vs Previous Period",
    avgRevenueGrowth: "+0% vs Previous Period",
    customersGrowth: "+0% vs Previous Period",
  }
  const dailyStats = data?.dailyStats || []
  const categoryDistribution = data?.categoryDistribution || []
  const leaderboards = data?.leaderboards || {
    topServices: [],
    topCustomers: [],
    topStaff: [],
    topProducts: [],
    topPackages: [],
  }
  const quarterlyResults = data?.quarterlyResults || []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Store Performance"
        subtitle="Comprehensive analytics and performance metrics."
        showBackButton
        backHref="/manage"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ReportDateSelector
              dateRange={dateRange}
              onDateRangeChange={handleDateRangeChange}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
              onCustomDateChange={handleCustomDateChange}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleFetch(dateRange)}
              disabled={loading}
              title="Refresh Performance Data"
              className="h-9 w-9 bg-white"
            >
              <RefreshCw className={`h-4 w-4 text-slate-600 ${loading ? "animate-spin text-primary" : ""}`} />
            </Button>
          </div>
        }
      />

      <div className={`transition-opacity duration-200 ${loading ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{kpis.revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{kpis.revenueGrowth}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalVisits}</div>
            <p className="text-xs text-muted-foreground">{kpis.visitsGrowth}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Customer Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{kpis.avgCustomerRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">{kpis.avgRevenueGrowth}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Customers</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalUniqueCustomers}</div>
            <p className="text-xs text-muted-foreground">{kpis.customersGrowth}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Growth Chart (Daily Revenue)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyStats} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#8884d8" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Category Wise Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Booking Count (Daily)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyStats} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="bookings" stroke="#82ca9d" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quarterly Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quarter</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quarterlyResults.map((row: any) => (
                  <TableRow key={row.quarter}>
                    <TableCell>{row.quarter}</TableCell>
                    <TableCell className="text-right">₹{row.revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{row.expenses.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">₹{row.profit.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(leaderboards).map(([key, data]: [string, any]) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
                    <RechartsTooltip />
                    <Bar dataKey="revenue" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      </div>
    </div>
  )
}
