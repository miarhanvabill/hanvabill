"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"

export default function TestFormsPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])

  const testInventoryForm = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test Product",
          category: "hair-care",
          brand: "Test Brand",
          sku: "TEST-001",
          quantity: "10",
          unit: "bottle",
          costPrice: "100",
          sellingPrice: "150",
          supplier: "Test Supplier",
          reorderLevel: "5",
          location: "Storage A",
          description: "Test product for form validation",
        }),
      })

      const result = await response.json()
      setResults((prev) => [...prev, { test: "Inventory Form", success: result.success, data: result }])

      if (result.success) {
        toast({ title: "Success", description: "Inventory form test passed!" })
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
    } catch (error) {
      setResults((prev) => [...prev, { test: "Inventory Form", success: false, error: error.message }])
      toast({ title: "Error", description: "Inventory form test failed", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const testCampaignForm = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test Campaign",
          type: "email",
          subject: "Test Subject",
          message: "This is a test campaign message",
          budget: "1000",
        }),
      })

      const result = await response.json()
      setResults((prev) => [...prev, { test: "Campaign Form", success: result.success, data: result }])

      if (result.success) {
        toast({ title: "Success", description: "Campaign form test passed!" })
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
    } catch (error) {
      setResults((prev) => [...prev, { test: "Campaign Form", success: false, error: error.message }])
      toast({ title: "Error", description: "Campaign form test failed", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const testStaffForm = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test Staff Member",
          email: "test@example.com",
          phone: "1234567890",
          role: "Hair Stylist",
          salary: "30000",
          specialization: "Hair Cutting, Styling",
        }),
      })

      const result = await response.json()
      setResults((prev) => [...prev, { test: "Staff Form", success: result.success, data: result }])

      if (result.success) {
        toast({ title: "Success", description: "Staff form test passed!" })
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
    } catch (error) {
      setResults((prev) => [...prev, { test: "Staff Form", success: false, error: error.message }])
      toast({ title: "Error", description: "Staff form test failed", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const testAllForms = async () => {
    setResults([])
    await testInventoryForm()
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await testCampaignForm()
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await testStaffForm()
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Form Testing Dashboard</h1>
        <Button onClick={testAllForms} disabled={loading}>
          {loading ? "Testing..." : "Test All Forms"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Inventory Form Test</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={testInventoryForm} disabled={loading} className="w-full">
              Test Inventory Form
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Form Test</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={testCampaignForm} disabled={loading} className="w-full">
              Test Campaign Form
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff Form Test</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={testStaffForm} disabled={loading} className="w-full">
              Test Staff Form
            </Button>
          </CardContent>
        </Card>
      </div>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{result.test}</h3>
                    <span
                      className={`px-2 py-1 rounded text-sm ${result.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                    >
                      {result.success ? "PASSED" : "FAILED"}
                    </span>
                  </div>
                  {result.error && <p className="text-red-600 text-sm mt-2">Error: {result.error}</p>}
                  {result.data && (
                    <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
