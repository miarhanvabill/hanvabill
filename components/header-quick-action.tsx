"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  Plus,
  Receipt,
  Calendar,
  UserPlus,
  CreditCard,
  ChevronDown,
  GraduationCap,
  Sparkles,
} from "lucide-react"

export function HeaderQuickAction() {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input or textarea
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        return
      }

      if (e.shiftKey && e.key.toUpperCase() === "N") {
        e.preventDefault()
        router.push("/new-sale")
      } else if (e.shiftKey && e.key.toUpperCase() === "B") {
        e.preventDefault()
        router.push("/bookings/calendar")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [router])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          className="relative group overflow-hidden bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white font-medium text-xs h-9 px-3.5 gap-1.5 shadow-[0_2px_10px_rgba(217,119,6,0.3),inset_0_1px_1.5px_rgba(255,255,255,0.45)] border border-amber-300/40 backdrop-blur-xl transition-all rounded-xl hover:shadow-[0_4px_16px_rgba(217,119,6,0.45),inset_0_1px_1.5px_rgba(255,255,255,0.6)] hover:brightness-105 active:scale-[0.98] cursor-pointer"
        >
          {/* macOS Glass specular reflection sheen */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-black/10 pointer-events-none" />
          
          <Plus className="relative z-10 h-3.5 w-3.5 stroke-[2.5] text-amber-50 drop-shadow-xs" />
          <span className="relative z-10 hidden sm:inline font-semibold tracking-wide">New Sale</span>
          <ChevronDown className="relative z-10 h-3 w-3 opacity-90 ml-0.5 text-amber-100" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 p-1.5 rounded-2xl border border-white/60 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl shadow-[0_14px_36px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.04)]"
      >
        <DropdownMenuLabel className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-1">
          Fast POS Actions
        </DropdownMenuLabel>

        <DropdownMenuItem asChild>
          <Link
            href="/new-sale"
            className="flex items-center justify-between px-2.5 py-2 text-xs font-medium cursor-pointer rounded-xl hover:bg-amber-500/10 hover:text-amber-950 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 border border-amber-500/20 shadow-2xs">
                <Receipt className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold text-slate-800">New Sale / Bill</span>
            </div>
            <kbd className="font-mono text-[10px] text-slate-500 bg-black/[0.04] px-1.5 py-0.5 rounded-md border border-black/[0.06]">
              ⇧N
            </kbd>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href="/bookings/calendar"
            className="flex items-center justify-between px-2.5 py-2 text-xs font-medium cursor-pointer rounded-xl hover:bg-amber-500/10 hover:text-amber-950 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 border border-emerald-500/20 shadow-2xs">
                <Calendar className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold text-slate-800">Book Appointment</span>
            </div>
            <kbd className="font-mono text-[10px] text-slate-500 bg-black/[0.04] px-1.5 py-0.5 rounded-md border border-black/[0.06]">
              ⇧B
            </kbd>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href="/customers/create"
            className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium cursor-pointer rounded-xl hover:bg-amber-500/10 hover:text-amber-950 transition-colors"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-500/15 text-orange-700 border border-orange-500/20 shadow-2xs">
              <UserPlus className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-slate-800">Add New Customer</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1 bg-black/[0.06]" />

        <DropdownMenuItem asChild>
          <Link
            href="/cash-registers"
            className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium cursor-pointer rounded-xl hover:bg-black/[0.04] transition-colors"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-500/15 text-slate-700 border border-slate-500/20 shadow-2xs">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
            <span className="text-slate-700">Cash Register & Shifts</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href="/university"
            className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium cursor-pointer rounded-xl hover:bg-amber-500/10 hover:text-amber-950 transition-colors"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 border border-amber-500/20 shadow-2xs">
              <GraduationCap className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center justify-between flex-1">
              <span className="text-slate-800">Hanva University</span>
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-500/15 px-1.5 py-0.2 rounded-md">
                5 Courses
              </span>
            </div>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
