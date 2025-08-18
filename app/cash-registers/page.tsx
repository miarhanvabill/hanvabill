"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  Receipt,
  Clock,
  Filter,
  Download,
} from "lucide-react"
import {
  getCashRegisters,
  createCashTransaction,
  type CashRegister,
  type CashTransaction,
} from "@/app/actions/cash-registers"

export default function CashRegistersPage() {
  const [registers, setRegisters] = useState<CashRegister[]>([])
  const [transactions, setTransactions] = useState<CashTransaction[]>([])
  const [selectedRegister, setSelectedRegister] = useState<number | null>(null)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [transactionType, setTransactionType] = useState<"cash_in" | "cash_out">("cash_in")
  const [loading, setLoading] = useState(true)
  const [transactionForm, setTransactionForm] = useState({
    amount: "",
    description: "",
    category: "",
    reference: "",
  })

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
      console.error("Error loading cash registers:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleTransaction = async () => {
    if (!selectedRegister || !transactionForm.amount) {
      alert("Please fill all required fields")
      return
    }

    const result = await createCashTransaction({
      registerId: selectedRegister,
      type: transactionType,
      amount: Number.parseFloat(transactionForm.amount),
      description: transactionForm.description,
      category: transactionForm.category,
      reference: transactionForm.reference,
    })

    if (result.success) {
      setShowTransactionModal(false)
      setTransactionForm({ amount: "", description: "", category: "", reference: "" })
      loadData()
    } else {
      alert(result.message)
    }
  }

  const getTransactionColor = (type: string) => {
    return type === "cash_in" ? "text-green-600" : "text-red-600"
  }

  const getTransactionIcon = (type: string) => {
    return type === "cash_in" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading cash registers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Cash Registers"
        subtitle="Manage cash flow, track transactions, and monitor daily sales across all payment methods."
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Cash</p>
                    <p className="text-2xl font-bold">
                      ₹
                      {registers
                        .reduce((sum, r) => sum + r.current_balance, 0)
                        .toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Today's Sales</p>
                    <p className="text-2xl font-bold">
                      ₹
                      {transactions
                        .filter(
                          (t) =>
                            t.type === "cash_in" && new Date(t.created_at).toDateString() === new Date().toDateString(),
                        )
                        .reduce((sum, t) => sum + t.amount, 0)
                        .toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Today's Expenses</p>
                    <p className="text-2xl font-bold">
                      ₹
                      {transactions
                        .filter(
                          (t) =>
                            t.type === "cash_out" &&
                            new Date(t.created_at).toDateString() === new Date().toDateString(),
                        )
                        .reduce((sum, t) => sum + t.amount, 0)
                        .toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Transactions</p>
                    <p className="text-2xl font-bold">
                      {
                        transactions.filter((t) => new Date(t.created_at).toDateString() === new Date().toDateString())
                          .length
                      }
                    </p>
                  </div>
                  <Receipt className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cash Registers */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Cash Registers</CardTitle>
              <Dialog open={showTransactionModal} onOpenChange={setShowTransactionModal}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    New Transaction
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Cash Transaction</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Register</Label>
                      <Select
                        value={selectedRegister?.toString()}
                        onValueChange={(value) => setSelectedRegister(Number.parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select register" />
                        </SelectTrigger>
                        <SelectContent>
                          {registers.map((register) => (
                            <SelectItem key={register.id} value={register.id.toString()}>
                              {register.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Transaction Type</Label>
                      <Select
                        value={transactionType}
                        onValueChange={(value: "cash_in" | "cash_out") => setTransactionType(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash_in">Cash In</SelectItem>
                          <SelectItem value="cash_out">Cash Out</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={transactionForm.amount}
                        onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Category</Label>
                      <Select
                        value={transactionForm.category}
                        onValueChange={(value) => setTransactionForm({ ...transactionForm, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="refund">Refund</SelectItem>
                          <SelectItem value="expense">Expense</SelectItem>
                          <SelectItem value="petty_cash">Petty Cash</SelectItem>
                          <SelectItem value="bank_deposit">Bank Deposit</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Transaction description..."
                        value={transactionForm.description}
                        onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Reference</Label>
                      <Input
                        placeholder="Reference number or invoice ID"
                        value={transactionForm.reference}
                        onChange={(e) => setTransactionForm({ ...transactionForm, reference: e.target.value })}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowTransactionModal(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleTransaction}>Add Transaction</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {registers.map((register) => (
                  <Card key={register.id} className="border-2 hover:border-blue-200 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{register.name}</h3>
                            <p className="text-sm text-gray-500">{register.location}</p>
                          </div>
                        </div>
                        <Badge variant={register.status === "active" ? "default" : "secondary"}>
                          {register.status}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Current Balance:</span>
                          <span className="font-semibold">
                            ₹
                            {register.current_balance.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Opening Balance:</span>
                          <span className="text-sm">
                            ₹
                            {register.opening_balance.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Last Updated:</span>
                          <span className="text-sm">{new Date(register.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 bg-transparent"
                          onClick={() => {
                            setSelectedRegister(register.id)
                            setTransactionType("cash_in")
                            setShowTransactionModal(true)
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Cash In
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 bg-transparent"
                          onClick={() => {
                            setSelectedRegister(register.id)
                            setTransactionType("cash_out")
                            setShowTransactionModal(true)
                          }}
                        >
                          <Minus className="w-4 h-4 mr-1" />
                          Cash Out
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <Filter className="w-4 h-4" />
                  Filter
                </Button>
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium">Date & Time</th>
                      <th className="text-left p-4 font-medium">Register</th>
                      <th className="text-left p-4 font-medium">Type</th>
                      <th className="text-left p-4 font-medium">Category</th>
                      <th className="text-left p-4 font-medium">Amount</th>
                      <th className="text-left p-4 font-medium">Description</th>
                      <th className="text-left p-4 font-medium">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transactions.slice(0, 20).map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <div className="text-sm">
                              <div>{new Date(transaction.created_at).toLocaleDateString()}</div>
                              <div className="text-gray-500">
                                {new Date(transaction.created_at).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm">{transaction.register_name}</span>
                        </td>
                        <td className="p-4">
                          <div className={`flex items-center gap-2 ${getTransactionColor(transaction.type)}`}>
                            {getTransactionIcon(transaction.type)}
                            <span className="text-sm capitalize">{transaction.type.replace("_", " ")}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="capitalize">
                            {transaction.category.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <span className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                            {transaction.type === "cash_in" ? "+" : "-"}₹
                            {transaction.amount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm">{transaction.description || "--"}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-mono">{transaction.reference || "--"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
