"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  AlertCircle
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  getNotificationLogs,
  getNotificationPreferences,
  saveNotificationPreferences,
  NotificationLog,
  NotificationPreference
} from "./actions"

const DEFAULT_EVENTS = [
  { id: "booking_created", label: "Booking Created", category: "Appointments" },
  { id: "booking_rescheduled", label: "Booking Rescheduled", category: "Appointments" },
  { id: "booking_cancelled", label: "Booking Cancelled", category: "Appointments" },
  { id: "appointment_reminder", label: "Appointment Reminder", category: "Appointments" },
  { id: "payment_received", label: "Payment Received", category: "Billing" },
  { id: "payment_failed", label: "Payment Failed", category: "Billing" },
  { id: "marketing_campaign", label: "Marketing Campaign", category: "Marketing" },
  { id: "birthday_wish", label: "Birthday Wish", category: "Marketing" },
]

export default function NotificationsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [logsRes, prefsRes] = await Promise.all([
        getNotificationLogs(),
        getNotificationPreferences()
      ])

      if (logsRes?.success) {
        setLogs(logsRes.data)
      }
      
      if (prefsRes?.success) {
        // Merge with defaults if not exists
        const dbPrefs = prefsRes.data
        const mergedPrefs = DEFAULT_EVENTS.map(event => {
          const existing = dbPrefs.find((p: any) => p.event_type === event.id)
          if (existing) return existing
          return {
            event_type: event.id,
            email_enabled: false,
            sms_enabled: false,
            whatsapp_enabled: false
          }
        })
        setPreferences(mergedPrefs)
      } else {
        // Use defaults if fetch fails or no data
        setPreferences(DEFAULT_EVENTS.map(event => ({
          event_type: event.id,
          email_enabled: false,
          sms_enabled: false,
          whatsapp_enabled: false
        })))
      }
    } catch (error) {
      console.error("Failed to load notifications page data:", error)
      toast({ title: "Error", description: "Failed to load data.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePreference = (eventType: string, channel: 'email_enabled' | 'sms_enabled' | 'whatsapp_enabled') => {
    setPreferences(prev => prev.map(p => {
      if (p.event_type === eventType) {
        return { ...p, [channel]: !p[channel] }
      }
      return p
    }))
  }

  const handleSavePreferences = async () => {
    setSaving(true)
    try {
      const res = await saveNotificationPreferences(preferences)
      if (res?.success) {
        toast({ title: "Success", description: "Notification preferences saved." })
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

  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case "email": return <Mail className="w-4 h-4" />
      case "sms": return <Smartphone className="w-4 h-4" />
      case "whatsapp": return <MessageSquare className="w-4 h-4 text-green-500" />
      default: return <Bell className="w-4 h-4" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
      case "sent": return <CheckCircle className="w-4 h-4 text-green-500" />
      case "failed": return <XCircle className="w-4 h-4 text-red-500" />
      case "pending": return <Clock className="w-4 h-4 text-yellow-500" />
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading notifications center...</p>
        </div>
      </div>
    )
  }

  // Group events for settings view
  const eventsByCategory = DEFAULT_EVENTS.reduce((acc, event) => {
    if (!acc[event.category]) acc[event.category] = []
    acc[event.category].push(event)
    return acc
  }, {} as Record<string, typeof DEFAULT_EVENTS>)

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader title="Notification Center" subtitle="Manage customer communications and view messaging history." />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-6xl mx-auto space-y-6">
          <Tabs defaultValue="history">
            <TabsList className="mb-4">
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Notification History
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Message Log</CardTitle>
                  <CardDescription>A log of all messages sent to your customers.</CardDescription>
                </CardHeader>
                <CardContent>
                  {logs.length === 0 ? (
                    <div className="text-center p-12 text-gray-500">
                      <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No messages have been sent yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                          <tr>
                            <th className="px-4 py-3">Date & Time</th>
                            <th className="px-4 py-3">Customer</th>
                            <th className="px-4 py-3">Event Type</th>
                            <th className="px-4 py-3">Channel</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Content</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                {new Date(log.sent_at).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 font-medium">
                                {log.customer_name || 'Unknown'}
                                <span className="block text-xs text-gray-500">{log.customer_phone}</span>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="capitalize">
                                  {log.type.replace(/_/g, ' ')}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5 capitalize text-gray-700">
                                  {getChannelIcon(log.channel)}
                                  {log.channel}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5 capitalize">
                                  {getStatusIcon(log.status)}
                                  <span className={
                                    log.status === 'failed' ? 'text-red-600' :
                                    log.status === 'delivered' ? 'text-green-600' : 'text-gray-600'
                                  }>
                                    {log.status}
                                  </span>
                                </div>
                                {log.error_message && (
                                  <span className="block text-xs text-red-500 mt-1 max-w-[150px] truncate" title={log.error_message}>
                                    {log.error_message}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-600 truncate max-w-xs" title={log.content}>
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

            <TabsContent value="settings">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Configure how and when your customers receive messages.</CardDescription>
                  </div>
                  <Button onClick={handleSavePreferences} disabled={saving}>
                    {saving ? "Saving..." : "Save Preferences"}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-8">
                  {Object.entries(eventsByCategory).map(([category, events]) => (
                    <div key={category}>
                      <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">{category}</h3>
                      <div className="grid gap-6">
                        {events.map((event) => {
                          const pref = preferences.find(p => p.event_type === event.id)
                          if (!pref) return null
                          
                          return (
                            <div key={event.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
                              <div className="mb-4 md:mb-0">
                                <h4 className="font-medium text-gray-900">{event.label}</h4>
                                <p className="text-sm text-gray-500">Triggers when a {event.label.toLowerCase()} event occurs.</p>
                              </div>
                              
                              <div className="flex items-center gap-6">
                                <div className="flex items-center space-x-2">
                                  <Switch 
                                    id={`email-${event.id}`}
                                    checked={pref.email_enabled}
                                    onCheckedChange={() => handleTogglePreference(event.id, 'email_enabled')}
                                  />
                                  <Label htmlFor={`email-${event.id}`} className="flex items-center gap-1 cursor-pointer">
                                    <Mail className="w-4 h-4 text-gray-500" />
                                    Email
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Switch 
                                    id={`sms-${event.id}`}
                                    checked={pref.sms_enabled}
                                    onCheckedChange={() => handleTogglePreference(event.id, 'sms_enabled')}
                                  />
                                  <Label htmlFor={`sms-${event.id}`} className="flex items-center gap-1 cursor-pointer">
                                    <Smartphone className="w-4 h-4 text-gray-500" />
                                    SMS
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Switch 
                                    id={`wa-${event.id}`}
                                    checked={pref.whatsapp_enabled}
                                    onCheckedChange={() => handleTogglePreference(event.id, 'whatsapp_enabled')}
                                  />
                                  <Label htmlFor={`wa-${event.id}`} className="flex items-center gap-1 cursor-pointer">
                                    <MessageSquare className="w-4 h-4 text-green-500" />
                                    WhatsApp
                                  </Label>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSavePreferences} disabled={saving} size="lg">
                      {saving ? "Saving..." : "Save Preferences"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
