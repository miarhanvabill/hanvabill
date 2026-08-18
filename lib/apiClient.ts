// lib/apiClient.ts
import { useAuth, useOrganization } from "@clerk/nextjs"

export const useApiClient = () => {
  const { getToken } = useAuth()
  const { organization } = useOrganization()

  const apiCall = async (url: string, options: RequestInit = {}) => {
    // Ensure we have an organization selected
    if (!organization) {
      throw new Error("No organization selected")
    }

    // Get the auth token
    const token = await getToken()
    
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': organization.id, // Explicit tenant header
    }

    return fetch(url, {
      ...options,
      headers,
    })
  }

  return { apiCall, organization }
}

// Usage example:
export const useTestApi = () => {
  const { apiCall } = useApiClient()
  
  const testAuth = async () => {
    try {
      const response = await apiCall('/api/debug-auth')
      const data = await response.json()
      console.log('API Response:', data)
      return data
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }
  }

  return { testAuth }
}
