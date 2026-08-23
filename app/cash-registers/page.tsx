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
import { AlertCircle, ArrowRightLeft, CreditCard, DollarSign, IndianRupee, Lock, LockOpen, Plus, Minus, Receipt, Wallet, TrendingUp, TrendingDown, Clock, Filter, Download, ArrowUpCircle, ArrowDownCircle } from "lucide-react"
import {
  getCashRegisters,
  openRegister,
  closeRegister,
  payIn,
  payOut,
  type CashRegister,
  type CashTransaction,
} from "@/app/actions/cash-registers"
import { toast } from "sonner"
import { format } from "date-fns"

export default function CashRegistersPage() {
  const [registers, setRegisters] = useState<CashRegister[]>([])
  const [transactions, setTransactions] = useState<CashTransaction[]>([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [activeRegisterId, setActiveRegisterId] = useState<number | null>(null)
  
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false)
  const [shiftMode, setShiftMode] = useState<"open" | "close">("open")
  const [shiftAmount, setShiftAmount] = useState("")
  const [shiftNotes, setShiftNotes] = useState("")

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [transactionType, setTransactionType] = useState<"cash_in" | "cash_out">("cash_in")
  const [transactionForm, setTransactionForm] = useState({ amount: "", description: "", category: "sales", reference: "" })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getCashRegisters()
      setRegisters(data.registers)
      setTransactions(data.transactions)
    } catch (error) {
      toast.error("Failed to load cash registers")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleShiftAction = async () => {
    if (!activeRegisterId || !shiftAmount) {
      toast.error("Please enter an amount")
      return
    }

    try {
      const amount = Number.parseFloat(shiftAmount)
      let result;
      if (shiftMode === "open") {
        result = await openRegister(activeRegisterId, amount, shiftNotes)
      } else {
        result = await closeRegister(activeRegisterId, amount, shiftNotes)
      }

      if (result.success) {
        toast.success(result.message)
        setIsShiftModalOpen(false)
        setShiftAmount("")
        setShiftNotes("")
        loadData()
      } else {
        toast.error(result.message)
      }
    } catch (e) {
      toast.error("An error occurred")
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
              </TabsList>
            </div>

            <TabsContent value="drawers" className="space-y-4 outline-none">
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
                                setShiftAmount(register.current_balance.toString())
                                setIsShiftModalOpen(true)
                              }}
                            >
                              Close Shift
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
          </Tabs>

        </div>
      </div>

      {/* Shift Modal (Open/Close) */}
      <Dialog open={isShiftModalOpen} onOpenChange={setIsShiftModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{shiftMode === "open" ? "Open Register Shift" : "Close Register Shift"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {shiftMode === "close" && activeRegister && (
              <div className="bg-slate-50 p-4 rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Expected Balance:</span>
                <span className="text-lg font-bold">{formatCurrency(activeRegister.current_balance)}</span>
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="amount">{shiftMode === "open" ? "Opening Balance" : "Actual Counted Cash"}</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IndianRupee className="h-4 w-4 text-slate-400" />
                </div>
                <Input
                  id="amount"
                  type="number"
                  className="pl-9"
                  placeholder="0.00"
                  value={shiftAmount}
                  onChange={(e) => setShiftAmount(e.target.value)}
                />
              </div>
            </div>

            {shiftMode === "close" && discrepancy !== 0 && (
              <div className={`p-3 rounded-md flex gap-2 text-sm ${discrepancy > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Discrepancy: {formatCurrency(Math.abs(discrepancy))}</p>
                  <p className="opacity-90">{discrepancy > 0 ? 'Over expected amount' : 'Short of expected amount'}</p>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder={shiftMode === "open" ? "Any starting notes..." : "Explain any discrepancy..."}
                value={shiftNotes}
                onChange={(e) => setShiftNotes(e.target.value)}
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
    </div>
  )
}
