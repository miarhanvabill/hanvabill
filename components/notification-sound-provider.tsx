"use client"

import { useEffect } from "react"
import { playNotificationSound } from "@/lib/notification-sound"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"

export function NotificationSoundProvider() {
  useEffect(() => {
    if (typeof window === "undefined") return

    // Listen for explicit custom events to play system notification chime
    const handleSoundEvent = () => {
      playNotificationSound()
    }
    window.addEventListener("play-notification-sound", handleSoundEvent)
    window.addEventListener("notification-sound", handleSoundEvent)

    return () => {
      window.removeEventListener("play-notification-sound", handleSoundEvent)
      window.removeEventListener("notification-sound", handleSoundEvent)
    }
  }, [])

  return <SonnerToaster position="top-right" richColors />
}
