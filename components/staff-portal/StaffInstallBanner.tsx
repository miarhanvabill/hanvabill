"use client"

import React, { useEffect, useState } from "react"
import { Download, Share2, PlusSquare, X, Smartphone, CheckCircle2 } from "lucide-react"

export default function StaffInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    // 1. Check standalone PWA mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true

    if (isStandalone) {
      setIsInstalled(true)
      return
    }

    // 2. Check iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const iosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIos(iosDevice)

    // 3. Check dismissal in localStorage
    try {
      const dismissedUntil = localStorage.getItem("hanva_pwa_dismissed_until")
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        setIsDismissed(true)
      }
    } catch {}

    // 4. Capture Chromium/Android install prompt
    const handleBeforeInstall = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall)

    // 5. Global trigger event so any button can open the install prompt
    const handleTriggerInstall = () => {
      handleInstallClick()
    }
    window.addEventListener("trigger-pwa-install", handleTriggerInstall)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
      window.removeEventListener("trigger-pwa-install", handleTriggerInstall)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") {
        setIsInstalled(true)
      }
      setDeferredPrompt(null)
    } else if (isIos) {
      setShowIosGuide(true)
    } else {
      // Direct instruction fallback for Chrome/Edge desktop
      alert("To install the app, click the Install icon (⊞ or ⬇) in your browser's address bar.")
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    try {
      // Dismiss for 3 days
      localStorage.setItem("hanva_pwa_dismissed_until", String(Date.now() + 3 * 24 * 60 * 60 * 1000))
    } catch {}
  }

  if (isInstalled || isDismissed) {
    return null
  }

  return (
    <>
      {/* Sleek Branded PWA Banner */}
      <div className="mx-4 mt-3 mb-1 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-3.5 shadow-xl text-white relative animate-in fade-in slide-in-from-top-2">
        <button
          onClick={handleDismiss}
          className="absolute top-2.5 right-2.5 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-3 pr-6">
          <div className="w-12 h-12 rounded-xl bg-white p-1.5 shadow-md flex-shrink-0 border border-slate-600/50">
            <img
              src="/logo-icon.png"
              alt="Orvia Logo"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-extrabold text-white tracking-tight">
                Install Orvia
              </h3>
              <span className="text-[9px] font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.2 rounded-full">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate mt-0.5">
              Fast clock-in, instant shifts & offline access.
            </p>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-between gap-2">
          <span className="text-[10px] text-slate-400">
            Works like a native mobile app
          </span>
          <button
            onClick={handleInstallClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-md active:scale-95 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        </div>
      </div>

      {/* iOS Step-by-Step Install Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm text-slate-900 shadow-2xl space-y-4 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white p-1 border shadow-sm">
                  <img src="/logo-icon.png" alt="Hanva Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Install on iPhone / iPad</h4>
                  <p className="text-[11px] text-slate-500">Orvia - Staff Portal</p>
                </div>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex items-start gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <div>
                  Tap the <strong className="inline-flex items-center gap-1 text-blue-600"><Share2 className="w-3 h-3" /> Share</strong> button in Safari toolbar at the bottom.
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <div>
                  Scroll down the share sheet and tap <strong className="inline-flex items-center gap-1 text-slate-900"><PlusSquare className="w-3 h-3" /> Add to Home Screen</strong>.
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </div>
                <div>
                  Tap <strong className="text-slate-900">Add</strong> in the top-right corner to place the app on your home screen.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full h-10 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  )
}
