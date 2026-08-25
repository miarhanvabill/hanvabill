"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Calendar,
  Scissors,
  UserCheck,
  Package,
  Cog,
  Star,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Crown,
  HelpCircle,
  ShoppingCart,
  FileText,
  MessageSquare,
} from "lucide-react"

const menuItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    description: "Overview & Analytics",
  },
  {
    title: "New Sales",
    href: "/new-sale",
    icon: ShoppingCart,
    description: "Create New Sale",
  },
  {
    title: "Customers",
    href: "/customers",
    icon: Users,
    description: "Customer Management",
  },
  {
    title: "Bookings",
    href: "/bookings",
    icon: Calendar,
    description: "Appointments & Scheduling",
  },
  {
    title: "Services",
    href: "/services",
    icon: Scissors,
    description: "Service Catalog",
  },
  {
    title: "Staff",
    href: "/staff",
    icon: UserCheck,
    description: "Staff Management",
  },
  {
    title: "Inventory",
    href: "/inventory",
    icon: Package,
    description: "Stock & Products",
  },
  {
    title: "Reports",
    href: "/reports",
    icon: FileText,
    description: "Business Reports",
  },
  {
    title: "Manage",
    href: "/manage",
    icon: Cog,
    description: "System Management",
  },
  {
    title: "Reviews",
    href: "/reviews",
    icon: Star,
    description: "Customer Feedback",
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    description: "Reports & Insights",
  },
  {
    title: "Marketing",
    href: "/marketing",
    icon: BarChart3,
    description: "Marketing Campaigns",
  },
  {
    title: "WhatsApp Chat",
    href: "/whatsapp",
    icon: MessageSquare,
    description: "Customer Communications",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    description: "System Configuration",
  },
]

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/"
    }
    return pathname.startsWith(href)
  }

  return (
    <div
      className={cn(
        "h-screen bg-white border-r border-gray-200 transition-all duration-300 shadow-lg flex flex-col",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <img src="/logo-icon.png" alt="Hanva Logo" className="w-8 h-8 object-contain" />
            <div>
              <h1 className="text-lg font-bold text-black">Hanva Billing</h1>
              <p className="text-xs text-gray-600 truncate max-w-[150px]">Hanva Technologies Pvt. Ltd.</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-200 text-black transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 bg-white overflow-y-auto">
        <ul className="space-y-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                    active
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                  )}
                >
                  <Icon className={cn("w-5 h-5 flex-shrink-0", active ? "text-white" : "text-gray-600")} />
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className={cn("font-medium text-sm", active ? "text-white" : "text-gray-700")}>
                        {item.title}
                      </div>
                      <div className={cn("text-xs opacity-70 truncate", active ? "text-white" : "text-gray-500")}>
                        {item.description}
                      </div>
                    </div>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
        {!isCollapsed && (
          <>
            <div className="mb-3">
              <Link
                href="/support"
                className="flex items-center gap-2 text-gray-700 hover:text-black text-sm transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
                Help & Support
              </Link>
            </div>
          </>
        )}
        {isCollapsed && (
          <div className="flex justify-center">
            <Crown className="w-5 h-5 text-purple-600" />
          </div>
        )}
      </div>
    </div>
  )
}

// Also export as named export for compatibility
export { Sidebar }
