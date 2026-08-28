// app/customers/[id]/page.tsx
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getCustomer } from "@/app/actions/customers"
import { getBookingsByCustomerId, getInvoicesByCustomerId } from "@/app/actions/bookings"
import { getActiveCustomerMembership } from "@/app/actions/memberships"
import { getStaff } from "@/app/actions/staff"
import { getCustomerPackages } from "@/app/actions/customer-packages"
import { CustomerProfileDisplay } from "@/components/customer-profile-display"

async function CustomerDetailsContent({ id }: { id: string }) {
  try {
    const customer = await getCustomer(id)

    if (!customer) {
      notFound()
    }

    // Fetch bookings, invoices, staff, and active membership in parallel for better performance
    const [bookings, invoices, activeMembership, staffList, packages] = await Promise.all([
      getBookingsByCustomerId(id),
      getInvoicesByCustomerId(id),
      getActiveCustomerMembership(Number(id)),
      getStaff(),
      getCustomerPackages(Number(id))
    ])

    // Serialize all data passing to the Client Component to avoid Date serialization errors
    const serializedCustomer = JSON.parse(JSON.stringify(customer))
    const serializedBookings = JSON.parse(JSON.stringify(bookings))
    const serializedInvoices = JSON.parse(JSON.stringify(invoices))
    const serializedMembership = activeMembership ? JSON.parse(JSON.stringify(activeMembership)) : null
    const serializedStaffList = JSON.parse(JSON.stringify(staffList))
    const serializedPackages = JSON.parse(JSON.stringify(packages))

    return <CustomerProfileDisplay 
      customer={serializedCustomer} 
      bookings={serializedBookings} 
      invoices={serializedInvoices} 
      activeMembership={serializedMembership} 
      staffList={serializedStaffList}
      packages={serializedPackages}
    />
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
