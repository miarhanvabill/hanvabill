import { Header } from "@/components/header"

export default function GiftCardsLoading() {
  return (
    <div className="flex-1 flex flex-col">
      <Header title="Gift Cards" subtitle="Loading gift cards data..." />
      <div className="flex-1 p-6 bg-gray-50">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}
