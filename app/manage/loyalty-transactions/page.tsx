"use client"

import { useState, useEffect, useCallback } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { toast } from "@/hooks/use-toast"
import {
  TrendingUp,
  TrendingDown,
  Star,
  Gift,
  Calendar,
  Users,
  RefreshCw,
  Download,
  Search,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Zap,
} from "lucide-react"
import { getLoyaltyDashboardStats, adjustLoyaltyPoints, getLoyaltySettings } from "@/app/actions/loyalty"
import { getCustomers } from "@/app/actions/customers"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

// ─── Types ─────────────────────────────────────────────────────────────────

type TxnType = "earned" | "redeemed" | "expired" | "bonus" | "refund"

interface LoyaltyTransaction {
  id: string
  customer_id: string
  customer_name: string
  customer_email: string
  transaction_type: TxnType
  points: number
  amount: number
  description: string
  reference_id?: string
  created_at: string
  expires_at?: string
}

interface DashboardStats {
  total_points_issued: number
  total_points_redeemed: number
  active_loyalty_members: number
  points_expiring_this_week: number
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const TYPE_META: Record<
  string,
  { label: string; bg: string; text: string; icon: React.ReactNode; positive: boolean }
> = {
  earned: {
    label: "Earned",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    icon: <ArrowUpRight className="w-3 h-3" />,
    positive: true,
  },
  bonus: {
    label: "Bonus",
    bg: "bg-violet-100",
    text: "text-violet-700",
    icon: <Gift className="w-3 h-3" />,
    positive: true,
  },
  refund: {
    label: "Refund",
    bg: "bg-amber-100",
    text: "text-amber-700",
    icon: <RefreshCw className="w-3 h-3" />,
    positive: true,
  },
  redeemed: {
    label: "Redeemed",
    bg: "bg-blue-100",
    text: "text-blue-700",
    icon: <ArrowDownRight className="w-3 h-3" />,
    positive: false,
  },
  expired: {
    label: "Expired",
    bg: "bg-red-100",
    text: "text-red-700",
    icon: <AlertCircle className="w-3 h-3" />,
    positive: false,
  },
}

function TypeBadge({ type }: { type: string }) {
  const meta = TYPE_META[type] ?? {
    label: type,
    bg: "bg-gray-100",
    text: "text-gray-700",
    icon: <Star className="w-3 h-3" />,
    positive: true,
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.bg} ${meta.text}`}
    >
      {meta.icon}
      {meta.label}
    </span>
  )
}

function PointsChip({ type, points }: { type: string; points: number }) {
  const isPositive = ["earned", "bonus", "refund"].includes(type)
  return (
    <span
      className={`font-bold text-sm tabular-nums ${
        isPositive ? "text-emerald-600" : "text-red-500"
      }`}
    >
      {isPositive ? "+" : "−"}
      {Math.abs(points).toLocaleString()}
    </span>
  )
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}
function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return n.toLocaleString()
}

function exportCSV(rows: LoyaltyTransaction[]) {
  const header = ["ID", "Customer", "Email", "Type", "Points", "Amount (Rs)", "Description", "Date", "Expires"]
  const lines = rows.map((r) =>
    [
      r.id,
      `"${r.customer_name}"`,
      r.customer_email,
      r.transaction_type,
      ["earned", "bonus", "refund"].includes(r.transaction_type) ? `+${r.points}` : `-${r.points}`,
      r.amount > 0 ? r.amount : "",
      `"${r.description}"`,
      fmtDate(r.created_at),
      r.expires_at ? fmtDate(r.expires_at) : "",
    ].join(",")
  )
  const csv = [header.join(","), ...lines].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `loyalty-transactions-${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Summary Card ───────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  icon,
  iconBg,
  iconColor,
  trend,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  trend?: "up" | "down" | "warn"
}) {
  return (
    <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0 ml-3`}>
            <span className={iconColor}>{icon}</span>
          </div>
        </div>
        {trend && (
          <div className="mt-3 pt-3 border-t border-gray-50">
            {trend === "up" && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <TrendingUp className="w-3 h-3" /> Points actively being earned
              </span>
            )}
            {trend === "down" && (
              <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                <TrendingDown className="w-3 h-3" /> Loyalty rewards being used
              </span>
            )}
            {trend === "warn" && (
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                <Clock className="w-3 h-3" /> Notify customers to redeem
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-3 py-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center px-1">
          <div className="h-9 w-9 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
            <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/4" />
          </div>
          <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
          <div className="h-4 w-12 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 15

export default function LoyaltyTransactionsPage() {
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [stats, setStats] = useState<DashboardStats>({
    total_points_issued: 0,
    total_points_redeemed: 0,
    active_loyalty_members: 0,
    points_expiring_this_week: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Adjust Points State
  const [isAdjustOpen, setIsAdjustOpen] = useState(false)
  const [adjustSubmitting, setAdjustSubmitting] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [adjustData, setAdjustData] = useState({
    customerId: "",
    points: "",
    type: "bonus" as "earned" | "redeemed" | "bonus" | "refund",
    description: "",
  })

  // Filters
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterDate, setFilterDate] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)

  // ── Build query params ─────────────────────────────────────────────────
  const buildApiUrl = useCallback(
    (page: number) => {
      const params = new URLSearchParams()
      params.set("transactions", "1")
      params.set("limit", String(ITEMS_PER_PAGE))
      params.set("offset", String((page - 1) * ITEMS_PER_PAGE))
      if (filterType !== "all") params.set("type", filterType)
      if (filterDate !== "all") {
        const now = new Date()
        if (filterDate === "today") {
          const start = new Date(now)
          start.setHours(0, 0, 0, 0)
          params.set("from", start.toISOString())
        } else if (filterDate === "week") {
          params.set("from", new Date(now.getTime() - 7 * 86400_000).toISOString())
        } else if (filterDate === "month") {
          params.set("from", new Date(now.getTime() - 30 * 86400_000).toISOString())
        } else if (filterDate === "quarter") {
          params.set("from", new Date(now.getTime() - 90 * 86400_000).toISOString())
        }
      }
      return `/api/loyalty/customer?${params.toString()}`
    },
    [filterType, filterDate]
  )

  // ── Load transactions ──────────────────────────────────────────────────
  const loadTransactions = useCallback(
    async (page: number) => {
      try {
        setLoading(true)
        const res = await fetch(buildApiUrl(page))
        const data = await res.json()
        if (!data.success) throw new Error(data.error || "Failed to fetch")

        const mapped: LoyaltyTransaction[] = (data.rows || []).map((r: any) => ({
          id: String(r.id),
          customer_id: String(r.customer_id),
          customer_name: r.customer_name || "Unknown Customer",
          customer_email: r.customer_email || "",
          transaction_type: r.transaction_type,
          points: Number(r.points) || 0,
          amount: Number(r.amount) || 0,
          description: r.description || "",
          reference_id: r.invoice_id ? String(r.invoice_id) : undefined,
          created_at: r.created_at,
          expires_at: r.expires_at,
        }))

        setTransactions(mapped)
        setTotalRows(data.total || 0)
        if (data.stats) {
          setStats(data.stats)
        }
      } catch (e: any) {
        toast({
          title: "Error loading transactions",
          description: e.message,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [buildApiUrl]
  )

  // ── Load dashboard stats ───────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const s = await getLoyaltyDashboardStats()
      setStats(s)
    } catch (e) {
      console.error("Failed to load loyalty stats", e)
    }
  }, [])

  const loadData = useCallback(async () => {
    try {
      const [cust, setts] = await Promise.all([getCustomers(), getLoyaltySettings()])
      setCustomers(cust)
      setSettings(setts)
    } catch (e) {
      console.error(e)
    }
  }, [])

  // ── Initial load ───────────────────────────────────────────────────────
  useEffect(() => {
    loadStats()
    loadData()
    loadTransactions(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Re-fetch on filter change ──────────────────────────────────────────
  useEffect(() => {
    setCurrentPage(1)
    loadTransactions(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterDate])

  // ── Page change ────────────────────────────────────────────────────────
  useEffect(() => {
    loadTransactions(currentPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage])

  const handleAdjustSubmit = async () => {
    if (!adjustData.customerId || !adjustData.points) {
      toast({ title: "Validation Error", description: "Customer and Points are required", variant: "destructive" })
      return
    }
    try {
      setAdjustSubmitting(true)
      await adjustLoyaltyPoints(
        Number(adjustData.customerId),
        Number(adjustData.points),
        adjustData.type,
        adjustData.description || "Manual adjustment"
      )
      toast({ title: "Success", description: "Points adjusted successfully." })
      setIsAdjustOpen(false)
      setAdjustData({ customerId: "", points: "", type: "bonus", description: "" })
      handleRefresh()
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to adjust points", variant: "destructive" })
    } finally {
      setAdjustSubmitting(false)
    }
  }

  // Client-side search on fetched page
  const visible = search.trim()
    ? transactions.filter(
        (t) =>
          t.customer_name.toLowerCase().includes(search.toLowerCase()) ||
          t.customer_email.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase())
      )
    : transactions

  const totalPages = Math.ceil(totalRows / ITEMS_PER_PAGE)

  const handleRefresh = () => {
    setRefreshing(true)
    loadStats()
    loadTransactions(currentPage)
  }

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/loyalty/customer?transactions=1&limit=1000&offset=0`)
      const data = await res.json()
      if (data.success && data.rows?.length) {
        const rows: LoyaltyTransaction[] = data.rows.map((r: any) => ({
          id: String(r.id),
          customer_id: String(r.customer_id),
          customer_name: r.customer_name || "Unknown",
          customer_email: r.customer_email || "",
          transaction_type: r.transaction_type,
          points: Number(r.points) || 0,
          amount: Number(r.amount) || 0,
          description: r.description || "",
          reference_id: r.invoice_id ? String(r.invoice_id) : undefined,
          created_at: r.created_at,
          expires_at: r.expires_at,
        }))
        exportCSV(rows)
        toast({ title: "Export ready", description: `${rows.length} transactions exported.` })
      } else {
        toast({ title: "Nothing to export", description: "No transactions found." })
      }
    } catch {
      toast({ title: "Export failed", variant: "destructive" })
    }
  }

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-screen">
      <div className="px-6 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Loyalty Transactions"
          subtitle={
            settings
              ? `Track points. Current Value: 1 Point = ₹${settings.points_per_rupee || 1}`
              : "Track every point earned, redeemed, and expiring across all customers"
          }
        />
        <Button onClick={() => setIsAdjustOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm">
          <Zap className="w-4 h-4 mr-2" />
          Adjust Points
        </Button>
      </div>

      <main className="flex-1 px-6 pb-6 pt-2">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              label="Points Issued"
              value={formatNumber(stats.total_points_issued)}
              sub="Total earned across all members"
              icon={<Star className="w-5 h-5" />}
              iconBg="bg-amber-50"
              iconColor="text-amber-500"
              trend="up"
            />
            <SummaryCard
              label="Points Redeemed"
              value={formatNumber(stats.total_points_redeemed)}
              sub="Used at checkout"
              icon={<TrendingDown className="w-5 h-5" />}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              trend="down"
            />
            <SummaryCard
              label="Active Members"
              value={stats.active_loyalty_members.toLocaleString()}
              sub="Customers with loyalty activity"
              icon={<Users className="w-5 h-5" />}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
            />
            <SummaryCard
              label="Expiring This Week"
              value={formatNumber(stats.points_expiring_this_week)}
              sub="Points expiring within 7 days"
              icon={<Clock className="w-5 h-5" />}
              iconBg={stats.points_expiring_this_week > 0 ? "bg-red-50" : "bg-gray-50"}
              iconColor={stats.points_expiring_this_week > 0 ? "text-red-500" : "text-gray-400"}
              trend={stats.points_expiring_this_week > 0 ? "warn" : undefined}
            />
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search customer name, email or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm border-gray-200"
                />
              </div>

              {/* Type filter */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-44 h-9 text-sm border-gray-200">
                  <SelectValue placeholder="Transaction type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="earned">Earned</SelectItem>
                  <SelectItem value="redeemed">Redeemed</SelectItem>
                  <SelectItem value="bonus">Bonus</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>

              {/* Date filter */}
              <Select value={filterDate} onValueChange={setFilterDate}>
                <SelectTrigger className="w-36 h-9 text-sm border-gray-200">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="quarter">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="h-9 border-gray-200 text-gray-600 hover:text-gray-900"
                >
                  <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  onClick={handleExport}
                  className="h-9 bg-violet-600 hover:bg-violet-700 text-white"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Active filter chips */}
            {(filterType !== "all" || filterDate !== "all") && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {filterType !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                    <Zap className="w-3 h-3" /> {filterType}
                    <button onClick={() => setFilterType("all")} className="ml-1 hover:text-violet-900">
                      x
                    </button>
                  </span>
                )}
                {filterDate !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    <Calendar className="w-3 h-3" />{" "}
                    {filterDate === "today"
                      ? "Today"
                      : filterDate === "week"
                      ? "Last 7 days"
                      : filterDate === "month"
                      ? "Last 30 days"
                      : "Last 90 days"}
                    <button onClick={() => setFilterDate("all")} className="ml-1 hover:text-blue-900">
                      x
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Table subheader */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Transactions</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {loading ? "Loading..." : `${totalRows.toLocaleString()} total`}
                </p>
              </div>
              {!loading && visible.length !== transactions.length && (
                <p className="text-xs text-gray-400">
                  {visible.length} match{visible.length !== 1 ? "es" : ""} for &quot;{search}&quot;
                </p>
              )}
            </div>

            {loading ? (
              <div className="px-5 py-4">
                <TableSkeleton />
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Star className="w-7 h-7 text-gray-300" />
                </div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">No transactions found</h3>
                <p className="text-sm text-gray-400 max-w-xs">
                  {search
                    ? `No results for "${search}". Try a different search term.`
                    : "No loyalty transactions match your current filters."}
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/60 hover:bg-gray-50/60">
                      <TableHead className="pl-5 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                        Customer
                      </TableHead>
                      <TableHead className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                        Type
                      </TableHead>
                      <TableHead className="text-xs text-gray-500 font-semibold uppercase tracking-wide text-right">
                        Points
                      </TableHead>
                      <TableHead className="text-xs text-gray-500 font-semibold uppercase tracking-wide text-right">
                        Amount
                      </TableHead>
                      <TableHead className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                        Description
                      </TableHead>
                      <TableHead className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                        Date
                      </TableHead>
                      <TableHead className="pr-5 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                        Expires
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((txn, idx) => (
                      <TableRow
                        key={txn.id}
                        className={`hover:bg-gray-50/70 transition-colors border-b border-gray-50 ${
                          idx % 2 === 0 ? "" : "bg-gray-50/30"
                        }`}
                      >
                        {/* Customer */}
                        <TableCell className="pl-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {txn.customer_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 leading-tight">
                                {txn.customer_name}
                              </p>
                              {txn.customer_email && (
                                <p className="text-xs text-gray-400 leading-tight mt-0.5">
                                  {txn.customer_email}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Type */}
                        <TableCell className="py-3.5">
                          <TypeBadge type={txn.transaction_type} />
                        </TableCell>

                        {/* Points */}
                        <TableCell className="py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <PointsChip type={txn.transaction_type} points={txn.points} />
                            <Star className="w-3 h-3 text-amber-400 flex-shrink-0" />
                          </div>
                        </TableCell>

                        {/* Amount */}
                        <TableCell className="py-3.5 text-right">
                          {txn.amount > 0 ? (
                            <span className="text-sm font-medium text-gray-800">
                              &#8377;{txn.amount.toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-sm">&#8212;</span>
                          )}
                        </TableCell>

                        {/* Description */}
                        <TableCell className="py-3.5 max-w-[220px]">
                          <p className="text-sm text-gray-700 truncate">{txn.description}</p>
                          {txn.reference_id && (
                            <p className="text-xs text-gray-400 mt-0.5">Inv #{txn.reference_id}</p>
                          )}
                        </TableCell>

                        {/* Date */}
                        <TableCell className="py-3.5">
                          <p className="text-sm text-gray-700">{fmtDate(txn.created_at)}</p>
                          <p className="text-xs text-gray-400">{fmtTime(txn.created_at)}</p>
                        </TableCell>

                        {/* Expires */}
                        <TableCell className="pr-5 py-3.5">
                          {txn.expires_at ? (
                            (() => {
                              const daysLeft = Math.ceil(
                                (new Date(txn.expires_at).getTime() - Date.now()) / 86400_000
                              )
                              return (
                                <div>
                                  <p className="text-sm text-gray-700">{fmtDate(txn.expires_at)}</p>
                                  {daysLeft <= 7 && daysLeft > 0 && (
                                    <p className="text-xs text-red-500 font-medium mt-0.5">
                                      {daysLeft}d left
                                    </p>
                                  )}
                                  {daysLeft <= 0 && (
                                    <p className="text-xs text-gray-400 mt-0.5">Expired</p>
                                  )}
                                </div>
                              )
                            })()
                          ) : (
                            <span className="text-gray-300 text-sm">No expiry</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="border-t border-gray-50 px-5 py-3 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      Page {currentPage} of {totalPages} &nbsp;&#183;&nbsp;{" "}
                      {totalRows.toLocaleString()} total records
                    </p>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              if (currentPage > 1) setCurrentPage((p) => p - 1)
                            }}
                            className={
                              currentPage === 1
                                ? "pointer-events-none opacity-40"
                                : "cursor-pointer hover:bg-gray-100"
                            }
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <span className="text-sm px-3 text-gray-600 font-medium">
                            {currentPage} / {totalPages}
                          </span>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              if (currentPage < totalPages) setCurrentPage((p) => p + 1)
                            }}
                            className={
                              currentPage === totalPages
                                ? "pointer-events-none opacity-40"
                                : "cursor-pointer hover:bg-gray-100"
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Adjust Points Modal */}
      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adjust Loyalty Points</DialogTitle>
            <DialogDescription>
              Manually add or deduct points for a customer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Customer</label>
              <Select
                value={adjustData.customerId}
                onValueChange={(val) => setAdjustData({ ...adjustData, customerId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {customers.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.full_name} {c.email ? `(${c.email})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Adjustment Type</label>
              <Select
                value={adjustData.type}
                onValueChange={(val: any) => setAdjustData({ ...adjustData, type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bonus">Bonus (Add Points)</SelectItem>
                  <SelectItem value="refund">Refund (Add Points)</SelectItem>
                  <SelectItem value="redeemed">Deduct (Remove Points)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Points Amount</label>
              <Input
                type="number"
                placeholder="e.g. 500"
                min="1"
                value={adjustData.points}
                onChange={(e) => setAdjustData({ ...adjustData, points: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Description / Reason</label>
              <Textarea
                placeholder="e.g. Compensation for bad experience"
                rows={3}
                value={adjustData.description}
                onChange={(e) => setAdjustData({ ...adjustData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjustOpen(false)} disabled={adjustSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleAdjustSubmit} disabled={adjustSubmitting} className="bg-violet-600 hover:bg-violet-700 text-white">
              {adjustSubmitting ? "Adjusting..." : "Confirm Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
