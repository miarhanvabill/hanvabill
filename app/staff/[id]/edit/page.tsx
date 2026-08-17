import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getStaffMember, type Staff } from "@/app/actions/staff"
import { EditStaffForm } from "./client-components"

interface EditStaffPageProps {
  params: Promise<{
    id: string
  }>
}

async function EditStaffContent({ staffId }: { staffId: string }) {
  const parsedId = Number.parseInt(staffId);

  // Check if the ID is a valid number
  if (isNaN(parsedId)) {
    console.error(`Invalid staff ID received for edit: ${staffId}`);
    notFound(); // Show 404 page if ID is not a number
  }

  const staff: Staff | null = await getStaffMember(parsedId)

  if (!staff) {
    notFound()
  }

  return <EditStaffForm staff={staff} />
}

export default async function EditStaffPage({ params }: EditStaffPageProps) {
  const { id } = await params;
  
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="h-64 bg-gray-200 rounded"></div>
                  <div className="h-48 bg-gray-200 rounded"></div>
                  <div className="h-32 bg-gray-200 rounded"></div>
                </div>
                <div className="space-y-6">
                  <div className="h-32 bg-gray-200 rounded"></div>
                  <div className="h-24 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <EditStaffContent staffId={id} />
    </Suspense>
  )
}
