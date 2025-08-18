"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Bell,
  Plus,
  Edit,
  Trash2,
  Send,
  Clock,
  Mail,
  MessageSquare,
  Calendar,
  CheckCircle,
  Play,
  Pause,
} from "lucide-react"
import { formatCurrency } from "@/lib/currency"

interface PaymentReminder {
  id: string
  name: string
  description: string
  isActive: boolean
  triggerType: "days_overdue" | "days_before_due" | "amount_threshold"
  triggerValue: number
  channels: ("email" | "sms" | "whatsapp")[]
  template: {
    subject: string
    message: string
    includeInvoice: boolean
  }
  schedule: {
    frequency: "once" | "daily" | "weekly"
    maxReminders: number
    stopAfterPayment: boolean
  }
  createdAt: string
  lastTriggered?: string
  totalSent: number
  successRate: number
}

interface ReminderLog {
  id: string
  reminderId: string
  customerName: string
  invoiceNumber: string
  amount: number
  channel: string
  status: "sent" | "delivered" | "failed" | "opened"
  sentAt: string
  responseAt?: string
}

export default function PaymentRemindersPage() {
  const [reminders, setReminders] = useState<PaymentReminder[]>([])
  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>([])
  const [selectedReminder, setSelectedReminder] = useState<PaymentReminder | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data for payment reminders
    const mockReminders: PaymentReminder[] = [
      {
        id: "1",
        name: "Overdue Payment Reminder",
        description: "Send reminder for payments overdue by 7 days",
        isActive: true,
        triggerType: "days_overdue",
        triggerValue: 7,
        channels: ["email", "sms"],
        template: {
          subject: "Payment Overdue - Invoice #{invoice_number}",
          message:
            "Dear {customer_name}, your payment of {amount} for invoice #{invoice_number} is now {days_overdue} days overdue. Please make payment at your earliest convenience.",
          includeInvoice: true,
        },
        schedule: {
          frequency: "weekly",
          maxReminders: 3,
          stopAfterPayment: true,
        },
        createdAt: "2024-01-15",
        lastTriggered: "2024-01-25",
        totalSent: 45,
        successRate: 78.5,
      },
      {
        id: "2",
        name: "Payment Due Soon",
        description: "Gentle reminder 3 days before payment due date",
        isActive: true,
        triggerType: "days_before_due",
        triggerValue: 3,
        channels: ["email"],
        template: {
          subject: "Payment Due Soon - Invoice #{invoice_number}",
          message:
            "Hi {customer_name}, this is a friendly reminder that your payment of {amount} for invoice #{invoice_number} is due in {days_until_due} days.",
          includeInvoice: false,
        },
        schedule: {
          frequency: "once",
          maxReminders: 1,
          stopAfterPayment: true,
        },
        createdAt: "2024-01-10",
        lastTriggered: "2024-01-24",
        totalSent: 23,
        successRate: 85.2,
      },
      {
        id: "3",
        name: "High Value Payment Alert",
        description: "Special reminder for payments above ₹10,000",
        isActive: false,
        triggerType: "amount_threshold",
        triggerValue: 10000,
        channels: ["email", "whatsapp"],
        template: {
          subject: "Important: High Value Payment Due",
          message:
            "Dear {customer_name}, we wanted to personally remind you about your upcoming payment of {amount} for invoice #{invoice_number}. Please contact us if you need any assistance.",
          includeInvoice: true,
        },
        schedule: {
          frequency: "daily",
          maxReminders: 5,
          stopAfterPayment: true,
        },
        createdAt: "2024-01-12",
        totalSent: 8,
        successRate: 92.3,
      },
    ]

    const mockLogs: ReminderLog[] = [
      {
        id: "1",
        reminderId: "1",
        customerName: "Sarah Johnson",
        invoiceNumber: "INV-2024-001",
        amount: 2500,
        channel: "email",
        status: "delivered",
        sentAt: "2024-01-25T10:30:00Z",
        responseAt: "2024-01-25T14:20:00Z",
      },
      {
        id: "2",
        reminderId: "1",
        customerName: "Michael Chen",
        invoiceNumber: "INV-2024-002",
        amount: 1800,
        channel: "sms",
        status: "sent",
        sentAt: "2024-01-25T10:30:00Z",
      },
      {
        id: "3",
        reminderId: "2",
        customerName: "Emily Rodriguez",
        invoiceNumber: "INV-2024-003",
        amount: 3200,
        channel: "email",
        status: "opened",
        sentAt: "2024-01-24T09:15:00Z",
        responseAt: "2024-01-24T11:45:00Z",
      },
    ]

    setReminders(mockReminders)
    setReminderLogs(mockLogs)
    setLoading(false)
  }, [])

  const handleCreateReminder = () => {
    const newReminder: PaymentReminder = {
      id: Date.now().toString(),
      name: "New Reminder",
      description: "Custom payment reminder",
      isActive: true,
      triggerType: "days_overdue",
      triggerValue: 7,
      channels: ["email"],
      template: {
        subject: "Payment Reminder - Invoice #{invoice_number}",
        message: "Dear {customer_name}, please pay your outstanding amount of {amount}.",
        includeInvoice: true,
      },
      schedule: {
        frequency: "once",
        maxReminders: 1,
        stopAfterPayment: true,
      },
      createdAt: new Date().toISOString().split("T")[0],
      totalSent: 0,
      successRate: 0,
    }

    setReminders([...reminders, newReminder])
    setSelectedReminder(newReminder)
    setIsEditing(true)
  }

  const handleSaveReminder = () => {
    if (selectedReminder) {
      const updatedReminders = reminders.map((reminder) =>
        reminder.id === selectedReminder.id ? selectedReminder : reminder,
      )
      setReminders(updatedReminders)
      setIsEditing(false)
    }
  }

  const handleDeleteReminder = (reminderId: string) => {
    setReminders(reminders.filter((reminder) => reminder.id !== reminderId))
    if (selectedReminder?.id === reminderId) {
      setSelectedReminder(null)
      setIsEditing(false)
    }
  }

  const handleToggleReminder = (reminderId: string) => {
    const updatedReminders = reminders.map((reminder) =>
      reminder.id === reminderId ? { ...reminder, isActive: !reminder.isActive } : reminder,
    )
    setReminders(updatedReminders)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-blue-100 text-blue-800"
      case "delivered":
        return "bg-green-100 text-green-800"
      case "opened":
        return "bg-purple-100 text-purple-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return <Mail className="w-4 h-4" />
      case "sms":
        return <MessageSquare className="w-4 h-4" />
      case "whatsapp":
        return <MessageSquare className="w-4 h-4" />
      default:
        return <Bell className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading reminders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Payment Reminders"
        subtitle="Automate payment reminders to improve cash flow and reduce overdue payments"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowLogs(true)} className="gap-2 bg-transparent">
              <Clock className="w-4 h-4" />
              View Logs
            </Button>
            <Button onClick={handleCreateReminder} className="gap-2">
              <Plus className="w-4 h-4" />
              New Reminder
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
                    <p className="text-sm font-medium text-gray-600">Active Reminders</p>
                    <p className="text-2xl font-bold">{reminders.filter((r) => r.isActive).length}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Bell className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Sent</p>
                    <p className="text-2xl font-bold">{reminders.reduce((sum, r) => sum + r.totalSent, 0)}</p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Send className="w-4 h-4 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold">
                      {reminders.length > 0
                        ? Math.round(reminders.reduce((sum, r) => sum + r.successRate, 0) / reminders.length)
                        : 0}
                      %
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">This Month</p>
                    <p className="text-2xl font-bold">{reminderLogs.length}</p>
                  </div>
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Reminders List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Reminders
                  </CardTitle>
                  <CardDescription>Manage your automated payment reminders</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-2 p-4">
                    {reminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedReminder?.id === reminder.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => setSelectedReminder(reminder)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-sm truncate">{reminder.name}</h3>
                              <Switch
                                checked={reminder.isActive}
                                onCheckedChange={() => handleToggleReminder(reminder.id)}
                                className="scale-75"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mb-2 line-clamp-2">{reminder.description}</p>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={reminder.isActive ? "default" : "secondary"}
                                className="text-xs capitalize"
                              >
                                {reminder.isActive ? "Active" : "Inactive"}
                              </Badge>
                              <span className="text-xs text-gray-500">{reminder.totalSent} sent</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reminder Editor */}
            <div className="lg:col-span-2">
              {selectedReminder ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Edit className="w-5 h-5" />
                          {isEditing ? "Edit Reminder" : selectedReminder.name}
                        </CardTitle>
                        <CardDescription>
                          {isEditing ? "Configure your reminder settings" : "Reminder details and statistics"}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleReminder(selectedReminder.id)}
                          className="gap-2 bg-transparent"
                        >
                          {selectedReminder.isActive ? (
                            <>
                              <Pause className="w-4 h-4" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              Activate
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteReminder(selectedReminder.id)}
                          className="gap-2 text-red-600 bg-transparent"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleSaveReminder} className="gap-2">
                              <CheckCircle className="w-4 h-4" />
                              Save
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" onClick={() => setIsEditing(true)} className="gap-2">
                            <Edit className="w-4 h-4" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <Tabs defaultValue="basic" className="space-y-4">
                        <TabsList>
                          <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                          <TabsTrigger value="trigger">Trigger</TabsTrigger>
                          <TabsTrigger value="template">Template</TabsTrigger>
                          <TabsTrigger value="schedule">Schedule</TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic" className="space-y-4">
                          <div>
                            <Label htmlFor="reminderName">Reminder Name</Label>
                            <Input
                              id="reminderName"
                              value={selectedReminder.name}
                              onChange={(e) => setSelectedReminder({ ...selectedReminder, name: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="reminderDescription">Description</Label>
                            <Textarea
                              id="reminderDescription"
                              value={selectedReminder.description}
                              onChange={(e) =>
                                setSelectedReminder({ ...selectedReminder, description: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label>Notification Channels</Label>
                            <div className="flex items-center gap-4 mt-2">
                              {["email", "sms", "whatsapp"].map((channel) => (
                                <div key={channel} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={channel}
                                    checked={selectedReminder.channels.includes(channel as any)}
                                    onChange={(e) => {
                                      const updatedChannels = e.target.checked
                                        ? [...selectedReminder.channels, channel as any]
                                        : selectedReminder.channels.filter((c) => c !== channel)
                                      setSelectedReminder({ ...selectedReminder, channels: updatedChannels })
                                    }}
                                    className="rounded"
                                  />
                                  <Label htmlFor={channel} className="text-sm capitalize">
                                    {channel}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="trigger" className="space-y-4">
                          <div>
                            <Label htmlFor="triggerType">Trigger Type</Label>
                            <Select
                              value={selectedReminder.triggerType}
                              onValueChange={(value: any) =>
                                setSelectedReminder({ ...selectedReminder, triggerType: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="days_overdue">Days Overdue</SelectItem>
                                <SelectItem value="days_before_due">Days Before Due</SelectItem>
                                <SelectItem value="amount_threshold">Amount Threshold</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="triggerValue">
                              {selectedReminder.triggerType === "amount_threshold"
                                ? "Amount (₹)"
                                : selectedReminder.triggerType === "days_overdue"
                                  ? "Days Overdue"
                                  : "Days Before Due"}
                            </Label>
                            <Input
                              id="triggerValue"
                              type="number"
                              value={selectedReminder.triggerValue}
                              onChange={(e) =>
                                setSelectedReminder({
                                  ...selectedReminder,
                                  triggerValue: Number.parseInt(e.target.value),
                                })
                              }
                            />
                          </div>
                        </TabsContent>

                        <TabsContent value="template" className="space-y-4">
                          <div>
                            <Label htmlFor="subject">Subject Line</Label>
                            <Input
                              id="subject"
                              value={selectedReminder.template.subject}
                              onChange={(e) =>
                                setSelectedReminder({
                                  ...selectedReminder,
                                  template: { ...selectedReminder.template, subject: e.target.value },
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="message">Message Template</Label>
                            <Textarea
                              id="message"
                              rows={6}
                              value={selectedReminder.template.message}
                              onChange={(e) =>
                                setSelectedReminder({
                                  ...selectedReminder,
                                  template: { ...selectedReminder.template, message: e.target.value },
                                })
                              }
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Available variables: {"{customer_name}"}, {"{amount}"}, {"{invoice_number}"},{" "}
                              {"{days_overdue}"}, {"{days_until_due}"}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="includeInvoice"
                              checked={selectedReminder.template.includeInvoice}
                              onCheckedChange={(checked) =>
                                setSelectedReminder({
                                  ...selectedReminder,
                                  template: { ...selectedReminder.template, includeInvoice: checked },
                                })
                              }
                            />
                            <Label htmlFor="includeInvoice">Include invoice attachment</Label>
                          </div>
                        </TabsContent>

                        <TabsContent value="schedule" className="space-y-4">
                          <div>
                            <Label htmlFor="frequency">Frequency</Label>
                            <Select
                              value={selectedReminder.schedule.frequency}
                              onValueChange={(value: any) =>
                                setSelectedReminder({
                                  ...selectedReminder,
                                  schedule: { ...selectedReminder.schedule, frequency: value },
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="once">Send Once</SelectItem>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="maxReminders">Maximum Reminders</Label>
                            <Input
                              id="maxReminders"
                              type="number"
                              value={selectedReminder.schedule.maxReminders}
                              onChange={(e) =>
                                setSelectedReminder({
                                  ...selectedReminder,
                                  schedule: {
                                    ...selectedReminder.schedule,
                                    maxReminders: Number.parseInt(e.target.value),
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="stopAfterPayment"
                              checked={selectedReminder.schedule.stopAfterPayment}
                              onCheckedChange={(checked) =>
                                setSelectedReminder({
                                  ...selectedReminder,
                                  schedule: { ...selectedReminder.schedule, stopAfterPayment: checked },
                                })
                              }
                            />
                            <Label htmlFor="stopAfterPayment">Stop reminders after payment received</Label>
                          </div>
                        </TabsContent>
                      </Tabs>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Status</Label>
                            <Badge
                              variant={selectedReminder.isActive ? "default" : "secondary"}
                              className="mt-1 capitalize"
                            >
                              {selectedReminder.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Trigger</Label>
                            <p className="mt-1 text-sm">
                              {selectedReminder.triggerType === "amount_threshold"
                                ? `Amount ≥ ${formatCurrency(selectedReminder.triggerValue)}`
                                : selectedReminder.triggerType === "days_overdue"
                                  ? `${selectedReminder.triggerValue} days overdue`
                                  : `${selectedReminder.triggerValue} days before due`}
                            </p>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-500">Channels</Label>
                          <div className="flex items-center gap-2 mt-1">
                            {selectedReminder.channels.map((channel) => (
                              <Badge key={channel} variant="outline" className="gap-1">
                                {getChannelIcon(channel)}
                                {channel}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Total Sent</Label>
                            <p className="mt-1 text-2xl font-bold">{selectedReminder.totalSent}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Success Rate</Label>
                            <p className="mt-1 text-2xl font-bold">{selectedReminder.successRate}%</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Last Triggered</Label>
                            <p className="mt-1 text-sm">
                              {selectedReminder.lastTriggered
                                ? new Date(selectedReminder.lastTriggered).toLocaleDateString()
                                : "Never"}
                            </p>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-500">Template Preview</Label>
                          <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                            <div className="mb-2">
                              <span className="font-medium">Subject: </span>
                              {selectedReminder.template.subject}
                            </div>
                            <div className="text-sm text-gray-600 whitespace-pre-wrap">
                              {selectedReminder.template.message}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Reminder Selected</h3>
                      <p className="text-gray-500 mb-4">Select a reminder from the list to view or edit it</p>
                      <Button onClick={handleCreateReminder} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Create New Reminder
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Logs Dialog */}
      <Dialog open={showLogs} onOpenChange={setShowLogs}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Reminder Logs</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-medium">Customer</th>
                    <th className="text-left p-4 font-medium">Invoice</th>
                    <th className="text-left p-4 font-medium">Amount</th>
                    <th className="text-left p-4 font-medium">Channel</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Sent At</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reminderLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <span className="font-medium">{log.customerName}</span>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-sm">{log.invoiceNumber}</span>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold">{formatCurrency(log.amount)}</span>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="gap-1">
                          {getChannelIcon(log.channel)}
                          {log.channel}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge className={`${getStatusColor(log.status)} capitalize`}>{log.status}</Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">{new Date(log.sentAt).toLocaleString("en-IN")}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
