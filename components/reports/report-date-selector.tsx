"use client"

import React, { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Calendar as CalendarIcon } from "lucide-react"

interface ReportDateSelectorProps {
  dateRange: string
  onDateRangeChange: (range: string) => void
  customStartDate?: string
  customEndDate?: string
  onCustomDateChange?: (start: string, end: string) => void
  className?: string
}

export function ReportDateSelector({
  dateRange,
  onDateRangeChange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
  className = "",
}: ReportDateSelectorProps) {
  const pad = (n: number) => String(n).padStart(2, "0")
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  const now = new Date()
  const todayStr = fmt(now)

  const defaultStart = new Date(now)
  defaultStart.setMonth(defaultStart.getMonth() - 1)
  const defaultStartStr = fmt(defaultStart)

  const [localStart, setLocalStart] = useState(customStartDate || defaultStartStr)
  const [localEnd, setLocalEnd] = useState(customEndDate || todayStr)

  React.useEffect(() => {
    if (customStartDate) setLocalStart(customStartDate)
  }, [customStartDate])

  React.useEffect(() => {
    if (customEndDate) setLocalEnd(customEndDate)
  }, [customEndDate])

  const handleRangeChange = (val: string) => {
    onDateRangeChange(val)
    if (val === "Custom" && onCustomDateChange) {
      onCustomDateChange(localStart, localEnd)
    }
  }

  const handleStartChange = (val: string) => {
    setLocalStart(val)
    if (onCustomDateChange) {
      onCustomDateChange(val, localEnd)
    }
  }

  const handleEndChange = (val: string) => {
    setLocalEnd(val)
    if (onCustomDateChange) {
      onCustomDateChange(localStart, val)
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Select value={dateRange} onValueChange={handleRangeChange}>
        <SelectTrigger className="w-[160px] bg-white">
          <CalendarIcon className="w-4 h-4 mr-2 text-gray-500 shrink-0" />
          <SelectValue placeholder="Select Range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Today">Today</SelectItem>
          <SelectItem value="Yesterday">Yesterday</SelectItem>
          <SelectItem value="This Week">This Week</SelectItem>
          <SelectItem value="This Month">This Month</SelectItem>
          <SelectItem value="Last 3 Months">Last 3 Months</SelectItem>
          <SelectItem value="Last 6 Months">Last 6 Months</SelectItem>
          <SelectItem value="This Year">This Year</SelectItem>
          <SelectItem value="Custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      {dateRange === "Custom" && (
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-md px-2 py-1 shadow-sm">
          <Input
            type="date"
            value={customStartDate ?? localStart}
            onChange={(e) => handleStartChange(e.target.value)}
            className="h-7 w-[130px] sm:w-[135px] text-xs px-1 border-0 focus-visible:ring-0 bg-transparent"
            title="Start Date"
          />
          <span className="text-gray-400 text-xs font-medium">to</span>
          <Input
            type="date"
            value={customEndDate ?? localEnd}
            onChange={(e) => handleEndChange(e.target.value)}
            className="h-7 w-[130px] sm:w-[135px] text-xs px-1 border-0 focus-visible:ring-0 bg-transparent"
            title="End Date"
          />
        </div>
      )}
    </div>
  )
}
