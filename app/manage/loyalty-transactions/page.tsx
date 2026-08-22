"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Plus,
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Star,
  Gift,
  Calendar,
  IndianRupee,
  Users,
  RefreshCw,
} from "lucide-react"
import { getLoyaltyStats, updateLoyaltyPoints } from "@/app/actions/loyalty"

interface LoyaltyTransaction {
  id: string
  customer_id: string
  customer_name: string
  customer_email: string
  transaction_type: "earned" | "redeemed" | "expired" | "bonus" | "refund"
  points: number
  amount: number
  description: string
  reference_id?: string
  created_at: string
  expires_at?: string
}

interface LoyaltyStats {
  total_transactions: number
  total_points_issued: number
  total_points_redeemed: number
  total_points_expired: number
  active_customers: number
  total_value_redeemed: number
}

interface Customer {
  id: number
  name: string
  email: string
}

export default function LoyaltyTransactionsPage() {
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([])
  const [stats, setStats] = useState<LoyaltyStats>({
    total_transactions: 0,
    total_points_issued: 0,
    total_points_redeemed: 0,
    total_points_expired: 0,
    active_customers: 0,
    total_value_redeemed: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterDateRange, setFilterDateRange] = useState<string>("all")
  const [isAddTransactionDialogOpen, setIsAddTransactionDialogOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  // Form state for manual transactions
  const [transactionFormData, setTransactionFormData] = useState({
    customer_id: "",
    transaction_type: "bonus" as const,
    points: 0,
    description: "",
  })

  useEffect(() => {
    loadData()
    loadCustomers()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      console.log("[v0] Loading loyalty transactions and stats...")

      // Fetch real transactions from API
      const transactionsResponse = await fetch("/api/loyalty/customer?transactions=1&limit=1000")
      const transactionsData = await transactionsResponse.json()

      if (!transactionsData.success) {
        throw new Error(transactionsData.error || "Failed to fetch transactions")
      }

      // Fetch real stats from server action
      const realStats = await getLoyaltyStats()

      // Transform transactions data to match interface
      const transformedTransactions: LoyaltyTransaction[] = transactionsData.rows.map((row: any) => ({
        id: row.id.toString(),
        customer_id: row.customer_id.toString(),
        customer_name: row.customer_name || "Unknown Customer",
        customer_email: row.customer_email || "",
        transaction_type: row.transaction_type,
        points: Number(row.points) || 0,
        amount: Number(row.amount) || 0,
        description: row.description || "",
        reference_id: row.invoice_id?.toString(),
        created_at: row.created_at,
        expires_at: row.expires_at,
      }))

      // Calculate additional stats from transactions
      const totalTransactions = transformedTransactions.length
      const totalPointsRedeemed = transformedTransactions
        .filter((t) => t.transaction_type === "redeemed")
        .reduce((sum, t) => sum + t.points, 0)
      const totalPointsExpired = transformedTransactions
        .filter((t) => t.transaction_type === "expired")
        .reduce((sum, t) => sum + t.points, 0)
      const totalValueRedeemed = transformedTransactions
        .filter((t) => t.transaction_type === "redeemed")
        .reduce((sum, t) => sum + t.amount, 0)

      const combinedStats: LoyaltyStats = {
        total_transactions: totalTransactions,
        total_points_issued: realStats.total_points_issued,
        total_points_redeemed: totalPointsRedeemed,
        total_points_expired: totalPointsExpired,
        active_customers: realStats.active_members,
        total_value_redeemed: totalValueRedeemed,
      }

      setTransactions(transformedTransactions)
      setStats(combinedStats)
      console.log("[v0] Loaded", transformedTransactions.length, "transactions")
    } catch (error) {
      console.error("[v0] Error loading loyalty data:", error)
      toast({
        title: "Error",
        description: "Failed to load loyalty transactions",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const loadCustomers = async () => {
    try {
      const response = await fetch("/api/customers")
      const data = await response.json()

      if (data.success && Array.isArray(data.customers)) {
        setCustomers(
          data.customers.map((c: any) => ({
            id: c.id,
            name: c.full_name, // Map full_name to name
            email: c.email || "",
          })),
        )
      } else {
        console.error("[v0] Invalid customers API response:", data)
        setCustomers([])
      }
    } catch (error) {
      console.error("[v0] Error loading customers:", error)
      setCustomers([])
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
  }

  const handleAddTransaction = async () => {
    try {
      const selectedCustomer = customers.find((c) => c.id.toString() === transactionFormData.customer_id)
      if (!selectedCustomer) {
        toast({
          title: "Error",
          description: "Please select a customer",
          variant: "destructive",
        })
        return
      }

      // Use real server action to add transaction
      await updateLoyaltyPoints(
        Number(transactionFormData.customer_id),
        transactionFormData.points,
        transactionFormData.transaction_type === "bonus" ? "earned" : "redeemed",
        transactionFormData.description || `${transactionFormData.transaction_type} points`,
      )

      setIsAddTransactionDialogOpen(false)
      resetTransactionForm()

      // Reload data to show the new transaction
      await loadData()

      toast({
        title: "Success",
        description: "Loyalty transaction added successfully",
      })
    } catch (error) {
      console.error("[v0] Error adding transaction:", error)
      toast({
        title: "Error",
        description: "Failed to add loyalty transaction",
        variant: "destructive",
      })
    }
  }

  const resetTransactionForm = () => {
    setTransactionFormData({
      customer_id: "",
      transaction_type: "bonus",
      points: 0,
      description: "",
    })
  }

  const exportTransactions = () => {
    // Mock export functionality
    toast({
      title: "Export Started",
      description: "Your transaction report is being generated...",
    })
  }

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case "earned":
        return "bg-green-500"
      case "redeemed":
        return "bg-blue-500"
      case "bonus":
        return "bg-purple-500"
      case "refund":
        return "bg-orange-500"
      case "expired":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "earned":
        return <TrendingUp className="w-4 h-4" />
      case "redeemed":
        return <TrendingDown className="w-4 h-4" />
      case "bonus":
        return <Gift className="w-4 h-4" />
      case "refund":
        return <RefreshCw className="w-4 h-4" />
      case "expired":
        return <Calendar className="w-4 h-4" />
      default:
        return <Star className="w-4 h-4" />
    }
  }

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === "all" || transaction.transaction_type === filterType

    let matchesDate = true
    if (filterDateRange !== "all") {
      const transactionDate = new Date(transaction.created_at)
      const now = new Date()

      switch (filterDateRange) {
        case "today":
          matchesDate = transactionDate.toDateString() === now.toDateString()
          break
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          matchesDate = transactionDate >= weekAgo
          break
        case "month":
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          matchesDate = transactionDate >= monthAgo
          break
      }
    }

    return matchesSearch && matchesType && matchesDate
  })

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader title="Loyalty Transactions" subtitle="Track and manage customer loyalty points transactions" />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Star className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Transactions</p>
                    <p className="text-2xl font-bold">{stats.total_transactions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Points Issued</p>
                    <p className="text-2xl font-bold">{stats.total_points_issued.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Points Redeemed</p>
                    <p className="text-2xl font-bold">{stats.total_points_redeemed.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Points Expired</p>
                    <p className="text-2xl font-bold">{stats.total_points_expired.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Customers</p>
                    <p className="text-2xl font-bold">{stats.active_customers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <IndianRupee className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Value Redeemed</p>
                    <p className="text-2xl font-bold">₹{stats.total_value_redeemed.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-48">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by type" />
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
                  <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                    <SelectTrigger className="w-48">
                      <Calendar className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">Last 30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="gap-2 bg-transparent"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <Button variant="outline" onClick={exportTransactions} className="gap-2 bg-transparent">
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                  <Dialog open={isAddTransactionDialogOpen} onOpenChange={setIsAddTransactionDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Transaction
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Manual Transaction</DialogTitle>
                        <DialogDescription>Add points manually for a customer</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="customer_id">Customer</Label>
                          <Select
                            value={transactionFormData.customer_id}
                            onValueChange={(value) =>
                              setTransactionFormData({ ...transactionFormData, customer_id: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select customer" />
                            </SelectTrigger>
                            <SelectContent>
                              {customers.map((customer) => (
                                <SelectItem key={customer.id} value={customer.id.toString()}>
                                  {customer.name} - {customer.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="transaction_type">Transaction Type</Label>
                          <Select
                            value={transactionFormData.transaction_type}
                            onValueChange={(value: any) =>
                              setTransactionFormData({ ...transactionFormData, transaction_type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bonus">Bonus Points</SelectItem>
                              <SelectItem value="refund">Refund Points</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="points">Points</Label>
                          <Input
                            id="points"
                            type="number"
                            value={transactionFormData.points}
                            onChange={(e) =>
                              setTransactionFormData({
                                ...transactionFormData,
                                points: Number.parseInt(e.target.value) || 0,
                              })
                            }
                            placeholder="100"
                          />
                        </div>

                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={transactionFormData.description}
                            onChange={(e) =>
                              setTransactionFormData({ ...transactionFormData, description: e.target.value })
                            }
                            placeholder="Reason for this transaction..."
                          />
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                          <Button variant="outline" onClick={() => setIsAddTransactionDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddTransaction}>Add Transaction</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                All loyalty points transactions including earned, redeemed, and bonus points
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Expires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{transaction.customer_name}</div>
                            <div className="text-sm text-gray-500">{transaction.customer_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${getTransactionTypeColor(transaction.transaction_type)} text-white border-0`}
                          >
                            <div className="flex items-center gap-1">
                              {getTransactionIcon(transaction.transaction_type)}
                              {transaction.transaction_type}
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {["earned", "bonus", "refund"].includes(transaction.transaction_type) ? (
                              <span className="text-green-600 font-medium">+{transaction.points}</span>
                            ) : (
                              <span className="text-red-600 font-medium">-{transaction.points}</span>
                            )}
                            <Star className="w-3 h-3 text-yellow-500" />
                          </div>
                        </TableCell>
                        <TableCell>
                          {transaction.amount > 0 ? (
                            <span className="font-medium">₹{transaction.amount}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-sm">{transaction.description}</p>
                            {transaction.reference_id && (
                              <p className="text-xs text-gray-500">Ref: {transaction.reference_id}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(transaction.created_at).toLocaleDateString()}
                            <div className="text-xs text-gray-500">
                              {new Date(transaction.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {transaction.expires_at ? (
                            <div className="text-sm">{new Date(transaction.expires_at).toLocaleDateString()}</div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {filteredTransactions.length === 0 && !loading && (
                <div className="text-center py-8">
                  <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
                  <p className="text-gray-500 mb-4">No loyalty transactions match your current filters.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
