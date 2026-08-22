"use client"

import { useState, useEffect, useCallback } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { Plus, Search, Wallet, TrendingUp, Users, Gift, Eye, History } from "lucide-react"
import { formatCurrency } from "@/lib/currency"
import { getCustomerWallets, getWalletTransactions, addWalletPoints } from "@/app/actions/wallet"
interface WalletTransaction {
  id: string
  customerId: string
  customerName: string
  type: "earned" | "redeemed" | "bonus" | "refund"
  points: number
  amount: number
  description: string
  createdAt: string
}

interface CustomerWallet {
  id: string
  customerId: string
  customerName: string
  customerPhone: string
  totalPoints: number
  lifetimeEarned: number
  lifetimeRedeemed: number
  tier: "bronze" | "silver" | "gold" | "platinum"
  lastActivity: string
}

export default function WalletManagePage() {
  const [wallets, setWallets] = useState<CustomerWallet[]>([])
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedWallet, setSelectedWallet] = useState<CustomerWallet | null>(null)
  const [isAddPointsDialogOpen, setIsAddPointsDialogOpen] = useState(false)
  const [isTransactionHistoryOpen, setIsTransactionHistoryOpen] = useState(false)
  const [formData, setFormData] = useState({
    points: "",
    type: "bonus" as "bonus" | "refund",
    description: "",
  })

  const fetchWalletData = useCallback(async () => {
    try {
      const [walletsData, transactionsData] = await Promise.all([
        getCustomerWallets(),
        getWalletTransactions(),
      ])

      setWallets(walletsData)
      setTransactions(transactionsData)
      setLastFetch(new Date())
      setIsOnline(true)
    } catch (error) {
      console.error("Failed to fetch wallet data:", error)
      setIsOnline(false)

      // Fallback mock data
      const mockWallets: CustomerWallet[] = [
        {
          id: "1",
          customerId: "1",
          customerName: "Sarah Johnson",
          customerPhone: "+91 98765 43210",
          totalPoints: 1250,
          lifetimeEarned: 2500,
          lifetimeRedeemed: 1250,
          tier: "gold",
          lastActivity: "2024-01-20T14:30:00Z",
        },
        {
          id: "2",
          customerId: "2",
          customerName: "Michael Chen",
          customerPhone: "+91 98765 43211",
          totalPoints: 850,
          lifetimeEarned: 1800,
          lifetimeRedeemed: 950,
          tier: "silver",
          lastActivity: "2024-01-18T11:00:00Z",
        },
      ]

      const mockTransactions: WalletTransaction[] = [
        {
          id: "1",
          customerId: "1",
          customerName: "Sarah Johnson",
          type: "earned",
          points: 120,
          amount: 1200,
          description: "Points earned from purchase",
          createdAt: "2024-01-20T14:30:00Z",
        },
      ]

      setWallets(mockWallets)
      setTransactions(mockTransactions)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWalletData()
    const interval = setInterval(fetchWalletData, 30000)
    return () => clearInterval(interval)
  }, [fetchWalletData])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      fetchWalletData()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [fetchWalletData])

  const handleAddPoints = async () => {
    if (!selectedWallet || !formData.points || !formData.description) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      const result = await addWalletPoints(
        selectedWallet.customerId,
        Number(formData.points),
        formData.type,
        formData.description
      )

      if (result.success) {
        // Refresh data
        await fetchWalletData()

        // Reset form
        setFormData({
          points: "",
          type: "bonus",
          description: "",
        })
        setIsAddPointsDialogOpen(false)
        setSelectedWallet(null)

        toast({
          title: "Success",
          description: `${formData.points} points added to ${selectedWallet.customerName}'s wallet!`,
        })
      } else {
        throw new Error(result.error || "Failed to add points")
      }
    } catch (error) {
      console.error("Error adding points:", error)
      toast({
        title: "Error",
        description: "Failed to add points. Please try again.",
        variant: "destructive",
      })
    }
  }

  const filteredWallets = wallets.filter(
    (wallet) =>
      wallet.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || wallet.customerPhone.includes(searchTerm),
  )

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "bronze":
        return "bg-orange-100 text-orange-800"
      case "silver":
        return "bg-gray-100 text-gray-800"
      case "gold":
        return "bg-yellow-100 text-yellow-800"
      case "platinum":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const totalPoints = wallets.reduce((sum, wallet) => sum + wallet.totalPoints, 0)
  const totalCustomers = wallets.length
  const averagePoints = totalCustomers > 0 ? Math.round(totalPoints / totalCustomers) : 0

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading wallet data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Wallet Management"
        subtitle="Manage customer loyalty points and wallet balances"
        action={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-gray-600">
                {isOnline ? "Live" : "Offline"} • {wallets.length} wallets
                {lastFetch && <span className="ml-2 text-gray-400">Updated {lastFetch.toLocaleTimeString()}</span>}
              </span>
              <Button variant="ghost" size="sm" onClick={fetchWalletData} disabled={loading} className="ml-2">
                🔄 Refresh
              </Button>
            </div>
            <Button
              onClick={() => setIsTransactionHistoryOpen(true)}
              variant="outline"
              className="gap-2 bg-transparent"
            >
              <History className="w-4 h-4" />
              Transaction History
            </Button>
          </div>
        }
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Points</p>
                    <p className="text-2xl font-bold">{totalPoints.toLocaleString()}</p>
                  </div>
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Wallets</p>
                    <p className="text-2xl font-bold">{totalCustomers}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Average Points</p>
                    <p className="text-2xl font-bold">{averagePoints}</p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Gold+ Members</p>
                    <p className="text-2xl font-bold">
                      {wallets.filter((w) => w.tier === "gold" || w.tier === "platinum").length}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Gift className="w-4 h-4 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="p-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search customers by name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Wallets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWallets.map((wallet) => (
              <Card key={wallet.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">{wallet.customerName}</CardTitle>
                      <p className="text-sm text-gray-600">{wallet.customerPhone}</p>
                      <Badge className={`mt-2 ${getTierColor(wallet.tier)} capitalize`}>{wallet.tier}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedWallet(wallet)
                          setIsTransactionHistoryOpen(true)
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedWallet(wallet)
                          setIsAddPointsDialogOpen(true)
                        }}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600">Current Balance</p>
                      <p className="text-3xl font-bold text-purple-600">{wallet.totalPoints}</p>
                      <p className="text-xs text-gray-500">points</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Lifetime Earned</p>
                        <p className="font-semibold text-green-600">{wallet.lifetimeEarned}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Lifetime Redeemed</p>
                        <p className="font-semibold text-red-600">{wallet.lifetimeRedeemed}</p>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      <p>Last Activity: {new Date(wallet.lastActivity).toLocaleDateString("en-IN")}</p>
                    </div>

                    {/* Points Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Tier Progress</span>
                        <span>
                          {wallet.tier === "bronze" && "Bronze"}
                          {wallet.tier === "silver" && "Silver"}
                          {wallet.tier === "gold" && "Gold"}
                          {wallet.tier === "platinum" && "Platinum"}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            wallet.tier === "bronze"
                              ? "bg-orange-500"
                              : wallet.tier === "silver"
                                ? "bg-gray-500"
                                : wallet.tier === "gold"
                                  ? "bg-yellow-500"
                                  : "bg-purple-500"
                          }`}
                          style={{
                            width: `${
                              wallet.tier === "bronze"
                                ? Math.min((wallet.lifetimeEarned / 1000) * 100, 100)
                                : wallet.tier === "silver"
                                  ? Math.min(((wallet.lifetimeEarned - 1000) / 2000) * 100, 100)
                                  : wallet.tier === "gold"
                                    ? Math.min(((wallet.lifetimeEarned - 3000) / 2000) * 100, 100)
                                    : 100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredWallets.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">No wallets found matching your criteria.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Add Points Dialog */}
      <Dialog open={isAddPointsDialogOpen} onOpenChange={setIsAddPointsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Points to Wallet</DialogTitle>
          </DialogHeader>
          {selectedWallet && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedWallet.customerName}</p>
                <p className="text-sm text-gray-600">{selectedWallet.customerPhone}</p>
                <p className="text-sm text-purple-600">Current Balance: {selectedWallet.totalPoints} points</p>
              </div>

              <div>
                <Label htmlFor="points">Points to Add *</Label>
                <Input
                  id="points"
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                  placeholder="100"
                  required
                />
              </div>

              <div>
                <Label htmlFor="type">Transaction Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "bonus" | "refund") => setFormData({ ...formData, type: value })}
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
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Reason for adding points..."
                  required
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddPointsDialogOpen(false)
                    setSelectedWallet(null)
                    setFormData({ points: "", type: "bonus", description: "" })
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleAddPoints} className="flex-1">
                  Add Points
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={isTransactionHistoryOpen} onOpenChange={setIsTransactionHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedWallet ? `${selectedWallet.customerName}'s Transaction History` : "All Transactions"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {transactions
              .filter((t) => !selectedWallet || t.customerId === selectedWallet.customerId)
              .map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          transaction.type === "earned"
                            ? "bg-green-100 text-green-800"
                            : transaction.type === "redeemed"
                              ? "bg-red-100 text-red-800"
                              : transaction.type === "bonus"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-purple-100 text-purple-800"
                        }
                      >
                        {transaction.type}
                      </Badge>
                      <span className="font-medium">{transaction.customerName}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{transaction.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(transaction.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${transaction.type === "redeemed" ? "text-red-600" : "text-green-600"}`}
                    >
                      {transaction.type === "redeemed" ? "-" : "+"}
                      {transaction.points} points
                    </p>
                    {transaction.amount > 0 && (
                      <p className="text-sm text-gray-600">{formatCurrency(transaction.amount)}</p>
                    )}
                  </div>
                </div>
              ))}

            {transactions.filter((t) => !selectedWallet || t.customerId === selectedWallet.customerId).length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No transactions found.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
