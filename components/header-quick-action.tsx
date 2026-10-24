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
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-9 px-3 gap-1.5 shadow-sm transition-all rounded-lg active:scale-95"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span className="hidden sm:inline">New Sale</span>
          <ChevronDown className="h-3 w-3 opacity-80 ml-0.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5">
        <DropdownMenuLabel className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-1">
          Fast POS Actions
        </DropdownMenuLabel>
        
        <DropdownMenuItem asChild>
          <Link
            href="/new-sale"
            className="flex items-center justify-between px-2.5 py-2 text-xs font-medium cursor-pointer rounded-md hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                <Receipt className="h-3.5 w-3.5" />
              </div>
              <span>New Sale / Bill</span>
            </div>
            <kbd className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">⇧N</kbd>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href="/bookings/calendar"
            className="flex items-center justify-between px-2.5 py-2 text-xs font-medium cursor-pointer rounded-md hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                <Calendar className="h-3.5 w-3.5" />
              </div>
              <span>Book Appointment</span>
            </div>
            <kbd className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">⇧B</kbd>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href="/customers/create"
            className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium cursor-pointer rounded-md hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-700">
              <UserPlus className="h-3.5 w-3.5" />
            </div>
            <span>Add New Customer</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuItem asChild>
          <Link
            href="/cash-registers"
            className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium cursor-pointer rounded-md hover:bg-slate-100 transition-colors"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 text-purple-700">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
            <span>Cash Register & Shifts</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href="/university"
            className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium cursor-pointer rounded-md hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
              <GraduationCap className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center justify-between flex-1">
              <span>Hanva University</span>
              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">5 Courses</span>
            </div>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
