"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { staffLogin } from "@/app/actions/staff-portal"
import { Lock, Smartphone, ShieldCheck, Delete, ArrowRight, AlertCircle, Loader2, Sparkles, Download } from "lucide-react"

export default function StaffLoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState("")
  const [pin, setPin] = useState("")
  const [activeInput, setActiveInput] = useState<"phone" | "pin">("phone")
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleKeyPress = (num: string) => {
    setErrorMessage(null)
    if (activeInput === "phone") {
      if (phone.length < 10) {
        const nextPhone = phone + num
        setPhone(nextPhone)
        if (nextPhone.length === 10) {
          setActiveInput("pin")
        }
      }
    } else {
      if (pin.length < 4) {
        const nextPin = pin + num
        setPin(nextPin)
        if (nextPin.length === 4) {
          // Auto submit when 4 digits are completed if phone is already 10 digits
          if (phone.length === 10) {
            submitLogin(phone, nextPin)
          }
        }
      }
    }
  }

  const handleDelete = () => {
    setErrorMessage(null)
    if (activeInput === "pin") {
      if (pin.length > 0) {
        setPin(pin.slice(0, -1))
      } else {
        setActiveInput("phone")
      }
    } else {
      setPhone(phone.slice(0, -1))
    }
  }

  const submitLogin = async (phoneVal = phone, pinVal = pin) => {
    if (phoneVal.length < 10) {
      setErrorMessage("Please enter your complete 10-digit phone number.")
      setActiveInput("phone")
      return
    }
    if (pinVal.length < 4) {
      setErrorMessage("Please enter your 4-digit security PIN.")
      setActiveInput("pin")
      return
    }

    setLoading(true)
    setErrorMessage(null)

    try {
      const res = await staffLogin(phoneVal, pinVal)
      if (res.success) {
        // Check if on staff subdomain or direct portal
        const isSubdomain =
          typeof window !== "undefined" &&
          (window.location.hostname.startsWith("staff.") ||
            window.location.hostname.includes("staff.biz.hanva.in"))
        const target = isSubdomain ? "/" : "/staff-portal"
        router.push(target)
        router.refresh()
      } else {
        setErrorMessage(res.message || "Login failed. Please check your credentials.")
        setPin("")
        setActiveInput("pin")
      }
    } catch (e: any) {
      setErrorMessage(e?.message || "Failed to connect to server. Try again.")
    } finally {
      setLoading(false)
    }
  }

  const fillDemoCredentials = () => {
    setPhone("9876543210")
    setPin("1234")
    submitLogin("9876543210", "1234")
  }

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col justify-center min-h-[90vh] py-6 select-none">
      {/* Top Branding */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white p-2.5 shadow-2xl shadow-blue-500/10 border border-slate-700/80 mb-3.5 ring-4 ring-slate-800/80 transition-transform duration-200 hover:scale-105">
          <img
            src="/logo-icon.png"
            alt="Hanva Logo"
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white">Hanva Staff</h1>
        <p className="text-xs text-slate-400 mt-1">Salon & Spa Mobile Companion</p>
      </div>

      {/* Input Display Area */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-2xl backdrop-blur-md mb-5">
        {/* Phone Input Box */}
        <div
          onClick={() => setActiveInput("phone")}
          className={`cursor-pointer rounded-xl p-3 border transition-all ${
            activeInput === "phone"
              ? "bg-slate-900 border-amber-400/80 ring-2 ring-amber-400/20"
              : "bg-slate-900/60 border-slate-700/60 hover:border-slate-600"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Smartphone className="w-3.5 h-3.5 text-slate-400" /> Mobile Number
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {phone.length}/10
            </span>
          </div>
          <div className="flex items-center font-mono text-lg tracking-wider text-white h-7">
            {phone ? (
              <span>
                {phone.slice(0, 5)} {phone.slice(5)}
              </span>
            ) : (
              <span className="text-slate-400 text-sm font-sans">
                Enter 10-digit mobile number...
              </span>
            )}
            {activeInput === "phone" && (
              <span className="w-2 h-5 bg-amber-400 ml-1 animate-pulse" />
            )}
          </div>
        </div>

        {/* PIN Input Box */}
        <div
          onClick={() => setActiveInput("pin")}
          className={`cursor-pointer rounded-xl p-3 border mt-3 transition-all ${
            activeInput === "pin"
              ? "bg-slate-900 border-amber-400/80 ring-2 ring-amber-400/20"
              : "bg-slate-900/60 border-slate-700/60 hover:border-slate-600"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Lock className="w-3.5 h-3.5 text-slate-400" /> 4-Digit Security PIN
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {pin.length}/4
            </span>
          </div>
          <div className="flex items-center justify-center space-x-4 py-1 h-7">
            {[0, 1, 2, 3].map((idx) => {
              const filled = pin.length > idx
              return (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                    filled
                      ? "bg-amber-400 scale-110 shadow-sm shadow-amber-400/50"
                      : "border-2 border-slate-600 bg-slate-800"
                  }`}
                />
              )
            })}
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-3 p-2.5 rounded-lg bg-red-950/80 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Numeric Touch Keypad */}
      <div className="grid grid-cols-3 gap-2.5 px-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleKeyPress(num)}
            className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 active:scale-95 text-white font-mono text-xl font-semibold shadow border border-slate-700/60 transition flex items-center justify-center"
          >
            {num}
          </button>
        ))}

        {/* Clear All / Back to Phone */}
        <button
          type="button"
          onClick={() => {
            setPhone("")
            setPin("")
            setActiveInput("phone")
            setErrorMessage(null)
          }}
          className="h-14 rounded-2xl bg-slate-800/60 hover:bg-slate-800 active:scale-95 text-xs text-slate-400 font-medium border border-slate-700/40 transition flex items-center justify-center"
        >
          Clear
        </button>

        {/* 0 */}
        <button
          type="button"
          onClick={() => handleKeyPress("0")}
          className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 active:scale-95 text-white font-mono text-xl font-semibold shadow border border-slate-700/60 transition flex items-center justify-center"
        >
          0
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={handleDelete}
          className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 active:scale-95 text-slate-300 font-semibold shadow border border-slate-700/60 transition flex items-center justify-center"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>

      {/* Submit Button */}
      <div className="mt-4 px-2">
        <button
          type="button"
          disabled={loading || phone.length < 10 || pin.length < 4}
          onClick={() => submitLogin()}
          className="w-full h-13 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Verifying Credentials...
            </>
          ) : (
            <>
              Sign In to Staff Portal <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Demo Credentials Helper */}
      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={fillDemoCredentials}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400/90 hover:text-amber-300 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-full transition active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Auto-fill Demo (9876543210 / 1234)
        </button>
      </div>

      {/* PWA Install Button */}
      <div className="mt-5 text-center border-t border-slate-800/80 pt-4">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("trigger-pwa-install"))
            }
          }}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-xl transition active:scale-95 shadow-md"
        >
          <img src="/logo-icon.png" alt="Hanva" className="w-4 h-4 object-contain" />
          <span>Install Hanva Staff App</span>
          <Download className="w-3.5 h-3.5 text-amber-400 ml-0.5" />
        </button>
      </div>
    </div>
  )
}
