"use client"

import type React from "react"

import { useEffect } from "react"

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          console.log("[v0] Service Worker registered successfully:", registration)
        })
        .catch((error) => {
          console.warn("[v0] SW registration failed:", error)
        })

      // Listen for sync completion to refetch queries
      navigator.serviceWorker.addEventListener("message", (evt) => {
        if (evt.data?.type === "SYNC_COMPLETE") {
          console.log("[v0] Background sync complete for tenant:", evt.data.tenant_id)
          // Trigger a page refresh or invalidate caches here
          window.dispatchEvent(
            new CustomEvent("sync-complete", {
              detail: { tenant_id: evt.data.tenant_id },
            }),
          )
        }
      })
    }
  }, [])

  return <>{children}</>
}
