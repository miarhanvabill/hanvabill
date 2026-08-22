// app/customers/[id]/page.tsx
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getCustomer } from "@/app/actions/customers"
import { getBookingsByCustomerId, getInvoicesByCustomerId } from "@/app/actions/bookings"
import { getActiveCustomerMembership } from "@/app/actions/memberships"
import { CustomerProfileDisplay } from "@/components/customer-profile-display"

async function CustomerDetailsContent({ id }: { id: string }) {
  try {
    const customer = await getCustomer(id)

    if (!customer) {
      notFound()
    }

    // Fetch bookings, invoices, and active membership in parallel for better performance
    const [bookings, invoices, activeMembership] = await Promise.all([
      getBookingsByCustomerId(id),
      getInvoicesByCustomerId(id),
      getActiveCustomerMembership(Number(id))
    ])

    return <CustomerProfileDisplay customer={customer} bookings={bookings} invoices={invoices} activeMembership={activeMembership} />
  } catch (error) {
    console.error("Error loading customer details:", error)
    notFound()
  }
}

export default async function CustomerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading customer details...</p>
          </div>
        </div>
      }
    >
      <CustomerDetailsContent id={resolvedParams.id} />
    </Suspense>
  )
}
