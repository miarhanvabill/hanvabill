"use client"
import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from "@/components/sidebar"
import { Header } from "@/components/header"
import { ErrorBoundary } from "@/components/error-boundary"

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Hide sidebar/header on public invoice and auth pages
  const isPublic = pathname?.startsWith('/inv/') || pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up');
  
  if (isPublic) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }
  
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
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
