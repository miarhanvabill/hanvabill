// app/customers/[id]/page.tsx
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getCustomer } from "@/app/actions/customers"
import { getBookingsByCustomerId, getInvoicesByCustomerId } from "@/app/actions/bookings"
import { CustomerProfileDisplay } from "@/components/customer-profile-display" // Import the new component

async function CustomerDetailsContent({ id }: { id: string }) {
  const customer = await getCustomer(id)

  if (!customer) {
    notFound()
  }

  const bookings = await getBookingsByCustomerId(id)
  const invoices = await getInvoicesByCustomerId(id)

  return <CustomerProfileDisplay customer={customer} bookings={bookings} invoices={invoices} />
}

export default async function CustomerDetailsPage({ params }: { params: { id: string } }) {
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
      <CustomerDetailsContent id={params.id} />
    </Suspense>
  )
}
