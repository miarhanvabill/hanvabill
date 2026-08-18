"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DollarSign, Plus, Filter, Download, Calendar, Receipt, TrendingUp, Edit, Trash2, Search } from "lucide-react"

interface Expense {
  id: number
  date: string
  category: string
  description: string
  amount: number
  paymentMethod: string
  vendor?: string
  receipt?: string
  status: string
  createdAt: string
}

const expenseCategories = [
  "Office Supplies",
  "Equipment",
  "Utilities",
  "Marketing",
  "Staff Salaries",
  "Rent",
  "Insurance",
  "Maintenance",
  "Travel",
  "Other",
]

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [filterCategory, setFilterCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [expenseForm, setExpenseForm] = useState({
    category: "",
    description: "",
    amount: "",
    paymentMethod: "",
    vendor: "",
    date: new Date().toISOString().split("T")[0],
  })

  useEffect(() => {
    loadExpenses()
  }, [])

  const loadExpenses = async () => {
    setLoading(true)
    // Mock data
    const mockExpenses: Expense[] = [
      {
        id: 1,
        date: "2025-01-08",
        category: "Office Supplies",
        description: "Hair care products and styling tools",
        amount: 2500.0,
        paymentMethod: "Cash",
        vendor: "Beauty Supply Co.",
        status: "approved",
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        date: "2025-01-07",
        category: "Utilities",
        description: "Electricity bill for January",
        amount: 1800.0,
        paymentMethod: "Bank Transfer",
        status: "approved",
        createdAt: new Date().toISOString(),
      },
      {
        id: 3,
        date: "2025-01-06",
        category: "Marketing",
        description: "Social media advertising campaign",
        amount: 3000.0,
        paymentMethod: "Credit Card",
        vendor: "Digital Marketing Agency",
        status: "pending",
        createdAt: new Date().toISOString(),
      },
      {
        id: 4,
        date: "2025-01-05",
        category: "Equipment",
        description: "New hair dryer and styling chair",
        amount: 15000.0,
        paymentMethod: "Bank Transfer",
        vendor: "Salon Equipment Ltd.",
        status: "approved",
        createdAt: new Date().toISOString(),
      },
      {
        id: 5,
        date: "2025-01-04",
        category: "Maintenance",
        description: "AC servicing and repair",
        amount: 1200.0,
        paymentMethod: "Cash",
        vendor: "Cool Air Services",
        status: "approved",
        createdAt: new Date().toISOString(),
      },
    ]

    setExpenses(mockExpenses)
    setLoading(false)
  }

  const handleAddExpense = async () => {
    if (!expenseForm.category || !expenseForm.description || !expenseForm.amount) {
      alert("Please fill all required fields")
      return
    }

    const newExpense: Expense = {
      id: expenses.length + 1,
      date: expenseForm.date,
      category: expenseForm.category,
      description: expenseForm.description,
      amount: Number.parseFloat(expenseForm.amount),
      paymentMethod: expenseForm.paymentMethod,
      vendor: expenseForm.vendor,
      status: "pending",
      createdAt: new Date().toISOString(),
    }

    setExpenses([newExpense, ...expenses])
    setShowAddModal(false)
    setExpenseForm({
      category: "",
      description: "",
      amount: "",
      paymentMethod: "",
      vendor: "",
      date: new Date().toISOString().split("T")[0],
    })
  }

  const filteredExpenses = expenses.filter((expense) => {
    const matchesCategory = filterCategory === "all" || expense.category === filterCategory
    const matchesSearch =
      expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.vendor?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const monthlyExpenses = expenses
    .filter((expense) => new Date(expense.date).getMonth() === new Date().getMonth())
    .reduce((sum, expense) => sum + expense.amount, 0)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading expenses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Expenses"
        subtitle="Track and manage all business expenses, from supplies to utilities and marketing costs."
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold">₹{totalExpenses.toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">This Month</p>
                    <p className="text-2xl font-bold">₹{monthlyExpenses.toLocaleString()}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                    <p className="text-2xl font-bold">{expenses.filter((e) => e.status === "pending").length}</p>
                  </div>
                  <Receipt className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Categories</p>
                    <p className="text-2xl font-bold">{new Set(expenses.map((e) => e.category)).size}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search expenses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>

                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <Filter className="w-4 h-4" />
                    Filter
                  </Button>
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                  <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Expense
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Expense</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Date</Label>
                          <Input
                            type="date"
                            value={expenseForm.date}
                            onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label>Category *</Label>
                          <Select
                            value={expenseForm.category}
                            onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {expenseCategories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Description *</Label>
                          <Textarea
                            placeholder="Expense description..."
                            value={expenseForm.description}
                            onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label>Amount *</Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={expenseForm.amount}
                            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label>Payment Method</Label>
                          <Select
                            value={expenseForm.paymentMethod}
                            onValueChange={(value) => setExpenseForm({ ...expenseForm, paymentMethod: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Cash">Cash</SelectItem>
                              <SelectItem value="Credit Card">Credit Card</SelectItem>
                              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                              <SelectItem value="UPI">UPI</SelectItem>
                              <SelectItem value="Cheque">Cheque</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Vendor</Label>
                          <Input
                            placeholder="Vendor name"
                            value={expenseForm.vendor}
                            onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowAddModal(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddExpense}>Add Expense</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses List */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Category</th>
                      <th className="text-left p-4 font-medium">Description</th>
                      <th className="text-left p-4 font-medium">Vendor</th>
                      <th className="text-left p-4 font-medium">Amount</th>
                      <th className="text-left p-4 font-medium">Payment Method</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <div className="text-sm">{new Date(expense.date).toLocaleDateString()}</div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline">{expense.category}</Badge>
                        </td>
                        <td className="p-4">
                          <div className="max-w-xs truncate">{expense.description}</div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm">{expense.vendor || "--"}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-red-600">₹{expense.amount.toFixed(2)}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm">{expense.paymentMethod}</span>
                        </td>
                        <td className="p-4">
                          <Badge className={`${getStatusColor(expense.status)} capitalize`}>{expense.status}</Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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
