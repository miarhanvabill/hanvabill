export default function InvoicesLoading() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-64"></div>
        </div>
      </div>

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards Loading */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border p-6">
                <div className="animate-pulse">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                    </div>
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Controls Loading */}
          <div className="bg-white rounded-lg border p-6">
            <div className="animate-pulse">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-10 bg-gray-200 rounded flex-1 max-w-md"></div>
                  <div className="h-10 bg-gray-200 rounded w-40"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-10 bg-gray-200 rounded w-32"></div>
                  <div className="h-10 bg-gray-200 rounded w-28"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Table Loading */}
          <div className="bg-white rounded-lg border">
            <div className="p-6 border-b">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
            <div className="p-0">
              <div className="animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center p-4 border-b last:border-b-0">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </div>
                    <div className="w-20 h-4 bg-gray-200 rounded"></div>
                    <div className="w-20 h-4 bg-gray-200 rounded ml-4"></div>
                    <div className="w-16 h-6 bg-gray-200 rounded ml-4"></div>
                    <div className="flex gap-2 ml-4">
                      <div className="w-8 h-8 bg-gray-200 rounded"></div>
                      <div className="w-8 h-8 bg-gray-200 rounded"></div>
                      <div className="w-8 h-8 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
