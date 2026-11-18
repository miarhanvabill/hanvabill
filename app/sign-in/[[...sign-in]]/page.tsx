"use client"

import React, { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { useSignIn } from "@clerk/nextjs/legacy"
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  CalendarDays,
  Users,
  BarChart3,
  Loader2,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Check,
} from "lucide-react"

type AuthMode = "login" | "verify_code" | "second_factor" | "forgot_email" | "forgot_reset"

const REMEMBER_STORAGE_KEY = "hanva_remember_login_identifier"

function getSafeRedirectTarget(raw: string | null): string {
  if (!raw) return "/"
  try {
    if (raw.startsWith("/")) {
      if (raw.startsWith("/sign-in") || raw.startsWith("/login")) return "/"
      return raw
    }
    if (typeof window !== "undefined") {
      const parsed = new URL(raw)
      if (parsed.origin === window.location.origin) {
        const path = `${parsed.pathname}${parsed.search}${parsed.hash}`
        if (path.startsWith("/sign-in") || path.startsWith("/login")) return "/"
        return path || "/"
      }
    }
  } catch {
    // Fallback to home on malformed redirect URL
  }
  return "/"
}

function extractClerkError(err: any): string {
  if (!err) return "Something went wrong. Please try again."
  if (Array.isArray(err.errors) && err.errors.length > 0) {
    return err.errors[0].longMessage || err.errors[0].message || "Authentication failed."
  }
  if (typeof err.message === "string" && err.message.trim()) {
    return err.message
  }
  return "Unable to sign in. Please verify your credentials and try again."
}

function SalonSignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth()
  const { isLoaded: isSignInLoaded, signIn, setActive } = useSignIn()

  const [mode, setMode] = useState<AuthMode>("login")
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  // Verification / Password reset state
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [secondFactorStrategy, setSecondFactorStrategy] = useState<"email_code" | "totp" | "phone_code">("email_code")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  const redirectTarget = getSafeRedirectTarget(searchParams?.get("redirect_url") ?? null)

  // Load remembered email/username on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_STORAGE_KEY)
      if (saved) {
        setIdentifier(saved)
        setRememberMe(true)
      }
    } catch {}
  }, [])

  // If already authenticated, redirect immediately to dashboard
  useEffect(() => {
    if (isAuthLoaded && isSignedIn) {
      router.replace(redirectTarget)
    }
  }, [isAuthLoaded, isSignedIn, redirectTarget, router])

  const completeSession = async (sessionId: string | null | undefined) => {
    if (!setActive || !sessionId) {
      router.replace(redirectTarget)
      return
    }
    await setActive({ session: sessionId })
    // Full navigation ensures middleware & server components receive the new Clerk cookie cleanly
    if (typeof window !== "undefined") {
      window.location.href = redirectTarget
    } else {
      router.replace(redirectTarget)
    }
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSignInLoaded || !signIn) return

    const trimmedId = identifier.trim()
    if (!trimmedId) {
      setError("Please enter your email or username.")
      return
    }

    setLoading(true)
    setError(null)
    setInfoMessage(null)

    try {
      // Persist or clear remembered identifier
      try {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_STORAGE_KEY, trimmedId)
        } else {
          localStorage.removeItem(REMEMBER_STORAGE_KEY)
        }
      } catch {}

      const result = await signIn.create(
        password
          ? { identifier: trimmedId, password }
          : { identifier: trimmedId }
      )

      if (result.status === "complete") {
        await completeSession(result.createdSessionId)
        return
      }

      if (result.status === "needs_first_factor") {
        // Attempt password first if provided, otherwise fall back to email code
        if (password) {
          const passwordFactor = result.supportedFirstFactors?.find(
            (f: any) => f.strategy === "password"
          )
          if (passwordFactor) {
            const attempt = await signIn.attemptFirstFactor({
              strategy: "password",
              password,
            })
            if (attempt.status === "complete") {
              await completeSession(attempt.createdSessionId)
              return
            }
            if (attempt.status === "needs_second_factor" || (attempt.status as string) === "needs_client_trust") {
              await startSecondFactorFlow(attempt)
              return
            }
          }
        }

        const emailFactor = result.supportedFirstFactors?.find(
          (f: any) => f.strategy === "email_code"
        ) as any
        if (emailFactor?.emailAddressId) {
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: emailFactor.emailAddressId,
          })
          setMode("verify_code")
          setInfoMessage(`We sent a 6-digit verification code to ${emailFactor.safeIdentifier || trimmedId}.`)
          return
        }

        setError("Please enter your password to continue.")
        return
      }

      if (result.status === "needs_second_factor" || (result.status as string) === "needs_client_trust") {
        await startSecondFactorFlow(result)
        return
      }

      setError("Additional verification is required. Please check your email or contact support.")
    } catch (err: any) {
      const codeStr = err?.errors?.[0]?.code
      if (codeStr === "session_exists") {
        router.replace(redirectTarget)
        return
      }
      setError(extractClerkError(err))
    } finally {
      setLoading(false)
    }
  }

  const startSecondFactorFlow = async (attempt: any) => {
    if (!signIn) return
    const factors = attempt?.supportedSecondFactors || []
    const emailFactor = factors.find((f: any) => f.strategy === "email_code")
    const totpFactor = factors.find((f: any) => f.strategy === "totp")
    const phoneFactor = factors.find((f: any) => f.strategy === "phone_code")

    if (emailFactor) {
      await signIn.prepareSecondFactor({
        strategy: "email_code",
        emailAddressId: emailFactor.emailAddressId,
      })
      setSecondFactorStrategy("email_code")
      setCode("")
      setMode("second_factor")
      setInfoMessage(`Enter the verification code sent to ${emailFactor.safeIdentifier || "your email"}.`)
    } else if (totpFactor) {
      setSecondFactorStrategy("totp")
      setCode("")
      setMode("second_factor")
      setInfoMessage("Enter the 6-digit code from your authenticator app.")
    } else if (phoneFactor) {
      await signIn.prepareSecondFactor({
        strategy: "phone_code",
        phoneNumberId: phoneFactor.phoneNumberId,
      })
      setSecondFactorStrategy("phone_code")
      setCode("")
      setMode("second_factor")
      setInfoMessage(`Enter the verification code sent to ${phoneFactor.safeIdentifier || "your phone"}.`)
    } else {
      setError("Two-factor verification is required for this account.")
    }
  }

  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSignInLoaded || !signIn) return

    setLoading(true)
    setError(null)
    try {
      const attempt =
        mode === "verify_code"
          ? await signIn.attemptFirstFactor({
              strategy: "email_code",
              code: code.trim(),
            })
          : await signIn.attemptSecondFactor({
              strategy: secondFactorStrategy,
              code: code.trim(),
            })

      if (attempt.status === "complete") {
        await completeSession(attempt.createdSessionId)
        return
      }
      if (attempt.status === "needs_second_factor" || (attempt.status as string) === "needs_client_trust") {
        await startSecondFactorFlow(attempt)
        return
      }
      setError("Verification incomplete. Please try again.")
    } catch (err: any) {
      setError(extractClerkError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleForgotEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSignInLoaded || !signIn) return

    const trimmedId = identifier.trim()
    if (!trimmedId) {
      setError("Please enter your account email address.")
      return
    }

    setLoading(true)
    setError(null)
    setInfoMessage(null)

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: trimmedId,
      })
      setCode("")
      setNewPassword("")
      setMode("forgot_reset")
      setInfoMessage(`Password reset code sent to ${trimmedId}.`)
    } catch (err: any) {
      setError(extractClerkError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleForgotResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSignInLoaded || !signIn) return

    if (!code.trim() || !newPassword) {
      setError("Please enter the verification code and your new password.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
        password: newPassword,
      })

      if (result.status === "complete") {
        await completeSession(result.createdSessionId)
        return
      }
      if (result.status === "needs_second_factor") {
        await startSecondFactorFlow(result)
        return
      }
      setError("Could not complete password reset. Please try again.")
    } catch (err: any) {
      setError(extractClerkError(err))
    } finally {
      setLoading(false)
    }
  }

  const resetToLogin = () => {
    setMode("login")
    setError(null)
    setInfoMessage(null)
    setCode("")
    setNewPassword("")
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#1e1b18] flex flex-col lg:flex-row items-center justify-center lg:justify-end px-4 py-8 sm:px-6 lg:px-12 xl:px-20">
      {/* Full-bleed Luxury Salon Reception Background */}
      <div
        className="absolute inset-0 bg-cover bg-no-repeat bg-[position:22%_center] lg:bg-center scale-[1.01]"
        style={{
          backgroundImage: "url('/login-salon-bg.jpg')",
        }}
        aria-hidden="true"
      />

      {/* Subtle vignette only on mobile so card stays crisp over busy background */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-slate-950/35 via-slate-950/20 to-slate-950/40 lg:bg-none pointer-events-none"
        aria-hidden="true"
      />

      {/* Compact Brand Badge for Mobile / Small Tablets (Desktop shows the illuminated salon wall logo directly) */}
      <div className="relative z-10 flex lg:hidden flex-col items-center mb-5 text-center">
        <div className="w-16 h-16 rounded-full bg-white/95 shadow-lg border-2 border-[#1f4f9e]/30 p-1.5 flex items-center justify-center mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-icon.png"
            alt="Hanva Technologies"
            className="w-full h-full object-contain"
          />
        </div>
        <p className="text-white font-bold tracking-wide text-sm drop-shadow">
          HANVA TECHNOLOGIES Pvt Ltd.
        </p>
        <p className="text-white/85 text-xs drop-shadow">www.hanva.in</p>
      </div>

      {/* Floating Soft Glass Login Card (Right-aligned on Desktop, Centered on Mobile) */}
      <div className="relative z-10 w-full max-w-[430px] sm:max-w-[448px] lg:mr-[2%] xl:mr-[4%]">
        <div className="bg-[#f4f5fb]/[0.94] backdrop-blur-xl rounded-[32px] shadow-[0_28px_75px_-12px_rgba(12,22,48,0.42)] border border-white/80 px-7 py-8 sm:px-9 sm:py-10">
          {/* Eyebrow Header with Side Dividers */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className="h-[1px] flex-1 bg-slate-300/80" />
            <span className="text-[11px] font-semibold tracking-[0.2em] text-[#47536e] uppercase whitespace-nowrap">
              Salon Management System
            </span>
            <span className="h-[1px] flex-1 bg-slate-300/80" />
          </div>

          {/* Card Title & Signature Blue Wave */}
          <div className="text-center mb-7">
            <h1 className="text-[30px] sm:text-[33px] font-bold tracking-tight text-[#122449] leading-tight">
              {mode === "login" && "Welcome Back"}
              {(mode === "verify_code" || mode === "second_factor") && "Verify Identity"}
              {mode === "forgot_email" && "Reset Password"}
              {mode === "forgot_reset" && "New Password"}
            </h1>

            {/* Hand-drawn Blue Wave Accent */}
            <div className="flex justify-center mt-1.5 mb-2.5" aria-hidden="true">
              <svg
                width="52"
                height="10"
                viewBox="0 0 52 10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 6.5C11 1.5 18 1.5 26 5.2C34 8.9 41 8.5 50 4"
                  stroke="#2260D8"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <p className="text-[15px] text-[#455068] font-medium">
              {mode === "login" && "Login to manage your salon"}
              {(mode === "verify_code" || mode === "second_factor") &&
                "Enter your verification code to continue"}
              {mode === "forgot_email" && "We will send a reset code to your email"}
              {mode === "forgot_reset" && "Enter the code and choose a new password"}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-2xl bg-rose-50 border border-rose-200/80 px-3.5 py-2.5 text-[13px] text-rose-700"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Info Banner */}
          {infoMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-2xl bg-blue-50 border border-blue-200/80 px-3.5 py-2.5 text-[13px] text-[#1c4ca3]">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#2261c4]" />
              <span className="leading-snug">{infoMessage}</span>
            </div>
          )}

          {/* MODE 1: STANDARD EMAIL / USERNAME & PASSWORD LOGIN */}
          {mode === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Email / Username Input */}
              <div className="relative flex items-center bg-[#e8ebf5]/85 hover:bg-[#e4e8f4] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2260d8]/30 border border-white/90 focus-within:border-[#2260d8]/50 rounded-2xl h-[54px] px-4 transition-all shadow-[inset_0_1px_2px_rgba(15,23,42,0.05)]">
                <Mail className="w-[19px] h-[19px] text-[#3a4a6a] shrink-0 stroke-[1.75]" />
                <span className="h-5 w-[1px] bg-slate-300/80 mx-3.5 shrink-0" />
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Email / Username"
                  required
                  className="w-full bg-transparent text-[15px] text-[#142344] placeholder:text-[#7c879f] focus:outline-none"
                />
              </div>

              {/* Password Input */}
              <div className="relative flex items-center bg-[#e8ebf5]/85 hover:bg-[#e4e8f4] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2260d8]/30 border border-white/90 focus-within:border-[#2260d8]/50 rounded-2xl h-[54px] px-4 transition-all shadow-[inset_0_1px_2px_rgba(15,23,42,0.05)]">
                <Lock className="w-[19px] h-[19px] text-[#3a4a6a] shrink-0 stroke-[1.75]" />
                <span className="h-5 w-[1px] bg-slate-300/80 mx-3.5 shrink-0" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-transparent text-[15px] text-[#142344] placeholder:text-[#7c879f] focus:outline-none pr-2"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="p-1 text-[#4c5b78] hover:text-[#122449] transition shrink-0"
                >
                  {showPassword ? (
                    <Eye className="w-[19px] h-[19px] stroke-[1.75]" />
                  ) : (
                    <EyeOff className="w-[19px] h-[19px] stroke-[1.75]" />
                  )}
                </button>
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between pt-1 pb-1.5">
                <label className="inline-flex items-center gap-2.5 cursor-pointer select-none group">
                  <span className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="w-[18px] h-[18px] rounded-[5px] border-[1.5px] border-[#516282] bg-white/80 peer-checked:bg-[#1f56b5] peer-checked:border-[#1f56b5] transition-colors flex items-center justify-center">
                      {rememberMe && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    </span>
                  </span>
                  <span className="text-[13.5px] font-medium text-[#2c3852] group-hover:text-[#122449] transition-colors">
                    Remember me
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    setInfoMessage(null)
                    setMode("forgot_email")
                  }}
                  className="text-[13.5px] font-medium text-[#2362d1] hover:text-[#164296] hover:underline transition"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Pill Royal Blue Gradient Login Button */}
              <button
                type="submit"
                disabled={loading || !isSignInLoaded}
                className="w-full h-[52px] rounded-full bg-gradient-to-r from-[#2364cb] via-[#1b4ca3] to-[#16336d] hover:from-[#286dd8] hover:via-[#1f55b5] hover:to-[#1a3c80] disabled:opacity-65 disabled:cursor-not-allowed text-white font-semibold text-[16px] tracking-wide shadow-[0_14px_26px_-8px_rgba(22,54,122,0.6)] hover:shadow-[0_16px_30px_-6px_rgba(22,54,122,0.7)] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-[19px] h-[19px] stroke-[2]" />
                    <span>Login</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* MODE 2: EMAIL / 2FA CODE VERIFICATION */}
          {(mode === "verify_code" || mode === "second_factor") && (
            <form onSubmit={handleVerifyCodeSubmit} className="space-y-4">
              <div className="relative flex items-center bg-[#e8ebf5]/85 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2260d8]/30 border border-white/90 focus-within:border-[#2260d8]/50 rounded-2xl h-[54px] px-4 transition-all">
                <KeyRound className="w-[19px] h-[19px] text-[#3a4a6a] shrink-0 stroke-[1.75]" />
                <span className="h-5 w-[1px] bg-slate-300/80 mx-3.5 shrink-0" />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  required
                  className="w-full bg-transparent text-[15px] tracking-[0.2em] font-semibold text-[#142344] placeholder:tracking-normal placeholder:font-normal placeholder:text-[#7c879f] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !isSignInLoaded}
                className="w-full h-[52px] rounded-full bg-gradient-to-r from-[#2364cb] via-[#1b4ca3] to-[#16336d] hover:from-[#286dd8] hover:via-[#1f55b5] hover:to-[#1a3c80] disabled:opacity-65 text-white font-semibold text-[16px] shadow-[0_14px_26px_-8px_rgba(22,54,122,0.6)] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>Verify & Login</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={resetToLogin}
                className="w-full flex items-center justify-center gap-1.5 text-[13.5px] font-medium text-[#47536e] hover:text-[#122449] pt-1 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Login</span>
              </button>
            </form>
          )}

          {/* MODE 3: FORGOT PASSWORD - STEP 1 (EMAIL) */}
          {mode === "forgot_email" && (
            <form onSubmit={handleForgotEmailSubmit} className="space-y-4">
              <div className="relative flex items-center bg-[#e8ebf5]/85 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2260d8]/30 border border-white/90 focus-within:border-[#2260d8]/50 rounded-2xl h-[54px] px-4 transition-all">
                <Mail className="w-[19px] h-[19px] text-[#3a4a6a] shrink-0 stroke-[1.75]" />
                <span className="h-5 w-[1px] bg-slate-300/80 mx-3.5 shrink-0" />
                <input
                  type="email"
                  autoComplete="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your account email"
                  required
                  className="w-full bg-transparent text-[15px] text-[#142344] placeholder:text-[#7c879f] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !isSignInLoaded}
                className="w-full h-[52px] rounded-full bg-gradient-to-r from-[#2364cb] via-[#1b4ca3] to-[#16336d] hover:from-[#286dd8] hover:via-[#1f55b5] hover:to-[#1a3c80] disabled:opacity-65 text-white font-semibold text-[16px] shadow-[0_14px_26px_-8px_rgba(22,54,122,0.6)] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sending code...</span>
                  </>
                ) : (
                  <span>Send Reset Code</span>
                )}
              </button>

              <button
                type="button"
                onClick={resetToLogin}
                className="w-full flex items-center justify-center gap-1.5 text-[13.5px] font-medium text-[#47536e] hover:text-[#122449] pt-1 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Login</span>
              </button>
            </form>
          )}

          {/* MODE 4: FORGOT PASSWORD - STEP 2 (CODE + NEW PASSWORD) */}
          {mode === "forgot_reset" && (
            <form onSubmit={handleForgotResetSubmit} className="space-y-4">
              <div className="relative flex items-center bg-[#e8ebf5]/85 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2260d8]/30 border border-white/90 focus-within:border-[#2260d8]/50 rounded-2xl h-[54px] px-4 transition-all">
                <KeyRound className="w-[19px] h-[19px] text-[#3a4a6a] shrink-0 stroke-[1.75]" />
                <span className="h-5 w-[1px] bg-slate-300/80 mx-3.5 shrink-0" />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="6-digit reset code"
                  required
                  className="w-full bg-transparent text-[15px] text-[#142344] placeholder:text-[#7c879f] focus:outline-none"
                />
              </div>

              <div className="relative flex items-center bg-[#e8ebf5]/85 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2260d8]/30 border border-white/90 focus-within:border-[#2260d8]/50 rounded-2xl h-[54px] px-4 transition-all">
                <Lock className="w-[19px] h-[19px] text-[#3a4a6a] shrink-0 stroke-[1.75]" />
                <span className="h-5 w-[1px] bg-slate-300/80 mx-3.5 shrink-0" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  required
                  className="w-full bg-transparent text-[15px] text-[#142344] placeholder:text-[#7c879f] focus:outline-none pr-2"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                  className="p-1 text-[#4c5b78] hover:text-[#122449] transition shrink-0"
                >
                  {showNewPassword ? (
                    <Eye className="w-[19px] h-[19px] stroke-[1.75]" />
                  ) : (
                    <EyeOff className="w-[19px] h-[19px] stroke-[1.75]" />
                  )}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || !isSignInLoaded}
                className="w-full h-[52px] rounded-full bg-gradient-to-r from-[#2364cb] via-[#1b4ca3] to-[#16336d] hover:from-[#286dd8] hover:via-[#1f55b5] hover:to-[#1a3c80] disabled:opacity-65 text-white font-semibold text-[16px] shadow-[0_14px_26px_-8px_rgba(22,54,122,0.6)] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Updating password...</span>
                  </>
                ) : (
                  <span>Update Password & Login</span>
                )}
              </button>

              <button
                type="button"
                onClick={resetToLogin}
                className="w-full flex items-center justify-center gap-1.5 text-[13.5px] font-medium text-[#47536e] hover:text-[#122449] pt-1 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Login</span>
              </button>
            </form>
          )}

          {/* Bottom 3-Column Feature Strip */}
          <div className="mt-7 pt-5 border-t border-slate-300/55 grid grid-cols-3 divide-x divide-slate-300/70">
            <div className="flex flex-col items-center justify-center gap-1.5 px-2 text-center">
              <CalendarDays className="w-6 h-6 text-[#1d4282] stroke-[1.7]" />
              <span className="text-[12px] font-medium text-[#2c3852]">Appointments</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-1.5 px-2 text-center">
              <Users className="w-6 h-6 text-[#1d4282] stroke-[1.7]" />
              <span className="text-[12px] font-medium text-[#2c3852]">Customers</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-1.5 px-2 text-center">
              <BarChart3 className="w-6 h-6 text-[#1d4282] stroke-[1.7]" />
              <span className="text-[12px] font-medium text-[#2c3852]">Reports</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#1e1b18]">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      }
    >
      <SalonSignInForm />
    </Suspense>
  )
}
