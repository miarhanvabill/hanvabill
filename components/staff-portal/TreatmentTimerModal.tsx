"use client"

import React, { useEffect, useState, useRef } from "react"
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  Bell,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"

interface TreatmentTimerModalProps {
  isOpen: boolean
  onClose: () => void
  bookingId: number
  customerName: string
  serviceName: string
}

export default function TreatmentTimerModal({
  isOpen,
  onClose,
  bookingId,
  customerName,
  serviceName,
}: TreatmentTimerModalProps) {
  const [totalSeconds, setTotalSeconds] = useState<number>(30 * 60) // default 30 min
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30 * 60)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)
  const [isFinished, setIsFinished] = useState<boolean>(false)
  const [customMinutes, setCustomMinutes] = useState<string>("")
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const storageKey = `treatment_timer_${bookingId}`

  // 1. Play Synthesized Web Audio Alarm when timer hits 0
  const playAlarmSound = () => {
    if (!soundEnabled || typeof window === "undefined") return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()

      const notes = [587.33, 880.0, 1174.66, 880.0, 1174.66]
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = "sine"
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.16)
        gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.16)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.16 + 0.3)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime + idx * 0.16)
        osc.stop(ctx.currentTime + idx * 0.16 + 0.3)
      })
    } catch {}
  }

  const triggerHapticAlarm = () => {
    if (typeof window !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([200, 100, 200, 100, 400])
      } catch {}
    }
  }

  // 2. Load stored timer on mount
  useEffect(() => {
    if (!bookingId) return
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        const now = Date.now()
        if (parsed.endsAt && parsed.endsAt > now) {
          const rem = Math.round((parsed.endsAt - now) / 1000)
          setTotalSeconds(parsed.totalSeconds || rem)
          setSecondsRemaining(rem)
          setIsRunning(true)
          setIsFinished(false)
        } else if (parsed.endsAt && parsed.endsAt <= now && parsed.wasRunning) {
          setSecondsRemaining(0)
          setIsRunning(false)
          setIsFinished(true)
        }
      }
    } catch {}
  }, [bookingId])

  // 3. Countdown loop
  useEffect(() => {
    if (isRunning) {
      timerIntervalRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!)
            setIsRunning(false)
            setIsFinished(true)
            playAlarmSound()
            triggerHapticAlarm()
            try {
              localStorage.setItem(
                storageKey,
                JSON.stringify({ wasRunning: false, endsAt: Date.now(), totalSeconds })
              )
              window.dispatchEvent(new CustomEvent("treatment-timer-finished", { detail: { bookingId } }))
            } catch {}
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [isRunning, totalSeconds, soundEnabled])

  const startPreset = (mins: number) => {
    const secs = mins * 60
    setTotalSeconds(secs)
    setSecondsRemaining(secs)
    setIsRunning(true)
    setIsFinished(false)
    try {
      const endsAt = Date.now() + secs * 1000
      localStorage.setItem(storageKey, JSON.stringify({ endsAt, totalSeconds: secs, wasRunning: true }))
      window.dispatchEvent(new CustomEvent("treatment-timer-started", { detail: { bookingId, endsAt } }))
    } catch {}
  }

  const handleCustomStart = () => {
    const mins = parseInt(customMinutes, 10)
    if (mins > 0 && mins <= 180) {
      startPreset(mins)
      setCustomMinutes("")
    }
  }

  const togglePause = () => {
    if (isRunning) {
      setIsRunning(false)
      try {
        localStorage.removeItem(storageKey)
      } catch {}
    } else {
      if (secondsRemaining > 0) {
        setIsRunning(true)
        setIsFinished(false)
        try {
          const endsAt = Date.now() + secondsRemaining * 1000
          localStorage.setItem(
            storageKey,
            JSON.stringify({ endsAt, totalSeconds, wasRunning: true })
          )
        } catch {}
      }
    }
  }

  const resetTimer = () => {
    setIsRunning(false)
    setIsFinished(false)
    setSecondsRemaining(totalSeconds)
    try {
      localStorage.removeItem(storageKey)
      window.dispatchEvent(new CustomEvent("treatment-timer-reset", { detail: { bookingId } }))
    } catch {}
  }

  if (!isOpen) return null

  const minutes = Math.floor(secondsRemaining / 60)
  const seconds = secondsRemaining % 60
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`

  const progressPercent = totalSeconds > 0 ? ((totalSeconds - secondsRemaining) / totalSeconds) * 100 : 0

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 text-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Chair Processing Timer</h3>
              <p className="text-[11px] text-slate-400 font-medium truncate max-w-[190px]">
                {customerName} • {serviceName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
              title={soundEnabled ? "Mute alarm" : "Unmute alarm"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Central Dial Area */}
        <div className="p-6 flex flex-col items-center justify-center">
          {/* Circular Countdown Ring */}
          <div
            className={`relative w-48 h-48 rounded-full flex flex-col items-center justify-center border-4 transition-all duration-300 ${
              isFinished
                ? "border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.5)] animate-pulse"
                : isRunning
                ? "border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                : "border-slate-800"
            }`}
          >
            {/* Pulsing indicator ring */}
            {isRunning && (
              <div className="absolute inset-2 rounded-full border border-emerald-500/30 animate-ping pointer-events-none" />
            )}

            <div className="font-mono text-4xl font-black tracking-wider text-white">
              {formattedTime}
            </div>

            <span className="text-[11px] text-slate-400 uppercase tracking-widest mt-1 font-semibold">
              {isFinished ? "Time Complete!" : isRunning ? "Processing..." : "Paused"}
            </span>

            {isFinished && (
              <span className="mt-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Bell className="w-3 h-3 animate-bounce" /> Rinse Hair / Check
              </span>
            )}
          </div>

          {/* Quick Presets Pills */}
          <div className="w-full mt-6">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
              Quick Treatment Presets
            </span>

            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "15m", mins: 15, hint: "Toner" },
                { label: "30m", mins: 30, hint: "Roots" },
                { label: "45m", mins: 45, hint: "Global" },
                { label: "60m", mins: 60, hint: "Keratin" },
              ].map((p) => (
                <button
                  key={p.mins}
                  onClick={() => startPreset(p.mins)}
                  className="py-2 px-1 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 active:scale-95 transition flex flex-col items-center"
                >
                  <span className="text-xs font-bold text-white">{p.label}</span>
                  <span className="text-[9px] text-slate-400">{p.hint}</span>
                </button>
              ))}
            </div>

            {/* Custom Minutes Input */}
            <div className="flex items-center gap-2 mt-2.5">
              <input
                type="number"
                min="1"
                max="180"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                placeholder="Custom mins (e.g. 25)..."
                className="flex-1 h-9 px-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
              <button
                type="button"
                onClick={handleCustomStart}
                disabled={!customMinutes}
                className="h-9 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold transition disabled:opacity-40"
              >
                Set
              </button>
            </div>
          </div>
        </div>

        {/* Primary Play / Pause / Reset Actions */}
        <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex items-center gap-2">
          <button
            onClick={togglePause}
            className={`flex-1 h-12 rounded-xl text-xs font-extrabold shadow-md transition active:scale-95 flex items-center justify-center gap-2 ${
              isRunning
                ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-slate-950" /> Pause Timer
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" /> Start Countdown
              </>
            )}
          </button>

          <button
            onClick={resetTimer}
            className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition active:scale-95"
            title="Reset Timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
