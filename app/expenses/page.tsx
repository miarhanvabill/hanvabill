"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  IndianRupee, 
  Plus, 
  Download, 
  Calendar, 
  Receipt, 
  TrendingUp, 
  Edit, 
  Trash2, 
  Search, 
  Building2, 
  PieChart 
} from "lucide-react"
import { 
  getExpenses, 
  addExpense, 
  updateExpense, 
  deleteExpense, 
  getExpenseRollups, 
  type ExpenseRecord, 
  type ExpenseCategoryRollup, 
  type ExpenseVendorRollup 
} from "@/app/actions/expenses"
import { downloadCSV } from "@/lib/utils"
import { toast } from "sonner"

const expenseCategories = [
  "Salon Products & Inventory",
  "Staff Salaries & Commission",
  "Rent & Facility",
  "Utilities & Electricity",
  "Equipment & Repairs",
  "Marketing & Promotions",
  "Office Supplies",
  "Insurance & Legal",
  "Travel & Transport",
  "Other Expenses",
]

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([])
  const [categoryRollups, setCategoryRollups] = useState<ExpenseCategoryRollup[]>([])
  const [vendorRollups, setVendorRollups] = useState<ExpenseVendorRollup[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null)
  const [filterCategory, setFilterCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  const [expenseForm, setExpenseForm] = useState({
    category: "",
    description: "",
    amount: "",
    paymentMethod: "Cash",
    vendor: "",
    date: new Date().toISOString().split("T")[0],
    status: "completed",
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [expensesData, rollupsData] = await Promise.all([
        getExpenses(),
        getExpenseRollups(),
      ])
      setExpenses(expensesData)
      setCategoryRollups(rollupsData.categoryRollups)
      setVendorRollups(rollupsData.vendorRollups)
    } catch (error) {
      console.error("Failed to load expenses:", error)
      toast.error("Failed to load expenses data")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setEditingExpense(null)
    setExpenseForm({
      category: "",
      description: "",
      amount: "",
      paymentMethod: "Cash",
      vendor: "",
      date: new Date().toISOString().split("T")[0],
      status: "completed",
    })
    setShowAddModal(true)
  }

  const handleOpenEdit = (expense: ExpenseRecord) => {
    setEditingExpense(expense)
    setExpenseForm({
      category: expense.category,
      description: expense.description || "",
      amount: expense.amount.toString(),
      paymentMethod: expense.payment_method || "Cash",
      vendor: expense.vendor || "",
      date: expense.date,
      status: expense.status || "completed",
    })
    setShowAddModal(true)
  }

  const handleSaveExpense = async () => {
    if (!expenseForm.category || !expenseForm.description || !expenseForm.amount) {
      toast.error("Please fill all required fields (Category, Description, Amount)")
      return
    }

    const numAmount = Number.parseFloat(expenseForm.amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid expense amount")
      return
    }

    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          date: expenseForm.date,
          category: expenseForm.category,
          description: expenseForm.description,
          amount: numAmount,
          payment_method: expenseForm.paymentMethod,
          vendor: expenseForm.vendor,
          status: expenseForm.status,
        })
        toast.success("Expense updated successfully")
      } else {
        await addExpense({
          date: expenseForm.date,
          category: expenseForm.category,
          description: expenseForm.description,
          amount: numAmount,
          payment_method: expenseForm.paymentMethod,
          vendor: expenseForm.vendor,
          status: expenseForm.status,
        })
        toast.success("Expense recorded successfully")
      }

      setShowAddModal(false)
      loadData()
    } catch (error) {
      console.error("Failed to save expense:", error)
      toast.error("Failed to save expense")
    }
  }

  const handleDeleteExpense = async (id: number) => {
    if (!confirm("Are you sure you want to delete this expense record?")) return
    try {
      await deleteExpense(id)
      toast.success("Expense deleted successfully")
      loadData()
    } catch (error) {
      console.error("Failed to delete expense:", error)
      toast.error("Failed to delete expense")
    }
  }

  const handleExportCSV = () => {
    if (expenses.length === 0) {
      toast.error("No expenses to export")
      return
    }
    const exportRows = filteredExpenses.map((e) => ({
      ID: e.id,
      Date: e.date,
      Category: e.category,
      Description: e.description,
      Vendor: e.vendor || "--",
      Amount: e.amount,
      PaymentMethod: e.payment_method || "--",
      Status: e.status,
    }))
    downloadCSV(exportRows, `Expenses-Report-${new Date().toISOString().split("T")[0]}.csv`)
  }

  const filteredExpenses = expenses.filter((expense) => {
    const matchesCategory = filterCategory === "all" || expense.category === filterCategory
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch =
      (expense.description || "").toLowerCase().includes(searchLower) ||
      (expense.vendor || "").toLowerCase().includes(searchLower) ||
      (expense.category || "").toLowerCase().includes(searchLower)
    return matchesCategory && matchesSearch
  })

  const totalExpenses = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0)
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const monthlyExpenses = expenses
    .filter((expense) => {
      const d = new Date(expense.date)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
    .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0)

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
      case "completed":
        return "bg-emerald-100 text-emerald-800 border-emerald-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "rejected":
        return "bg-rose-100 text-rose-800 border-rose-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading expenses and category rollups...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <PageHeader
        title="Expense Tracking"
        subtitle="Track salon expenses, manage vendor costs, and inspect spending category rollups."
      />

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-none shadow-xs">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Total Spend</p>
                    <p className="text-2xl font-bold text-slate-900">₹{totalExpenses.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                    <IndianRupee className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xs">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">This Month</p>
                    <p className="text-2xl font-bold text-slate-900">₹{monthlyExpenses.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                    <Calendar className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xs">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Active Vendors</p>
                    <p className="text-2xl font-bold text-slate-900">{vendorRollups.length}</p>
                  </div>
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                    <Building2 className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xs">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Categories</p>
                    <p className="text-2xl font-bold text-slate-900">{categoryRollups.length}</p>
                  </div>
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for Expenses, Category Rollups, and Vendor Tracking */}
          <Tabs defaultValue="all" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <TabsList className="bg-white border shadow-xs">
                <TabsTrigger value="all" className="data-[state=active]:bg-slate-100">
                  Expense Records ({expenses.length})
                </TabsTrigger>
                <TabsTrigger value="categories" className="data-[state=active]:bg-slate-100">
                  <PieChart className="w-4 h-4 mr-1.5" /> Category Rollups
                </TabsTrigger>
                <TabsTrigger value="vendors" className="data-[state=active]:bg-slate-100">
                  <Building2 className="w-4 h-4 mr-1.5" /> Vendor Tracking
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button variant="outline" className="gap-2 bg-white" onClick={handleExportCSV}>
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
                <Button className="gap-2 bg-slate-900 hover:bg-slate-800" onClick={handleOpenAdd}>
                  <Plus className="w-4 h-4" />
                  Add Expense
                </Button>
              </div>
            </div>

            {/* TAB 1: Expense Records Table */}
            <TabsContent value="all" className="space-y-4 outline-hidden">
              <Card className="border-none shadow-xs">
                <CardContent className="p-4 border-b">
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className="relative flex-1 md:w-72">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                          placeholder="Search description, vendor..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 bg-white"
                        />
                      </div>

                      <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-48 bg-white">
                          <SelectValue placeholder="All Categories" />
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
                  </div>
                </CardContent>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b">
                      <tr>
                        <th className="p-4 font-medium">Date</th>
                        <th className="p-4 font-medium">Category</th>
                        <th className="p-4 font-medium">Description</th>
                        <th className="p-4 font-medium">Vendor</th>
                        <th className="p-4 font-medium text-right">Amount</th>
                        <th className="p-4 font-medium">Payment Method</th>
                        <th className="p-4 font-medium">Status</th>
                        <th className="p-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-500">
                            No expenses found matching the criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredExpenses.map((expense) => (
                          <tr key={expense.id} className="hover:bg-slate-50/50">
                            <td className="p-4 whitespace-nowrap text-slate-700">
                              {expense.date ? new Date(expense.date).toLocaleDateString("en-IN") : "--"}
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className="font-normal bg-white">
                                {expense.category}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div className="max-w-xs truncate font-medium text-slate-900">{expense.description}</div>
                            </td>
                            <td className="p-4 text-slate-600">
                              {expense.vendor || "--"}
                            </td>
                            <td className="p-4 text-right font-bold text-rose-600 whitespace-nowrap">
                              ₹{(Number(expense.amount) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-4 text-slate-600 text-xs">
                              {expense.payment_method || "--"}
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className={`${getStatusColor(expense.status)} capitalize text-xs`}>
                                {expense.status}
                              </Badge>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-slate-600 hover:text-slate-900"
                                  onClick={() => handleOpenEdit(expense)}
                                  title="Edit Expense"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  title="Delete Expense"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>

            {/* TAB 2: Category Rollups */}
            <TabsContent value="categories" className="space-y-4 outline-hidden">
              <Card className="border-none shadow-xs">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Expense Spending by Category</h3>
                  <div className="space-y-4">
                    {categoryRollups.length === 0 ? (
                      <p className="text-slate-500 py-6 text-center">No categorized expenses recorded yet.</p>
                    ) : (
                      categoryRollups.map((cat, idx) => (
                        <div key={cat.category} className="space-y-1.5">
                          <div className="flex justify-between items-center text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"][idx % 7],
                                }}
                              />
                              <span className="text-slate-800">{cat.category}</span>
                              <span className="text-xs text-slate-400 font-normal">({cat.count} expenses)</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-900">
                                ₹{cat.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-xs text-slate-500 w-12 text-right">
                                {cat.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(cat.percentage, 100)}%`,
                                backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"][idx % 7],
                              }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: Vendor Tracking */}
            <TabsContent value="vendors" className="space-y-4 outline-hidden">
              <Card className="border-none shadow-xs">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Vendor Spending & Supplier Tracking</h3>
                  <div className="space-y-4">
                    {vendorRollups.length === 0 ? (
                      <p className="text-slate-500 py-6 text-center">No vendor expenses recorded yet.</p>
                    ) : (
                      vendorRollups.map((v, idx) => (
                        <div key={v.vendor} className="space-y-1.5">
                          <div className="flex justify-between items-center text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-slate-400" />
                              <span className="text-slate-800 font-semibold">{v.vendor}</span>
                              <span className="text-xs text-slate-400 font-normal">({v.count} payments)</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-900">
                                ₹{v.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-xs text-slate-500 w-12 text-right">
                                {v.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-2 bg-indigo-600 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(v.percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Add / Edit Expense Dialog */}
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>{editingExpense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="amount">Amount (₹) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={expenseForm.category}
                    onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value })}
                  >
                    <SelectTrigger id="category">
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
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Expense details, item names, purpose..."
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vendor">Vendor / Supplier</Label>
                    <Input
                      id="vendor"
                      placeholder="e.g. L'Oreal, Landlord, Discom"
                      value={expenseForm.vendor}
                      onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select
                      value={expenseForm.paymentMethod}
                      onValueChange={(value) => setExpenseForm({ ...expenseForm, paymentMethod: value })}
                    >
                      <SelectTrigger id="paymentMethod">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                        <SelectItem value="Debit Card">Debit Card</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={expenseForm.status}
                    onValueChange={(value) => setExpenseForm({ ...expenseForm, status: value })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed / Paid</SelectItem>
                      <SelectItem value="pending">Pending Approval</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveExpense} className="bg-slate-900 hover:bg-slate-800">
                  {editingExpense ? "Save Changes" : "Record Expense"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  )
}
