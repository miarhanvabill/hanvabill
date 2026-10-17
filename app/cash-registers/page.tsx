"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, ArrowRightLeft, CreditCard, DollarSign, IndianRupee, Lock, LockOpen, Plus, Minus, Receipt, Wallet, TrendingUp, TrendingDown, Clock, Filter, Download, ArrowUpCircle, ArrowDownCircle, Printer, CheckCircle2, Building2 } from "lucide-react"
import {
  getCashRegisters,
  createCashRegister,
  openRegister,
  closeRegister,
  payIn,
  payOut,
  getShiftHistory,
  getZReportData,
  type CashRegister,
  type CashTransaction,
  type ZReportData,
} from "@/app/actions/cash-registers"
import { toast } from "sonner"
import { format } from "date-fns"

const DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1] as const

export default function CashRegistersPage() {
  const [registers, setRegisters] = useState<CashRegister[]>([])
  const [transactions, setTransactions] = useState<CashTransaction[]>([])
  const [shiftHistory, setShiftHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [activeRegisterId, setActiveRegisterId] = useState<number | null>(null)
  
  // Create Drawer Modal
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false)
  const [createDrawerForm, setCreateDrawerForm] = useState({ name: "", location: "Front Desk", openingBalance: "0" })
  const [creatingDrawer, setCreatingDrawer] = useState(false)

  // Z-Report Modal
  const [isZReportOpen, setIsZReportOpen] = useState(false)
  const [zReportData, setZReportData] = useState<ZReportData | null>(null)
  const [zReportLoading, setZReportLoading] = useState(false)

  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false)
  const [shiftMode, setShiftMode] = useState<"open" | "close">("open")
  const [shiftAmount, setShiftAmount] = useState("")
  const [shiftNotes, setShiftNotes] = useState("")
  const [showDenominations, setShowDenominations] = useState(false)
  const [denomCounts, setDenomCounts] = useState<Record<number, number>>({
    2000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    2: 0,
    1: 0,
  })

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [transactionType, setTransactionType] = useState<"cash_in" | "cash_out">("cash_in")
  const [transactionForm, setTransactionForm] = useState({ amount: "", description: "", category: "sales", reference: "" })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [data, shifts] = await Promise.all([
        getCashRegisters(),
        getShiftHistory(),
      ])
      setRegisters(data.registers)
      setTransactions(data.transactions)
      setShiftHistory(shifts)
    } catch (error) {
      toast.error("Failed to load cash registers")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDenomChange = (denom: number, valueStr: string) => {
    const count = parseInt(valueStr, 10) || 0
    const updated = { ...denomCounts, [denom]: Math.max(0, count) }
    setDenomCounts(updated)
    const total = Object.entries(updated).reduce((acc, [d, c]) => acc + Number(d) * Number(c), 0)
    setShiftAmount(total.toString())
  }

  const handleShiftAction = async () => {
    if (!activeRegisterId || !shiftAmount) {
      toast.error("Please enter an amount")
      return
    }

    try {
      const amount = Number.parseFloat(shiftAmount)
      let result: any
      if (shiftMode === "open") {
        result = await openRegister(activeRegisterId, amount, shiftNotes, showDenominations ? denomCounts : undefined)
      } else {
        result = await closeRegister(activeRegisterId, amount, shiftNotes, showDenominations ? denomCounts : undefined)
      }

      if (result.success) {
        toast.success(result.message)
        setIsShiftModalOpen(false)
        const closedShiftId = result.shiftId
        setShiftAmount("")
        setShiftNotes("")
        setShowDenominations(false)
        setDenomCounts({ 2000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 })
        loadData()

        if (shiftMode === "close" && closedShiftId) {
          loadAndShowZReport(closedShiftId)
        }
      } else {
        toast.error(result.message)
      }
    } catch (e: any) {
      toast.error(e.message || "An error occurred")
    }
  }

  const handleCreateDrawer = async () => {
    if (!createDrawerForm.name.trim()) {
      toast.error("Please enter drawer name")
      return
    }
    setCreatingDrawer(true)
    try {
      const res = await createCashRegister({
        name: createDrawerForm.name,
        location: createDrawerForm.location,
        openingBalance: Number(createDrawerForm.openingBalance) || 0,
      })
      if (res.success) {
        toast.success("Cash drawer created successfully")
        setIsCreateDrawerOpen(false)
        setCreateDrawerForm({ name: "", location: "Front Desk", openingBalance: "0" })
        loadData()
      } else {
        toast.error(res.message || "Failed to create drawer")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create drawer")
    } finally {
      setCreatingDrawer(false)
    }
  }

  const loadAndShowZReport = async (shiftId: number) => {
    setZReportLoading(true)
    try {
      const data = await getZReportData(shiftId)
      if (data) {
        setZReportData(data)
        setIsZReportOpen(true)
      } else {
        toast.error("Could not load Z-Report for this shift")
      }
    } catch (err) {
      toast.error("Failed to generate Z-Report")
    } finally {
      setZReportLoading(false)
    }
  }

  const handleTransaction = async () => {
    if (!activeRegisterId || !transactionForm.amount) {
      toast.error("Please fill all required fields")
      return
    }

    try {
      const amount = Number.parseFloat(transactionForm.amount)
      let result;
      if (transactionType === "cash_in") {
        result = await payIn(activeRegisterId, amount, transactionForm.description, transactionForm.category, transactionForm.reference)
      } else {
        result = await payOut(activeRegisterId, amount, transactionForm.description, transactionForm.category, transactionForm.reference)
      }

      if (result.success) {
        toast.success(result.message)
        setIsTransactionModalOpen(false)
        setTransactionForm({ amount: "", description: "", category: "sales", reference: "" })
        loadData()
      } else {
        toast.error(result.message)
      }
    } catch (e) {
      toast.error("An error occurred")
    }
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "₹0.00"
    return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const todayTransactions = transactions.filter(t => new Date(t.created_at).toDateString() === new Date().toDateString())
  const todayPayIns = todayTransactions.filter(t => t.type === 'cash_in').reduce((sum, t) => sum + t.amount, 0)
  const todayPayOuts = todayTransactions.filter(t => t.type === 'cash_out').reduce((sum, t) => sum + t.amount, 0)
  const totalDrawerCash = registers.filter(r => r.current_shift_id).reduce((sum, r) => sum + r.current_balance, 0)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-gray-500">Loading Cash Drawers...</p>
        </div>
      </div>
    )
  }

  const activeRegister = registers.find(r => r.id === activeRegisterId)
  const discrepancy = shiftMode === "close" && shiftAmount ? Number.parseFloat(shiftAmount) - (activeRegister?.current_balance || 0) : 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
      <PageHeader
        title="Cash Registers"
        subtitle="Manage daily shifts, track drawer balances, and monitor discrepancies."
        action={
          <Button 
            onClick={() => setIsCreateDrawerOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Cash Drawer
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-none shadow-sm">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Cash in Drawers</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalDrawerCash)}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-sm">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                  <ArrowDownCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Today's Pay Ins</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(todayPayIns)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-rose-100 text-rose-600 rounded-lg">
                  <ArrowUpCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Today's Pay Outs</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(todayPayOuts)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="drawers" className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList className="bg-white border shadow-sm">
                <TabsTrigger value="drawers" className="data-[state=active]:bg-slate-100">
                  Drawers & Shifts
                </TabsTrigger>
                <TabsTrigger value="transactions" className="data-[state=active]:bg-slate-100">
                  Transaction Log
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-slate-100">
                  Shift History
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="drawers" className="space-y-4 outline-none">
              {registers.length === 0 ? (
                <Card className="border-dashed p-12 text-center bg-white shadow-xs">
                  <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-4">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">No Cash Drawers Found</h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                    Create your first cash drawer (e.g. Front Desk) to start opening shifts, tracking cash sales, and balancing denominations.
                  </p>
                  <Button onClick={() => setIsCreateDrawerOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white">
                    <Plus className="h-4 w-4 mr-1.5" /> Add Cash Drawer
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {registers.map((register) => {
                    const isOpen = !!register.current_shift_id
                    return (
                      <Card key={register.id} className="flex flex-col border-none shadow-sm overflow-hidden transition-all hover:shadow-md">
                        <div className={`h-2 w-full ${isOpen ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                        <CardHeader className="pb-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg flex items-center gap-2">
                                {register.name}
                              </CardTitle>
                              <CardDescription className="mt-1 flex items-center gap-1">
                                {isOpen ? (
                                  <><LockOpen className="h-3 w-3 text-emerald-500" /> <span className="text-emerald-600 font-medium text-xs">Open Shift</span></>
                                ) : (
                                  <><Lock className="h-3 w-3" /> <span className="text-xs">Closed</span></>
                                )}
                              </CardDescription>
                            </div>
                            <Badge variant="outline" className="bg-slate-50">
                              {register.location}
                            </Badge>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="flex-1 pb-2">
                          {isOpen ? (
                            <div className="space-y-4">
                              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Expected Balance</span>
                                  <span className="font-semibold">{formatCurrency(register.current_balance)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Opening Balance</span>
                                  <span>{formatCurrency(register.opening_balance)}</span>
                                </div>
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Opened {register.opened_at ? new Date(register.opened_at).toLocaleString() : 'Unknown'}
                              </div>
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center p-6 text-slate-400 text-sm">
                              Shift is currently closed. Open the drawer to start transacting.
                            </div>
                          )}
                        </CardContent>
                        
                        <CardFooter className="pt-4 border-t gap-2 flex-wrap">
                          {isOpen ? (
                            <>
                              <div className="flex gap-2 w-full mb-2">
                                <Button 
                                  variant="outline" 
                                  className="flex-1 bg-white text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => {
                                    setActiveRegisterId(register.id)
                                    setTransactionType("cash_in")
                                    setTransactionForm(prev => ({...prev, category: 'sales'}))
                                    setIsTransactionModalOpen(true)
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-1" /> Pay In
                                </Button>
                                <Button 
                                  variant="outline" 
                                  className="flex-1 bg-white text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                  onClick={() => {
                                    setActiveRegisterId(register.id)
                                    setTransactionType("cash_out")
                                    setTransactionForm(prev => ({...prev, category: 'expense'}))
                                    setIsTransactionModalOpen(true)
                                  }}
                                >
                                  <Minus className="h-4 w-4 mr-1" /> Pay Out
                                </Button>
                              </div>
                              <Button 
                                variant="default" 
                                className="w-full bg-slate-900 hover:bg-slate-800"
                                onClick={() => {
                                  setActiveRegisterId(register.id)
                                  setShiftMode("close")
                                  setShiftAmount("0")
                                  setShowDenominations(true)
                                  setDenomCounts({ 2000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 })
                                  setShiftNotes("")
                                  setIsShiftModalOpen(true)
                                }}
                              >
                                Close Shift / End Day
                              </Button>
                            </>
                          ) : (
                            <Button 
                              variant="default" 
                              className="w-full bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => {
                                setActiveRegisterId(register.id)
                                setShiftMode("open")
                                setShiftAmount("0")
                                setShowDenominations(false)
                                setDenomCounts({ 2000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 })
                                setShiftNotes("")
                                setIsShiftModalOpen(true)
                              }}
                            >
                              Open Shift
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="transactions" className="outline-none">
              <Card className="border-none shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b">
                      <tr>
                        <th className="px-6 py-4 font-medium">Date & Time</th>
                        <th className="px-6 py-4 font-medium">Register</th>
                        <th className="px-6 py-4 font-medium">Type</th>
                        <th className="px-6 py-4 font-medium">Category</th>
                        <th className="px-6 py-4 font-medium">Reference</th>
                        <th className="px-6 py-4 font-medium text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                            No transactions found
                          </td>
                        </tr>
                      ) : (
                        transactions.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-slate-900">{format(new Date(t.created_at), "MMM d, yyyy")}</div>
                              <div className="text-slate-500 text-xs">{format(new Date(t.created_at), "h:mm a")}</div>
                            </td>
                            <td className="px-6 py-4 text-slate-600">{t.register_name}</td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className={t.type === "cash_in" ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-rose-600 bg-rose-50 border-rose-200"}>
                                {t.type === "cash_in" ? "Pay In" : "Pay Out"}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 capitalize text-slate-600">
                              {t.category.replace("_", " ")}
                            </td>
                            <td className="px-6 py-4 text-slate-500 text-xs font-mono">
                              {t.reference || "--"}
                            </td>
                            <td className={`px-6 py-4 text-right font-semibold ${t.type === 'cash_in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {t.type === "cash_in" ? "+" : "-"}{formatCurrency(t.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="outline-none">
              <Card className="border-none shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b">
                      <tr>
                        <th className="px-6 py-4 font-medium">Register</th>
                        <th className="px-6 py-4 font-medium">Opened At</th>
                        <th className="px-6 py-4 font-medium">Closed At</th>
                        <th className="px-6 py-4 font-medium text-right">Opening Float</th>
                        <th className="px-6 py-4 font-medium text-right">Expected</th>
                        <th className="px-6 py-4 font-medium text-right">Counted</th>
                        <th className="px-6 py-4 font-medium text-right">Variance</th>
                        <th className="px-6 py-4 font-medium">Notes & Breakdown</th>
                        <th className="px-6 py-4 font-medium text-right">Report</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {shiftHistory.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                            No closed shift records found
                          </td>
                        </tr>
                      ) : (
                        shiftHistory.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4 font-medium text-slate-900">{s.register_name || `Register #${s.register_id}`}</td>
                            <td className="px-6 py-4 text-xs text-slate-600">
                              {s.opened_at ? format(new Date(s.opened_at), "MMM d, yyyy h:mm a") : "--"}
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-600">
                              {s.closed_at ? (
                                format(new Date(s.closed_at), "MMM d, yyyy h:mm a")
                              ) : (
                                <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">
                                  Currently Open
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(s.opening_balance)}</td>
                            <td className="px-6 py-4 text-right text-slate-600">{s.expected_balance !== null ? formatCurrency(s.expected_balance) : "--"}</td>
                            <td className="px-6 py-4 text-right font-semibold text-slate-900">{s.actual_balance !== null ? formatCurrency(s.actual_balance) : "--"}</td>
                            <td className="px-6 py-4 text-right">
                              {s.closed_at ? (
                                <Badge
                                  variant="outline"
                                  className={
                                    s.discrepancy === 0
                                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                      : s.discrepancy > 0
                                      ? "text-amber-700 bg-amber-50 border-amber-200"
                                      : "text-rose-700 bg-rose-50 border-rose-200"
                                  }
                                >
                                  {s.discrepancy >= 0 ? "+" : ""}{formatCurrency(s.discrepancy)}
                                </Badge>
                              ) : (
                                "--"
                              )}
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate" title={s.notes || ""}>
                              {s.notes || "--"}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {s.closed_at ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1 border-slate-300 hover:bg-slate-100 text-slate-800 font-medium"
                                  onClick={() => loadAndShowZReport(s.id)}
                                >
                                  <Printer className="h-3 w-3 text-slate-600" />
                                  Z-Report
                                </Button>
                              ) : (
                                <span className="text-xs text-slate-400">Open</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

        </div>
      </div>

      {/* Shift Modal (Open/Close) */}
      <Dialog open={isShiftModalOpen} onOpenChange={setIsShiftModalOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {shiftMode === "open" ? "Open Register Shift" : "Close Register Shift"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {shiftMode === "close" && activeRegister && (
              <div className="bg-slate-50 p-4 rounded-lg flex items-center justify-between border">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">System Expected Balance</span>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(activeRegister.current_balance)}</p>
                </div>
                <Badge variant="outline" className="bg-white px-3 py-1 text-xs">
                  {activeRegister.name}
                </Badge>
              </div>
            )}

            {/* Denomination Breakdown Calculator */}
            <div className="border rounded-lg p-3 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold text-slate-800">Denomination Breakdown</Label>
                  <p className="text-xs text-slate-500">Count physical currency notes & coins</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 bg-white"
                  onClick={() => setShowDenominations(!showDenominations)}
                >
                  {showDenominations ? "Hide Notes Counter" : "Open Notes Counter"}
                </Button>
              </div>

              {showDenominations && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                  {DENOMINATIONS.map((denom) => {
                    const count = denomCounts[denom] || 0
                    const subtotal = denom * count
                    return (
                      <div key={denom} className="bg-white p-2 rounded border flex flex-col justify-between shadow-xs">
                        <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1">
                          <span className="font-bold">₹{denom}</span>
                          <span className="text-slate-400 font-mono text-[11px]">= ₹{subtotal.toLocaleString()}</span>
                        </div>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          className="h-8 text-center text-sm font-semibold"
                          value={count === 0 ? "" : count}
                          onChange={(e) => handleDenomChange(denom, e.target.value)}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount" className="font-semibold text-slate-800">
                  {shiftMode === "open" ? "Opening Float Balance" : "Actual Counted Cash"}
                </Label>
                {showDenominations && (
                  <span className="text-xs text-emerald-600 font-medium">Auto-summed from notes</span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IndianRupee className="h-4 w-4 text-slate-400" />
                </div>
                <Input
                  id="amount"
                  type="number"
                  step="any"
                  className="pl-9 text-lg font-bold"
                  placeholder="0.00"
                  value={shiftAmount}
                  onChange={(e) => setShiftAmount(e.target.value)}
                />
              </div>
            </div>

            {shiftMode === "close" && activeRegister && (
              <div
                className={`p-3 rounded-lg border flex items-center justify-between text-sm ${
                  discrepancy === 0
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : discrepancy > 0
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-rose-50 text-rose-800 border-rose-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <div>
                    <span className="font-semibold">
                      {discrepancy === 0
                        ? "Drawer Balanced (₹0.00)"
                        : discrepancy > 0
                        ? `Cash Over (+${formatCurrency(discrepancy)})`
                        : `Cash Short (-${formatCurrency(Math.abs(discrepancy))})`}
                    </span>
                    <p className="text-xs opacity-85">
                      {discrepancy === 0
                        ? "Counted amount matches system expected balance."
                        : discrepancy > 0
                        ? "Drawer has more cash than system tracked."
                        : "Drawer is missing cash compared to system tracked."}
                    </p>
                  </div>
                </div>
                <span className="text-base font-bold font-mono">
                  {discrepancy >= 0 ? "+" : ""}{formatCurrency(discrepancy)}
                </span>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="notes">Shift Notes / Handover Comments</Label>
              <Textarea
                id="notes"
                placeholder={shiftMode === "open" ? "Starting float, cashier name, notes..." : "Reason for discrepancy, handover notes..."}
                value={shiftNotes}
                onChange={(e) => setShiftNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShiftModalOpen(false)}>Cancel</Button>
            <Button onClick={handleShiftAction} className={shiftMode === 'open' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900'}>
              {shiftMode === "open" ? "Start Shift" : "Close Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Modal (Pay In/Out) */}
      <Dialog open={isTransactionModalOpen} onOpenChange={setIsTransactionModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{transactionType === "cash_in" ? "Pay In (Add Cash)" : "Pay Out (Remove Cash)"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Amount</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IndianRupee className="h-4 w-4 text-slate-400" />
                </div>
                <Input
                  type="number"
                  className="pl-9"
                  placeholder="0.00"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={transactionForm.category}
                onValueChange={(value) => setTransactionForm({ ...transactionForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales / Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="petty_cash">Petty Cash</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="bank_deposit">Bank Deposit</SelectItem>
                  <SelectItem value="owner_withdrawal">Owner Withdrawal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                placeholder="What is this for?"
                value={transactionForm.description}
                onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label>Reference Number (Optional)</Label>
              <Input
                placeholder="Invoice or Receipt ID"
                value={transactionForm.reference}
                onChange={(e) => setTransactionForm({ ...transactionForm, reference: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransactionModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleTransaction}
              className={transactionType === 'cash_in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}
            >
              {transactionType === "cash_in" ? "Add to Drawer" : "Take from Drawer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Cash Drawer Dialog */}
      <Dialog open={isCreateDrawerOpen} onOpenChange={setIsCreateDrawerOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Cash Drawer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="drawer-name">Drawer / Register Name</Label>
              <Input
                id="drawer-name"
                placeholder="e.g. Front Desk, Counter 2"
                value={createDrawerForm.name}
                onChange={(e) => setCreateDrawerForm({ ...createDrawerForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="drawer-loc">Physical Location</Label>
              <Input
                id="drawer-loc"
                placeholder="e.g. Front Desk, Spa Lobby"
                value={createDrawerForm.location}
                onChange={(e) => setCreateDrawerForm({ ...createDrawerForm, location: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="drawer-float">Initial Opening Float (₹)</Label>
              <Input
                id="drawer-float"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={createDrawerForm.openingBalance}
                onChange={(e) => setCreateDrawerForm({ ...createDrawerForm, openingBalance: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDrawerOpen(false)} disabled={creatingDrawer}>
              Cancel
            </Button>
            <Button onClick={handleCreateDrawer} disabled={creatingDrawer} className="bg-slate-900 text-white hover:bg-slate-800">
              {creatingDrawer ? "Creating..." : "Create Drawer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Z-Report Dialog */}
      <Dialog open={isZReportOpen} onOpenChange={setIsZReportOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[92vh] overflow-y-auto">
          <DialogHeader className="print:hidden">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Receipt className="h-5 w-5 text-emerald-600" />
                Shift Closure Z-Report
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5 bg-slate-900 text-white hover:bg-slate-800 hover:text-white"
              >
                <Printer className="h-4 w-4" /> Print Z-Report
              </Button>
            </div>
          </DialogHeader>

          {zReportLoading ? (
            <div className="py-12 text-center text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-3" />
              Generating Z-Report...
            </div>
          ) : zReportData ? (
            <div id="z-report-printable" className="space-y-5 text-slate-900 font-mono text-sm p-4 bg-white border rounded-lg">
              {/* Salon / Header */}
              <div className="text-center border-b pb-4 space-y-1">
                <h2 className="text-xl font-bold tracking-tight uppercase text-slate-900">
                  {zReportData.business?.name || "Hanva Salon"}
                </h2>
                {zReportData.business?.address && (
                  <p className="text-xs text-slate-500">{zReportData.business.address}</p>
                )}
                {zReportData.business?.phone && (
                  <p className="text-xs text-slate-500">Tel: {zReportData.business.phone}</p>
                )}
                {zReportData.business?.gstin && (
                  <p className="text-xs text-slate-500">GSTIN: {zReportData.business.gstin}</p>
                )}
                <div className="pt-2">
                  <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold rounded uppercase tracking-wider">
                    Official Z-Report (End of Shift / Day)
                  </span>
                </div>
              </div>

              {/* Shift Metadata */}
              <div className="grid grid-cols-2 gap-2 text-xs border-b pb-3">
                <div>
                  <span className="text-slate-500">Shift ID:</span> #{zReportData.shiftId}
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Register:</span> {zReportData.registerName} ({zReportData.registerLocation})
                </div>
                <div>
                  <span className="text-slate-500">Opened:</span> {zReportData.openedAt || "--"}
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Closed:</span> {zReportData.closedAt || "--"}
                </div>
              </div>

              {/* Cash Reconciliation */}
              <div className="space-y-1.5 border-b pb-3 text-xs">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
                  Cash Drawer Reconciliation
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Opening Cash Float:</span>
                  <span>{formatCurrency(zReportData.openingBalance)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>(+) Cash Sales:</span>
                  <span>+{formatCurrency(zReportData.cashSales)}</span>
                </div>
                {zReportData.cashPayIns > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>(+) Pay-Ins (Cash In):</span>
                    <span>+{formatCurrency(zReportData.cashPayIns)}</span>
                  </div>
                )}
                {zReportData.cashPayOuts > 0 && (
                  <div className="flex justify-between text-rose-700">
                    <span>(-) Pay-Outs / Cash Expenses:</span>
                    <span>-{formatCurrency(zReportData.cashPayOuts)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-1 border-t text-slate-900">
                  <span>(=) Expected Cash in Drawer:</span>
                  <span>{formatCurrency(zReportData.expectedBalance)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Actual Counted Cash:</span>
                  <span>{formatCurrency(zReportData.actualBalance)}</span>
                </div>
                <div className={`flex justify-between font-bold p-1.5 rounded ${
                  zReportData.discrepancy === 0
                    ? "bg-emerald-50 text-emerald-800"
                    : zReportData.discrepancy > 0
                    ? "bg-amber-50 text-amber-800"
                    : "bg-rose-50 text-rose-800"
                }`}>
                  <span>Discrepancy / Variance:</span>
                  <span>
                    {zReportData.discrepancy >= 0 ? "+" : ""}
                    {formatCurrency(zReportData.discrepancy)}
                    {" "}
                    ({zReportData.discrepancy === 0 ? "BALANCED" : zReportData.discrepancy > 0 ? "OVER" : "SHORT"})
                  </span>
                </div>
              </div>

              {/* Physical Denominations Table */}
              {zReportData.denominations && Object.keys(zReportData.denominations).length > 0 && (
                <div className="border-b pb-3">
                  <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
                    Physical Denomination Counts
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                    {Object.entries(zReportData.denominations)
                      .sort((a, b) => Number(b[0]) - Number(a[0]))
                      .map(([denom, count]) => (
                        <div key={denom} className="flex justify-between bg-slate-50 px-2 py-1 rounded border">
                          <span className="font-medium text-slate-700">₹{denom} × {count}</span>
                          <span className="font-semibold">{formatCurrency(Number(denom) * Number(count))}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Total Revenue & Payment Methods Breakdown */}
              <div className="space-y-1.5 border-b pb-3 text-xs">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
                  Total Shift Revenue by Method
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Cash Collections:</span>
                  <span>{formatCurrency(zReportData.cashSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">UPI / QR Code:</span>
                  <span>{formatCurrency(zReportData.nonCashSales.upi)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Credit / Debit Cards:</span>
                  <span>{formatCurrency(zReportData.nonCashSales.card)}</span>
                </div>
                {zReportData.nonCashSales.other > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Other (Wallets/Custom):</span>
                    <span>{formatCurrency(zReportData.nonCashSales.other)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-1.5 border-t text-sm text-slate-900">
                  <span>Total Shift Turnover:</span>
                  <span>{formatCurrency(zReportData.totalRevenue || (zReportData.cashSales + zReportData.nonCashSales.total))}</span>
                </div>
              </div>

              {/* Shift Notes */}
              {zReportData.notes && (
                <div className="text-xs bg-slate-50 p-2.5 rounded border">
                  <span className="font-bold block text-slate-700 mb-0.5">Notes:</span>
                  <p className="text-slate-600 whitespace-pre-wrap">{zReportData.notes}</p>
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-6 text-xs text-center">
                <div>
                  <div className="border-b border-slate-400 mb-1 h-6" />
                  <span className="text-slate-500 font-sans">Cashier Signature</span>
                </div>
                <div>
                  <div className="border-b border-slate-400 mb-1 h-6" />
                  <span className="text-slate-500 font-sans">Manager / Auditor Signature</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-slate-500">No Z-Report data found.</div>
          )}

          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setIsZReportOpen(false)}>Close</Button>
            {zReportData && (
              <Button onClick={() => window.print()} className="bg-slate-900 text-white hover:bg-slate-800">
                <Printer className="h-4 w-4 mr-1.5" /> Print Receipt
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #z-report-printable, #z-report-printable * {
            visibility: visible;
          }
          #z-report-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 12px;
            font-size: 11px;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  )
}
