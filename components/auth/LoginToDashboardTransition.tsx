"use client"

import React from "react"
import { Check, Sparkles } from "lucide-react"

export type LoginTransitionPhase = "idle" | "active" | "revealing"

interface LoginToDashboardTransitionProps {
  phase: LoginTransitionPhase
  userName?: string
}

export default function LoginToDashboardTransition({
  phase,
  userName,
}: LoginToDashboardTransitionProps) {
  if (phase === "idle") return null

  const isRevealing = phase === "revealing"
  const cleanFirstName = userName ? userName.trim().split(/\s+/)[0] : ""

  return (
    <div
      aria-live="polite"
      aria-label="Signing in to your salon dashboard"
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isRevealing
          ? "opacity-0 -translate-y-4 scale-[1.03] pointer-events-none"
          : "opacity-100 translate-y-0 scale-100 animate-hanva-transition-in"
      }`}
    >
      {/* Subtle blurred salon backdrop bridge */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-105 blur-md opacity-30"
        style={{ backgroundImage: "url('/login-salon-bg.jpg')" }}
        aria-hidden="true"
      />

      {/* Frosted pearl-lavender luxury gradient veil matching login card */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#f6f7fc]/92 via-[#edf1fa]/94 to-[#e2e9f7]/95 backdrop-blur-2xl"
        aria-hidden="true"
      />

      {/* Ambient royal blue glow behind center card */}
      <div
        className="absolute w-[420px] h-[420px] rounded-full bg-[#2260d8]/12 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Center Welcome Emblem & Progress */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md w-full animate-hanva-logo-pop">
        {/* Expanding pulse ring + circular Hanva emblem */}
        <div className="relative mb-6 flex items-center justify-center">
          <span
            className="absolute w-24 h-24 rounded-full border-2 border-[#2364cb]/45 animate-hanva-ring-pulse"
            aria-hidden="true"
          />
          <div className="relative w-24 h-24 rounded-full bg-white shadow-[0_20px_50px_-10px_rgba(22,54,122,0.35)] border-2 border-[#2364cb]/25 p-2.5 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-icon.png"
              alt="Hanva Technologies"
              className="w-full h-full object-contain"
            />
            {/* Verified check badge */}
            <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md border-2 border-white flex items-center justify-center">
              <Check className="w-4 h-4 stroke-[3]" />
            </span>
          </div>
        </div>

        {/* Eyebrow with side dividers */}
        <div className="flex items-center justify-center gap-3 w-full max-w-[280px] mb-3">
          <span className="h-[1px] flex-1 bg-slate-300/80" />
          <span className="text-[10.5px] font-semibold tracking-[0.22em] text-[#47536e] uppercase whitespace-nowrap">
            Salon Management System
          </span>
          <span className="h-[1px] flex-1 bg-slate-300/80" />
        </div>

        {/* Personalized Greeting */}
        <h2 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#122449] leading-tight">
          {cleanFirstName ? `Welcome Back, ${cleanFirstName}` : "Welcome Back"}
        </h2>

        {/* Signature Blue Wave Accent */}
        <div className="flex justify-center mt-2 mb-3" aria-hidden="true">
          <svg
            width="54"
            height="10"
            viewBox="0 0 54 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 6.5C11 1.5 19 1.5 27 5.2C35 8.9 43 8.5 52 4"
              stroke="#2260D8"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <p className="text-sm text-[#455068] font-medium flex items-center gap-1.5 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-[#2260d8]" />
          <span>Opening your salon workspace...</span>
        </p>

        {/* Sleek Royal Blue Gradient Progress Bar */}
        <div className="w-56 h-1.5 rounded-full bg-slate-300/60 overflow-hidden shadow-inner">
          <div className="h-full w-full rounded-full bg-gradient-to-r from-[#2364cb] via-[#1b4ca3] to-[#16336d] animate-hanva-progress" />
        </div>
      </div>
    </div>
  )
}
