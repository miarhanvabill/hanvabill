import type { Metadata, Viewport } from "next"
import StaffShell from "@/components/staff-portal/StaffShell"

export const metadata: Metadata = {
  title: "Orvia - Staff Portal",
  description: "Mobile-first Staff Portal for Salon Appointments, Clock-in, and Commissions",
  manifest: "/staff-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Orvia",
  },
  icons: {
    icon: [
      { url: "/orvia-icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/orvia-icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/orvia-logo.png", sizes: "1024x1024", type: "image/png" },
    ],
    apple: [
      { url: "/orvia-icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/orvia-icon-512x512.png", sizes: "512x512", type: "image/png" },
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
