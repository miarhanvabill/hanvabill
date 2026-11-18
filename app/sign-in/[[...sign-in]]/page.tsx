import { SignIn } from "@clerk/nextjs"
import { CalendarDays, Users, BarChart3 } from "lucide-react"

export default function SignInPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#1e1b18] flex flex-col lg:flex-row items-center justify-center lg:justify-end px-4 py-8 sm:px-6 lg:px-12 xl:px-20">
      {/* Full-bleed Luxury Salon Reception Background */}
      <div
        className="absolute inset-0 bg-cover bg-no-repeat bg-[position:22%_center] lg:bg-center animate-hanva-login-bg"
        style={{
          backgroundImage: "url('/login-salon-bg.jpg')",
        }}
        aria-hidden="true"
      />

      {/* Subtle mobile readability veil (Desktop shows full bright illuminated wall) */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-slate-950/35 via-slate-950/20 to-slate-950/40 lg:bg-none pointer-events-none"
        aria-hidden="true"
      />

      {/* Compact Brand Header for Mobile / Small Tablets */}
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

      {/* Floating Frosted Glass Login Card */}
      <div className="relative z-10 w-full max-w-[430px] sm:max-w-[448px] lg:mr-[2%] xl:mr-[4%] animate-hanva-login-card">
        <div className="bg-[#f4f5fb]/[0.94] backdrop-blur-xl rounded-[32px] shadow-[0_28px_75px_-12px_rgba(12,22,48,0.42)] border border-white/80 px-7 py-8 sm:px-9 sm:py-9">
          {/* Eyebrow Header with Side Dividers */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="h-[1px] flex-1 bg-slate-300/80" />
            <span className="text-[11px] font-semibold tracking-[0.2em] text-[#47536e] uppercase whitespace-nowrap">
              Salon Management System
            </span>
            <span className="h-[1px] flex-1 bg-slate-300/80" />
          </div>

          {/* Card Title & Signature Blue Wave */}
          <div className="text-center mb-5">
            <h1 className="text-[30px] sm:text-[32px] font-bold tracking-tight text-[#122449] leading-tight">
              Welcome Back
            </h1>

            {/* Hand-drawn Blue Wave Accent */}
            <div className="flex justify-center mt-1.5 mb-2" aria-hidden="true">
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
              Login to manage your salon
            </p>
          </div>

          {/* Native Clerk SignIn (Preserves 100% of Clerk features: OAuth/Google, Email/Phone/Username, Password, OTP, Passkeys, 2FA, Forgot Password, Sign Up) */}
          <div className="hanva-clerk-signin w-full">
            <SignIn
              appearance={{
                variables: {
                  colorPrimary: "#1d4ea8",
                  colorText: "#122449",
                  colorTextSecondary: "#455068",
                  colorBackground: "transparent",
                  colorInputBackground: "#e8ebf5",
                  colorInputText: "#142344",
                  borderRadius: "1rem",
                },
                elements: {
                  rootBox: "w-full",
                  cardBox: "w-full shadow-none border-0 bg-transparent",
                  card: "w-full shadow-none border-0 bg-transparent p-0",
                  formButtonPrimary:
                    "normal-case font-semibold text-[15px] rounded-full border-0",
                  footer: "bg-transparent shadow-none border-0",
                  footerAction: "bg-transparent",
                },
              }}
            />
          </div>

          {/* Bottom 3-Column Feature Strip */}
          <div className="mt-5 pt-5 border-t border-slate-300/55 grid grid-cols-3 divide-x divide-slate-300/70">
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
