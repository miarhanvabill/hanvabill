export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Skeleton */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-28 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Steps Skeleton */}
      <div className="bg-white border-b py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 w-28 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <div className="bg-white rounded-xl border p-8 space-y-6 animate-pulse">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto" />
          <div className="h-6 w-48 bg-gray-200 rounded mx-auto" />
          <div className="h-4 w-72 bg-gray-200 rounded mx-auto" />
          <div className="h-10 w-36 bg-gray-200 rounded-lg mx-auto" />
        </div>
      </div>
    </div>
  )
}
