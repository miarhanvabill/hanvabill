"use client"

import { useState, useEffect } from "react"
import { CheckCircle, AlertCircle, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type SyncStatus = "synced" | "syncing" | "error"

export function SyncStatus() {
  const [status, setStatus] = useState<SyncStatus>("synced")
  const [lastSync, setLastSync] = useState<Date>(new Date())

  useEffect(() => {
    // Simulate sync status changes
    const interval = setInterval(() => {
      const random = Math.random()
      if (random > 0.9) {
        setStatus("error")
      } else if (random > 0.8) {
        setStatus("syncing")
      } else {
        setStatus("synced")
        setLastSync(new Date())
      }
    }, 5000)

    return () => clearInterval(interval)
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
      {status === "synced" && (
        <span className="text-xs text-gray-500">
          {lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </div>
  )
}
