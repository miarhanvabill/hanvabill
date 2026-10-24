"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Wifi, WifiOff, Clock, RefreshCw } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function HeaderLivePulse() {
  const [isOnline, setIsOnline] = useState(true)
  const [timeString, setTimeString] = useState("")
  const [mounted, setMounted] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true)

    const updateTime = () => {
      const now = new Date()
      setTimeString(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      )
    }

    updateTime()
    const clockInterval = setInterval(updateTime, 1000)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      clearInterval(clockInterval)
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const handleManualSync = () => {
    setIsRefreshing(true)
    window.dispatchEvent(new Event("refresh-notifications"))
    setTimeout(() => {
      setIsRefreshing(false)
    }, 800)
  }

  if (!mounted) {
    return (
      <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-500">
        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
        <span className="font-medium">Live</span>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleManualSync}
            type="button"
            className={`hidden lg:inline-flex items-center gap-2 px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
              isOnline
                ? "border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100/70"
                : "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
            }`}
          >
            {isOnline ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            ) : (
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            )}

            <span className="text-[11px] font-semibold tracking-wide">
              {isOnline ? "Live" : "Offline"}
            </span>

            {timeString && (
              <>
                <span className="text-emerald-300 dark:text-emerald-700">•</span>
                <span className="font-mono text-xs font-medium text-slate-700">
                  {timeString}
                </span>
              </>
            )}

            <RefreshCw
              className={`h-3 w-3 text-emerald-600 transition-transform ${
                isRefreshing ? "animate-spin" : "opacity-0 group-hover:opacity-100"
              }`}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-medium">
            {isOnline ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Cloud Synced & Real-Time</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-rose-500" />
                <span>Offline Mode (Queue Active)</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            {isOnline
              ? "All changes update instantly across devices. Click to sync."
              : "Bills and edits are stored locally and will sync when internet returns."}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
