import { PageHeader } from "@/components/page-header"

export default function VendorsLoading() {
  return (
    <div className="flex-1 flex flex-col">
      <PageHeader title="Vendors" subtitle="Loading vendors data..." />
      <div className="flex-1 p-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}
