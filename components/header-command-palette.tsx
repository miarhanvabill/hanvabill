"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Search,
  PlusCircle,
  Calendar,
  UserPlus,
  Users,
  ShoppingBag,
  Package,
  BarChart3,
  GraduationCap,
  Settings,
  MessageSquare,
  Receipt,
  Sparkles,
  CreditCard,
  Scissors,
  Star,
  ExternalLink,
} from "lucide-react"

interface CustomerResult {
  id: string | number
  name: string
  phone?: string
  email?: string
  total_spend?: number | string
  visits?: number
}

interface ServiceResult {
  id: string | number
  name: string
  price?: number | string
  category?: string
  duration?: number
}

export function HeaderCommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [customers, setCustomers] = useState<CustomerResult[]>([])
  const [services, setServices] = useState<ServiceResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isMac, setIsMac] = useState(true)
  const router = useRouter()

  useEffect(() => {
    setIsMac(typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0)

    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // Debounced search for customers and services
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setCustomers([])
      setServices([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const [custRes, servRes] = await Promise.allSettled([
          fetch(`/api/customers?search=${encodeURIComponent(query)}`).then((r) => r.json()),
          fetch(`/api/services`).then((r) => r.json()),
        ])

        if (custRes.status === "fulfilled" && custRes.value?.customers) {
          setCustomers(custRes.value.customers.slice(0, 5))
        }

        if (servRes.status === "fulfilled" && Array.isArray(servRes.value)) {
          const q = query.toLowerCase()
          const matched = servRes.value
            .filter((s: any) => s.name?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q))
            .slice(0, 4)
          setServices(matched)
        }
      } catch (err) {
        console.warn("[CommandPalette] Search error:", err)
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query])

  const runCommand = useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  return (
    <>
      {/* Header Search Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        type="button"
        className="group relative flex h-9 w-full max-w-sm sm:max-w-md items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-3 text-xs text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          <span className="hidden sm:inline font-normal">Search customers, bookings, services...</span>
          <span className="sm:hidden font-normal">Search...</span>
        </div>
        <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-slate-200 bg-white px-1.5 font-mono text-[10px] font-medium text-slate-500 shadow-2xs">
          {isMac ? "⌘K" : "Ctrl+K"}
        </kbd>
      </button>

      {/* Command Palette Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Type a command, search customer, service or navigate..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[420px]">
          <CommandEmpty>
            {isSearching ? (
              <span className="text-xs text-slate-400">Searching records...</span>
            ) : (
              <span className="text-xs text-slate-500">No results found for &quot;{query}&quot;.</span>
            )}
          </CommandEmpty>

          {/* Customer Results */}
          {customers.length > 0 && (
            <CommandGroup heading="Customers">
              {customers.map((c) => (
                <CommandItem
                  key={`cust-${c.id}`}
                  onSelect={() => runCommand(() => router.push(`/customers/${c.id}`))}
                  className="flex items-center justify-between py-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{c.name}</div>
                      <div className="text-[11px] text-slate-500">{c.phone || c.email || "Customer profile"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        runCommand(() => router.push(`/new-sale?customer_id=${c.id}`))
                      }}
                      className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                    >
                      Start Bill
                    </button>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Service Results */}
          {services.length > 0 && (
            <CommandGroup heading="Services & Menu">
              {services.map((s) => (
                <CommandItem
                  key={`serv-${s.id}`}
                  onSelect={() => runCommand(() => router.push(`/services`))}
                  className="flex items-center justify-between py-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Scissors className="h-4 w-4 text-purple-600" />
                    <div>
                      <div className="font-medium text-slate-900">{s.name}</div>
                      <div className="text-[11px] text-slate-500">{s.category || "Salon Service"}</div>
                    </div>
                  </div>
                  {s.price && (
                    <span className="text-xs font-semibold text-slate-700">₹{s.price}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Quick Actions */}
          <CommandGroup heading="Quick Actions">
            <CommandItem
              onSelect={() => runCommand(() => router.push("/new-sale"))}
              className="flex items-center gap-2.5 py-2 cursor-pointer"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                <Receipt className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 font-medium text-slate-900">New Sale / POS Billing</div>
              <kbd className="font-mono text-[10px] text-slate-400">Shift+N</kbd>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => router.push("/bookings/calendar"))}
              className="flex items-center gap-2.5 py-2 cursor-pointer"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                <Calendar className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 font-medium text-slate-900">Book Appointment / Calendar</div>
              <kbd className="font-mono text-[10px] text-slate-400">Shift+B</kbd>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => router.push("/customers/create"))}
              className="flex items-center gap-2.5 py-2 cursor-pointer"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                <UserPlus className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 font-medium text-slate-900">Add New Customer</div>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => router.push("/cash-registers"))}
              className="flex items-center gap-2.5 py-2 cursor-pointer"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 text-purple-700">
                <CreditCard className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 font-medium text-slate-900">Cash Drawer & Register Status</div>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Navigation Shortcuts */}
          <CommandGroup heading="Jump to Page">
            <CommandItem
              onSelect={() => runCommand(() => router.push("/billing/advanced-reports"))}
              className="flex items-center gap-2.5 py-1.5 cursor-pointer"
            >
              <BarChart3 className="h-4 w-4 text-slate-500" />
              <span>Advanced Business Reports</span>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => router.push("/university"))}
              className="flex items-center gap-2.5 py-1.5 cursor-pointer"
            >
              <GraduationCap className="h-4 w-4 text-indigo-500" />
              <div className="flex items-center gap-2">
                <span>Hanva University & Certifications</span>
                <span className="rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] font-medium text-indigo-700">
                  New
                </span>
              </div>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => router.push("/inventory"))}
              className="flex items-center gap-2.5 py-1.5 cursor-pointer"
            >
              <Package className="h-4 w-4 text-slate-500" />
              <span>Inventory & Stock Management</span>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => router.push("/customers"))}
              className="flex items-center gap-2.5 py-1.5 cursor-pointer"
            >
              <Users className="h-4 w-4 text-slate-500" />
              <span>Customer Directory</span>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => router.push("/manage/whatsapp-config"))}
              className="flex items-center gap-2.5 py-1.5 cursor-pointer"
            >
              <MessageSquare className="h-4 w-4 text-emerald-500" />
              <span>WhatsApp Automations & Marketing</span>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => router.push("/settings"))}
              className="flex items-center gap-2.5 py-1.5 cursor-pointer"
            >
              <Settings className="h-4 w-4 text-slate-500" />
              <span>Store Settings</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
