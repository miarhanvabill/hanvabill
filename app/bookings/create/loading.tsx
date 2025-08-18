import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function CreateBookingLoading() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse mb-2 w-64"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-48"></div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded animate-pulse w-32"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <div className="h-5 bg-gray-200 rounded animate-pulse w-40"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>

            {/* Service Information */}
            <div className="space-y-4">
              <div className="h-5 bg-gray-200 rounded animate-pulse w-36"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>

            {/* Booking Details */}
            <div className="space-y-4">
              <div className="h-5 bg-gray-200 rounded animate-pulse w-32"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
            </div>

            <div className="flex gap-4">
              <div className="h-10 bg-gray-200 rounded animate-pulse flex-1"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse w-20"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
