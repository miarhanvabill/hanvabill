"use client"

import { useState, useEffect, useRef } from "react"
import {
  Bell,
  Menu,
  Store,
  Volume2,
  VolumeX,
  CheckCheck,
  GraduationCap,
  Sparkles,
  ExternalLink,
} from "lucide-react"
import {
  playNotificationSound,
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
} from "@/lib/notification-sound"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Link from "next/link"
import { useAuth, SignInButton, SignUpButton, UserButton, OrganizationSwitcher } from "@clerk/nextjs"
import { HeaderCommandPalette } from "./header-command-palette"
import { HeaderQuickAction } from "./header-quick-action"
import { HeaderLivePulse } from "./header-live-pulse"
import { HeaderFullscreenToggle } from "./header-fullscreen-toggle"

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
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notifFilter, setNotifFilter] = useState<"all" | "unread">("all")
  const prevNotificationIds = useRef<Set<string>>(new Set())
  const isInitialLoad = useRef(true)

  const { isLoaded, isSignedIn } = useAuth()

  useEffect(() => {
    setSoundEnabled(isNotificationSoundEnabled())
  }, [])

  const toggleSound = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    setNotificationSoundEnabled(next)
  }

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

    const handleFocus = () => fetchNotifications()
    const handleCustomRefresh = () => fetchNotifications()

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
  const displayedNotifications = notifications.filter((n) => notifFilter === "all" || !n.is_read)

  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return "Just now"
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "Just now"

    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "Just now"

    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return "Yesterday"
    if (diffInDays < 7) return `${diffInDays}d ago`

    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
  }

  const getNotificationLink = (message: string) => {
    const msg = message.toLowerCase()
    if (msg.includes("booking") || msg.includes("appointment")) return "/bookings/calendar"
    if (msg.includes("bill") || msg.includes("invoice") || msg.includes("sale") || msg.includes("payment")) return "/invoices"
    if (msg.includes("stock") || msg.includes("inventory")) return "/inventory"
    if (msg.includes("customer")) return "/customers"
    return "/notifications"
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2.5 sm:gap-4 border-b border-black/[0.06] bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl backdrop-saturate-200 px-3 sm:px-4 md:px-6 shadow-[0_1px_3px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.7)]">
      {/* Left side: Mobile menu toggle + Universal Command Palette Search */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-xs sm:max-w-md lg:max-w-lg">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9 text-slate-600 hover:text-slate-900 rounded-xl"
          onClick={onMenuToggle}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Global Command Palette Search */}
        <HeaderCommandPalette />
      </div>

      {/* Middle: Store / Branch Location Switcher - macOS Glass Segment */}
      {isLoaded && isSignedIn && (
        <div className="hidden lg:flex items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-black/[0.07] dark:border-white/10 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl shadow-2xs hover:bg-white/85 hover:border-amber-300/60 transition-all">
            <Store className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <OrganizationSwitcher
              afterSelectOrganizationUrl="/"
              appearance={{
                elements: {
                  organizationSwitcherTrigger:
                    "flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 p-0 hover:text-slate-950 border-0 bg-transparent shadow-none focus:outline-none focus:ring-0",
                  organizationPreviewTextContainer: "text-xs font-semibold text-slate-800 dark:text-slate-200",
                  organizationSwitcherTriggerIcon: "text-slate-400 h-3 w-3",
                },
              }}
            />
          </div>
        </div>
      )}

      {/* Right side items & tools */}
      <div className="flex items-center gap-2 sm:gap-2.5 ml-auto">
        {/* + Quick Action Fast POS Button (macOS Golden Gate Glass) */}
        <HeaderQuickAction />

        {/* Consolidated Live Status & Salon Local Clock (macOS Frosted Capsule) */}
        <HeaderLivePulse />

        {/* Fullscreen Touchscreen / Kiosk Toggle */}
        <HeaderFullscreenToggle />

        {/* Direct Link to Hanva University */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/university"
                className="hidden xl:inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/50 hover:bg-white/85 border border-black/[0.07] hover:border-amber-300/60 text-slate-600 hover:text-amber-700 backdrop-blur-md shadow-2xs transition-all"
                aria-label="Hanva University"
              >
                <GraduationCap className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <span>Hanva University Masterclasses</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Notifications Center */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-xl bg-white/50 hover:bg-white/85 border border-black/[0.07] text-slate-600 hover:text-slate-900 backdrop-blur-md shadow-2xs transition-all cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 w-4 min-w-[16px] rounded-full p-0 flex items-center justify-center text-[10px] font-bold bg-gradient-to-r from-amber-600 to-orange-600 text-white border-2 border-white shadow-xs"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-80 sm:w-88 p-0 rounded-2xl border border-white/60 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl shadow-[0_14px_36px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.04)]"
          >
            {/* Notification Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-black/[0.06] bg-black/[0.02]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-slate-900">Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-md bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* Sound alert toggle */}
                <button
                  type="button"
                  onClick={toggleSound}
                  title={soundEnabled ? "Mute alert chimes" : "Unmute alert chimes"}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-black/[0.05] transition-colors cursor-pointer"
                >
                  {soundEnabled ? (
                    <Volume2 className="h-3.5 w-3.5 text-amber-700" />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </button>

                {/* Mark all as read */}
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    title="Mark all as read"
                    className="p-1 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50/70 transition-colors cursor-pointer"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Filter: All vs Unread */}
            <div className="flex border-b border-black/[0.06] px-2.5 pt-1 gap-1">
              <button
                type="button"
                onClick={() => setNotifFilter("all")}
                className={`px-2.5 py-1 text-[11px] font-medium border-b-2 transition-colors cursor-pointer ${
                  notifFilter === "all"
                    ? "border-amber-600 text-amber-800 font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setNotifFilter("unread")}
                className={`px-2.5 py-1 text-[11px] font-medium border-b-2 transition-colors cursor-pointer ${
                  notifFilter === "unread"
                    ? "border-amber-600 text-amber-800 font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Notification Items List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-black/[0.04]">
              {loading ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading notifications...</div>
              ) : error ? (
                <div className="py-6 text-center text-xs text-rose-500">Failed to load alerts</div>
              ) : displayedNotifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  {notifFilter === "unread" ? "No unread notifications" : "No notifications yet"}
                </div>
              ) : (
                displayedNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-2.5 p-3 hover:bg-black/[0.03] transition-colors cursor-pointer group ${
                      !notification.is_read ? "bg-amber-500/5" : ""
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="mt-1">
                      {!notification.is_read ? (
                        <div className="h-2 w-2 rounded-full bg-amber-600 shadow-2xs" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-transparent" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs leading-snug ${
                          !notification.is_read
                            ? "font-semibold text-slate-900"
                            : "text-slate-700"
                        }`}
                      >
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                        <span>{formatRelativeTime(notification.created_at)}</span>
                        <Link
                          href={getNotificationLink(notification.message)}
                          className="opacity-0 group-hover:opacity-100 text-amber-700 hover:underline flex items-center gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>Open</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Footer */}
            <DropdownMenuSeparator className="m-0 bg-black/[0.06]" />
            <DropdownMenuItem asChild>
              <Link
                href="/notifications"
                className="flex items-center justify-center py-2.5 text-center w-full text-xs font-semibold text-amber-700 hover:text-amber-800 hover:bg-black/[0.03] transition-colors"
              >
                View all notifications in Activity Center
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Account Button (Clerk) */}
        {isLoaded && !isSignedIn && (
          <div className="flex items-center gap-2">
            <SignInButton />
            <SignUpButton>
              <Button
                className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs h-8 px-3 rounded-lg shadow-2xs"
                size="sm"
              >
                Sign Up
              </Button>
            </SignUpButton>
          </div>
        )}
        {isLoaded && isSignedIn && <UserButton />}
      </div>
    </header>
  )
}
