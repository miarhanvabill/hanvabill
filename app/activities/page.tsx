"use client"

import { PageHeader } from "@/components/page-header"
import { BookingSalesActivityTable } from "@/components/booking-sales-activity-table"

export default function ActivitiesPage() {
  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Booking & Sales Activity"
        subtitle="Real-time view of all bookings and sales with staff assignments and completion tracking"
      />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <BookingSalesActivityTable />
        </div>
      </main>
    </div>
  )
}
