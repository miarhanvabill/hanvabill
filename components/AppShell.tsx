"use client"
import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Sidebar from "@/components/sidebar"
import { Header } from "@/components/header"
import { ErrorBoundary } from "@/components/error-boundary"
import { usePermissions } from "@/hooks/use-permissions"
import { ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { canAccessRoute, isLoading } = usePermissions();

  // Hide sidebar/header on public invoice and auth pages
  const isPublic = pathname?.startsWith('/inv/') || pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up') || pathname?.startsWith('/terms-of-service') || pathname?.startsWith('/privacy-policy') || pathname?.startsWith('/unauthorized-sign-in') || pathname?.startsWith('/book/');
  
  if (isPublic) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }

  const isAllowed = canAccessRoute(pathname || "");
  
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <div className="print:hidden h-full">
        <ErrorBoundary
          fallback={
            <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex items-center justify-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Sidebar unavailable</p>
            </div>
          }
        >
          <Sidebar />
        </ErrorBoundary>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="print:hidden w-full">
          <ErrorBoundary
            fallback={
              <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Header unavailable</p>
              </div>
            }
          >
            <Header />
          </ErrorBoundary>
        </div>
        <main className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900 print:bg-white print:p-0 print:overflow-visible">
          <ErrorBoundary
            fallback={
              <div className="p-8 text-center">
                <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
                <p className="text-gray-500">The page content failed to load.</p>
              </div>
            }
          >
            {!isLoading && !isAllowed ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm max-w-xl mx-auto my-12">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Restricted</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
                  You do not have permission to view or manage this section. Please contact your salon administrator if you believe this is an error.
                </p>
                <Button asChild className="bg-slate-900 hover:bg-slate-800 text-white">
                  <Link href="/">Return to Dashboard</Link>
                </Button>
              </div>
            ) : (
              children
            )}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
