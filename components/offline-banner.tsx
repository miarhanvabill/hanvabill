"use client"

import { useEffect, useState } from "react"
import { Wifi, WifiOff, Loader2, CheckCircle2 } from "lucide-react"
import { replayPendingQueue } from "@/lib/offline/idb-queue"

export function OfflineBanner() {
  const [online, setOnline] = useState(true)
  const [showBanner, setShowBanner] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncCount, setSyncCount] = useState(0)

  useEffect(() => {
    const handleOnline = async () => {
      setOnline(true)
      setShowBanner(true)
      setIsSyncing(true)

      // Notify Service Worker if active
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "REPLAY_QUEUE" })
      }

      // Replay IndexedDB queue directly (works in Safari, Chrome, Firefox)
      try {
        const result = await replayPendingQueue()
        if (result.processed > 0) {
          setSyncCount(result.processed)
        }
      } catch (err) {
        console.warn("[OfflineBanner] Failed to replay queue:", err)
      } finally {
        setIsSyncing(false)
        setTimeout(() => {
          setShowBanner(false)
          setSyncCount(0)
        }, 4000)
      }
    }

    const handleOffline = () => {
      setOnline(false)
      setShowBanner(true)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    setOnline(navigator.onLine)

    // Also check on mount if there's any pending queue to replay while online
    if (navigator.onLine) {
      replayPendingQueue().catch(() => {})
    }

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (!showBanner && online) return null

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl px-4 py-2 shadow-lg z-50 flex items-center gap-2 transition-all duration-300 ${
        online
          ? "bg-green-100 text-green-800 border border-green-200"
          : "bg-amber-100 text-amber-800 border border-amber-200"
      }`}
    >
      {online ? (
        <>
          {isSyncing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-green-700" />
              <span className="text-sm font-medium">Back online! Syncing data...</span>
            </>
          ) : syncCount > 0 ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-700" />
              <span className="text-sm font-medium">Back online! Synced {syncCount} offline change{syncCount > 1 ? "s" : ""}.</span>
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4" />
              <span className="text-sm font-medium">Back online! Connected to server.</span>
            </>
          )}
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Offline mode: changes will sync when reconnected</span>
        </>
      )}
    </div>
  )
}
