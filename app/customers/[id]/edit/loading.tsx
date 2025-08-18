// app/customers/[id]/edit/loading.tsx
export default function Loading() {
  return <div className="p-6">Loading…</div>
}

// app/customers/[id]/edit/error.tsx
"use client"
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6">
      <p className="text-red-600">Something went wrong: {error.message}</p>
      <button onClick={reset} className="mt-2 underline">Try again</button>
    </div>
  )
}
