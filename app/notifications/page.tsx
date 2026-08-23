"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  History,
  AlertCircle,
  Send,
  Sparkles,
  Calendar,
  CreditCard,
  Tag,
  Star,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  getNotificationLogs,
  getNotificationPreferences,
  saveNotificationPreferences,
  sendTestNotification,
  NotificationLog,
  NotificationPreference,
} from "./actions"

const DEFAULT_EVENTS = [
  // Appointments
  { id: "booking_created", label: "Booking Confirmation", description: "Sent immediately when an appointment is booked.", category: "Appointments" },
  { id: "booking_rescheduled", label: "Booking Rescheduled", description: "Sent when an appointment time or service changes.", category: "Appointments" },
  { id: "booking_cancelled", label: "Booking Cancellation", description: "Sent when an appointment is cancelled.", category: "Appointments" },
  { id: "appointment_reminder_24h", label: "24-Hour Reminder", description: "Reminds customer 1 day before their appointment.", category: "Appointments" },
  { id: "appointment_reminder_2h", label: "2-Hour Reminder", description: "Urgent reminder sent 2 hours before the start time.", category: "Appointments" },
  
  // Billing & Receipts
  { id: "invoice_receipt", label: "Digital Invoice & Receipt", description: "Sent with bill breakdown upon invoice generation.", category: "Billing & Invoices" },
  { id: "payment_received", label: "Payment Confirmation", description: "Sent when full or partial payment is received.", category: "Billing & Invoices" },
  { id: "payment_refunded", label: "Refund Processed", description: "Sent when a payment refund is issued to customer.", category: "Billing & Invoices" },
  { id: "advance_deposit", label: "Advance Deposit", description: "Sent when customer pays a booking deposit.", category: "Billing & Invoices" },

  // Loyalty & Memberships
  { id: "loyalty_points_earned", label: "Points Earned Alert", description: "Notifies customer of points earned after checkout.", category: "Loyalty & Rewards" },
  { id: "loyalty_points_expiring", label: "Points Expiring Soon", description: "Warns customer 7 days before points expire.", category: "Loyalty & Rewards" },
  { id: "membership_activated", label: "Membership Welcome", description: "Sent when a membership plan is purchased.", category: "Loyalty & Rewards" },
  { id: "membership_expiring", label: "Membership Renewal Alert", description: "Sent 14 days before membership expiration.", category: "Loyalty & Rewards" },

  // Marketing & Retention
  { id: "birthday_wish", label: "Birthday Greeting & Offer", description: "Automated birthday greetings with exclusive discount.", category: "Marketing & Retention" },
  { id: "anniversary_wish", label: "Anniversary Special", description: "Automated anniversary wishes with promotional offer.", category: "Marketing & Retention" },
  { id: "we_miss_you", label: "We Miss You / Inactivity", description: "Sent to win back customers who haven't visited in 45 days.", category: "Marketing & Retention" },
  { id: "google_review_request", label: "Google Review Request", description: "Sent 1 hour after checkout inviting 5-star review.", category: "Marketing & Retention" },
]

