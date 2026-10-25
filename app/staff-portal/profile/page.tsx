"use client"

import React, { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  getStaffProfile,
  updateStaffProfile,
  staffLogout,
} from "@/app/actions/staff-portal"
import {
  User,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  Download,
  LogOut,
  CreditCard,
  ShieldAlert,
  CheckCircle2,
  Share2,
  Smartphone,
  Edit2,
  Check,
  Building,
  Loader2,
} from "lucide-react"

export default function StaffProfilePage() {
  const router = useRouter()
  const pathname = usePathname() || ""
  const prefix = pathname.startsWith("/staff-portal") ? "/staff-portal" : ""

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [editingUpi, setEditingUpi] = useState(false)
  const [upiValue, setUpiValue] = useState("")
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // PWA install prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const loadProfile = async () => {
    try {
      setLoading(true)
      const res = await getStaffProfile()
      if (res.success && res.profile) {
        setProfile({
          ...res.profile,
          upiId: res.profile.upi_id,
          hireDate: res.profile.hire_date,
          avatarUrl: res.profile.avatar_url,
          emergencyContact: res.profile.emergency_contact,
          commissionRate: res.profile.commission_rate ? `${res.profile.commission_rate}%` : "20%",
          specialties: (res.profile.skills || "Hair Styling, Beard Grooming, Balayage, Keratin")
            .split(",")
            .map((s: string) => s.trim()),
          salonName: "Hanva Luxury Salon & Spa",
        })
        setUpiValue(res.profile.upi_id || "")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()

    // Detect if already installed as standalone PWA
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true)
    }

    // Capture PWA install prompt on Chromium / Android
    const handleBeforeInstall = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstall)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") {
        setIsInstalled(true)
        showToast("App installed to home screen!")
      }
      setDeferredPrompt(null)
    } else {
      // Show iOS / manual instructions
      setShowIosGuide(true)
    }
  }

  const handleSaveUpi = async () => {
    try {
      await updateStaffProfile({ upi_id: upiValue })
      setEditingUpi(false)
      showToast("UPI ID saved for payouts!")
      await loadProfile()
    } catch (e) {
      showToast("Failed to save UPI ID")
    }
  }

  const handleLogout = async () => {
    try {
      setLogoutLoading(true)
      await staffLogout()
      const isSubdomain =
        typeof window !== "undefined" &&
        (window.location.hostname.startsWith("staff.") ||
          window.location.hostname.includes("staff.biz.hanva.in"))
      const target = isSubdomain ? "/login" : "/staff-portal/login"
      router.push(target)
      router.refresh()
    } catch (e) {
      console.error(e)
    } finally {
      setLogoutLoading(false)
    }
  }

  if (loading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 text-slate-800 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* Staff ID Profile Header Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white rounded-3xl p-5 shadow-xl border border-slate-800 relative overflow-hidden text-center">
        <div className="relative inline-block mx-auto mb-3">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              className="w-20 h-20 rounded-full object-cover mx-auto ring-4 ring-slate-800 shadow-xl"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-slate-800 text-white flex items-center justify-center font-black text-2xl mx-auto ring-4 ring-slate-700">
              {profile?.name?.charAt(0) || "S"}
            </div>
          )}
          <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full" />
        </div>

        <h2 className="text-lg font-black text-white">{profile?.name}</h2>
        <div className="flex items-center justify-center gap-1.5 mt-0.5">
          <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
            {profile?.role || "Hair Stylist"}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {profile?.commissionRate} Commission
          </span>
        </div>

        <p className="text-xs text-slate-400 mt-2 flex items-center justify-center gap-1">
          <Building className="w-3.5 h-3.5 text-slate-400" />
          <span>{profile?.salonName}</span>
        </p>
      </div>

      {/* PWA Install to Home Screen Banner */}
      {!isInstalled && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 rounded-2xl p-4 text-slate-950 shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-white p-0.5 border shadow-sm shrink-0 overflow-hidden">
                <img src="/orvia-logo.png" alt="Orvia Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <div>
                <span className="inline-block text-[10px] font-black uppercase tracking-wider bg-slate-950 text-white px-2 py-0.5 rounded mb-1">
                  Fast Access
                </span>
                <h3 className="text-sm font-black leading-tight">
                  Install Orvia
                </h3>
                <p className="text-xs font-medium text-slate-900 mt-0.5">
                  Add to your phone&apos;s home screen for 1-tap shift check-in.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full mt-3 h-10 rounded-xl bg-slate-950 text-white text-xs font-bold hover:bg-slate-900 active:scale-98 transition flex items-center justify-center gap-2 shadow"
          >
            <Download className="w-4 h-4" />
            <span>Install App to Home Screen</span>
          </button>
        </div>
      )}

      {/* iOS Install Instructions Modal */}
      {showIosGuide && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-blue-600" /> Install on iPhone / Safari
            </h4>
            <button
              onClick={() => setShowIosGuide(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Dismiss
            </button>
          </div>
          <p className="text-xs text-slate-600">
            1. Tap the <strong>Share</strong> button at the bottom of Safari.<br />
            2. Scroll down and select <strong>&quot;Add to Home Screen&quot;</strong>.<br />
            3. Tap <strong>Add</strong> in the top-right corner.
          </p>
        </div>
      )}

      {/* Specialty Skills Tags */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Specialties & Services
        </h3>

        <div className="flex flex-wrap gap-1.5">
          {profile?.specialties?.map((tag: string, idx: number) => (
            <span
              key={idx}
              className="text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200/60 px-3 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Contact & Employment Details */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
          Staff Profile Details
        </h3>

        <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
          <span className="text-slate-500 flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-slate-400" /> Mobile Number
          </span>
          <span className="font-bold text-slate-900 font-mono">
            +91 {profile?.phone}
          </span>
        </div>

        <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
          <span className="text-slate-500 flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-slate-400" /> Email ID
          </span>
          <span className="font-semibold text-slate-800">
            {profile?.email}
          </span>
        </div>

        <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
          <span className="text-slate-500 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date Joined
          </span>
          <span className="font-semibold text-slate-800">
            {profile?.hireDate}
          </span>
        </div>

        {/* UPI ID for Commission Settlements */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" /> UPI ID for Payouts
            </span>
            {!editingUpi && (
              <button
                type="button"
                onClick={() => setEditingUpi(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" /> Edit
              </button>
            )}
          </div>

          {editingUpi ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={upiValue}
                onChange={(e) => setUpiValue(e.target.value)}
                placeholder="username@okhdfcbank"
                className="flex-1 h-9 px-3 rounded-lg border border-slate-300 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button
                type="button"
                onClick={handleSaveUpi}
                className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition"
              >
                <Check className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          ) : (
            <div className="text-xs font-mono font-bold text-slate-900 bg-slate-50 p-2 rounded-lg border border-slate-100">
              {profile?.upiId || "Not configured"}
            </div>
          )}
        </div>

        {/* Emergency Contact */}
        <div className="pt-1 text-xs">
          <span className="text-slate-500 flex items-center gap-2 mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400" /> Emergency Contact
          </span>
          <p className="font-semibold text-slate-800">
            {profile?.emergencyContact}
          </p>
        </div>
      </div>

      {/* Logout Action Button */}
      <div className="pt-2">
        <button
          type="button"
          disabled={logoutLoading}
          onClick={handleLogout}
          className="w-full h-12 rounded-2xl bg-red-50 hover:bg-red-100 active:scale-98 text-red-600 font-bold text-xs flex items-center justify-center gap-2 border border-red-200/80 transition shadow-sm"
        >
          {logoutLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Logging Out...
            </>
          ) : (
            <>
              <LogOut className="w-4 h-4" /> Log Out of Staff Portal
            </>
          )}
        </button>
      </div>
    </div>
  )
}
