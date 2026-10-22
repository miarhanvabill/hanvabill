"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, Search, Menu } from "lucide-react"
import { playNotificationSound } from "@/lib/notification-sound"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { SyncStatus } from "./sync-status"
import { RealTimeIndicator } from "./real-time-indicator"
import Link from "next/link"
import { useAuth, SignInButton, SignUpButton, UserButton, OrganizationSwitcher } from "@clerk/nextjs"

interface HeaderProps {
  onMenuToggle?: () => void
}

interface Notification {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

const READ_STORAGE_KEY = "hanva_read_notification_ids"

function getLocalReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function saveLocalReadId(id: string) {
  if (typeof window === "undefined") return
  try {
    const current = getLocalReadIds()
    current.add(id)
    const arr = Array.from(current).slice(-200)
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(arr))
  } catch {}
}

function saveAllLocalReadIds(ids: string[]) {
  if (typeof window === "undefined") return
  try {
    const current = getLocalReadIds()
    ids.forEach((id) => current.add(id))
    const arr = Array.from(current).slice(-200)
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(arr))
  } catch {}
}

export function Header({ onMenuToggle }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const prevNotificationIds = useRef<Set<string>>(new Set())
  const isInitialLoad = useRef(true)
  
  const { isLoaded, isSignedIn } = useAuth();

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      const rawItems: Notification[] = data.notifications || []
      const localReadIds = getLocalReadIds()

      const newItems: Notification[] = rawItems.map((item) => ({
        ...item,
        is_read: item.is_read || localReadIds.has(item.id),
      }))

      // If new unread notifications arrived after initial load, play the notification sound
      if (!isInitialLoad.current && newItems.length > 0) {
        const hasFreshUnread = newItems.some(
          (n) => !n.is_read && !prevNotificationIds.current.has(n.id)
        )
        if (hasFreshUnread) {
          playNotificationSound()
        }
      }

      isInitialLoad.current = false
      prevNotificationIds.current = new Set(newItems.map((n) => n.id))
      setNotifications(newItems)
      setError(null)
    } catch (error) {
      console.error("[v0] Error fetching notifications:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch notifications")
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    saveLocalReadId(notificationId)
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)))
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_read: true }),
      })
    } catch (error) {
      console.error("[v0] Error marking notification as read:", error)
    }
  }

  const handleMarkAllAsRead = async () => {
    const ids = notifications.map((n) => n.id)
    saveAllLocalReadIds(ids)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" })
      const { markAllAsRead: markLegacy } = await import("@/app/actions/notifications")
      await markLegacy().catch(() => {})
    } catch (error) {
      console.error("Error marking all as read:", error)
    }
  }

  useEffect(() => {
    fetchNotifications()

    // Poll every 12 seconds for fresh business/system notifications
    const interval = setInterval(fetchNotifications, 12000)

    // Check when user returns to tab or window gains focus
    const handleFocus = () => {
      fetchNotifications()
    }
    const handleCustomRefresh = () => {
      fetchNotifications()
    }

    window.addEventListener("focus", handleFocus)
    window.addEventListener("refresh-notifications", handleCustomRefresh)
    document.addEventListener("visibilitychange", handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("refresh-notifications", handleCustomRefresh)
      document.removeEventListener("visibilitychange", handleFocus)
    }
  }, [])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return "Just now"
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "Just now"

    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "Just now"

    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} hr ago`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return "Yesterday"
    if (diffInDays < 7) return `${diffInDays} days ago`

    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-4 md:px-6">
      {/* Mobile menu button */}
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuToggle} aria-label="Toggle menu">
        <Menu className="h-5 w-5" />
      </Button>

      {/* Left side items */}
      <div className="flex-1 flex items-center gap-4 max-w-2xl">
        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search customers, bookings..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {isLoaded && isSignedIn && (
          <div className="hidden md:flex items-center gap-2">
            <OrganizationSwitcher 
              afterSelectOrganizationUrl="/" 
              appearance={{
                elements: {
                  organizationSwitcherTrigger: "flex gap-2 items-center px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 transition"
                }
              }}
            />
            
          </div>
        )}
      </div>

      {/* Right side items */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Real-time sync status */}
        <div className="hidden lg:flex items-center gap-2">
          <SyncStatus />
          <RealTimeIndicator />
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleMarkAllAsRead} 
                  className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800"
                >
                  Mark all as read
                </Button>
              )}
            </div>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <DropdownMenuItem className="text-center text-gray-500">Loading notifications...</DropdownMenuItem>
              ) : error ? (
                <DropdownMenuItem className="text-center text-red-500">Failed to load notifications</DropdownMenuItem>
              ) : notifications.length === 0 ? (
                <DropdownMenuItem className="text-center text-gray-500">No notifications</DropdownMenuItem>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className={`text-sm ${!notification.is_read ? "font-medium" : ""}`}>
                        {notification.message}
                      </span>
                      {!notification.is_read && <div className="h-2 w-2 bg-blue-600 rounded-full" />}
                    </div>
                    <span className="text-xs text-gray-500">{formatRelativeTime(notification.created_at)}</span>
                  </DropdownMenuItem>
                ))
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/notifications" className="text-center w-full">
                <span className="text-sm text-blue-600">View all notifications</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu / Clerk Auth */}
        {isLoaded && !isSignedIn && (
          <div className="flex items-center gap-2">
            <SignInButton />
            <SignUpButton>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm">
                Sign Up
              </Button>
            </SignUpButton>
          </div>
        )}
        {isLoaded && isSignedIn && (
          <UserButton />
        )}
      </div>
    </header>
  )
}
