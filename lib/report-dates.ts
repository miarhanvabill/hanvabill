export interface DateRangeResult {
  startIso: string
  endIso: string
  days: number
}

export function getDefaultCustomDates(): { startDate: string; endDate: string } {
  const pad = (n: number) => String(n).padStart(2, "0")
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const now = new Date()
  const start = new Date(now)
  start.setMonth(start.getMonth() - 1)
  return {
    startDate: fmt(start),
    endDate: fmt(now),
  }
}

export function parseReportDates(
  dateRange: string = "This Month",
  customStart?: string | null,
  customEnd?: string | null
): DateRangeResult {
  const pad = (n: number) => String(n).padStart(2, "0")
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  const now = new Date()
  const todayStr = fmt(now)

  // If custom dates are explicitly provided
  if ((dateRange === "Custom" || dateRange === "custom") && customStart && customEnd) {
    const s = new Date(customStart)
    const e = new Date(customEnd)
    const diffDays = Math.max(1, Math.round(Math.abs((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))))
    return {
      startIso: customStart,
      endIso: customEnd,
      days: diffDays,
    }
  }

  switch (dateRange) {
    case "Today": {
      return { startIso: todayStr, endIso: todayStr, days: 1 }
    }
    case "Yesterday": {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      const yStr = fmt(y)
      return { startIso: yStr, endIso: yStr, days: 1 }
    }
    case "This Week":
    case "Last 7 Days": {
      const s = new Date(now)
      s.setDate(s.getDate() - 6)
      return { startIso: fmt(s), endIso: todayStr, days: 7 }
    }
    case "This Month": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1)
      return { startIso: fmt(s), endIso: todayStr, days: 30 }
    }
    case "Last 30 Days": {
      const s = new Date(now)
      s.setDate(s.getDate() - 29)
      return { startIso: fmt(s), endIso: todayStr, days: 30 }
    }
    case "Last 3 Months":
    case "Last 90 Days": {
      const s = new Date(now)
      s.setMonth(s.getMonth() - 3)
      return { startIso: fmt(s), endIso: todayStr, days: 90 }
    }
    case "Last 6 Months": {
      const s = new Date(now)
      s.setMonth(s.getMonth() - 6)
      return { startIso: fmt(s), endIso: todayStr, days: 180 }
    }
    case "This Year":
    case "Last 12 Months": {
      const s = new Date(now.getFullYear(), 0, 1)
      return { startIso: fmt(s), endIso: todayStr, days: 365 }
    }
    default: {
      if (customStart && customEnd) {
        return { startIso: customStart, endIso: customEnd, days: 30 }
      }
      const s = new Date(now.getFullYear(), now.getMonth(), 1)
      return { startIso: fmt(s), endIso: todayStr, days: 30 }
    }
  }
}
