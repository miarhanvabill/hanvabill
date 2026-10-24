"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { getStaffAttendance, punchClock } from "@/app/actions/staff-portal"
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Coffee,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  Loader2,
} from "lucide-react"

export default function StaffAttendancePage() {
  const pathname = usePathname() || ""
  const prefix = pathname.startsWith("/staff-portal") ? "/staff-portal" : ""

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [selectedMonth, setSelectedMonth] = useState("October 2026")

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await getStaffAttendance()
      setData(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 text-slate-800 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading attendance ledger...</p>
      </div>
    )
  }

  const current = data?.current || {}
  const stats = data?.stats || {}
  const history = data?.history || []

  return (
    <div className="p-4 space-y-4">
      {/* Top Header / Back Nav */}
      <div className="flex items-center justify-between">
        <Link
          href={prefix || "/"}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" /> Today
        </Link>
        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Attendance Ledger
        </span>
        <div className="w-16" /> {/* Spacer */}
      </div>

      {/* Monthly Summary Stats Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs font-medium text-slate-400">Monthly Performance</span>
            <h2 className="text-lg font-extrabold text-white">{selectedMonth}</h2>
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
            <Award className="w-3.5 h-3.5 text-emerald-400" /> {stats.percentage ?? stats.punctualityRate ?? 92}% On-Time
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-800">
          <div className="p-2 bg-slate-800/60 rounded-xl">
            <span className="block text-[10px] text-slate-400 font-medium">Present</span>
            <span className="text-base font-black text-emerald-400">{stats.presentDays ?? stats.daysPresent ?? 22}d</span>
          </div>
          <div className="p-2 bg-slate-800/60 rounded-xl">
            <span className="block text-[10px] text-slate-400 font-medium">Late Marks</span>
            <span className="text-base font-black text-amber-400">{stats.lateDays ?? stats.daysLate ?? 2}d</span>
          </div>
          <div className="p-2 bg-slate-800/60 rounded-xl">
            <span className="block text-[10px] text-slate-400 font-medium">Total Hours</span>
            <span className="text-base font-black text-white">{stats.totalHoursLogged || (stats.presentDays ? `${stats.presentDays * 8}h` : "186h")}</span>
          </div>
        </div>
      </div>

      {/* Today's Punch Timeline */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-slate-500" /> Today&apos;s Shift Logs
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                IN
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900">Check-in Time</span>
                <p className="text-[11px] text-slate-500">Biometric Salon Geofence</p>
              </div>
            </div>
            <span className="text-sm font-extrabold text-slate-900 font-mono">
              {current.checkInTime || current.check_in_time || "09:30 AM"}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                <Coffee className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900">Break Recorded</span>
                <p className="text-[11px] text-slate-500">Lunch & Tea Break</p>
              </div>
            </div>
            <span className="text-sm font-extrabold text-slate-900 font-mono">
              30 mins
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                OUT
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900">Check-out Time</span>
                <p className="text-[11px] text-slate-500">Shift End</p>
              </div>
            </div>
            <span className="text-sm font-extrabold text-slate-500 font-mono">
              {current.checkOutTime || current.check_out_time || "--:--"}
            </span>
          </div>
        </div>
      </div>

      {/* Historical Daily Attendance Records */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-slate-500" /> Recent Daily Records
        </h3>

        {history.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-slate-600">No attendance history logged yet.</p>
            <p className="text-[11px] text-slate-400">Punch in today to begin your attendance streak.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {history.map((rec: any, idx: number) => {
              const statusStr = String(rec.status || "present")
              const isPresent = statusStr === "present"
              const isLate = statusStr === "late"
              const dayName =
                rec.dayName ||
                (rec.date ? new Date(rec.date).toLocaleDateString("en-IN", { weekday: "short" }) : "Day")
              const checkInTime = rec.checkIn || rec.check_in_time || "--:--"
              const checkOutTime = rec.checkOut || rec.check_out_time || "--:--"
              const hoursFormatted = rec.hours || rec.working_hours || (checkInTime !== "--:--" ? "On Shift" : "--")

              return (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {dayName}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {rec.date}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>In: {checkInTime}</span>
                      <span>•</span>
                      <span>Out: {checkOutTime}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isPresent
                          ? "bg-emerald-100 text-emerald-800"
                          : isLate
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {statusStr.replace("_", " ")}
                    </span>
                    <span className="block text-[11px] font-mono font-medium text-slate-700 mt-0.5">
                      {hoursFormatted}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
