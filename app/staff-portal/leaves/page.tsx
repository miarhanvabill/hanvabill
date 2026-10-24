"use client"

import React, { useEffect, useState } from "react"
import { getStaffLeaves, applyStaffLeave } from "@/app/actions/staff-portal"
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Calendar,
  X,
  Loader2,
} from "lucide-react"

export default function StaffLeavesPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Leave Form State
  const [leaveType, setLeaveType] = useState("Casual Leave")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reason, setReason] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const loadLeaves = async () => {
    try {
      setLoading(true)
      const res = await getStaffLeaves()
      setData(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeaves()
  }, [])

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!startDate || !endDate) {
      setFormError("Please select both start and end dates.")
      return
    }
    if (!reason || reason.trim().length < 5) {
      setFormError("Please provide a reason (minimum 5 characters).")
      return
    }

    try {
      setSubmitting(true)
      const res = await applyStaffLeave({
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason,
      })

      if (res.success) {
        showToast("Leave application submitted!")
        setIsModalOpen(false)
        setReason("")
        setStartDate("")
        setEndDate("")
        await loadLeaves()
      } else {
        setFormError(res.message || "Failed to submit leave request.")
      }
    } catch (err: any) {
      setFormError(err?.message || "An unexpected error occurred.")
    } finally {
      setSubmitting(false)
    }
  }

  const balances = data?.balances || {
    casual: { remaining: 8, total: 12 },
    sick: { remaining: 5, total: 7 },
    earned: { remaining: 4, total: 6 },
  }
  const requests = data?.leaves || data?.requests || []

  return (
    <div className="p-4 space-y-4">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* Top Banner & Apply Leave Action Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Leaves & Offs</h2>
          <p className="text-xs text-slate-500">Track and request time off</p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold shadow transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Apply Leave</span>
        </button>
      </div>

      {/* Leave Balances Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Casual
          </span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {balances.casual?.remaining || 8}
            <span className="text-xs font-medium text-slate-400">/{balances.casual?.total || 12}</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Available</span>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Sick
          </span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {balances.sick?.remaining || 5}
            <span className="text-xs font-medium text-slate-400">/{balances.sick?.total || 7}</span>
          </div>
          <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">Available</span>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Earned
          </span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {balances.earned?.remaining || 4}
            <span className="text-xs font-medium text-slate-400">/{balances.earned?.total || 6}</span>
          </div>
          <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">Available</span>
        </div>
      </div>

      {/* Leave Application History List */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-slate-500" />
          Request History
        </h3>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-2">
            <Loader2 className="w-6 h-6 text-slate-800 animate-spin" />
            <p className="text-xs text-slate-500">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <p className="text-xs">No leave requests found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((req: any) => {
              const isApproved = req.status === "approved"
              const isPending = req.status === "pending"
              const isRejected = req.status === "rejected"

              return (
                <div key={req.id} className="py-3 flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {req.leave_type}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {req.total_days ?? req.totalDays ?? 1} {(req.total_days ?? req.totalDays ?? 1) === 1 ? "day" : "days"}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 font-medium">
                      {req.start_date} {req.start_date !== req.end_date ? `to ${req.end_date}` : ""}
                    </p>

                    <p className="text-[11px] text-slate-400 italic">
                      &quot;{req.reason}&quot;
                    </p>

                    {(req.reviewer_notes || req.reviewerNotes) && (
                      <p className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200/60 rounded px-1.5 py-0.5 mt-1 font-medium">
                        Admin note: {req.reviewer_notes || req.reviewerNotes}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isApproved
                          ? "bg-emerald-100 text-emerald-800"
                          : isPending
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {isApproved && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      {isPending && <Clock className="w-3 h-3 text-amber-600" />}
                      {isRejected && <XCircle className="w-3 h-3 text-red-600" />}
                      <span>{req.status}</span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Apply for Leave</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} className="space-y-4 mt-4">
              {/* Leave Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Leave Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["Casual Leave", "Sick Leave", "Earned Privilege"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setLeaveType(type)}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition ${
                        leaveType === type
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Leave
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Attending brother's wedding ceremony in Delhi..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-11 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition flex items-center justify-center gap-1 shadow-md"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    "Submit Application"
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
