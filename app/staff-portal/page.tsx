"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  getStaffDashboardData,
  markStaffAttendance,
  logStaffBreak,
  updateAppointmentStatus,
} from "@/app/actions/staff-portal"
import {
  Clock,
  MapPin,
  CheckCircle2,
  Coffee,
  Play,
  Square,
  Sparkles,
  TrendingUp,
  User,
  Phone,
  Calendar,
  ChevronRight,
  IndianRupee,
  Scissors,
  AlertCircle,
  Loader2,
  Check,
} from "lucide-react"

export default function StaffTodayDashboard() {
  const pathname = usePathname() || ""
  const prefix = pathname.startsWith("/staff-portal") ? "/staff-portal" : ""

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | undefined>(undefined)

  // Live digital clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      )
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  // Geolocation lookup
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      )
    }
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const res = await getStaffDashboardData()
      setData(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handlePunch = async (action: "check_in" | "check_out" | "break_start" | "break_end") => {
    try {
      setActionLoading(true)
      if (action === "check_in" || action === "check_out") {
        const res = await markStaffAttendance(action, geoCoords)
        showToast(res.message)
      } else if (action === "break_start") {
        const res = await logStaffBreak("start", "lunch")
        showToast(res.message)
      } else if (action === "break_end") {
        const res = await logStaffBreak("end")
        showToast(res.message)
      }
      await loadDashboard()
    } catch (err: any) {
      showToast(err?.message || "Could not update punch status.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleStatusChange = async (
    bookingId: number,
    nextStatus: "arrived" | "in_progress" | "completed"
  ) => {
    try {
      setActionLoading(true)
      const res = await updateAppointmentStatus(bookingId, nextStatus)
      showToast(res.message || `Appointment updated to ${nextStatus}`)
      await loadDashboard()
    } catch (e: any) {
      showToast(e?.message || "Failed to update status")
    } finally {
      setActionLoading(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 space-y-3">
        <Loader2 className="w-8 h-8 text-slate-800 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading today&apos;s shift...</p>
      </div>
    )
  }

  const attendance = data?.attendance || {}
  const metrics = data?.metrics || {}
  const nextClient = data?.next_appointment
  const isCheckedIn = attendance.status === "present" && !attendance.check_out_time
  const isOnBreak = Boolean(attendance.active_break)

  return (
    <div className="p-4 space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-xl border border-slate-700/80 animate-in fade-in slide-in-from-top-2 duration-200">
          {toastMessage}
        </div>
      )}

      {/* 1. Real-Time Punch Clock Card */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-3xl p-5 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -right-8 -top-8 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-full">
            <MapPin className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>📍 Inside Salon</span>
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>

        {/* Live Digital Clock */}
        <div className="my-3 text-center">
          <div className="font-mono text-3xl font-extrabold tracking-wider text-white">
            {currentTime || "09:30:00 AM"}
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {isCheckedIn ? (
              <span>
                Shift In: <strong className="text-white">{attendance.check_in_time || "09:30 AM"}</strong>
                {isOnBreak && <span className="text-amber-400 ml-1 font-bold">(On Break)</span>}
              </span>
            ) : attendance.check_out_time ? (
              <span>Shift Ended: <strong className="text-white">{attendance.check_out_time}</strong></span>
            ) : (
              <span>Not Clocked In Yet</span>
            )}
          </p>
        </div>

        {/* Punch In / Out and Break Buttons */}
        <div className="grid grid-cols-2 gap-2.5 mt-4 pt-3 border-t border-slate-800/80">
          {isCheckedIn ? (
            <button
              disabled={actionLoading}
              onClick={() => handlePunch("check_out")}
              className="h-12 rounded-xl bg-red-600/90 hover:bg-red-600 active:scale-95 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Punch Out</span>
            </button>
          ) : (
            <button
              disabled={actionLoading}
              onClick={() => handlePunch("check_in")}
              className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Punch In</span>
            </button>
          )}

          {isOnBreak ? (
            <button
              disabled={actionLoading}
              onClick={() => handlePunch("break_end")}
              className="h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Resume Shift</span>
            </button>
          ) : (
            <button
              disabled={actionLoading || !isCheckedIn}
              onClick={() => handlePunch("break_start")}
              className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold border border-slate-700/80 transition flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Coffee className="w-4 h-4 text-amber-400" />
              <span>Start Break</span>
            </button>
          )}
        </div>
      </section>

      {/* 2. Today's Performance & Commission Ticker */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Today&apos;s Earnings & Metrics
            </h2>
          </div>
          <Link
            href={`${prefix}/earnings`}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
          >
            Ledger <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[11px] font-medium text-slate-500">Commission Earned</span>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5 flex items-center">
              ₹{metrics.today_commission_earned?.toLocaleString("en-IN") || "0"}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold">
              + tips: ₹{metrics.tips_collected_today || 0}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[11px] font-medium text-slate-500">Business Revenue</span>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">
              ₹{metrics.today_business_revenue?.toLocaleString("en-IN") || "0"}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              {metrics.services_completed_today || 0} services done
            </span>
          </div>
        </div>
      </section>

      {/* 3. Next Client in Chair Card */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-lg bg-blue-50 text-blue-600">
              <Scissors className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Next Client in Chair
            </h2>
          </div>
          <Link
            href={`${prefix}/schedule`}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
          >
            Queue <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {nextClient ? (
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/60 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 mb-1">
                  {nextClient.booking_time}
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {nextClient.customer_name}
                </h3>
                <p className="text-xs font-medium text-slate-600 mt-0.5">
                  {nextClient.service_name}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-slate-900">
                  ₹{nextClient.total_amount}
                </span>
                <span className="block text-[10px] text-slate-400 font-mono">
                  {nextClient.booking_number}
                </span>
              </div>
            </div>

            {nextClient.notes && (
              <div className="text-xs bg-amber-50 text-amber-900 border border-amber-200/60 rounded-lg p-2 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span><strong>Client Note:</strong> {nextClient.notes}</span>
              </div>
            )}

            {/* Quick Status Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              {(nextClient.status === "confirmed" || nextClient.status === "pending") && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleStatusChange(nextClient.id, "arrived")}
                  className="flex-1 h-9 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Arrived
                </button>
              )}

              {nextClient.status === "arrived" && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleStatusChange(nextClient.id, "in_progress")}
                  className="flex-1 h-9 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
                >
                  <Play className="w-3.5 h-3.5" /> Start Service
                </button>
              )}

              {nextClient.status === "in_progress" && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleStatusChange(nextClient.id, "completed")}
                  className="flex-1 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" /> Complete Service
                </button>
              )}

              {nextClient.customer_phone && (
                <a
                  href={`tel:${nextClient.customer_phone}`}
                  className="h-9 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center text-xs font-semibold gap-1"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-500" /> Call
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl border border-slate-200/50">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-1" />
            <p className="text-xs font-semibold text-slate-700">All clients completed for today!</p>
            <p className="text-[11px] text-slate-400">Great job on finishing your appointment queue.</p>
          </div>
        )}
      </section>

      {/* 4. Quick Shortcuts */}
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href={`${prefix}/attendance`}
          className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3 active:scale-98 transition"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Attendance</h4>
            <p className="text-[10px] text-slate-500">History & Calendar</p>
          </div>
        </Link>

        <Link
          href={`${prefix}/leaves`}
          className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3 active:scale-98 transition"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Apply Leave</h4>
            <p className="text-[10px] text-slate-500">Casual & Sick Leaves</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
