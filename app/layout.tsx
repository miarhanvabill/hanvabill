import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Sidebar from "@/components/sidebar"
import { Header } from "@/components/header"
import { AuthProvider } from "@/contexts/auth-context"
import { ErrorBoundary } from "@/components/error-boundary"
import { Toaster } from "@/components/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Glamour Salon Management System",
  description: "Complete salon management solution",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <AuthProvider>
            <div className="flex h-screen bg-gray-50">
              <ErrorBoundary
                fallback={
                  <div className="w-64 bg-white border-r border-gray-200 flex items-center justify-center">
                    <p className="text-sm text-gray-500">Sidebar unavailable</p>
                  </div>
                }
              >
                <Sidebar />
              </ErrorBoundary>

              <div className="flex-1 flex flex-col ml-64">
                <ErrorBoundary
                  fallback={
                    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-center">
                      <p className="text-sm text-gray-500">Header unavailable</p>
                    </div>
                  }
                >
                  <Header />
                </ErrorBoundary>

                <main className="flex-1 overflow-auto p-6 bg-gray-50">
                  <ErrorBoundary>{children}</ErrorBoundary>
                </main>
              </div>
            </div>
            <Toaster />
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
