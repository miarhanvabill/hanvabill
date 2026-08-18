"use client";

import { ErrorBoundary } from "@/components/error-boundary";
import { SettingsProvider } from "@/hooks/use-settings";
import { ServiceWorkerProvider } from "@/components/service-worker-provider";
import { ConsentBanner } from "@/components/compliance/ConsentBanner";
import { OfflineBanner } from "@/components/offline-banner";
import { Toaster } from "@/components/toaster";
import { ThemeProvider } from "@/contexts/theme-context";

function handleGlobalError(error: Error, info: any) {
  console.error("Global error caught:", error, info);
}

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary onError={handleGlobalError}>
      <ThemeProvider>
        <SettingsProvider>
          <ServiceWorkerProvider>
            {children}
          </ServiceWorkerProvider>
        </SettingsProvider>
      </ThemeProvider>
      <Toaster />
      <ConsentBanner />
      <OfflineBanner />
    </ErrorBoundary>
  );
}
