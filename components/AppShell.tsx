"use client"
import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useUser } from '@clerk/nextjs';
import Sidebar from "@/components/sidebar"
import { Header } from "@/components/header"
import { ErrorBoundary } from "@/components/error-boundary"
import { usePermissions } from "@/hooks/use-permissions"
import { ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import LoginToDashboardTransition, { type LoginTransitionPhase } from "@/components/auth/LoginToDashboardTransition"

const LOGIN_TRANSITION_KEY = "hanva_login_pending";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { canAccessRoute, isLoading, isAdmin } = usePermissions();

  const wasOnAuthRouteRef = useRef(false);
  const revealScheduledRef = useRef(false);
  const [transitionPhase, setTransitionPhase] = useState<LoginTransitionPhase>("idle");
  const [animateDashboardIn, setAnimateDashboardIn] = useState(false);

  // Check if current route belongs to Staff Portal (isolated from admin dashboard)
  const isStaffRoute =
    pathname?.startsWith('/staff-portal') ||
    (typeof window !== 'undefined' &&
      (window.location.hostname.startsWith('staff.') ||
        window.location.hostname.includes('staff.biz.hanva.in')));

  const isAuthRoute =
    pathname?.startsWith('/sign-in') ||
    pathname?.startsWith('/sign-up') ||
    pathname === '/login';

  // Hide sidebar/header on public invoice, customer booking, and auth pages
  const isPublic = 
    isStaffRoute ||
    isAuthRoute ||
    pathname?.startsWith('/inv/') || 
    pathname?.startsWith('/terms-of-service') || 
    pathname?.startsWith('/privacy-policy') || 
    pathname?.startsWith('/unauthorized-sign-in') || 
    pathname?.startsWith('/book/') ||
    pathname === '/book' ||
    pathname?.startsWith('/bookings/customer-schedule');

  // Record when user visits login / sign-up so we can play the luxury transition upon entering dashboard
  useEffect(() => {
    if (isAuthRoute && !isSignedIn) {
      wasOnAuthRouteRef.current = true;
      revealScheduledRef.current = false;
      try {
        sessionStorage.setItem(LOGIN_TRANSITION_KEY, String(Date.now()));
      } catch {}
    }
  }, [isAuthRoute, isSignedIn]);

  // Orchestrate smooth Login -> Dashboard transition across route change
  useEffect(() => {
    if (!isAuthLoaded || !isSignedIn || isStaffRoute) return;

    let hasPendingFlag = false;
    try {
      const raw = sessionStorage.getItem(LOGIN_TRANSITION_KEY);
      if (raw) {
        const ageMs = Date.now() - Number(raw);
        if (!Number.isNaN(ageMs) && ageMs >= 0 && ageMs < 3 * 60 * 1000) {
          hasPendingFlag = true;
        } else {
          sessionStorage.removeItem(LOGIN_TRANSITION_KEY);
        }
      }
    } catch {}

    const comingFromLogin = wasOnAuthRouteRef.current || hasPendingFlag;

    // 1. Trigger active transition overlay as soon as sign-in completes
    if (comingFromLogin && transitionPhase === "idle") {
      setTransitionPhase("active");
      return;
    }

    // 2. Once landed on authenticated dashboard (!isPublic), wait briefly then reveal smoothly
    if (!isPublic && transitionPhase === "active" && !revealScheduledRef.current) {
      revealScheduledRef.current = true;
      wasOnAuthRouteRef.current = false;
      try {
        sessionStorage.removeItem(LOGIN_TRANSITION_KEY);
      } catch {}

      const revealTimer = setTimeout(() => {
        setAnimateDashboardIn(true);
        setTransitionPhase("revealing");
      }, 820);

      return () => clearTimeout(revealTimer);
    }
  }, [isAuthLoaded, isSignedIn, isPublic, isStaffRoute, transitionPhase]);

  // Finish fade-out smoothly once revealing begins
  useEffect(() => {
    if (transitionPhase !== "revealing") return;
    const doneTimer = setTimeout(() => {
      setTransitionPhase("idle");
      revealScheduledRef.current = false;
    }, 540);
    return () => clearTimeout(doneTimer);
  }, [transitionPhase]);

  // Safety valve: never allow the transition overlay to remain stuck
  useEffect(() => {
    if (transitionPhase !== "active") return;
    const safetyTimer = setTimeout(() => {
      wasOnAuthRouteRef.current = false;
      try {
        sessionStorage.removeItem(LOGIN_TRANSITION_KEY);
      } catch {}
      setAnimateDashboardIn(true);
      setTransitionPhase("revealing");
    }, 3000);
    return () => clearTimeout(safetyTimer);
  }, [transitionPhase]);

  // If user is definitely not logged in on a protected salon route, redirect directly to login
  useEffect(() => {
    if (isAuthLoaded && !isSignedIn && !isPublic) {
      const currentUrl = typeof window !== 'undefined' ? window.location.href : (pathname || '/');
      router.replace(`/sign-in?redirect_url=${encodeURIComponent(currentUrl)}`);
    }
  }, [isAuthLoaded, isSignedIn, isPublic, pathname, router]);

  const userName = user?.firstName || user?.fullName || undefined;

  if (isStaffRoute) {
    return <div className="min-h-screen bg-slate-50 antialiased selection:bg-slate-900 selection:text-white">{children}</div>;
  }

  if (isPublic) {
    return (
      <>
        <LoginToDashboardTransition phase={transitionPhase} userName={userName} />
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </>
    );
  }

  // If not logged in on a protected page, show a redirecting indicator instead of flashing Access Restricted
  if (isAuthLoaded && !isSignedIn) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  // Admins always have access, loading states never block, otherwise check permissions for signed-in staff
  const isRestricted = isAuthLoaded && isSignedIn && !isLoading && !isAdmin && !canAccessRoute(pathname || "");
  
  return (
    <>
      <LoginToDashboardTransition phase={transitionPhase} userName={userName} />
      <div className={`flex h-screen bg-gray-50 dark:bg-gray-900 ${animateDashboardIn ? "animate-hanva-dashboard-enter" : ""}`}>
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
            {isRestricted ? (
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
    </>
  );
}
