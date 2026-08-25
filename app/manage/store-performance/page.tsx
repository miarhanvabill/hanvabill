import React from "react"
import { getStorePerformanceData } from "@/app/actions/store-performance"
import DashboardClient from "./DashboardClient"

export const metadata = {
  title: "Store Performance | Analytics Dashboard",
  description: "Comprehensive analytics and performance metrics for the store.",
}

export default async function StorePerformancePage() {
  const result = await getStorePerformanceData()
  
  if (!result.success || !result.data) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Failed to load store performance data. Please try again later.</p>
      </div>
    )
  }

  return <DashboardClient initialData={result.data} />
}
