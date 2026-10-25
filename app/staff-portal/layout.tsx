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
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/logo-icon.png", sizes: "285x286", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
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
