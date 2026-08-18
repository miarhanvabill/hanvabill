"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Bell,
  Calendar,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  Settings,
  Trash2,
  BookMarkedIcon as MarkAsUnread,
  Filter,
} from "lucide-react"

interface Notification {
  id: number
  type: "appointment" | "payment" | "customer" | "system" | "marketing" | "reminder"
  title: string
  message: string
  created_at: string
  read: boolean
  priority: "low" | "medium" | "high"
  action_url?: string
}

interface NotificationStats {
  total: number
  unread: number
  highPriority: number
  appointments: number
}

const notificationSettings = {
  appointments: {
    newBooking: true,
    cancellation: true,
    reminder: true,
    noShow: true,
  },
  payments: {
    received: true,
    failed: false,
    refund: true,
    lowBalance: true,
  },
  customers: {
    newCustomer: true,
    birthday: true,
    anniversary: true,
    feedback: true,
  },
  system: {
    updates: true,
    maintenance: true,
    security: true,
    backup: false,
  },
  marketing: {
    campaigns: false,
    promotions: true,
    analytics: false,
    social: false,
  },
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0, highPriority: 0, appointments: 0 })
  const [activeTab, setActiveTab] = useState("all")
  const [settings, setSettings] = useState(notificationSettings)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      console.log("[v0] Loading notifications data")

      const [notificationsResponse, statsResponse] = await Promise.all([
        fetch("/api/notifications"),
        fetch("/api/notifications?stats=true"),
      ])

      if (notificationsResponse.ok && statsResponse.ok) {
        const notificationsData = await notificationsResponse.json()
        const statsData = await statsResponse.json()

        console.log("[v0] Loaded notifications:", notificationsData.length)
        console.log("[v0] Loaded stats:", statsData)

        setNotifications(notificationsData)
        setStats(statsData)
      } else {
        console.error("[v0] Failed to load notifications data")
        // Fallback to empty data
        setNotifications([])
        setStats({ total: 0, unread: 0, highPriority: 0, appointments: 0 })
      }
    } catch (error) {
      console.error("[v0] Error loading notifications:", error)
      // Fallback to empty data
      setNotifications([])
      setStats({ total: 0, unread: 0, highPriority: 0, appointments: 0 })
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: number) => {
    try {
      console.log("[v0] Marking notification as read:", id)

      const response = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read" }),
      })

      if (response.ok) {
        setNotifications(notifications.map((notif) => (notif.id === id ? { ...notif, read: true } : notif)))
        setStats((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }))
      } else {
        console.error("[v0] Failed to mark notification as read")
      }
    } catch (error) {
      console.error("[v0] Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      console.log("[v0] Marking all notifications as read")

      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      })

      if (response.ok) {
        setNotifications(notifications.map((notif) => ({ ...notif, read: true })))
        setStats((prev) => ({ ...prev, unread: 0 }))
      } else {
        console.error("[v0] Failed to mark all notifications as read")
      }
    } catch (error) {
      console.error("[v0] Error marking all notifications as read:", error)
    }
  }

  const deleteNotification = async (id: number) => {
    try {
      console.log("[v0] Deleting notification:", id)

      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        const deletedNotif = notifications.find((n) => n.id === id)
        setNotifications(notifications.filter((notif) => notif.id !== id))
        setStats((prev) => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
          unread: deletedNotif && !deletedNotif.read ? Math.max(0, prev.unread - 1) : prev.unread,
          highPriority:
            deletedNotif && deletedNotif.priority === "high" ? Math.max(0, prev.highPriority - 1) : prev.highPriority,
          appointments:
            deletedNotif && deletedNotif.type === "appointment"
              ? Math.max(0, prev.appointments - 1)
              : prev.appointments,
        }))
      } else {
        console.error("[v0] Failed to delete notification")
      }
    } catch (error) {
      console.error("[v0] Error deleting notification:", error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "appointment":
        return Calendar
      case "payment":
        return DollarSign
      case "customer":
        return Users
      case "system":
        return AlertTriangle
      case "marketing":
        return MessageSquare
      case "reminder":
        return Clock
      default:
        return Bell
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredNotifications = notifications.filter((notif) => {
    if (activeTab === "all") return true
    if (activeTab === "unread") return !notif.read
    return notif.type === activeTab
  })

  const unreadCount = stats.unread

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading notifications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Notifications" subtitle="Stay updated with important alerts and messages from your salon." />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Notifications</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-red-600">{stats.unread}</div>
                <div className="text-sm text-gray-600">Unread</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.highPriority}</div>
                <div className="text-sm text-gray-600">High Priority</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.appointments}</div>
                <div className="text-sm text-gray-600">Appointments</div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">
                  Unread {unreadCount > 0 && <Badge className="ml-2">{unreadCount}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="appointment">Appointments</TabsTrigger>
                <TabsTrigger value="payment">Payments</TabsTrigger>
                <TabsTrigger value="customer">Customers</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark All Read
                </Button>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>

            <TabsContent value={activeTab} className="space-y-4">
              {filteredNotifications.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No notifications found</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => {
                    const IconComponent = getNotificationIcon(notification.type)
                    return (
                      <Card
                        key={notification.id}
                        className={`hover:shadow-sm transition-shadow cursor-pointer ${
                          !notification.read ? "border-l-4 border-l-blue-500 bg-blue-50/30" : ""
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                notification.type === "appointment"
                                  ? "bg-blue-100 text-blue-600"
                                  : notification.type === "payment"
                                    ? "bg-green-100 text-green-600"
                                    : notification.type === "customer"
                                      ? "bg-purple-100 text-purple-600"
                                      : notification.type === "system"
                                        ? "bg-red-100 text-red-600"
                                        : notification.type === "marketing"
                                          ? "bg-orange-100 text-orange-600"
                                          : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              <IconComponent className="w-5 h-5" />
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className={`font-medium ${!notification.read ? "font-semibold" : ""}`}>
                                  {notification.title}
                                </h3>
                                <Badge className={getPriorityColor(notification.priority)}>
                                  {notification.priority}
                                </Badge>
                                {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                              </div>
                              <p className="text-gray-600 text-sm mb-2">{notification.message}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                  {new Date(notification.created_at).toLocaleString()}
                                </span>
                                <div className="flex items-center gap-1">
                                  {!notification.read && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        markAsRead(notification.id)
                                      }}
                                    >
                                      <MarkAsUnread className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deleteNotification(notification.id)
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(settings).map(([category, categorySettings]) => (
                <div key={category}>
                  <h3 className="font-medium mb-3 capitalize">{category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(categorySettings).map(([setting, enabled]) => (
                      <div key={setting} className="flex items-center justify-between">
                        <Label htmlFor={`${category}-${setting}`} className="capitalize">
                          {setting.replace(/([A-Z])/g, " $1").trim()}
                        </Label>
                        <Switch
                          id={`${category}-${setting}`}
                          checked={enabled}
                          onCheckedChange={(checked) => {
                            setSettings({
                              ...settings,
                              [category]: {
                                ...categorySettings,
                                [setting]: checked,
                              },
                            })
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
