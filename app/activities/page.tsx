"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { Header } from "@/components/header"
import { BookingSalesActivityTable } from "@/components/booking-sales-activity-table"
import { useRouter } from "next/navigation"

export default function ActivitiesPage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const router = useRouter()
  const [tenantId, setTenantId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      router.push("/sign-in") // redirect if not signed in
      return
    }

    // 🔑 Assuming tenant_id is stored in user.publicMetadata (from Clerk)
    const tid = user?.publicMetadata?.tenant_id as string | undefined
    if (!tid) {
      router.push("/onboarding") // redirect to onboarding if tenant missing
    } else {
      setTenantId(tid)
    }
  }, [isLoaded, isSignedIn, user, router])

  if (!isLoaded || !tenantId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Loading activities...
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Booking & Sales Activity"
        subtitle="Real-time view of all bookings and sales with staff assignments and completion tracking"
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* Pass tenantId down to filter only tenant-specific data */}
          <BookingSalesActivityTable tenantId={tenantId} />
        </div>
      </main>
    </div>
  )
}
