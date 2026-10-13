"use client"

import { useEffect } from "react"
import { playNotificationSound } from "@/lib/notification-sound"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"

export function NotificationSoundProvider() {
  useEffect(() => {
    if (typeof window === "undefined") return

    // 1. Listen for global custom events to play notification chime
    const handleSoundEvent = () => {
      playNotificationSound()
    }
    window.addEventListener("play-notification-sound", handleSoundEvent)
    window.addEventListener("notification-sound", handleSoundEvent)

    // 2. Global MutationObserver to automatically detect when any toast notification
    // (such as Sonner or third-party alerts) is mounted to the DOM
    let observer: MutationObserver | null = null
    try {
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            for (let i = 0; i < mutation.addedNodes.length; i++) {
              const node = mutation.addedNodes[i]
              if (node instanceof HTMLElement) {
                // Check if this node is or contains a toast notification
                const isToastNode =
                  node.hasAttribute("data-sonner-toast") ||
                  node.getAttribute("role") === "status" ||
                  node.getAttribute("role") === "alert" ||
                  Boolean(node.querySelector?.("[data-sonner-toast]"))

                if (isToastNode) {
                  playNotificationSound()
                  return
                }
              }
            }
          }
        }
      })

      observer.observe(document.body, { childList: true, subtree: true })
    } catch (e) {
      console.debug("[NotificationSoundProvider] Observer init skipped:", e)
    }

    return () => {
      window.removeEventListener("play-notification-sound", handleSoundEvent)
      window.removeEventListener("notification-sound", handleSoundEvent)
      if (observer) {
        observer.disconnect()
      }
    }
  }, [])

  return <SonnerToaster position="top-right" richColors />
}
