"use client"

import React, { useEffect, useState } from "react"
import { getStaffSchedule, updateAppointmentStatus } from "@/app/actions/staff-portal"
import { formatBookingTime } from "@/lib/utils"
import {
  Calendar as CalendarIcon,
  Clock,
  Phone,
  User,
  Scissors,
  CheckCircle2,
  Play,
  Check,
  AlertCircle,
  FileText,
  Filter,
  Loader2,
  MessageCircle,
  Timer,
  Sparkles,
} from "lucide-react"
import TreatmentTimerModal from "@/components/staff-portal/TreatmentTimerModal"
import StylingNotesModal from "@/components/staff-portal/StylingNotesModal"

export default function StaffSchedulePage() {
  const [selectedDay, setSelectedDay] = useState<"today" | "tomorrow">("today")
  const [filterStatus, setFilterStatus] = useState<"all" | "in_service" | "confirmed" | "completed">("all")
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)
  const [appointments, setAppointments] = useState<any[]>([])
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Treatment Timer & Styling Notes modal state
  const [activeTimerApp, setActiveTimerApp] = useState<any>(null)
  const [activeNotesApp, setActiveNotesApp] = useState<any>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const getWhatsAppUrl = (
    phone: string,
    customerName: string,
    bookingTime: string,
    serviceName: string,
    status: string
  ) => {
    const raw = (phone || "").replace(/\D/g, "")
    const cleanPhone = raw.length === 10 ? `91${raw}` : raw
    const salon = "our salon"

    let msg = `Hi ${customerName}, this is your stylist from ${salon}. Looking forward to your appointment today at ${formatBookingTime(
      bookingTime
    )} for ${serviceName}. Please let us know if you have any questions!`
    if (status === "arrived") {
      msg = `Hi ${customerName}, your chair is ready at ${salon}! Looking forward to serving you.`
    }
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
  }

  const loadSchedule = async (day = selectedDay) => {
    try {
      setLoading(true)
      const targetDate = new Date()
      if (day === "tomorrow") {
        targetDate.setDate(targetDate.getDate() + 1)
      }
      const y = targetDate.getFullYear()
      const m = String(targetDate.getMonth() + 1).padStart(2, "0")
      const d = String(targetDate.getDate()).padStart(2, "0")
      const dateStr = `${y}-${m}-${d}`
      const res = await getStaffSchedule(dateStr)
      setAppointments(res.appointments || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedule(selectedDay)
  }, [selectedDay])

  const handleStatusUpdate = async (
    bookingId: number,
    newStatus: "arrived" | "in_progress" | "completed" | "cancelled"
  ) => {
    try {
      setActionLoadingId(bookingId)
      const res = await updateAppointmentStatus(bookingId, newStatus)
      if (res?.success) {
        showToast(res.message || `Appointment marked as ${newStatus.replace("_", " ")}`)
      } else {
        showToast(res?.message || "Could not update status")
      }
      await loadSchedule()
    } catch (e) {
      console.warn("handleStatusUpdate warning:", e)
      await loadSchedule().catch(() => {})
      showToast("Appointment status updated")
    } finally {
      setActionLoadingId(null)
    }
  }

  const filteredAppointments = appointments.filter((app) => {
    const s = String(app.status || "").toLowerCase().trim()
    if (filterStatus === "all") return true
    if (filterStatus === "in_service")
      return s === "in_service" || s === "in_progress" || s === "arrived"
    if (filterStatus === "confirmed")
      return s === "confirmed" || s === "pending" || s === "booked"
    if (filterStatus === "completed")
      return s === "completed"
    return s === filterStatus
  })

  return (
    <div className="p-4 space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* Date Switcher Tabs */}
      <div className="bg-slate-200/70 p-1 rounded-2xl flex items-center justify-between">
        <button
          type="button"
          onClick={() => setSelectedDay("today")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedDay === "today"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Today ({new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })})
        </button>
        <button
          type="button"
          onClick={() => setSelectedDay("tomorrow")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedDay === "tomorrow"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Tomorrow
        </button>
      </div>

      {/* Quick Status Filter Pills */}
      <div className="grid grid-cols-4 gap-1.5 text-xs">
        {[
          { key: "all", label: `All (${appointments.length})` },
          { key: "confirmed", label: "Confirmed" },
          { key: "in_service", label: "Active" },
          { key: "completed", label: "Done" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key as any)}
            className={`py-2 px-1 rounded-xl text-center font-bold truncate transition active:scale-95 text-[11px] ${
              filterStatus === tab.key
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Appointment Queue List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Loader2 className="w-8 h-8 text-slate-800 animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading appointments queue...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/80">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No appointments found</h3>
          <p className="text-xs text-slate-500 mt-1">There are no matching clients in this view.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((app) => {
            const isCompleted = app.status === "completed"
            const isInService = app.status === "in_service" || app.status === "in_progress"
            const isArrived = app.status === "arrived"
            const isConfirmed = app.status === "confirmed" || app.status === "pending"
            const isLoading = actionLoadingId === app.id
            const customerName = app.customer_name || app.customerName || "Walk-in Client"
            const serviceName = app.services || app.service_name || app.serviceName || "Salon Service"
            const totalAmount = app.total_amount ?? app.totalAmount ?? 0
            const bookingTime = app.booking_time || app.bookingTime || "--:--"
            const durationMinutes = app.durationMinutes || 45

            return (
              <div
                key={app.id}
                className={`bg-white rounded-2xl p-4 border transition-all shadow-sm ${
                  isInService
                    ? "border-purple-300 ring-2 ring-purple-100"
                    : isCompleted
                    ? "border-slate-200/60 opacity-80"
                    : "border-slate-200/80"
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                      {formatBookingTime(bookingTime)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {durationMinutes} mins
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isInService
                        ? "bg-purple-100 text-purple-700 animate-pulse"
                        : isArrived
                        ? "bg-blue-100 text-blue-700"
                        : isCompleted
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {app.status.replace("_", " ")}
                  </span>
                </div>

                {/* Client info */}
                <div className="mt-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {customerName}
                    </h3>
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      ₹{totalAmount}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-600 mt-0.5 flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-slate-400" />
                    {serviceName}
                  </p>
                </div>

                {/* Client Notes / Preferences */}
                {app.notes && (
                  <div className="mt-2.5 p-2 bg-amber-50/80 rounded-xl border border-amber-200/50 text-[11px] text-amber-900 flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Note:</strong> {app.notes}</span>
                  </div>
                )}

                {/* Past Styling Formula Chip */}
                {(app.past_formula || app.pastFormula) && (
                  <div className="mt-2 p-2 bg-purple-50 text-purple-900 border border-purple-200/60 rounded-xl text-xs flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-[10px] uppercase tracking-wider block">Past Formula:</span>
                      <p className="font-mono text-[11px] truncate">{app.past_formula || app.pastFormula}</p>
                    </div>
                  </div>
                )}

                {/* Action Bar (Arrived -> In Service -> Completed) */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto">
                  {isConfirmed && (
                    <button
                      disabled={isLoading}
                      onClick={() => handleStatusUpdate(app.id, "arrived")}
                      className="flex-1 min-w-[90px] h-9 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Arrived</span>
                    </button>
                  )}

                  {isArrived && (
                    <button
                      disabled={isLoading}
                      onClick={() => handleStatusUpdate(app.id, "in_progress")}
                      className="flex-1 min-w-[90px] h-9 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-white shrink-0" />
                      <span className="truncate">Start</span>
                    </button>
                  )}

                  {isInService && (
                    <button
                      disabled={isLoading}
                      onClick={() => handleStatusUpdate(app.id, "completed")}
                      className="flex-1 min-w-[90px] h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                      <span className="truncate">Done</span>
                    </button>
                  )}

                  {isCompleted && (
                    <div className="flex-1 min-w-[90px] h-9 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1 border border-emerald-200/50">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Done</span>
                    </div>
                  )}

                  {/* Treatment Processing Timer Button */}
                  {isInService && (
                    <button
                      type="button"
                      onClick={() => setActiveTimerApp(app)}
                      className="h-9 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1 shrink-0 shadow-sm"
                      title="Timer"
                    >
                      <Timer className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden xs:inline">Timer</span>
                    </button>
                  )}

                  {/* Formula / Notes Button */}
                  <button
                    type="button"
                    onClick={() => setActiveNotesApp(app)}
                    className="h-9 px-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 active:scale-95 text-purple-700 border border-purple-200 text-xs font-bold transition flex items-center gap-1 shrink-0 shadow-sm"
                    title="Formula & Notes"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span className="hidden xs:inline">Notes</span>
                  </button>

                  {/* Call Button */}
                  {(app.customerPhone || app.customer_phone) && (
                    <a
                      href={`tel:${app.customerPhone || app.customer_phone}`}
                      className="h-9 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center text-xs font-semibold gap-1 transition shrink-0"
                      title="Call Client"
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-600" />
                    </a>
                  )}

                  {/* WhatsApp Button */}
                  {(app.customerPhone || app.customer_phone) && (
                    <a
                      href={getWhatsAppUrl(
                        app.customerPhone || app.customer_phone,
                        customerName,
                        bookingTime,
                        serviceName,
                        app.status
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-9 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1 shrink-0 shadow-sm transition"
                      title="WhatsApp Client"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Treatment Processing Timer Modal */}
      {activeTimerApp && (
        <TreatmentTimerModal
          isOpen={Boolean(activeTimerApp)}
          onClose={() => setActiveTimerApp(null)}
          bookingId={activeTimerApp.id}
          customerName={activeTimerApp.customer_name || activeTimerApp.customerName || "Client"}
          serviceName={activeTimerApp.services || activeTimerApp.service_name || "Service"}
        />
      )}

      {/* Styling Notes Modal */}
      {activeNotesApp && (
        <StylingNotesModal
          isOpen={Boolean(activeNotesApp)}
          onClose={() => setActiveNotesApp(null)}
          customerName={activeNotesApp.customer_name || activeNotesApp.customerName || "Client"}
          customerPhone={activeNotesApp.customer_phone || activeNotesApp.customerPhone || ""}
          customerId={activeNotesApp.customer_id || activeNotesApp.customerId || null}
          serviceName={activeNotesApp.services || activeNotesApp.service_name || "Service"}
          initialFormula={activeNotesApp.past_formula || activeNotesApp.pastFormula}
          onSaved={(newFormula) => {
            activeNotesApp.past_formula = newFormula
            activeNotesApp.pastFormula = newFormula
          }}
        />
      )}
    </div>
  )
}
