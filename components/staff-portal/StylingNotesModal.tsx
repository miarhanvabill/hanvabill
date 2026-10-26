"use client"

import React, { useEffect, useState } from "react"
import {
  Sparkles,
  X,
  Plus,
  Save,
  Clock,
  User,
  Scissors,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  History,
} from "lucide-react"
import {
  saveCustomerStylingNote,
  getCustomerStylingNotes,
} from "@/app/actions/staff-portal"

interface StylingNotesModalProps {
  isOpen: boolean
  onClose: () => void
  customerName: string
  customerPhone?: string
  customerId?: number | null
  serviceName?: string
  initialFormula?: string | null
  onSaved?: (formula: string) => void
}

export default function StylingNotesModal({
  isOpen,
  onClose,
  customerName,
  customerPhone,
  customerId,
  serviceName,
  initialFormula,
  onSaved,
}: StylingNotesModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notesHistory, setNotesHistory] = useState<any[]>([])
  const [formula, setFormula] = useState(initialFormula || "")
  const [preferences, setPreferences] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setFormula(initialFormula || "")
      setPreferences("")
      setFormError(null)
      loadHistory()
    }
  }, [isOpen, customerPhone, customerId, initialFormula])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const res = await getCustomerStylingNotes(customerPhone, customerId)
      if (res.success) {
        setNotesHistory(res.notes || [])
      }
    } catch (e) {
      console.warn("Failed to load styling history:", e)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formula.trim() && !preferences.trim()) {
      setFormError("Please enter a styling formula or consultation note.")
      return
    }

    try {
      setSaving(true)
      const res = await saveCustomerStylingNote({
        customerId: customerId || null,
        customerPhone: customerPhone || "",
        customerName: customerName || "Client",
        serviceName: serviceName || "Salon Service",
        formula: formula.trim(),
        preferences: preferences.trim(),
      })

      if (res.success) {
        setToastMessage("Styling note saved ✓")
        setTimeout(() => setToastMessage(null), 2500)
        if (onSaved) onSaved(formula.trim())
        await loadHistory()
        setPreferences("")
      } else {
        setFormError(res.message || "Failed to save note")
      }
    } catch (e: any) {
      setFormError(e?.message || "An unexpected error occurred")
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/60">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Styling Formulas & Notes
              </h3>
              <p className="text-[11px] text-slate-500 font-medium truncate max-w-[220px]">
                {customerName} {serviceName ? `• ${serviceName}` : ""}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Toast feedback */}
          {toastMessage && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Form error */}
          {formError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Add / Update Formula Card */}
          <form onSubmit={handleSave} className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-purple-600" />
                Chemical Formula & Shades
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Private Stylist Record</span>
            </div>

            <div>
              <textarea
                rows={2}
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                placeholder="e.g. L'Oréal Majirel 5.1 + 20 Vol (1:1.5), roots only for 35m..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Client Preferences & Scalp Notes
              </label>
              <input
                type="text"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="e.g. Sensitive scalp, loves head massage with argan oil..."
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full h-10 rounded-xl bg-purple-700 hover:bg-purple-600 active:scale-98 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving Formula...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> Save to Client Profile
                </>
              )}
            </button>
          </form>

          {/* Past Formulas History */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-500" /> Past Formulas History ({notesHistory.length})
              </h4>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-6 text-slate-400 text-xs gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading past formulas...
              </div>
            ) : notesHistory.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100 text-slate-400">
                <FileText className="w-7 h-7 mx-auto mb-1 text-slate-300" />
                <p className="text-xs font-medium text-slate-600">No past styling formulas logged yet.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Write today&apos;s formula above to start client history.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 space-y-2">
                {notesHistory.map((note) => (
                  <div key={note.id} className="pt-2 bg-slate-50/70 p-3 rounded-xl border border-slate-200/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-900">
                        {note.service_name || "Salon Service"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {note.created_at}
                      </span>
                    </div>

                    {note.formula && (
                      <div className="text-xs font-mono font-medium text-purple-900 bg-purple-50/60 p-2 rounded-lg border border-purple-100">
                        {note.formula}
                      </div>
                    )}

                    {note.preferences && (
                      <p className="text-[11px] text-slate-600 italic">
                        &quot;{note.preferences}&quot;
                      </p>
                    )}

                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>Stylist: {note.staff_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full h-10 rounded-xl bg-slate-200/80 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
