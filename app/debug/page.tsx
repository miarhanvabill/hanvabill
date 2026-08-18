"use client"

import React, { useState } from "react"

export default function DebugPage() {
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const createTestCustomer = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const response = await fetch("/api/debug-create-customer", {
        method: "POST",
        credentials: "include",
      })
      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(`Failed: ${err.message || err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-xl font-bold mb-4">Debug: Insert Test Customer</h1>

      <button
        onClick={createTestCustomer}
        disabled={loading}
        className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Test Customer"}
      </button>

      {error && <p className="mt-4 text-red-600">{error}</p>}

      {result && (
        <pre className="mt-4 bg-gray-100 p-4 rounded max-h-[400px] overflow-auto text-sm">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}
