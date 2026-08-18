// app/dashboard/tenants/TenantDashboard.tsx
"use client"

import { useState } from "react"

export default function TenantDashboard({
  summary,
  health,
  growth,
}: {
  summary: { totalCustomers: number; totalRevenue: number }
  health: any
  growth: { newToday: number; newThisMonth: number }
}) {
  const [testTenantId, setTestTenantId] = useState("")
  const [testResult, setTestResult] = useState<any>(null)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Tenant Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold">Total Customers</h2>
          <p className="text-3xl font-bold">{summary.totalCustomers}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold">Total Revenue</h2>
          <p className="text-3xl font-bold">${summary.totalRevenue.toFixed(2)}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold">New Today</h2>
          <p className="text-3xl font-bold">{growth.newToday}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold">New This Month</h2>
          <p className="text-3xl font-bold">{growth.newThisMonth}</p>
        </div>
      </div>

      {/* Health Check */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-2xl font-bold mb-4">Tenant Health</h2>
        <ul className="space-y-2">
          <li>✅ Tenant Exists: <strong>{health.tenantExists ? "Yes" : "No"}</strong></li>
          <li>✅ RLS Enabled: <strong>{health.rlsEnabled ? "Yes" : "No"}</strong></li>
          <li>⚠️ Schema Mismatches: <strong>{health.schemaMismatch}</strong> tables (from CSV)</li>
          <li>🔧 Current Tenant: <code>{health.currentSetting}</code></li>
          <li>🔗 Connection: <strong>{health.connectionType}</strong></li>
        </ul>
      </div>

      {/* Debug: Test Tenant Context */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-2xl font-bold mb-4">Debug: Test Tenant Context</h2>
        <p className="mb-4 text-gray-600">
          Test if <code>SET app.current_tenant</code> works.
        </p>
        <input
          type="text"
          value={testTenantId}
          onChange={(e) => setTestTenantId(e.target.value)}
          placeholder="Enter tenant ID (e.g., org_abc123)"
          className="border p-2 rounded mr-2"
        />
        <button
          onClick={async () => {
            const res = await fetch("/api/debug/test-tenant", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tenantId: testTenantId }),
            })
            const data = await res.json()
            setTestResult(data)
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Test
        </button>

        {testResult && (
          <pre className="mt-4 p-4 bg-gray-100 rounded text-sm">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        )}
      </div>

      {/* Schema Mismatch Table (from CSV) */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Schema Mismatches</h2>
        <p className="mb-4 text-gray-600">
          Found from your diagnostic CSV — <strong>{health.schemaMismatch}</strong> tables have <code>tenant_id TEXT</code> vs <code>tenants.id INTEGER</code>
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-4 py-2">Table</th>
                <th className="border px-4 py-2">tenant_id Type</th>
                <th className="border px-4 py-2">tenants.id Type</th>
                <th className="border px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                "customers", "bookings", "invoices", "staff", "products", "coupons",
                "gift_cards", "wallet_transactions", "payments", "services"
              ].map((table) => (
                <tr key={table}>
                  <td className="border px-4 py-2 font-mono">{table}</td>
                  <td className="border px-4 py-2">TEXT/VARCHAR</td>
                  <td className="border px-4 py-2">INTEGER</td>
                  <td className="border px-4 py-2 text-orange-600">Mismatch</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
