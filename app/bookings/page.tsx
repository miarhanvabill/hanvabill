import { Suspense } from "react"
import { getBookingsPageData } from "@/app/actions/bookings-paginated"
import BookingsClient from "./bookings-client"

export const dynamic = "force-dynamic"

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }> | { [key: string]: string | undefined }
}) {
  const resolvedParams =
    searchParams && typeof (searchParams as any).then === "function"
      ? await searchParams
      : ((searchParams as any) || {})

  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString("en-CA")
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString("en-CA")

  const startDate = resolvedParams.startDate || currentMonthStart
  const endDate = resolvedParams.endDate || currentMonthEnd

  const initialData = await getBookingsPageData({
    startDate,
    endDate,
    status: resolvedParams.status,
    search: resolvedParams.search,
    offset: 0,
    limit: 50,
  })

  return (
    <Suspense>
      <BookingsClient initialData={initialData} searchParams={resolvedParams} />
    </Suspense>
  )
}
