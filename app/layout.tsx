import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Sidebar from "@/components/sidebar"
import { Header } from "@/components/header"
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  OrganizationSwitcher
} from "@clerk/nextjs"
import { Geist, Geist_Mono } from "next/font/google"
import ClientLayoutWrapper from "@/components/ClientLayoutWrapper"
import { ErrorBoundary } from "@/components/error-boundary"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })
const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Glamour Salon Management System",
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
            <header className="flex justify-between items-center p-4 gap-4 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <SignedIn>
                  <OrganizationSwitcher 
                    afterSelectOrganizationUrl="/dashboard" 
                    appearance={{
                      elements: {
                        organizationSwitcherTrigger: "flex gap-2 items-center px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                      }
                    }}
                  />
                  {/* 👉 Dashboard Link */}
                  <SignedIn>
                    <a 
                      href="/dashboard/tenants" 
                      className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-[#6c47ff] dark:hover:text-[#8c67ff] transition-colors px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Tenant Dashboard
                    </a>
                  </SignedIn>
                </SignedIn>
              </div>
             
              <div className="flex items-center gap-4">
                <SignedOut>
                  <SignInButton />
                  <SignUpButton>
                    <button className="bg-[#6c47ff] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
                      Sign Up
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
              </div>
            </header>

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

              <div className="flex-1 flex flex-col ml-64">
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
