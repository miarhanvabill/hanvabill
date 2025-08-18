import { Header } from "@/components/header"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function ResourceAvailabilityLoading() {
  return (
    <div className="flex-1 flex flex-col">
      <Header title="Resource Availability" subtitle="Manage equipment, rooms, and station availability" />

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content Skeleton */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex gap-4">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-48" />
                  </div>
                  <Skeleton className="h-10 w-32" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <Skeleton className="w-4 h-4" />
                            <div className="space-y-2">
                              <Skeleton className="h-6 w-32" />
                              <Skeleton className="h-4 w-16" />
                            </div>
                          </div>
                          <Skeleton className="h-6 w-20" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <Skeleton className="h-4 w-full" />
                          <div className="space-y-2">
                            {[...Array(3)].map((_, j) => (
                              <div key={j} className="flex justify-between">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-3 w-16" />
                              </div>
                            ))}
                          </div>
                          <Skeleton className="h-6 w-32" />
                          <div className="flex gap-2">
                            <Skeleton className="h-8 flex-1" />
                            <Skeleton className="h-8 w-8" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
