"use client"

import { useState, useEffect, useMemo } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Gift,
  Plus,
  CreditCard,
  TrendingUp,
  Users,
  Wallet,
  Copy,
  Check,
  Share2,
  Printer,
  Search,
  RefreshCw,
  History,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Ban,
  ArrowUpRight,
  Sparkles,
  Phone,
  Mail,
  User,
  SlidersHorizontal,
  ChevronRight,
  Building2,
  CheckCircle,
} from "lucide-react"
import {
  getGiftCards,
  createGiftCard,
  getGiftCardStats,
  addGiftCardBalance,
  updateGiftCardStatus,
  getGiftCardTransactions,
  type GiftCard,
  type GiftCardStats,
  type GiftCardTransaction,
} from "@/app/actions/gift-cards"
import { getCustomers, type Customer } from "@/app/actions/customers"
import { getBusinessSettings } from "@/app/actions/settings"
import { formatCurrency } from "@/lib/currency"

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000]

export default function GiftCardsPage() {
  const [giftCards, setGiftCards] = useState<GiftCard[]>([])
  const [stats, setStats] = useState<GiftCardStats>({
    total_cards: 0,
    total_value: 0,
    redeemed_value: 0,
    active_cards: 0,
    active_balance: 0,
  })
  const [customers, setCustomers] = useState<Customer[]>([])
  const [businessSettings, setBusinessSettings] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<string>("all")

  // Copy feedback tracking
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    amount: "1000",
    code: "",
    isCustomCode: false,
    selectedCustomerId: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    expiryDays: "365",
    notes: "",
  })

  // Celebration / Success Modal
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [createdCard, setCreatedCard] = useState<GiftCard | null>(null)

  // Voucher Preview / Print Modal
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false)
  const [selectedVoucherCard, setSelectedVoucherCard] = useState<GiftCard | null>(null)

  // Transaction Ledger Modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [historyCard, setHistoryCard] = useState<GiftCard | null>(null)
  const [transactions, setTransactions] = useState<GiftCardTransaction[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Top Up Modal
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false)
  const [topUpCard, setTopUpCard] = useState<GiftCard | null>(null)
  const [topUpAmount, setTopUpAmount] = useState("")
  const [topUpNotes, setTopUpNotes] = useState("")
  const [isSubmittingTopUp, setIsSubmittingTopUp] = useState(false)

  // Status Change Modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [statusCard, setStatusCard] = useState<GiftCard | null>(null)
  const [newStatus, setNewStatus] = useState<"active" | "used" | "expired" | "void">("active")
  const [statusNotes, setStatusNotes] = useState("")
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [cardsData, statsData, customersData, settingsData] = await Promise.all([
        getGiftCards(),
        getGiftCardStats(),
        getCustomers().catch(() => []),
        getBusinessSettings().catch(() => null),
      ])

      setGiftCards(cardsData)
      setStats(statsData)
      setCustomers(customersData || [])
      setBusinessSettings(settingsData)
    } catch (error) {
      console.error("Failed to load gift cards:", error)
      toast.error("Failed to load gift cards data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyCode = (code: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(code)
      setCopiedCode(code)
      toast.success(`Copied code: ${code}`)
      setTimeout(() => setCopiedCode(null), 2000)
    }
  }

  const generateRandomCode = () => {
    const p1 = Math.random().toString(36).substring(2, 6).toUpperCase()
    const p2 = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `GC-${p1}-${p2}`
  }

  const handleSelectCustomer = (customerId: string) => {
    if (!customerId || customerId === "none") {
      setCreateForm((prev) => ({
        ...prev,
        selectedCustomerId: "",
        customerName: "",
        customerPhone: "",
        customerEmail: "",
      }))
      return
    }
    const found = customers.find((c) => String(c.id) === customerId)
    if (found) {
      setCreateForm((prev) => ({
        ...prev,
        selectedCustomerId: customerId,
        customerName: found.full_name || "",
        customerPhone: found.phone_number || "",
        customerEmail: found.email || "",
      }))
    }
  }

  const handleCreateGiftCard = async (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = Number(createForm.amount)
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount greater than ₹0")
      return
    }

    setIsCreating(true)
    try {
      const expiry =
        createForm.expiryDays === "never" || createForm.expiryDays === "0"
          ? null
          : Number(createForm.expiryDays) || 365

      const res = await createGiftCard({
        amount: numAmount,
        code: createForm.isCustomCode && createForm.code.trim() ? createForm.code.trim() : undefined,
        customerName: createForm.customerName.trim() || undefined,
        customerPhone: createForm.customerPhone.trim() || undefined,
        customerEmail: createForm.customerEmail.trim() || undefined,
        customerId: createForm.selectedCustomerId ? Number(createForm.selectedCustomerId) : undefined,
        expiryDays: expiry,
        notes: createForm.notes.trim() || undefined,
      })

      if (res.success && res.card) {
        toast.success("Gift Card created successfully!")
        setIsCreateModalOpen(false)
        setCreatedCard(res.card)
        setIsSuccessModalOpen(true)
        setCreateForm({
          amount: "1000",
          code: "",
          isCustomCode: false,
          selectedCustomerId: "",
          customerName: "",
          customerPhone: "",
          customerEmail: "",
          expiryDays: "365",
          notes: "",
        })
        loadData()
      } else {
        toast.error(res.error || "Failed to create gift card")
      }
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred")
    } finally {
      setIsCreating(false)
    }
  }

  const openHistoryModal = async (card: GiftCard) => {
    setHistoryCard(card)
    setIsHistoryModalOpen(true)
    setLoadingHistory(true)
    try {
      const txs = await getGiftCardTransactions(card.id)
      setTransactions(txs)
    } catch (err) {
      toast.error("Failed to load transaction history")
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topUpCard) return
    const amt = Number(topUpAmount)
    if (!amt || isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid top-up amount")
      return
    }

    setIsSubmittingTopUp(true)
    try {
      const res = await addGiftCardBalance(topUpCard.id, amt, topUpNotes.trim() || undefined)
      if (res.success) {
        toast.success(`Added ${formatCurrency(amt)} to Gift Card #${topUpCard.code}`)
        setIsTopUpModalOpen(false)
        setTopUpAmount("")
        setTopUpNotes("")
        loadData()
      } else {
        toast.error(res.error || "Failed to add balance")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reload balance")
    } finally {
      setIsSubmittingTopUp(false)
    }
  }

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!statusCard) return

    setIsSubmittingStatus(true)
    try {
      const res = await updateGiftCardStatus(statusCard.id, newStatus, statusNotes.trim() || undefined)
      if (res.success) {
        toast.success(`Gift card status updated to ${newStatus}`)
        setIsStatusModalOpen(false)
        setStatusNotes("")
        loadData()
      } else {
        toast.error(res.error || "Failed to update status")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update status")
    } finally {
      setIsSubmittingStatus(false)
    }
  }

  const getWhatsAppShareUrl = (card: GiftCard) => {
    const salonName = businessSettings?.name || "Hanva Salon"
    const phone = (card.customer_phone || "").replace(/\D/g, "")
    const expiryText = card.expires_at
      ? `Valid till: ${new Date(card.expires_at).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`
      : "Validity: Never Expires"
    const balanceText = formatCurrency(card.balance)

    const text = `Hello ${card.customer_name || "Valued Client"}! 🎁\n\nYou have received a Gift Voucher for *${salonName}*!\n\n💳 *Voucher Code:* ${card.code}\n💰 *Balance:* ${balanceText}\n⏳ *${expiryText}*\n${card.notes ? `📝 *Note:* "${card.notes}"\n` : ""}\nPresent this code at checkout to redeem against any services or products. We look forward to seeing you soon! ✨`

    if (phone && phone.length >= 10) {
      const cleaned = phone.length === 10 ? `91${phone}` : phone
      return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`
    }
    return `https://wa.me/?text=${encodeURIComponent(text)}`
  }

  // Filtered Gift Cards List
  const filteredCards = useMemo(() => {
    return giftCards.filter((card) => {
      // Tab filter
      if (activeTab === "active" && card.status !== "active") return false
      if (activeTab === "partial") {
        if (card.status !== "active" || card.balance >= card.amount || card.balance <= 0) return false
      }
      if (activeTab === "used" && card.status !== "used" && card.balance > 0) return false
      if (activeTab === "expired" && card.status !== "expired") return false
      if (activeTab === "void" && card.status !== "void") return false

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesCode = card.code.toLowerCase().includes(q)
        const matchesName = (card.customer_name || "").toLowerCase().includes(q)
        const matchesPhone = (card.customer_phone || "").includes(q)
        return matchesCode || matchesName || matchesPhone
      }

      return true
    })
  }, [giftCards, activeTab, searchQuery])

  const getStatusBadge = (card: GiftCard) => {
    if (card.status === "void") {
      return (
        <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
          <Ban className="w-3 h-3 mr-1" /> Void
        </Badge>
      )
    }
    if (card.status === "expired") {
      return (
        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
          <Clock className="w-3 h-3 mr-1" /> Expired
        </Badge>
      )
    }
    if (card.balance <= 0 || card.status === "used") {
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Redeemed
        </Badge>
      )
    }
    if (card.balance < card.amount) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <Sparkles className="w-3 h-3 mr-1" /> Partially Used
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
        <CheckCircle className="w-3 h-3 mr-1" /> Active
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
        <PageHeader title="Gift Cards & Vouchers" subtitle="Loading gift cards..." />
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto" />
            <p className="text-sm text-slate-500">Loading gift cards & ledger...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
      <PageHeader
        title="Gift Cards & Vouchers"
        subtitle="Issue prepaid vouchers, track redemptions, and monitor outstanding liability."
        action={
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Issue Gift Card
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Issued</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total_cards}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{stats.active_cards} currently active</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Value Sold</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.total_value)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Prepaid sales revenue</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <Gift className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Redeemed</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.redeemed_value)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Utilized at checkout</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Balance</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.active_balance)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Outstanding store liability</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls: Search & Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by code, customer name, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white shadow-xs border-slate-200"
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <TabsList className="bg-white border shadow-xs">
                <TabsTrigger value="all" className="text-xs">
                  All ({giftCards.length})
                </TabsTrigger>
                <TabsTrigger value="active" className="text-xs">
                  Active ({giftCards.filter((c) => c.status === "active").length})
                </TabsTrigger>
                <TabsTrigger value="partial" className="text-xs">
                  Partial ({giftCards.filter((c) => c.status === "active" && c.balance < c.amount && c.balance > 0).length})
                </TabsTrigger>
                <TabsTrigger value="used" className="text-xs">
                  Redeemed ({giftCards.filter((c) => c.status === "used" || c.balance <= 0).length})
                </TabsTrigger>
                <TabsTrigger value="expired" className="text-xs">
                  Expired ({giftCards.filter((c) => c.status === "expired").length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Cards Grid */}
          {filteredCards.length === 0 ? (
            <Card className="border-dashed p-12 text-center bg-white shadow-xs">
              <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-4">
                <Gift className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">No Gift Cards Found</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                {searchQuery
                  ? "No gift cards match your search criteria. Try a different query."
                  : "Issue prepaid gift vouchers to delight clients, boost seasonal cash flow, and attract new visitors."}
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white">
                <Plus className="w-4 h-4 mr-1.5" /> Issue First Gift Card
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCards.map((card) => {
                const percentLeft = card.amount > 0 ? Math.min(100, Math.round((card.balance / card.amount) * 100)) : 0
                const isExpired = card.expires_at && new Date(card.expires_at) < new Date()
                const daysUntilExpiry = card.expires_at
                  ? Math.ceil((new Date(card.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  : null

                return (
                  <Card
                    key={card.id}
                    className="flex flex-col border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white"
                  >
                    {/* Top Accent Strip */}
                    <div
                      className={`h-2 w-full ${
                        card.status === "void"
                          ? "bg-slate-300"
                          : card.status === "expired"
                          ? "bg-rose-400"
                          : card.balance <= 0
                          ? "bg-gray-300"
                          : "bg-gradient-to-r from-violet-600 to-pink-500"
                      }`}
                    />

                    <CardHeader className="pb-3 pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-base font-bold text-slate-900 tracking-wide">
                              {card.code}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-slate-400 hover:text-slate-800"
                              onClick={() => handleCopyCode(card.code)}
                              title="Copy Code"
                            >
                              {copiedCode === card.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Issued: {new Date(card.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        {getStatusBadge(card)}
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 space-y-4 pb-3">
                      {/* Balance Box */}
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Remaining Balance</span>
                          <span className="text-lg font-bold text-slate-900">{formatCurrency(card.balance)}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              card.balance <= 0
                                ? "bg-slate-400"
                                : percentLeft < 30
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${percentLeft}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-xs text-slate-500 pt-0.5">
                          <span>Original: {formatCurrency(card.amount)}</span>
                          <span>{percentLeft}% remaining</span>
                        </div>
                      </div>

                      {/* Recipient Details */}
                      <div className="text-xs space-y-1 text-slate-600">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{card.customer_name || "Bearer / Walk-in Client"}</span>
                        </div>
                        {card.customer_phone && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{card.customer_phone}</span>
                          </div>
                        )}
                        {card.customer_email && (
                          <div className="flex items-center gap-1.5 text-slate-500 truncate">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{card.customer_email}</span>
                          </div>
                        )}
                      </div>

                      {/* Expiry & Notes */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {card.expires_at ? (
                            <span>
                              Expires: {new Date(card.expires_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-medium">Never Expires</span>
                          )}
                        </div>

                        {daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30 && card.status === "active" && (
                          <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 border-amber-200">
                            {daysUntilExpiry}d left
                          </Badge>
                        )}
                      </div>

                      {card.notes && (
                        <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 italic truncate">
                          "{card.notes}"
                        </div>
                      )}
                    </CardContent>

                    {/* Card Actions */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                      <div className="flex items-center gap-1">
                        {/* WhatsApp Share */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                          onClick={() => window.open(getWhatsAppShareUrl(card), "_blank")}
                          title="Share on WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5 mr-1" /> WhatsApp
                        </Button>

                        {/* Print / Digital Voucher */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-200"
                          onClick={() => {
                            setSelectedVoucherCard(card)
                            setIsVoucherModalOpen(true)
                          }}
                          title="View & Print Voucher"
                        >
                          <Printer className="w-3.5 h-3.5 mr-1" /> Voucher
                        </Button>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Audit History */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-slate-700 hover:text-slate-900"
                          onClick={() => openHistoryModal(card)}
                          title="View Ledger & Redemptions"
                        >
                          <History className="w-3.5 h-3.5" />
                        </Button>

                        {/* Top-up Balance */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs bg-white text-slate-800 hover:bg-slate-100"
                          onClick={() => {
                            setTopUpCard(card)
                            setTopUpAmount("")
                            setTopUpNotes("")
                            setIsTopUpModalOpen(true)
                          }}
                          title="Add Balance / Reload"
                        >
                          <Plus className="w-3 h-3 mr-0.5" /> Reload
                        </Button>

                        {/* Status Toggle */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-1.5 text-xs text-slate-500 hover:text-slate-800"
                          onClick={() => {
                            setStatusCard(card)
                            setNewStatus(card.status)
                            setStatusNotes("")
                            setIsStatusModalOpen(true)
                          }}
                          title="Change Status"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* CREATE / ISSUE GIFT CARD MODAL */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-600" />
              Issue New Gift Card
            </DialogTitle>
            <DialogDescription>
              Create a prepaid voucher for a walk-in client or specific recipient.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateGiftCard} className="space-y-4 pt-2">
            {/* Amount Selection */}
            <div className="space-y-2">
              <Label className="font-semibold text-slate-800">Gift Card Value (₹) *</Label>
              <div className="flex gap-1.5 flex-wrap">
                {PRESET_AMOUNTS.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={createForm.amount === String(preset) ? "default" : "outline"}
                    size="sm"
                    className={
                      createForm.amount === String(preset)
                        ? "bg-purple-600 hover:bg-purple-700 text-white text-xs h-8"
                        : "text-xs h-8 bg-white"
                    }
                    onClick={() => setCreateForm({ ...createForm, amount: String(preset) })}
                  >
                    ₹{preset.toLocaleString("en-IN")}
                  </Button>
                ))}
              </div>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-slate-500">₹</span>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="Enter custom amount"
                  value={createForm.amount}
                  onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                  className="pl-8 text-base font-bold text-slate-900"
                  required
                />
              </div>
            </div>

            {/* Code Generation */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-slate-800">Voucher Code</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                  onClick={() =>
                    setCreateForm((prev) => ({
                      ...prev,
                      isCustomCode: !prev.isCustomCode,
                      code: prev.isCustomCode ? "" : generateRandomCode(),
                    }))
                  }
                >
                  {createForm.isCustomCode ? "Use Auto-Generated Code" : "Custom Code"}
                </Button>
              </div>

              {createForm.isCustomCode ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. BDAY-PRIYA or VIP2000"
                    value={createForm.code}
                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                    className="font-mono uppercase font-bold"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCreateForm({ ...createForm, code: generateRandomCode() })}
                    title="Generate Random"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-100 flex items-center justify-between text-xs text-purple-800">
                  <span className="font-medium">Auto-generated upon creation (e.g. GC-7K9A-4R2M)</span>
                  <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                </div>
              )}
            </div>

            {/* Recipient Information */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="font-semibold text-slate-800">Recipient Details (Optional)</Label>

              {customers.length > 0 && (
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Quick Select Existing Customer</Label>
                  <Select value={createForm.selectedCustomerId} onValueChange={handleSelectCustomer}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Choose from registered clients..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      <SelectItem value="none">-- Walk-in / New Recipient --</SelectItem>
                      {customers.slice(0, 50).map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.full_name} ({c.phone_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="customerName" className="text-xs">
                    Customer Name
                  </Label>
                  <Input
                    id="customerName"
                    placeholder="Recipient name"
                    value={createForm.customerName}
                    onChange={(e) => setCreateForm({ ...createForm, customerName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone" className="text-xs">
                    Customer Phone (for WhatsApp)
                  </Label>
                  <Input
                    id="customerPhone"
                    placeholder="e.g. 9876543210"
                    value={createForm.customerPhone}
                    onChange={(e) => setCreateForm({ ...createForm, customerPhone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="customerEmail" className="text-xs">
                  Customer Email (Optional)
                </Label>
                <Input
                  id="customerEmail"
                  type="email"
                  placeholder="recipient@example.com"
                  value={createForm.customerEmail}
                  onChange={(e) => setCreateForm({ ...createForm, customerEmail: e.target.value })}
                />
              </div>
            </div>

            {/* Expiry Settings */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="font-semibold text-slate-800">Validity Period</Label>
              <Select
                value={createForm.expiryDays}
                onValueChange={(val) => setCreateForm({ ...createForm, expiryDays: val })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 Days (1 Month)</SelectItem>
                  <SelectItem value="90">90 Days (3 Months)</SelectItem>
                  <SelectItem value="180">180 Days (6 Months)</SelectItem>
                  <SelectItem value="365">1 Year (365 Days) — Recommended</SelectItem>
                  <SelectItem value="never">Never Expires</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes / Occasion */}
            <div className="space-y-1 pt-2 border-t">
              <Label htmlFor="notes" className="font-semibold text-slate-800">
                Gift Message / Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="e.g. Happy Birthday Priya! Enjoy your salon day from Arjun."
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                rows={2}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating} className="bg-purple-600 hover:bg-purple-700 text-white">
                {isCreating ? "Issuing..." : "Issue Gift Card"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CELEBRATION SUCCESS MODAL */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="sm:max-w-[480px] text-center p-6">
          <div className="mx-auto w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
            <Sparkles className="w-7 h-7" />
          </div>

          <DialogTitle className="text-2xl font-bold text-slate-900">
            Gift Card Issued Successfully!
          </DialogTitle>
          <DialogDescription className="text-slate-500 mt-1">
            The voucher is active and ready to be redeemed at checkout.
          </DialogDescription>

          {createdCard && (
            <div className="space-y-4 my-5">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100 space-y-1">
                <span className="text-xs uppercase font-bold text-purple-600 tracking-wider">Voucher Code</span>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-2xl font-extrabold text-purple-950 tracking-wider">
                    {createdCard.code}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 bg-white border-purple-200"
                    onClick={() => handleCopyCode(createdCard.code)}
                  >
                    {copiedCode === createdCard.code ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                <p className="text-lg font-bold text-slate-800 pt-1">{formatCurrency(createdCard.balance)}</p>
                {createdCard.customer_name && (
                  <p className="text-xs text-slate-500">Recipient: {createdCard.customer_name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1.5"
                  onClick={() => window.open(getWhatsAppShareUrl(createdCard), "_blank")}
                >
                  <Share2 className="w-4 h-4" /> Share on WhatsApp
                </Button>

                <Button
                  variant="outline"
                  className="bg-slate-900 text-white hover:bg-slate-800 gap-1.5"
                  onClick={() => {
                    setIsSuccessModalOpen(false)
                    setSelectedVoucherCard(createdCard)
                    setIsVoucherModalOpen(true)
                  }}
                >
                  <Printer className="w-4 h-4" /> Print Voucher
                </Button>
              </div>
            </div>
          )}

          <Button variant="ghost" onClick={() => setIsSuccessModalOpen(false)} className="w-full">
            Done
          </Button>
        </DialogContent>
      </Dialog>

      {/* PRINTABLE DIGITAL VOUCHER MODAL */}
      <Dialog open={isVoucherModalOpen} onOpenChange={setIsVoucherModalOpen}>
        <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden bg-transparent border-none shadow-2xl">
          {selectedVoucherCard && (
            <div>
              {/* Voucher Card Container */}
              <div
                id="printable-voucher"
                className="bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white p-8 rounded-2xl relative overflow-hidden shadow-2xl border border-purple-500/30"
              >
                {/* Decorative glows */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

                {/* Voucher Content */}
                <div className="relative z-10 space-y-6">
                  {/* Salon Header */}
                  <div className="flex justify-between items-start border-b border-white/10 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-amber-400" />
                        <h2 className="text-xl font-bold tracking-tight text-white uppercase">
                          {businessSettings?.name || "Hanva Salon & Spa"}
                        </h2>
                      </div>
                      {businessSettings?.address && (
                        <p className="text-xs text-white/60 mt-0.5">{businessSettings.address}</p>
                      )}
                      {businessSettings?.phone && (
                        <p className="text-xs text-white/60">Tel: {businessSettings.phone}</p>
                      )}
                    </div>
                    <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      Gift Voucher
                    </span>
                  </div>

                  {/* Value & Code */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-purple-300 font-semibold">Voucher Value</span>
                      <p className="text-4xl font-extrabold text-amber-300 tracking-tight">
                        {formatCurrency(selectedVoucherCard.balance)}
                      </p>
                      {selectedVoucherCard.balance < selectedVoucherCard.amount && (
                        <p className="text-xs text-white/60 mt-0.5">
                          Original Value: {formatCurrency(selectedVoucherCard.amount)}
                        </p>
                      )}
                    </div>

                    <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl border border-white/15 text-center">
                      <span className="text-[11px] uppercase tracking-wider text-purple-200 block mb-1">
                        Voucher Code
                      </span>
                      <span className="font-mono text-2xl font-black text-white tracking-widest">
                        {selectedVoucherCard.code}
                      </span>
                    </div>
                  </div>

                  {/* Recipient & Validity */}
                  <div className="grid grid-cols-2 gap-4 text-xs bg-white/5 p-4 rounded-xl border border-white/10">
                    <div>
                      <span className="text-purple-300 block font-semibold mb-0.5">Presented To:</span>
                      <p className="text-white font-medium text-sm">
                        {selectedVoucherCard.customer_name || "Valued Guest"}
                      </p>
                      {selectedVoucherCard.customer_phone && (
                        <p className="text-white/60 text-xs">{selectedVoucherCard.customer_phone}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-purple-300 block font-semibold mb-0.5">Valid Until:</span>
                      <p className="text-white font-medium text-sm">
                        {selectedVoucherCard.expires_at
                          ? new Date(selectedVoucherCard.expires_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "Never Expires"}
                      </p>
                    </div>
                  </div>

                  {/* Note */}
                  {selectedVoucherCard.notes && (
                    <div className="bg-purple-900/30 p-3 rounded-lg border border-purple-500/20 text-xs text-purple-200 italic">
                      "{selectedVoucherCard.notes}"
                    </div>
                  )}

                  {/* Barcode Mock Visual & Terms */}
                  <div className="space-y-2 pt-2 border-t border-white/10 text-center">
                    <div className="font-mono tracking-widest text-xs text-white/40 select-none">
                      ||| | | |||| || | || |||| | | ||| |||| |
                    </div>
                    <p className="text-[11px] text-white/50">
                      Redeemable across all hair, skin, and spa treatments. Present this voucher code at checkout.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons (Hidden on Print) */}
              <div className="p-4 bg-white rounded-b-2xl flex items-center justify-between gap-2 print:hidden">
                <Button variant="outline" onClick={() => setIsVoucherModalOpen(false)}>
                  Close
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    onClick={() => window.open(getWhatsAppShareUrl(selectedVoucherCard), "_blank")}
                  >
                    <Share2 className="w-4 h-4 mr-1.5" /> Share WhatsApp
                  </Button>
                  <Button onClick={() => window.print()} className="bg-slate-900 text-white hover:bg-slate-800">
                    <Printer className="w-4 h-4 mr-1.5" /> Print Voucher
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* TRANSACTION AUDIT LEDGER MODAL */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-slate-700" />
              Gift Card Transaction Ledger
            </DialogTitle>
            <DialogDescription>
              {historyCard && `Audit history for Gift Card #${historyCard.code}`}
            </DialogDescription>
          </DialogHeader>

          {loadingHistory ? (
            <div className="py-12 text-center text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-2" />
              Loading transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              No transactions recorded for this gift card yet.
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          tx.type === "issue"
                            ? "bg-purple-50 text-purple-700 border-purple-200 capitalize"
                            : tx.type === "redeem"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 capitalize"
                            : "bg-blue-50 text-blue-700 border-blue-200 capitalize"
                        }
                      >
                        {tx.type}
                      </Badge>
                      <span className="text-slate-500">
                        {new Date(tx.created_at).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {tx.notes && <p className="text-slate-700 mt-1 font-medium">{tx.notes}</p>}
                    <p className="text-slate-400 mt-0.5">
                      Balance: {formatCurrency(tx.balance_before)} → {formatCurrency(tx.balance_after)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-sm font-bold ${
                        tx.type === "redeem" ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {tx.type === "redeem" ? "-" : "+"}
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TOP-UP / RELOAD BALANCE MODAL */}
      <Dialog open={isTopUpModalOpen} onOpenChange={setIsTopUpModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Reload Gift Card Balance</DialogTitle>
            <DialogDescription>
              {topUpCard && `Add funds to Gift Card #${topUpCard.code}`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTopUpSubmit} className="space-y-4 pt-2">
            {topUpCard && (
              <div className="bg-slate-50 p-3 rounded-lg border text-xs flex justify-between">
                <span className="text-slate-500">Current Balance:</span>
                <span className="font-bold text-slate-900">{formatCurrency(topUpCard.balance)}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="topup-amount">Amount to Add (₹) *</Label>
              <div className="flex gap-2">
                {[500, 1000, 2000].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => setTopUpAmount(String(preset))}
                  >
                    +₹{preset}
                  </Button>
                ))}
              </div>
              <Input
                id="topup-amount"
                type="number"
                min="1"
                step="any"
                placeholder="0.00"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="topup-notes">Reason / Notes</Label>
              <Input
                id="topup-notes"
                placeholder="e.g. In-store customer reload"
                value={topUpNotes}
                onChange={(e) => setTopUpNotes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsTopUpModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingTopUp} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSubmittingTopUp ? "Adding..." : "Add Balance"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* STATUS CHANGE MODAL */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Update Gift Card Status</DialogTitle>
            <DialogDescription>
              {statusCard && `Change status for Gift Card #${statusCard.code}`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleStatusSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Select New Status</Label>
              <Select value={newStatus} onValueChange={(val: any) => setNewStatus(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active (Available for redemption)</SelectItem>
                  <SelectItem value="void">Void (Temporarily or permanently blocked)</SelectItem>
                  <SelectItem value="expired">Expired (Past validity date)</SelectItem>
                  <SelectItem value="used">Redeemed / Used</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="status-notes">Reason for Change</Label>
              <Input
                id="status-notes"
                placeholder="e.g. Customer requested cancellation / void"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsStatusModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingStatus} className="bg-slate-900 text-white hover:bg-slate-800">
                {isSubmittingStatus ? "Saving..." : "Update Status"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Global Print Styles for Gift Card Voucher */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-voucher, #printable-voucher * {
            visibility: visible;
          }
          #printable-voucher {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px;
            background: #0f172a !important;
            color: #ffffff !important;
            box-shadow: none !important;
            border-radius: 12px;
          }
        }
      `}</style>
    </div>
  )
}
