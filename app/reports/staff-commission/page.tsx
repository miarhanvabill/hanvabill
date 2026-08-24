"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { downloadCSV } from "@/lib/utils"
import { Download, ArrowLeft, DollarSign, Wallet, Activity } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface StaffCommission {
  id: number
  name: string
  role: string
  bookings_count: number
  total_revenue: number
  commission_type: string
  base_rate: number
  commission_earned: number
}

interface Summary {
  totalRevenue: number
  totalCommission: number
}

// ── Multi-Staff Split types ────────────────────────────────────────────────
interface SplitRow {
  staff_id: number
  staff_name: string
  service_name: string
  split_percentage: number
  revenue_amount: number
  invoice_id: number
  created_at: string
}

function dateRangeToISO(range: string): { startDate?: string; endDate?: string } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  switch (range) {
    case "Today":
      return { startDate: fmt(now), endDate: fmt(now) }
    case "Yesterday": {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      return { startDate: fmt(y), endDate: fmt(y) }
    }
    case "This Week": {
      const s = new Date(now)
      s.setDate(s.getDate() - s.getDay())
      return { startDate: fmt(s), endDate: fmt(now) }
    }
    case "Last 7 Days": {
      const s = new Date(now)
      s.setDate(s.getDate() - 6)
      return { startDate: fmt(s), endDate: fmt(now) }
    }
    case "This Month":
      return {
        startDate: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`,
        endDate: fmt(now),
      }
    case "Last 30 Days": {
      const s = new Date(now)
      s.setDate(s.getDate() - 29)
      return { startDate: fmt(s), endDate: fmt(now) }
    }
    case "This Year":
      return { startDate: `${now.getFullYear()}-01-01`, endDate: fmt(now) }
    default:
      return {}
  }
}

// ── Multi-Staff Split History component ───────────────────────────────────
function MultiStaffSplitHistory({ dateRange }: { dateRange: string }) {
  const [splits, setSplits] = useState<SplitRow[]>([])
  const [splitsLoading, setSplitsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setSplitsLoading(true)
      try {
        const { startDate, endDate } = dateRangeToISO(dateRange)
        const { getStaffCommissionSplits } = await import("@/app/actions/staff")
        const result = await getStaffCommissionSplits(startDate, endDate)
        if (result.success) setSplits(result.data)
      } catch (err) {
        console.error("Failed to load split history:", err)
      } finally {
        setSplitsLoading(false)
      }
    }
    load()
  }, [dateRange])

  // Aggregate per-staff totals from split rows
  const staffSummary = splits.reduce<Record<number, { name: string; total: number }>>(
    (acc, row) => {
      if (!acc[row.staff_id]) acc[row.staff_id] = { name: row.staff_name, total: 0 }
      acc[row.staff_id].total += row.revenue_amount
      return acc
    },
    {}
  )

  const handleExportSplits = () => {
    const csvData = [
      ["Staff", "Service", "Split %", "Revenue Amount", "Invoice ID", "Date"],
      ...splits.map((s) => [
        s.staff_name,
        s.service_name,
        `${s.split_percentage}%`,
        `₹${s.revenue_amount.toFixed(2)}`,
        String(s.invoice_id),
        new Date(s.created_at).toLocaleDateString("en-IN"),
      ]),
    ]
    downloadCSV(csvData, `multi_staff_splits_${dateRange.replace(/\s+/g, "_").toLowerCase()}.csv`)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base font-semibold">Multi-Staff Split History</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Revenue from services handled by multiple staff members
          </p>
        </div>
        {splits.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleExportSplits}>
            <Download className="mr-2 h-3 w-3" /> Export
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {splitsLoading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
          </div>
        ) : splits.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            No multi-staff split transactions found for this period.
          </div>
        ) : (
          <>
            {/* Per-staff revenue summary chips */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Revenue by Staff (from Splits)
              </p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(staffSummary).map(([id, { name, total }]) => (
                  <div
                    key={id}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-slate-50"
                  >
                    <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{name}</div>
                      <div className="text-sm font-bold text-violet-700">₹{total.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Split transactions table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Staff</th>
                    <th className="pb-3 font-medium">Service</th>
                    <th className="pb-3 font-medium text-center">Split %</th>
                    <th className="pb-3 font-medium text-right">Revenue</th>
                    <th className="pb-3 font-medium text-center">Invoice</th>
                    <th className="pb-3 font-medium text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {splits.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 font-medium text-slate-900">{row.staff_name}</td>
                      <td className="py-3 text-slate-600">{row.service_name}</td>
                      <td className="py-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800">
                          {row.split_percentage}%
                        </span>
                      </td>
                      <td className="py-3 text-right font-semibold text-slate-900">
                        ₹{row.revenue_amount.toFixed(2)}
                      </td>
                      <td className="py-3 text-center text-slate-500">#{row.invoice_id}</td>
                      <td className="py-3 text-right text-slate-500 text-xs">
                        {new Date(row.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function StaffCommissionPage() {
  const [dateRange, setDateRange] = useState("This Month")
  const [data, setData] = useState<StaffCommission[]>([])
  const [summary, setSummary] = useState<Summary>({ totalRevenue: 0, totalCommission: 0 })
  const [loading, setLoading] = useState(true)

  const fetchCommissions = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/reports/staff-commission?range=${dateRange}`)
      if (!res.ok) throw new Error("Failed to fetch data")
      const result = await res.json()
      setData(result.staffCommissions)
      setSummary(result.summary)
    } catch (error) {
      console.error(error)
      toast.error("Failed to load commission report")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCommissions()
  }, [dateRange])

  const handleExport = () => {
    const csvData = [
      ["Staff Member", "Role", "Services Handled", "Total Sales", "Commission Structure", "Commission Earned"],
      ...data.map((s) => [
        s.name,
        s.role,
        s.bookings_count.toString(),
        `₹${s.total_revenue.toFixed(2)}`,
        s.commission_type === "percentage" ? `${s.base_rate}%` : s.commission_type === "fixed" ? `₹${s.base_rate} fixed` : "None",
        `₹${s.commission_earned.toFixed(2)}`,
      ]),
    ]
    downloadCSV(csvData, `staff_commission_${dateRange.replace(/\s+/g, "_").toLowerCase()}.csv`)
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/reports">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader 
          title="Staff Commissions" 
          description="Track commissions earned by your staff based on their sales and commission profiles." 
        />
      </div>

      <div className="flex items-center justify-between">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Today">Today</SelectItem>
            <SelectItem value="Yesterday">Yesterday</SelectItem>
            <SelectItem value="This Week">This Week</SelectItem>
            <SelectItem value="Last 7 Days">Last 7 Days</SelectItem>
            <SelectItem value="This Month">This Month</SelectItem>
            <SelectItem value="Last 30 Days">Last 30 Days</SelectItem>
            <SelectItem value="This Year">This Year</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={handleExport} variant="outline" disabled={loading || data.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales Revenue</CardTitle>
            <Activity className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{summary.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Generated by staff</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Commissions Paid</CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">₹{summary.totalCommission.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Owed to staff</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Commission Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {summary.totalRevenue > 0 ? ((summary.totalCommission / summary.totalRevenue) * 100).toFixed(1) : "0.0"}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Blended rate</p>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Commission Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No commission data found for the selected period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Staff Member</th>
                    <th className="pb-3 font-medium">Services Handled</th>
                    <th className="pb-3 font-medium">Total Sales</th>
                    <th className="pb-3 font-medium">Commission Profile</th>
                    <th className="pb-3 font-medium text-right">Commission Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50">
                      <td className="py-4">
                        <div className="font-medium text-slate-900">{staff.name}</div>
                        <div className="text-xs text-slate-500">{staff.role}</div>
                      </td>
                      <td className="py-4">{staff.bookings_count}</td>
                      <td className="py-4 font-medium">₹{staff.total_revenue.toFixed(2)}</td>
                      <td className="py-4">
                        {staff.commission_type === "percentage" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {staff.base_rate}% of sales
                          </span>
                        ) : staff.commission_type === "fixed" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            ₹{staff.base_rate} per service
                          </span>
                        ) : (
                          <span className="text-slate-400">No Profile</span>
                        )}
                      </td>
                      <td className="py-4 text-right font-bold text-slate-900">
                        ₹{staff.commission_earned.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Multi-Staff Split History ──────────────────────────────────────── */}
      <MultiStaffSplitHistory dateRange={dateRange} />
    </div>
  )
}
