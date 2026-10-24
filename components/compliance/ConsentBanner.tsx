"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Cookie, ShieldCheck, X, Settings2, ExternalLink, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface CookiePreferences {
  essential: boolean
  analytics: boolean
  marketing: boolean
}

export function ConsentBanner() {
  const [mounted, setMounted] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: true,
    marketing: false,
  })

  useEffect(() => {
    setMounted(true)
    const consent = localStorage.getItem("gdpr_consent")
    const savedPrefs = localStorage.getItem("cookie_preferences")

    if (savedPrefs) {
      try {
        setPreferences(JSON.parse(savedPrefs))
      } catch {}
    }

    if (!consent) {
      setShowBanner(true)
    }
  }, [])

  const recordConsentOnServer = async (type: "all" | "essential" | "custom", prefs: CookiePreferences) => {
    try {
      await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consentType: type,
          consentGiven: true,
          preferences: prefs,
        }),
      }).catch(() => {})
    } catch (error) {
      console.warn("Failed to record consent on server:", error)
    }
  }

  const handleAcceptAll = () => {
    const allApproved: CookiePreferences = {
      essential: true,
      analytics: true,
      marketing: true,
    }
    setPreferences(allApproved)
    localStorage.setItem("gdpr_consent", "all")
    localStorage.setItem("cookie_preferences", JSON.stringify(allApproved))
    recordConsentOnServer("all", allApproved)
    setShowBanner(false)
    setShowPreferences(false)
  }

  const handleDeclineNonEssential = () => {
    const essentialOnly: CookiePreferences = {
      essential: true,
      analytics: false,
      marketing: false,
    }
    setPreferences(essentialOnly)
    localStorage.setItem("gdpr_consent", "essential")
    localStorage.setItem("cookie_preferences", JSON.stringify(essentialOnly))
    recordConsentOnServer("essential", essentialOnly)
    setShowBanner(false)
    setShowPreferences(false)
  }

  const handleSaveCustomPreferences = () => {
    localStorage.setItem("gdpr_consent", "custom")
    localStorage.setItem("cookie_preferences", JSON.stringify(preferences))
    recordConsentOnServer("custom", preferences)
    setShowPreferences(false)
    setShowBanner(false)
  }

  if (!mounted) return null

  return (
    <>
      {/* Floating Modern Consent Card */}
      {showBanner && (
        <div
          role="region"
          aria-label="Cookie consent banner"
          className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 left-4 sm:left-auto sm:max-w-md z-50 bg-background/95 dark:bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl p-4 sm:p-5 text-foreground animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                <Cookie className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-1.5">
                  Cookies & Privacy Policy
                </h3>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Your privacy matters to us
                </span>
              </div>
            </div>
            <button
              onClick={handleDeclineNonEssential}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
              title="Decline non-essential & close"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Copy with Explicit Links */}
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            We use cookies to enhance navigation, analyze site usage, and support our salon management services. By clicking{" "}
            <strong className="text-foreground font-semibold">"Accept All"</strong>, you consent to our use of cookies and agree to our{" "}
            <Link
              href="/privacy-policy"
              className="text-primary underline font-medium hover:text-primary/80 transition-colors inline-flex items-center gap-0.5"
            >
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link
              href="/terms-of-service"
              className="text-primary underline font-medium hover:text-primary/80 transition-colors inline-flex items-center gap-0.5"
            >
              Terms of Service (T&amp;C)
            </Link>.
          </p>

          {/* Action Buttons */}
          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPreferences(true)}
              className="text-xs text-muted-foreground hover:text-foreground justify-center gap-1.5 h-8 px-2 order-3 sm:order-1"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Preferences
            </Button>

            <div className="flex items-center gap-2 order-1 sm:order-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeclineNonEssential}
                className="text-xs h-8 px-3 flex-1 sm:flex-initial border-border text-foreground hover:bg-muted"
              >
                Reject Non-Essential
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAcceptAll}
                className="text-xs h-8 px-4 flex-1 sm:flex-initial font-medium shadow-xs"
              >
                Accept All
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Tiny Re-open Trigger (When banner is closed) */}
      {!showBanner && (
        <button
          type="button"
          onClick={() => setShowPreferences(true)}
          title="Cookie & Privacy Preferences"
          aria-label="Cookie & Privacy Preferences"
          className="fixed bottom-4 left-4 z-40 p-2.5 rounded-full bg-background/90 dark:bg-card/90 backdrop-blur-md border border-border/80 shadow-md text-muted-foreground hover:text-foreground hover:scale-105 transition-all group"
        >
          <Cookie className="w-4 h-4 text-amber-500 group-hover:rotate-12 transition-transform" />
          <span className="sr-only">Open Cookie Preferences</span>
        </button>
      )}

      {/* Granular Preferences Dialog */}
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Cookie className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Cookie &amp; Privacy Preferences</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Customize which cookies you want to allow. Learn more in our{" "}
                  <Link href="/privacy-policy" className="text-primary underline">
                    Privacy Policy
                  </Link>.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            {/* Strictly Necessary */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border/70 bg-muted/30">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">Strictly Necessary Cookies</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
                    Required
                  </Badge>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Essential for security, authentication, session maintenance, and processing bookings and bills. Cannot be disabled.
                </p>
              </div>
              <Switch checked={true} disabled aria-label="Strictly Necessary Cookies" />
            </div>

            {/* Performance & Analytics */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border/70 hover:bg-muted/30 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">Analytics &amp; Performance</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Helps us understand how visitors interact with our salon platform, diagnose bugs, and optimize load speeds.
                </p>
              </div>
              <Switch
                checked={preferences.analytics}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, analytics: checked }))
                }
                aria-label="Analytics & Performance Cookies"
              />
            </div>

            {/* Marketing & Personalization */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border/70 hover:bg-muted/30 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">Marketing &amp; Personalization</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Allows relevant promotional offers, loyalty rewards, and customized WhatsApp reminders.
                </p>
              </div>
              <Switch
                checked={preferences.marketing}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, marketing: checked }))
                }
                aria-label="Marketing & Personalization Cookies"
              />
            </div>

            {/* Legal Links Footer */}
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>GDPR, CCPA &amp; Digital Personal Data Protection</span>
              <div className="flex items-center gap-3">
                <Link
                  href="/terms-of-service"
                  className="hover:text-foreground underline inline-flex items-center gap-1"
                >
                  T&amp;C <ExternalLink className="w-3 h-3" />
                </Link>
                <Link
                  href="/privacy-policy"
                  className="hover:text-foreground underline inline-flex items-center gap-1"
                >
                  Privacy <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDeclineNonEssential}
              className="text-xs w-full sm:w-auto"
            >
              Reject Non-Essential
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSaveCustomPreferences}
                className="text-xs flex-1 sm:flex-initial"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Save Preferences
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAcceptAll}
                className="text-xs flex-1 sm:flex-initial font-medium"
              >
                Accept All
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
