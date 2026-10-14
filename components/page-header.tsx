import React from "react"
import Link from "next/link"
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
  backHref = "/reports",
  action,
  children,
  className = "",
}: PageHeaderProps) {
  const displayTitle = title || heading || ""
  const displaySubtitle = subtitle || description || text

  return (
    <div className={`mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        {showBackButton && (
          <Button variant="ghost" size="icon" asChild className="h-9 w-9 shrink-0">
            <Link href={backHref} aria-label="Go back">
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
