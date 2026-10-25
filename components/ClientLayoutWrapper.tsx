"use client";

import { usePathname } from "next/navigation";
import { ErrorBoundary } from "@/components/error-boundary";
import { SettingsProvider } from "@/hooks/use-settings";
import { ServiceWorkerProvider } from "@/components/service-worker-provider";
import { ConsentBanner } from "@/components/compliance/ConsentBanner";
import { OfflineBanner } from "@/components/offline-banner";
import { Toaster } from "@/components/toaster";
import { NotificationSoundProvider } from "@/components/notification-sound-provider";
import { ThemeProvider } from "@/contexts/theme-context";
import { PermissionsProvider } from "@/hooks/use-permissions";

function handleGlobalError(error: Error, info: any) {
  console.error("Global error caught:", error, info);
}

export default function ClientLayoutWrapper({ 
  children,
  isStaffPortal = false,
}: { 
  children: React.ReactNode 
  isStaffPortal?: boolean
}) {
  const pathname = usePathname();
  const isStaff = 
    isStaffPortal || 
    pathname?.startsWith("/staff-portal") ||
    (typeof window !== "undefined" && 
      (window.location.hostname.startsWith("staff.") || 
       window.location.hostname.includes("staff.biz.hanva.in")));

  if (isStaff) {
    return (
      <ErrorBoundary onError={handleGlobalError}>
        <ServiceWorkerProvider>
          {children}
        </ServiceWorkerProvider>
        <Toaster />
        <NotificationSoundProvider />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary onError={handleGlobalError}>
      <ThemeProvider>
        <PermissionsProvider>
          <SettingsProvider>
            <ServiceWorkerProvider>
              {children}
            </ServiceWorkerProvider>
          </SettingsProvider>
        </PermissionsProvider>
      </ThemeProvider>
      <Toaster />
      <NotificationSoundProvider />
      <ConsentBanner />
      <OfflineBanner />
    </ErrorBoundary>
  );
}
