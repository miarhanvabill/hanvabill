export default function AnalyticsLoading() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b bg-white p-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
      </div>

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Summary cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-6 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                    <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
                  </div>
                  <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Controls skeleton */}
          <div className="bg-white rounded-lg p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="h-10 bg-gray-200 rounded w-40 animate-pulse"></div>
              <div className="flex items-center gap-2">
                <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Charts skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 h-80 animate-pulse shadow-xs"></div>
            <div className="bg-white rounded-lg p-6 h-80 animate-pulse shadow-xs"></div>
          </div>
        </div>
      </main>
    </div>
  )
}
