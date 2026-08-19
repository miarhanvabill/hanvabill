import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Sidebar from "@/components/sidebar"
import { Header } from "@/components/header"
import { ClerkProvider } from "@clerk/nextjs"
import { Geist, Geist_Mono } from "next/font/google"
import ClientLayoutWrapper from "@/components/ClientLayoutWrapper"
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

            <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
              <ErrorBoundary
                fallback={
                  <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex items-center justify-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Sidebar unavailable</p>
                  </div>
                }
              >
                <Sidebar />
              </ErrorBoundary>

              <div className="flex-1 flex flex-col">
                <ErrorBoundary
                  fallback={
                    <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Header unavailable</p>
                    </div>
                  }
                >
                  <Header />
                </ErrorBoundary>

                <main className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
                  <ErrorBoundary>{children}</ErrorBoundary>
                </main>
              </div>
            </div>
          </ClientLayoutWrapper>
        </body>
      </html>
    </ClerkProvider>
  )
}
