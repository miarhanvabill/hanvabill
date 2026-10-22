"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PageHeaderProps {
  title?: string
  heading?: string
  subtitle?: string
  description?: string
  text?: string
  showBackButton?: boolean
  backHref?: string
  action?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  heading,
  subtitle,
  description,
  text,
  showBackButton,
  backHref,
  action,
  children,
  className = "",
}: PageHeaderProps) {
  const pathname = usePathname()
  const displayTitle = title || heading || ""
  const displaySubtitle = subtitle || description || text

  // Automatically detect if we are on a subpage of manage, billing, reports, or manage-linked pages
  const isManageSubpage = pathname ? pathname.startsWith("/manage/") && pathname !== "/manage" : false
  const isReportsSubpage = pathname ? pathname.startsWith("/reports/") && pathname !== "/reports" : false
  const isBillingSubpage = pathname ? pathname.startsWith("/billing/") && pathname !== "/billing" : false

  const manageLinkedPaths = [
    "/user-management",
    "/attendance",
    "/services",
    "/todos",
    "/billing/reminders",
    "/billing/templates",
    "/billing/advanced-reports",
    "/cash-registers",
    "/invoices",
    "/expenses",
    "/enquiry",
    "/appointments",
    "/university",
    "/forms",
    "/reviews",
    "/notifications",
  ]
  const isManageLinkedPage = pathname
    ? manageLinkedPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))
    : false

  // If showBackButton is explicitly passed (boolean), respect it; otherwise auto-enable for manage/reports/billing subpages
  const shouldShowBack = showBackButton !== undefined ? showBackButton : (isManageSubpage || isReportsSubpage || isBillingSubpage || isManageLinkedPage)

  // Resolve back URL: default to /manage for manage, billing, and manage-linked pages, /reports for reports subpages
  const defaultBackHref = isManageSubpage || isBillingSubpage || isManageLinkedPage ? "/manage" : "/reports"
  const resolvedBackHref = backHref || defaultBackHref

  return (
    <div className={`mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        {shouldShowBack && (
          <Button variant="ghost" size="icon" asChild className="h-9 w-9 shrink-0">
            <Link href={resolvedBackHref} aria-label="Go back">
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </Link>
          </Button>
        )}
        <div>
          {displayTitle && (
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {displayTitle}
            </h1>
          )}
          {displaySubtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{displaySubtitle}</p>
          )}
        </div>
      </div>
      {(action || children) && (
        <div className="flex-shrink-0 flex items-center gap-2">
          {action}
          {children}
        </div>
      )}
    </div>
  )
}

