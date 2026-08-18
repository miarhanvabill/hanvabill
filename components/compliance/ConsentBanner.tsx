"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

export function ConsentBanner() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem("gdpr_consent")
    if (!consent) setShowBanner(true)
  }, [])

  const handleAccept = async () => {
    try {
      await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consentType: "all",
          consentGiven: true,
        }),
      })

      localStorage.setItem("gdpr_consent", "accepted")
      setShowBanner(false)
    } catch (error) {
      console.error("Failed to record consent:", error)
    }
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white p-4 z-50">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm">
          We use cookies and collect data to improve your experience. By continuing, you consent to our privacy policy.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBanner(false)}>
            Decline
          </Button>
          <Button onClick={handleAccept}>Accept All</Button>
        </div>
      </div>
    </div>
  )
}
