import type { Metadata, Viewport } from "next"
import StaffShell from "@/components/staff-portal/StaffShell"

export const metadata: Metadata = {
  title: "Hanva Staff Portal",
  description: "Mobile-first Staff Portal for Salon Appointments, Clock-in, and Commissions",
  manifest: "/staff-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hanva Staff",
  },
}

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function StaffPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-900 flex justify-center text-slate-800">
      <StaffShell>{children}</StaffShell>
    </div>
  )
}
