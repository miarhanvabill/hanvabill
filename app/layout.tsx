export const dynamic = 'force-dynamic';
import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ClerkProvider } from "@clerk/nextjs"
import { Geist, Geist_Mono } from "next/font/google"
import ClientLayoutWrapper from "@/components/ClientLayoutWrapper"
import AppShell from "@/components/AppShell"
import { ErrorBoundary } from "@/components/error-boundary"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })
const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Hanva Billing",
  description: "Complete salon management solution",
    generator: 'v0.app'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/"
      afterSignUpUrl="/onboarding"
    >
      <html lang="en">
        <body className={`${inter.className} ${geistSans.variable} ${geistMono.variable}`}>
          <ClientLayoutWrapper>

            <AppShell>{children}</AppShell>
          </ClientLayoutWrapper>
        </body>
      </html>
    </ClerkProvider>
  )
}
