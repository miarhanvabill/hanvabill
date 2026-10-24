"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, WifiOff, RefreshCw } from "lucide-react"
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
      <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/[0.07] bg-white/60 backdrop-blur-xl text-xs text-slate-500">
        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
        <span className="font-medium text-slate-700">Live</span>
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
            className={`hidden lg:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-xl transition-all cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
              isOnline
                ? "border-black/[0.07] bg-white/60 text-slate-700 hover:bg-white/85 hover:border-black/[0.12]"
                : "border-rose-200/80 bg-rose-50/70 text-rose-800 hover:bg-rose-100/70"
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

            <span className="text-[11px] font-semibold tracking-wide text-slate-800">
              {isOnline ? "Live" : "Offline"}
            </span>

            {timeString && (
              <>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="font-mono text-xs font-semibold text-slate-700">
                  {timeString}
                </span>
              </>
            )}

            <RefreshCw
              className={`h-3 w-3 text-slate-400 transition-transform ${
                isRefreshing ? "animate-spin text-amber-600" : "opacity-0 group-hover:opacity-100"
              }`}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs space-y-1 rounded-xl p-2.5">
          <div className="flex items-center gap-1.5 font-medium">
            {isOnline ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-slate-800 font-semibold">Cloud Synced & Real-Time</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-rose-500" />
                <span className="text-rose-700 font-semibold">Offline Mode (Local Queue Active)</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {isOnline
              ? "All salon operations update instantly. Click to manually check sync."
              : "Sales and edits will sync to cloud when internet returns."}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
