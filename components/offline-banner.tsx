"use client"
import { useEffect, useState } from "react"
import { Wifi, WifiOff } from "lucide-react"

export function OfflineBanner() {
  const [online, setOnline] = useState(true)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      setShowBanner(true)
      // Hide the "back online" banner after 3 seconds
      setTimeout(() => setShowBanner(false), 3000)
    }

    const handleOffline = () => {
      setOnline(false)
      setShowBanner(true)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    setOnline(navigator.onLine)

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
          <Wifi className="h-4 w-4" />
          <span className="text-sm font-medium">Back online! Syncing data...</span>
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
