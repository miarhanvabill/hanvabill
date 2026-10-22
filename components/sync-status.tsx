"use client"

import { useState, useEffect } from "react"
import { CheckCircle, AlertCircle, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type SyncStatus = "synced" | "syncing" | "error"

export function SyncStatus() {
  const [status, setStatus] = useState<SyncStatus>("synced")
  const [lastSync, setLastSync] = useState<Date>(new Date())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Check real browser online / offline state
    const handleOnline = () => setStatus("synced")
    const handleOffline = () => setStatus("error")

    if (typeof window !== "undefined") {
      setStatus(navigator.onLine ? "synced" : "error")
      window.addEventListener("online", handleOnline)
      window.addEventListener("offline", handleOffline)
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline)
        window.removeEventListener("offline", handleOffline)
      }
    }
  }, [])

  const getStatusConfig = () => {
    switch (status) {
      case "synced":
        return {
          icon: CheckCircle,
          text: "Synced",
          variant: "default" as const,
          color: "text-green-600",
        }
      case "syncing":
        return {
          icon: Clock,
          text: "Syncing",
          variant: "secondary" as const,
          color: "text-blue-600",
        }
      case "error":
        return {
          icon: AlertCircle,
          text: "Sync Error",
          variant: "destructive" as const,
          color: "text-red-600",
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <div className="flex items-center gap-2">
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        <span className="text-xs">{config.text}</span>
      </Badge>
      {mounted && status === "synced" && (
        <span className="text-xs text-gray-500">
          {lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </div>
  )
}
