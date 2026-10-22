"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  CheckSquare,
  ListTodo,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  getTodos,
  getStaffMembers,
  createTodo,
  updateTodo,
  toggleTodoStatus,
  deleteTodo,
  TodoItem,
  StaffOption,
} from "@/app/actions/todos"

export default function TodosPage() {
  const { toast } = useToast()

  const [todos, setTodos] = useState<TodoItem[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [loading, setLoading] = useState(true)

  // Filtering & Sorting State
  const [groupBy, setGroupBy] = useState("status")
  const [groupOrder, setGroupOrder] = useState<"descending" | "ascending">("descending")
  const [sortBy, setSortBy] = useState("created-at")
  const [sortOrder, setSortOrder] = useState<"descending" | "ascending">("descending")
  const [hideCompleted, setHideCompleted] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null)
  const [saving, setSaving] = useState(false)

  // Form Fields
  const [formTitle, setFormTitle] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formPriority, setFormPriority] = useState<"low" | "medium" | "high">("medium")
  const [formStatus, setFormStatus] = useState<"pending" | "in_progress" | "completed">("pending")
  const [formAssignedTo, setFormAssignedTo] = useState<string>("none")
  const [formDueDate, setFormDueDate] = useState("")

  const loadData = async () => {
    setLoading(true)
    try {
      const [todosRes, staffRes] = await Promise.all([getTodos(), getStaffMembers()])
      if (todosRes.success && todosRes.data) {
        setTodos(todosRes.data)
      }
      if (staffRes.success && staffRes.data) {
        setStaff(staffRes.data)
      }
    } catch (err) {
      console.error("Failed to load todos:", err)
      toast({
        title: "Error",
        description: "Failed to load tasks from server",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenCreateModal = () => {
    setEditingTodo(null)
    setFormTitle("")
    setFormDescription("")
    setFormPriority("medium")
    setFormStatus("pending")
    setFormAssignedTo("none")
    setFormDueDate("")
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (todo: TodoItem) => {
    setEditingTodo(todo)
    setFormTitle(todo.title)
    setFormDescription(todo.description || "")
    setFormPriority(todo.priority || "medium")
    setFormStatus(todo.status || "pending")
    setFormAssignedTo(todo.assigned_to ? String(todo.assigned_to) : "none")
    setFormDueDate(todo.due_date ? todo.due_date.split("T")[0] : "")
    setIsModalOpen(true)
  }

  const handleSaveTodo = async () => {
    if (!formTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for the todo task",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const assignedId = formAssignedTo && formAssignedTo !== "none" ? Number(formAssignedTo) : null
      const dueDateVal = formDueDate ? formDueDate : null

      if (editingTodo) {
        const res = await updateTodo(editingTodo.id, {
          title: formTitle,
          description: formDescription,
          priority: formPriority,
          status: formStatus,
          assigned_to: assignedId,
          due_date: dueDateVal,
        })
        if (res.success) {
          toast({ title: "Task Updated", description: `"${formTitle}" updated successfully.` })
          setIsModalOpen(false)
          loadData()
        } else {
          toast({ title: "Error", description: res.error || "Failed to update task", variant: "destructive" })
        }
      } else {
        const res = await createTodo({
          title: formTitle,
          description: formDescription,
          priority: formPriority,
          assigned_to: assignedId,
          due_date: dueDateVal,
        })
        if (res.success) {
          toast({ title: "Task Created", description: `"${formTitle}" added to your todos.` })
          setIsModalOpen(false)
          loadData()
        } else {
          toast({ title: "Error", description: res.error || "Failed to create task", variant: "destructive" })
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to save task", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (todo: TodoItem) => {
    const nextStatus = todo.status === "completed" ? "pending" : "completed"

    // Optimistic UI update
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, status: nextStatus } : t))
    )

    try {
      const res = await toggleTodoStatus(todo.id, todo.status)
      if (!res.success) {
        // Rollback
        loadData()
        toast({ title: "Error", description: res.error || "Failed to update status", variant: "destructive" })
      }
    } catch (err) {
      loadData()
    }
  }

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return

    setTodos((prev) => prev.filter((t) => t.id !== id))
    try {
      const res = await deleteTodo(id)
      if (res.success) {
        toast({ title: "Deleted", description: `Task "${title}" deleted.` })
      } else {
        loadData()
        toast({ title: "Error", description: res.error || "Failed to delete task", variant: "destructive" })
      }
    } catch (err) {
      loadData()
    }
  }

  // Filtered Todos
  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      if (hideCompleted && todo.status === "completed") return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const titleMatch = todo.title.toLowerCase().includes(q)
        const descMatch = todo.description?.toLowerCase().includes(q)
        const staffMatch = todo.assigned_to_name?.toLowerCase().includes(q)
        if (!titleMatch && !descMatch && !staffMatch) return false
      }

      return true
    })
  }, [todos, hideCompleted, searchQuery])

  // Sorted and Grouped Todos
  const groupedTodos = useMemo(() => {
    const sorted = [...filteredTodos].sort((a, b) => {
      let cmp = 0
      if (sortBy === "created-at") {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else if (sortBy === "due-date") {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : 9999999999999
        const dateB = b.due_date ? new Date(b.due_date).getTime() : 9999999999999
        cmp = dateA - dateB
      } else if (sortBy === "priority") {
        const pWeight: Record<string, number> = { high: 3, medium: 2, low: 1 }
        cmp = (pWeight[a.priority] || 0) - (pWeight[b.priority] || 0)
      } else if (sortBy === "title") {
        cmp = a.title.localeCompare(b.title)
      }
      return sortOrder === "descending" ? -cmp : cmp
    })

    const groups: Record<string, TodoItem[]> = {}

    sorted.forEach((item) => {
      let groupKey = "Other"
      if (groupBy === "status") {
        if (item.status === "completed") groupKey = "Completed"
        else if (item.status === "in_progress") groupKey = "In Progress"
        else groupKey = "Pending"
      } else if (groupBy === "priority") {
        groupKey = (item.priority?.charAt(0).toUpperCase() + item.priority?.slice(1)) || "Medium"
      } else if (groupBy === "assigned") {
        groupKey = item.assigned_to_name || "Unassigned"
      } else if (groupBy === "due-date") {
        if (!item.due_date) {
          groupKey = "No Due Date"
        } else {
          const due = new Date(item.due_date)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          if (diffDays < 0) groupKey = "Overdue"
          else if (diffDays === 0) groupKey = "Due Today"
          else if (diffDays === 1) groupKey = "Due Tomorrow"
          else groupKey = "Upcoming"
        }
      }

      if (!groups[groupKey]) groups[groupKey] = []
      groups[groupKey].push(item)
    })

    // Sort group keys according to groupOrder
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const cmp = a.localeCompare(b)
      return groupOrder === "descending" ? -cmp : cmp
    })

    return { groups, sortedKeys }
  }, [filteredTodos, sortBy, sortOrder, groupBy, groupOrder])

  // Statistics
  const stats = useMemo(() => {
    const total = todos.length
    const completed = todos.filter((t) => t.status === "completed").length
    const inProgress = todos.filter((t) => t.status === "in_progress").length
    const pending = todos.filter((t) => t.status === "pending").length
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const overdue = todos.filter((t) => {
      if (t.status === "completed" || !t.due_date) return false
      return new Date(t.due_date).getTime() < today.getTime()
    }).length
    return { total, completed, inProgress, pending, overdue }
  }, [todos])

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive" className="capitalize text-[11px] px-2 py-0.5">High Priority</Badge>
      case "low":
        return <Badge variant="secondary" className="capitalize text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700">Low</Badge>
      default:
        return <Badge className="capitalize text-[11px] px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white">Medium</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px]">Completed</Badge>
      case "in_progress":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-[11px]">In Progress</Badge>
      default:
        return <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-[11px]">Pending</Badge>
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/50">
      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/manage">
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-white">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <ListTodo className="w-6 h-6 text-primary" />
                Staff &amp; Salon Todos
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Manage tasks, assign daily duties to staff, and track progress.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleOpenCreateModal} className="gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              Add New Todo
            </Button>
          </div>
        </div>

        {/* Quick KPI Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card className="bg-white border-slate-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total Tasks</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats.total}</h3>
              </div>
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <ListTodo className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600">Pending</p>
                <h3 className="text-2xl font-bold text-amber-700 mt-0.5">{stats.pending}</h3>
              </div>
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600">In Progress</p>
                <h3 className="text-2xl font-bold text-blue-700 mt-0.5">{stats.inProgress}</h3>
              </div>
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <RefreshCw className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-600">Completed</p>
                <h3 className="text-2xl font-bold text-emerald-700 mt-0.5">{stats.completed}</h3>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-rose-600">Overdue</p>
                <h3 className="text-2xl font-bold text-rose-700 mt-0.5">{stats.overdue}</h3>
              </div>
              <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                <AlertCircle className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls Bar */}
        <Card className="bg-white border-slate-200">
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Group By</label>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="assigned">Assigned Staff</SelectItem>
                    <SelectItem value="due-date">Due Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Group Order</label>
                <Select value={groupOrder} onValueChange={(val: any) => setGroupOrder(val)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="descending">Descending</SelectItem>
                    <SelectItem value="ascending">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Sort Tasks By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created-at">Created Date</SelectItem>
                    <SelectItem value="due-date">Due Date</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Sort Order</label>
                <Select value={sortOrder} onValueChange={(val: any) => setSortOrder(val)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="descending">Descending</SelectItem>
                    <SelectItem value="ascending">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                variant={hideCompleted ? "default" : "outline"}
                onClick={() => setHideCompleted(!hideCompleted)}
                className="gap-2 w-full h-10"
              >
                {hideCompleted ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {hideCompleted ? "Show All" : "Hide Done"}
              </Button>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={loadData}
                  disabled={loading}
                  className="h-10 w-10 shrink-0 bg-white"
                  title="Reload Tasks"
                >
                  <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? "animate-spin text-primary" : ""}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Lists Grouped */}
        {loading && todos.length === 0 ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-slate-500 font-medium">Loading tasks from database...</p>
            </div>
          </div>
        ) : filteredTodos.length === 0 ? (
          <Card className="bg-white border-slate-200">
            <CardContent className="p-12 text-center">
              <div className="text-slate-500 max-w-sm mx-auto space-y-3">
                <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center text-3xl">
                  📝
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No Todos Found</h3>
                <p className="text-sm text-slate-500">
                  {searchQuery || hideCompleted
                    ? "No tasks match your current filter criteria. Try clearing search or toggling filters."
                    : "Create your first task to assign staff duties and stay organized."}
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  {(searchQuery || hideCompleted) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("")
                        setHideCompleted(false)
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                  <Button onClick={handleOpenCreateModal} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add New Todo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {groupedTodos.sortedKeys.map((groupKey) => {
              const groupItems = groupedTodos.groups[groupKey] || []
              if (groupItems.length === 0) return null

              return (
                <div key={groupKey} className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <h2 className="text-sm font-bold text-slate-800 tracking-wide flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      {groupKey}
                      <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {groupItems.length}
                      </span>
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {groupItems.map((todo) => {
                      const isDone = todo.status === "completed"
                      const isOverdue =
                        !isDone &&
                        todo.due_date &&
                        new Date(todo.due_date).getTime() < new Date().setHours(0, 0, 0, 0)

                      return (
                        <div
                          key={todo.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-white transition-all shadow-sm hover:shadow ${
                            isDone ? "border-slate-200 bg-slate-50/60" : "border-slate-200/80"
                          }`}
                        >
                          <div className="flex items-start gap-3.5 flex-1 min-w-0 pr-4">
                            <div className="pt-0.5">
                              <Checkbox
                                checked={isDone}
                                onCheckedChange={() => handleToggleStatus(todo)}
                                className="h-5 w-5 rounded data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                              />
                            </div>
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`text-sm font-semibold truncate ${
                                    isDone ? "line-through text-slate-400" : "text-slate-900"
                                  }`}
                                >
                                  {todo.title}
                                </span>
                                {getPriorityBadge(todo.priority)}
                                {getStatusBadge(todo.status)}
                                {isOverdue && (
                                  <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider">
                                    Overdue
                                  </Badge>
                                )}
                              </div>
                              {todo.description && (
                                <p className={`text-xs ${isDone ? "text-slate-400" : "text-slate-600"} line-clamp-2`}>
                                  {todo.description}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                                {todo.assigned_to_name ? (
                                  <span className="flex items-center gap-1 font-medium text-slate-700">
                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                    {todo.assigned_to_name}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-slate-400 italic">
                                    <User className="w-3.5 h-3.5" />
                                    Unassigned
                                  </span>
                                )}

                                {todo.due_date && (
                                  <span
                                    className={`flex items-center gap-1 font-medium ${
                                      isOverdue ? "text-rose-600" : "text-slate-600"
                                    }`}
                                  >
                                    <Calendar className="w-3.5 h-3.5" />
                                    Due: {todo.due_date}
                                  </span>
                                )}

                                <span className="text-[11px] text-slate-400">
                                  Created {new Date(todo.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 mt-3 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditModal(todo)}
                              className="h-8 px-2.5 text-slate-600 hover:text-slate-900"
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(todo.id, todo.title)}
                              className="h-8 px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Todo Modal Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>{editingTodo ? "Edit Task" : "Add New Task"}</DialogTitle>
            <DialogDescription>
              {editingTodo
                ? "Update task details, assigned staff, or progress."
                : "Create a new todo for yourself or assign it to a team member."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-title" className="text-xs font-semibold">
                Task Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="task-title"
                placeholder="e.g. Clean sterilization autoclave / Inventory stock check"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-desc" className="text-xs font-semibold">
                Description / Notes
              </Label>
              <Textarea
                id="task-desc"
                placeholder="Additional instructions, room number, or checklist details..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Priority</Label>
                <Select value={formPriority} onValueChange={(val: any) => setFormPriority(val)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editingTodo ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Status</Label>
                  <Select value={formStatus} onValueChange={(val: any) => setFormStatus(val)}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="due-date" className="text-xs font-semibold">
                    Due Date
                  </Label>
                  <Input
                    id="due-date"
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            {editingTodo && (
              <div className="space-y-1.5">
                <Label htmlFor="due-date" className="text-xs font-semibold">
                  Due Date
                </Label>
                <Input
                  id="due-date"
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Assign To Staff Member</Label>
              <Select value={formAssignedTo} onValueChange={setFormAssignedTo}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned / General Task</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTodo} disabled={saving} className="gap-2">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
              {editingTodo ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
