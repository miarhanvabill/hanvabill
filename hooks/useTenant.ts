// hooks/useTenant.ts
"use client";

import useSWR from "swr";

// 🔥 Critical: Include credentials to send Clerk session cookies
const fetcher = (url: string) =>
  fetch(url, {
    method: "GET",
    credentials: "include" as const, // TypeScript-safe
  }).then((res) => {
    if (!res.ok) {
      throw new Error(`Failed to fetch tenant: ${res.status} ${res.statusText}`);
    }
    return res.json();
  });

export function useTenant() {
  const { data, error, isLoading } = useSWR("/api/tenants", fetcher, {
    revalidateOnFocus: true,
    shouldRetryOnError: true,
    dedupingInterval: 2000,
  });

  return {
    tenant: data?.success && data.tenant ? data.tenant : null,
    userRole: data?.userRole || null,
    tenantId: data?.tenant?.id || null,
    isLoading,
    isError: !!error,
    error: error?.message || null,
  };
}
