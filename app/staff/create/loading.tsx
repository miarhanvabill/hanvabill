export default function CreateStaffLoading() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="h-10 w-24 bg-gray-200 rounded"></div>
            <div>
              <div className="h-8 w-56 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-40 bg-gray-200 rounded"></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information Card */}
              <div className="bg-white rounded-lg border p-6">
                <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                  <div>
                    <div className="h-4 w-16 bg-gray-200 rounded mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                  <div>
                    <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                  <div>
                    <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="h-4 w-16 bg-gray-200 rounded mb-2"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              </div>

              {/* Employment Details Card */}
              <div className="bg-white rounded-lg border p-6">
                <div className="h-6 w-36 bg-gray-200 rounded mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="h-4 w-16 bg-gray-200 rounded mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                  <div>
                    <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                  <div>
                    <div className="h-4 w-18 bg-gray-200 rounded mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                  <div>
                    <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                    <div className="h-6 w-32 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>

              {/* Compensation Card */}
              <div className="bg-white rounded-lg border p-6">
                <div className="h-6 w-28 bg-gray-200 rounded mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                  <div>
                    <div className="h-4 w-28 bg-gray-200 rounded mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>

              {/* Specialties Card */}
              <div className="bg-white rounded-lg border p-6">
                <div className="h-6 w-20 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-4">
                  <div>
                    <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="h-8 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="h-4 w-36 bg-gray-200 rounded mb-2"></div>
                    <div className="flex gap-2">
                      <div className="h-10 flex-1 bg-gray-200 rounded"></div>
                      <div className="h-10 w-10 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes Card */}
              <div className="bg-white rounded-lg border p-6">
                <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
                <div>
                  <div className="h-4 w-12 bg-gray-200 rounded mb-2"></div>
                  <div className="h-24 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Actions Card */}
              <div className="bg-white rounded-lg border p-6">
                <div className="h-6 w-16 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                  <div className="h-10 bg-gray-200 rounded"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              </div>

              {/* Preview Card */}
              <div className="bg-white rounded-lg border p-6">
                <div className="h-6 w-16 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <div className="h-4 w-12 bg-gray-200 rounded"></div>
                    <div className="h-4 w-16 bg-gray-200 rounded"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="h-4 w-16 bg-gray-200 rounded"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="h-4 w-20 bg-gray-200 rounded"></div>
                    <div className="h-4 w-16 bg-gray-200 rounded"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="h-4 w-12 bg-gray-200 rounded"></div>
                    <div className="h-4 w-16 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
