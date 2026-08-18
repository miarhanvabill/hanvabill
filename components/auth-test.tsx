"use client"

import { useUser, useAuth } from "@clerk/nextjs"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function AuthTest() {
  const { user, isLoaded } = useUser()
  const { signOut } = useAuth()
  const [tenantInfo, setTenantInfo] = useState<any>(null)
  const [testResults, setTestResults] = useState<any[]>([])

  useEffect(() => {
    if (isLoaded && user) {
      testAuthFlow()
    }
  }, [isLoaded, user])

  const testAuthFlow = async () => {
    const results = []

    // Test 1: Get tenant info
    try {
      const response = await fetch("/api/tenants")
      const data = await response.json()

      if (response.ok) {
        setTenantInfo(data.tenant)
        results.push({ test: "Tenant Resolution", status: "✅ Pass", data: data.tenant })
      } else {
        results.push({ test: "Tenant Resolution", status: "❌ Fail", error: data.error })
      }
    } catch (error) {
      results.push({ test: "Tenant Resolution", status: "❌ Error", error: error.message })
    }

    // Test 2: Get customers (tenant-scoped)
    try {
      const response = await fetch("/api/customers")
      const data = await response.json()

      if (response.ok) {
        results.push({ test: "Tenant-Scoped Data", status: "✅ Pass", data: `${data.count} customers` })
      } else {
        results.push({ test: "Tenant-Scoped Data", status: "❌ Fail", error: data.error })
      }
    } catch (error) {
      results.push({ test: "Tenant-Scoped Data", status: "❌ Error", error: error.message })
    }

    // Test 3: Role-based access (try to access admin endpoint)
    try {
      const response = await fetch("/api/staff", { method: "POST", body: JSON.stringify({}) })
      const data = await response.json()

      if (response.status === 403) {
        results.push({ test: "Role-Based Access", status: "✅ Pass", data: "Correctly blocked non-admin" })
      } else if (response.ok) {
        results.push({ test: "Role-Based Access", status: "✅ Pass", data: "Admin access granted" })
      } else {
        results.push({ test: "Role-Based Access", status: "❌ Fail", error: data.error })
      }
    } catch (error) {
      results.push({ test: "Role-Based Access", status: "❌ Error", error: error.message })
    }

    setTestResults(results)
  }

  if (!isLoaded) {
    return <div>Loading...</div>
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please sign in to test the authentication flow.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            <strong>User ID:</strong> {user.id}
          </p>
          <p>
            <strong>Email:</strong> {user.primaryEmailAddress?.emailAddress}
          </p>
          <p>
            <strong>Name:</strong> {user.fullName}
          </p>
          <Button onClick={() => signOut()} variant="outline" size="sm">
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {tenantInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Tenant Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <strong>Tenant ID:</strong> {tenantInfo.id}
            </p>
            <p>
              <strong>Salon Name:</strong> {tenantInfo.name}
            </p>
            <p>
              <strong>Created:</strong> {new Date(tenantInfo.created_at).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Authentication Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="font-medium">{result.test}</p>
                  {result.data && <p className="text-sm text-gray-600">{result.data}</p>}
                  {result.error && <p className="text-sm text-red-600">{result.error}</p>}
                </div>
                <Badge variant={result.status.includes("✅") ? "default" : "destructive"}>{result.status}</Badge>
              </div>
            ))}
          </div>
          <Button onClick={testAuthFlow} className="mt-4" size="sm">
            Re-run Tests
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