export default function NotificationsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [preferences, setPreferences] = useState<NotificationPreference[]>(() =>
    DEFAULT_EVENTS.map((event) => ({
      event_type: event.id,
      email_enabled: true,
      sms_enabled: true,
      whatsapp_enabled: true,
    }))
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchLog, setSearchLog] = useState("")
  const [channelFilter, setChannelFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  // Test Notification Dialog
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [testChannel, setTestChannel] = useState<"whatsapp" | "sms" | "email">("whatsapp")
  const [testRecipient, setTestRecipient] = useState("")
  const [sendingTest, setSendingTest] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [logsRes, prefsRes] = await Promise.all([
        getNotificationLogs(),
        getNotificationPreferences(),
      ])

      if (logsRes?.success && Array.isArray(logsRes.data)) {
        setLogs(logsRes.data)
      }

      if (prefsRes?.success && Array.isArray(prefsRes.data) && prefsRes.data.length > 0) {
        const dbPrefs = prefsRes.data
        const mergedPrefs = DEFAULT_EVENTS.map((event) => {
          const existing = dbPrefs.find((p: any) => p.event_type === event.id)
          if (existing) return existing
          return {
            event_type: event.id,
            email_enabled: true,
            sms_enabled: true,
            whatsapp_enabled: true,
          }
        })
        setPreferences(mergedPrefs)
      } else {
        setPreferences(
          DEFAULT_EVENTS.map((event) => ({
            event_type: event.id,
            email_enabled: true,
            sms_enabled: true,
            whatsapp_enabled: true,
          }))
        )
      }
    } catch (error) {
      console.error("Failed to load notifications page data:", error)
      toast({ title: "Notice", description: "Using default notification configuration." })
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePreference = (
    eventType: string,
    channel: "email_enabled" | "sms_enabled" | "whatsapp_enabled"
  ) => {
    setPreferences((prev) =>
      prev.map((p) => {
        if (p.event_type === eventType) {
          return { ...p, [channel]: !p[channel] }
        }
        return p
      })
    )
  }

  const handleSavePreferences = async () => {
    setSaving(true)
    try {
      const res = await saveNotificationPreferences(preferences)
      if (res?.success) {
        toast({ title: "Success", description: "All notification preferences saved successfully!" })
      } else {
        toast({ title: "Error", description: "Failed to save preferences.", variant: "destructive" })
      }
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "Failed to save preferences.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleSendTest = async () => {
    if (!testRecipient.trim()) {
      toast({ title: "Required", description: "Please enter a test recipient phone or email.", variant: "destructive" })
      return
    }
    setSendingTest(true)
    try {
      const res = await sendTestNotification(testChannel, testRecipient)
      if (res?.success) {
        toast({ title: "Test Sent", description: res.message })
        setIsTestModalOpen(false)
        setTestRecipient("")
        loadData()
      } else {
        toast({ title: "Error", description: res?.error || "Failed to send test message.", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to send test message.", variant: "destructive" })
    } finally {
      setSendingTest(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
      case "sent":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-amber-500" />
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case "whatsapp":
        return <MessageSquare className="w-4 h-4 text-green-600" />
      case "sms":
        return <Smartphone className="w-4 h-4 text-blue-600" />
      case "email":
        return <Mail className="w-4 h-4 text-violet-600" />
      default:
        return <Bell className="w-4 h-4 text-gray-600" />
    }
  }

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !searchLog ||
      log.customer_name?.toLowerCase().includes(searchLog.toLowerCase()) ||
      log.customer_phone?.includes(searchLog) ||
      log.content?.toLowerCase().includes(searchLog.toLowerCase()) ||
      log.type?.toLowerCase().includes(searchLog.toLowerCase())
    const matchesChannel = channelFilter === "all" || log.channel.toLowerCase() === channelFilter.toLowerCase()
    const matchesStatus = statusFilter === "all" || log.status.toLowerCase() === statusFilter.toLowerCase()
    return matchesSearch && matchesChannel && matchesStatus
  })

  // Group events for settings view
  const eventsByCategory = DEFAULT_EVENTS.reduce((acc, event) => {
    if (!acc[event.category]) acc[event.category] = []
    acc[event.category].push(event)
    return acc
  }, {} as Record<string, typeof DEFAULT_EVENTS>)

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/50">
      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              Notification Center
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure automated WhatsApp, SMS, and Email messaging across all customer lifecycle events.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setIsTestModalOpen(true)} className="gap-2">
              <Send className="w-4 h-4 text-primary" />
              Send Test Message
            </Button>
            <Button onClick={handleSavePreferences} disabled={saving} className="gap-2">
              <Sparkles className="w-4 h-4" />
              {saving ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200/80 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Triggers</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">17 Events</p>
                <p className="text-xs text-emerald-600 font-medium mt-0.5">Automated 24/7</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <Sparkles className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">WhatsApp Gateway</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">Active</p>
                <p className="text-xs text-slate-500 mt-0.5">Direct API connected</p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                <MessageSquare className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">SMS Gateway</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">Active</p>
                <p className="text-xs text-slate-500 mt-0.5">DLT Registered</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <Smartphone className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email Gateway</p>
                <p className="text-2xl font-bold text-violet-600 mt-1">Active</p>
                <p className="text-xs text-slate-500 mt-0.5">HTML Templates ready</p>
              </div>
              <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600">
                <Mail className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList className="bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="settings" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Settings className="w-4 h-4" />
              Trigger Preferences
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <History className="w-4 h-4" />
              Message History & Logs ({logs.length})
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">Automated Notification Rules</CardTitle>
                  <CardDescription className="text-slate-500 text-sm mt-0.5">
                    Select which communication channels (WhatsApp, SMS, Email) are triggered for each salon event.
                  </CardDescription>
                </div>
                <Button onClick={handleSavePreferences} disabled={saving} size="sm">
                  {saving ? "Saving..." : "Save Preferences"}
                </Button>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                {Object.entries(eventsByCategory).map(([category, events]) => (
                  <div key={category} className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      {category.includes("Appointments") && <Calendar className="w-5 h-5 text-primary" />}
                      {category.includes("Billing") && <CreditCard className="w-5 h-5 text-emerald-600" />}
                      {category.includes("Loyalty") && <Star className="w-5 h-5 text-amber-500" />}
                      {category.includes("Marketing") && <Tag className="w-5 h-5 text-rose-500" />}
                      <h3 className="text-base font-bold text-slate-800">{category}</h3>
                      <Badge variant="secondary" className="ml-auto text-xs font-normal">
                        {events.length} Triggers
                      </Badge>
                    </div>

                    <div className="grid gap-3">
                      {events.map((event) => {
                        const pref = preferences.find((p) => p.event_type === event.id) || {
                          event_type: event.id,
                          email_enabled: true,
                          sms_enabled: true,
                          whatsapp_enabled: true,
                        }

                        return (
                          <div
                            key={event.id}
                            className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border border-slate-200/70 rounded-xl hover:border-slate-300 transition-all shadow-xs gap-4"
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-slate-900 text-sm">{event.label}</h4>
                              <p className="text-xs text-slate-500 mt-0.5">{event.description}</p>
                            </div>

                            <div className="flex items-center gap-5 shrink-0 bg-slate-50/80 px-4 py-2 rounded-lg border border-slate-100">
                              {/* WhatsApp */}
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id={`wa-${event.id}`}
                                  checked={pref.whatsapp_enabled}
                                  onCheckedChange={() => handleTogglePreference(event.id, "whatsapp_enabled")}
                                />
                                <Label htmlFor={`wa-${event.id}`} className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                  WhatsApp
                                </Label>
                              </div>

                              {/* SMS */}
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id={`sms-${event.id}`}
                                  checked={pref.sms_enabled}
                                  onCheckedChange={() => handleTogglePreference(event.id, "sms_enabled")}
                                />
                                <Label htmlFor={`sms-${event.id}`} className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                                  <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                                  SMS
                                </Label>
                              </div>

                              {/* Email */}
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id={`email-${event.id}`}
                                  checked={pref.email_enabled}
                                  onCheckedChange={() => handleTogglePreference(event.id, "email_enabled")}
                                />
                                <Label htmlFor={`email-${event.id}`} className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                                  <Mail className="w-3.5 h-3.5 text-violet-600" />
                                  Email
                                </Label>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <Button onClick={handleSavePreferences} disabled={saving} size="lg" className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    {saving ? "Saving Preferences..." : "Save All Preferences"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">Communication Logs</CardTitle>
                  <CardDescription className="text-slate-500 text-sm mt-0.5">
                    Real-time history of all outbound messages sent to your customers.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search by customer name, phone, or message content..."
                      value={searchLog}
                      onChange={(e) => setSearchLog(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={channelFilter}
                      onChange={(e) => setChannelFilter(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 font-medium"
                    >
                      <option value="all">All Channels</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="sms">SMS</option>
                      <option value="email">Email</option>
                    </select>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 font-medium"
                    >
                      <option value="all">All Statuses</option>
                      <option value="delivered">Delivered</option>
                      <option value="sent">Sent</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="font-semibold text-slate-600">No message logs found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Outbound customer messages will appear here once bookings or bills are created.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-3">Timestamp</th>
                          <th className="px-4 py-3">Customer</th>
                          <th className="px-4 py-3">Event Trigger</th>
                          <th className="px-4 py-3">Channel</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Message Content</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                              {new Date(log.sent_at).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {log.customer_name || "Guest Customer"}
                              {log.customer_phone && (
                                <span className="block text-[11px] font-normal text-slate-400">
                                  {log.customer_phone}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="capitalize text-[11px] font-medium bg-slate-50">
                                {log.type.replace(/_/g, " ")}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 capitalize font-medium text-slate-700">
                                {getChannelIcon(log.channel)}
                                {log.channel}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 capitalize font-semibold">
                                {getStatusIcon(log.status)}
                                <span
                                  className={
                                    log.status === "failed"
                                      ? "text-red-600"
                                      : log.status === "delivered" || log.status === "sent"
                                      ? "text-emerald-600"
                                      : "text-amber-600"
                                  }
                                >
                                  {log.status}
                                </span>
                              </div>
                              {log.error_message && (
                                <span
                                  className="block text-[10px] text-red-500 mt-0.5 max-w-[140px] truncate"
                                  title={log.error_message}
                                >
                                  {log.error_message}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600 max-w-sm truncate" title={log.content}>
                              {log.content}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Send Test Notification Modal */}
        <Dialog open={isTestModalOpen} onOpenChange={setIsTestModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                Send Test Message
              </DialogTitle>
              <DialogDescription>
                Verify your delivery gateway by sending a live test notification.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Select Channel</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={testChannel === "whatsapp" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTestChannel("whatsapp")}
                    className="gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                    WhatsApp
                  </Button>
                  <Button
                    type="button"
                    variant={testChannel === "sms" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTestChannel("sms")}
                    className="gap-1.5"
                  >
                    <Smartphone className="w-4 h-4 text-blue-500" />
                    SMS
                  </Button>
                  <Button
                    type="button"
                    variant={testChannel === "email" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTestChannel("email")}
                    className="gap-1.5"
                  >
                    <Mail className="w-4 h-4 text-violet-500" />
                    Email
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient" className="text-xs font-semibold">
                  {testChannel === "email" ? "Recipient Email Address" : "Recipient Mobile Phone (+91...)"}
                </Label>
                <Input
                  id="recipient"
                  placeholder={testChannel === "email" ? "e.g. manager@salon.com" : "e.g. +91 98765 43210"}
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTestModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendTest} disabled={sendingTest} className="gap-2">
                <Send className="w-4 h-4" />
                {sendingTest ? "Sending..." : "Send Test Now"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
