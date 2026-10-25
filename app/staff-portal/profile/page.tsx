"use client"

import React, { useEffect, useState, useRef } from "react"
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
  Edit3,
  Check,
  Building,
  Loader2,
  Camera,
  MapPin,
  X,
  Plus,
  Award,
  SlidersHorizontal,
  Save,
  Upload,
} from "lucide-react"

const POPULAR_SPECIALTIES = [
  "Hair Styling",
  "Hair Coloring",
  "Balayage",
  "Keratin Treatment",
  "Beard Grooming",
  "Hair Spa",
  "Facials & Cleanups",
  "Nail Art",
  "Bridal Makeup",
  "Skin Therapy",
  "Threading & Waxing",
  "Head Massage",
]

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=faces",
]

export default function StaffProfilePage() {
  const router = useRouter()
  const pathname = usePathname() || ""
  const prefix = pathname.startsWith("/staff-portal") ? "/staff-portal" : ""

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    upiId: "",
    emergencyContact: "",
    address: "",
    skills: [] as string[],
    avatarUrl: "",
  })
  const [customSkillInput, setCustomSkillInput] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // PWA install prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    if (typeof window !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(25)
      } catch {}
    }
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadProfile = async () => {
    try {
      setLoading(true)
      const res = await getStaffProfile()
      if (res.success && res.profile) {
        const p = res.profile
        const skillsList = (p.skills || "Hair Styling, Beard Grooming, Balayage, Keratin")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)

        const profileObj = {
          ...p,
          upiId: p.upi_id || "",
          hireDate: p.hire_date || "2026-01-15",
          avatarUrl: p.avatar_url || null,
          emergencyContact: p.emergency_contact || "",
          address: p.address || "",
          commissionRate: p.commission_rate ? `${p.commission_rate}%` : "20%",
          specialties: skillsList,
          salonName: "Hanva Luxury Salon & Spa",
        }

        setProfile(profileObj)
        setFormData({
          name: p.name || "",
          phone: p.phone || "",
          email: p.email || "",
          upiId: p.upi_id || "",
          emergencyContact: p.emergency_contact || "",
          address: p.address || "",
          skills: skillsList,
          avatarUrl: p.avatar_url || "",
        })
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
      setShowIosGuide(true)
    }
  }

  const handleOpenEdit = () => {
    setFormError(null)
    setFormData({
      name: profile?.name || "",
      phone: profile?.phone || "",
      email: profile?.email || "",
      upiId: profile?.upiId || "",
      emergencyContact: profile?.emergencyContact || "",
      address: profile?.address || "",
      skills: [...(profile?.specialties || [])],
      avatarUrl: profile?.avatarUrl || "",
    })
    setIsEditModalOpen(true)
  }

  const handleToggleSkill = (skill: string) => {
    setFormData((prev) => {
      const exists = prev.skills.includes(skill)
      if (exists) {
        return { ...prev, skills: prev.skills.filter((s) => s !== skill) }
      } else {
        return { ...prev, skills: [...prev.skills, skill] }
      }
    })
  }

  const handleAddCustomSkill = () => {
    const trimmed = customSkillInput.trim()
    if (!trimmed) return
    if (!formData.skills.includes(trimmed)) {
      setFormData((prev) => ({ ...prev, skills: [...prev.skills, trimmed] }))
    }
    setCustomSkillInput("")
  }

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setFormError("Image is too large. Please select a photo under 2MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setFormData((prev) => ({ ...prev, avatarUrl: result }))
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.name.trim()) {
      setFormError("Please enter your full name.")
      return
    }

    const cleanPhone = formData.phone.replace(/\D/g, "")
    if (cleanPhone.length < 10) {
      setFormError("Please enter a valid 10-digit mobile number.")
      return
    }

    try {
      setSaving(true)
      const res = await updateStaffProfile({
        name: formData.name.trim(),
        phone: cleanPhone,
        email: formData.email.trim(),
        upi_id: formData.upiId.trim(),
        emergency_contact: formData.emergencyContact.trim(),
        address: formData.address.trim(),
        skills: formData.skills.join(", "),
        avatar_url: formData.avatarUrl,
      })

      if (res.success) {
        showToast("Profile updated successfully!")
        setIsEditModalOpen(false)
        await loadProfile()
      } else {
        setFormError(res.message || "Failed to save profile changes.")
      }
    } catch (err: any) {
      setFormError(err?.message || "An unexpected error occurred while saving.")
    } finally {
      setSaving(false)
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
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* 1. Main Hero Card with Quick Edit Trigger */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white rounded-3xl p-5 shadow-xl border border-slate-800 relative overflow-hidden text-center">
        {/* Subtle background glow */}
        <div className="absolute -right-8 -top-8 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Right Edit Button */}
        <button
          type="button"
          onClick={handleOpenEdit}
          className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 border border-amber-400/30 text-xs font-bold shadow-md active:scale-95 transition backdrop-blur-sm"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit Profile</span>
        </button>

        {/* Avatar with Camera Badge */}
        <div className="relative inline-block mx-auto mb-3">
          <div
            onClick={handleOpenEdit}
            className="cursor-pointer group relative w-20 h-20 rounded-full overflow-hidden mx-auto ring-4 ring-slate-800 shadow-2xl bg-slate-800"
          >
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-black text-2xl text-white">
                {profile?.name?.charAt(0) || "S"}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Camera className="w-5 h-5" />
            </div>
          </div>
          <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full shadow" />
        </div>

        <h2 className="text-lg font-black text-white">{profile?.name}</h2>

        <div className="flex items-center justify-center gap-1.5 mt-1">
          <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
            {profile?.role || "Staff Stylist"}
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

      {/* 2. Specialties & Services Chips */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Specialties & Services ({profile?.specialties?.length || 0})
          </h3>
          <button
            type="button"
            onClick={handleOpenEdit}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
          >
            <Edit2 className="w-3 h-3" /> Edit
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {profile?.specialties?.length > 0 ? (
            profile.specialties.map((tag: string, idx: number) => (
              <span
                key={idx}
                className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full shadow-2xs"
              >
                {tag}
              </span>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic">No specialties listed. Tap edit to add skills.</p>
          )}
        </div>
      </div>

      {/* 3. Personal & Contact Information */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Contact & Employment Details
          </h3>
          <button
            type="button"
            onClick={handleOpenEdit}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
          >
            <Edit2 className="w-3 h-3" /> Edit
          </button>
        </div>

        {/* Mobile Number */}
        <div className="flex items-center justify-between py-1 border-b border-slate-100 text-xs">
          <span className="text-slate-500 flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-slate-400" /> Mobile Number
          </span>
          <span className="font-bold text-slate-900 font-mono">
            +91 {profile?.phone}
          </span>
        </div>

        {/* Email */}
        <div className="flex items-center justify-between py-1 border-b border-slate-100 text-xs">
          <span className="text-slate-500 flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-slate-400" /> Email ID
          </span>
          <span className="font-semibold text-slate-800 truncate max-w-[200px]">
            {profile?.email || "Not provided"}
          </span>
        </div>

        {/* Date Joined */}
        <div className="flex items-center justify-between py-1 border-b border-slate-100 text-xs">
          <span className="text-slate-500 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date Joined
          </span>
          <span className="font-semibold text-slate-800 font-mono">
            {profile?.hireDate}
          </span>
        </div>

        {/* Residential Address */}
        <div className="flex items-start justify-between py-1 border-b border-slate-100 text-xs">
          <span className="text-slate-500 flex items-center gap-2 shrink-0">
            <MapPin className="w-3.5 h-3.5 text-slate-400" /> Address
          </span>
          <span className="font-medium text-slate-800 text-right truncate max-w-[220px]">
            {profile?.address || "Not provided"}
          </span>
        </div>

        {/* Emergency Contact */}
        <div className="flex items-center justify-between py-1 text-xs">
          <span className="text-slate-500 flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400" /> Emergency Contact
          </span>
          <span className="font-semibold text-slate-900 font-mono">
            {profile?.emergencyContact || "Not set"}
          </span>
        </div>
      </div>

      {/* 4. Financial & Payout Settings */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            Payout & Commission Settlement
          </h3>
          <button
            type="button"
            onClick={handleOpenEdit}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
          >
            <Edit2 className="w-3 h-3" /> Edit
          </button>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 block font-medium">UPI ID for Bank Transfers</span>
            <span className="text-xs font-bold font-mono text-slate-900 block mt-0.5">
              {profile?.upiId || "No UPI configured"}
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
            Direct
          </span>
        </div>
      </div>

      {/* 5. PWA Install to Home Screen Banner */}
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

      {/* 6. Logout Action Button */}
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

      {/* ======================================================== */}
      {/* 7. FULL-FEATURED EDIT PROFILE MODAL (Mobile Slide-Up)   */}
      {/* ======================================================== */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500/10 rounded-xl text-amber-600 border border-amber-500/20">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Edit Complete Profile</h3>
                  <p className="text-[11px] text-slate-500">Update your public info, contact & payouts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-medium flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Avatar Selector Section */}
              <div className="text-center pb-2 border-b border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Profile Photo
                </label>

                <div className="relative inline-block mx-auto mb-2">
                  <div className="w-20 h-20 rounded-full overflow-hidden mx-auto ring-4 ring-amber-400/30 shadow-md bg-slate-100">
                    {formData.avatarUrl ? (
                      <img
                        src={formData.avatarUrl}
                        alt="Avatar Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-2xl text-slate-500">
                        {formData.name?.charAt(0) || "S"}
                      </div>
                    )}
                  </div>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileUpload}
                    className="hidden"
                  />

                  {/* Upload Trigger Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 rounded-full bg-slate-900 text-white shadow-lg border-2 border-white hover:bg-slate-800 active:scale-95 transition"
                    title="Upload Photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100"
                  >
                    <Upload className="w-3 h-3" /> Upload from Device
                  </button>
                </div>

                {/* Preset Avatars Row */}
                <div className="mt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Or Choose an Aesthetic Avatar
                  </span>
                  <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
                    {AVATAR_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, avatarUrl: preset }))}
                        className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all ${
                          formData.avatarUrl === preset
                            ? "border-amber-500 ring-2 ring-amber-400/40 scale-105"
                            : "border-slate-200 hover:border-slate-400 opacity-80"
                        }`}
                      >
                        <img src={preset} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Priya Sharma"
                    className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Mobile Phone & Email Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="10-digit mobile"
                      className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email ID
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@gmail.com"
                      className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
                    />
                  </div>
                </div>
              </div>

              {/* UPI ID & Emergency Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    UPI ID (for Payouts)
                  </label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.upiId}
                      onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                      placeholder="username@okhdfcbank"
                      className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Emergency Contact Number
                  </label>
                  <div className="relative">
                    <ShieldAlert className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.emergencyContact}
                      onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                      placeholder="e.g. 9811223344 (Spouse)"
                      className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
                    />
                  </div>
                </div>
              </div>

              {/* Residential Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Residential Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. Flat 302, Green Glen Layout, Bellandur, Bengaluru"
                    className="w-full p-2.5 pl-9 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Specialties & Skills Editor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Specialties & Skills ({formData.skills.length} selected)
                </label>

                {/* Popular Chips */}
                <div className="flex flex-wrap gap-1.5 mb-2.5 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200/60">
                  {POPULAR_SPECIALTIES.map((skill) => {
                    const isSelected = formData.skills.includes(skill)
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => handleToggleSkill(skill)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition active:scale-95 flex items-center gap-1 ${
                          isSelected
                            ? "bg-slate-900 text-white shadow-sm"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-amber-400 stroke-[3]" />}
                        <span>{skill}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Custom Skill Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customSkillInput}
                    onChange={(e) => setCustomSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddCustomSkill()
                      }
                    }}
                    placeholder="Add custom skill (e.g. Balayage Master)..."
                    className="flex-1 h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSkill}
                    className="h-9 px-3 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition active:scale-95 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-extrabold shadow-md active:scale-95 transition flex items-center justify-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Profile
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
