"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import StaffInstallBanner from "@/components/staff-portal/StaffInstallBanner"
import {
  CalendarDays,
  CalendarCheck2,
  TrendingUp,
  FileSpreadsheet,
  UserCircle2,
  Sparkles,
  MapPin,
  Bell,
  Clock,
} from "lucide-react"

interface StaffShellProps {
  children: React.ReactNode
}

export default function StaffShell({ children }: StaffShellProps) {
  const pathname = usePathname() || ""
  const [mounted, setMounted] = useState(false)
  const [salonName, setSalonName] = useState("Orvia Salon")
  const [staffName, setStaffName] = useState("Staff Portal")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isCheckedIn, setIsCheckedIn] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Fetch minimal session details and today's attendance status
    import("@/app/actions/staff-portal")
      .then((mod) => mod.getStaffSession())
      .then((sess: any) => {
        if (sess) {
          setSalonName(sess.tenantName || "Orvia Luxury Salon")
          setStaffName(sess.name || sess.staffName || "Staff Member")
          if (sess.avatarUrl || sess.avatar_url) setAvatarUrl(sess.avatarUrl || sess.avatar_url)
          if (typeof sess.isCheckedIn === "boolean") {
            setIsCheckedIn(sess.isCheckedIn)
          }
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handleAttendanceChange = (e: any) => {
      if (e?.detail && typeof e.detail.isCheckedIn === "boolean") {
        setIsCheckedIn(e.detail.isCheckedIn)
      }
    }
    window.addEventListener("staff-attendance-updated", handleAttendanceChange)
    return () => {
      window.removeEventListener("staff-attendance-updated", handleAttendanceChange)
    }
  }, [])

  const isLoginPage =
    pathname.endsWith("/login") || pathname === "/staff-portal/login"

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center px-4 py-8">
        <StaffInstallBanner />
        {children}
      </div>
    )
  }

  // Detect whether paths should use "/staff-portal" prefix or subdomain root "/"
  const isDirectPortalPath = pathname.startsWith("/staff-portal")
  const prefix = isDirectPortalPath ? "/staff-portal" : ""

  const navItems = [
    {
      label: "Today",
      href: prefix || "/",
      icon: Sparkles,
      exact: true,
    },
    {
      label: "Schedule",
      href: `${prefix}/schedule`,
      icon: CalendarCheck2,
    },
    {
      label: "Earnings",
      href: `${prefix}/earnings`,
      icon: TrendingUp,
    },
    {
      label: "Leaves",
      href: `${prefix}/leaves`,
      icon: FileSpreadsheet,
    },
    {
      label: "Profile",
      href: `${prefix}/profile`,
      icon: UserCircle2,
    },
  ]

  const isItemActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href || (prefix && pathname === prefix) || (!prefix && pathname === "/")
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between w-full max-w-md mx-auto shadow-2xl relative border-x border-slate-200/60">
      {/* Top Mobile Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={staffName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/20"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-wide shadow">
                  {staffName.charAt(0) || "S"}
                </div>
              )}
              {isCheckedIn && (
                <span
                  title="Checked In"
                  className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-emerald-600/30"
                />
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <img src="/orvia-logo.png" alt="Orvia Logo" className="w-4 h-4 rounded-full object-contain shrink-0" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate max-w-[130px]">
                  {salonName}
                </span>
              </div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight truncate">
                {staffName}
              </h1>
            </div>
          </div>

          <div className="flex items-center shrink-0">
            <Link
              href={`${prefix}/attendance`}
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full active:scale-95 transition ${
                isCheckedIn
                  ? "text-emerald-700 bg-emerald-50 border border-emerald-200/70"
                  : "text-slate-600 bg-slate-100 border border-slate-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isCheckedIn ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`}
              />
              <span className="whitespace-nowrap">{isCheckedIn ? "Checked In" : "Not Clocked In"}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* PWA Install Banner */}
      <StaffInstallBanner />

      {/* Main Content Area */}
      <main className="flex-1 pb-24 overflow-x-hidden w-full">{children}</main>

      {/* Fixed Bottom Navigation Bar (Strictly aligned grid with safe-area support) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 w-full max-w-md mx-auto shadow-lg pb-[env(safe-area-inset-bottom,0px)]">
        <div className="grid grid-cols-5 h-[62px] items-center px-1">
          {navItems.map((item) => {
            const active = isItemActive(item.href, item.exact)
            const Icon = item.icon

            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center justify-center h-full py-1 select-none transition-colors group"
              >
                <div
                  className={`w-12 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                    active
                      ? "bg-slate-900 text-amber-400 shadow-sm"
                      : "text-slate-500 group-hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-[18px] h-[18px] ${active ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
                </div>
                <span
                  className={`text-[10px] tracking-tight mt-1 leading-none transition-colors ${
                    active ? "font-bold text-slate-950" : "font-medium text-slate-500 group-hover:text-slate-800"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
