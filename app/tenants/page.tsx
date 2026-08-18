// app/tenants/page.tsx
"use client"
import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"

export default function TenantInfoPage() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string>("")
  const { getToken } = useAuth()

  useEffect(() => {
    async function fetchTenant() {
      try {
        const token = await getToken()
        console.log("Clerk token:", token ? "Present" : "Missing")
        
        const res = await fetch("/api/tenants", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        })
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error("Error fetching tenant:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
      }
    }
    
    fetchTenant()
  }, [getToken])

  if (error) return <div>Error: {error}</div>
  if (!data) return <div>Loading...</div>
  
  return <pre>{JSON.stringify(data, null, 2)}</pre>
}
