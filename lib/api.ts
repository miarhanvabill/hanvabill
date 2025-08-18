const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

class ApiClient {
  private baseURL: string
  private token: string | null = null
  private isOnline = true

  constructor(baseURL: string) {
    this.baseURL = baseURL
    if (typeof window !== "undefined") {
      try {
        this.token = localStorage.getItem("auth_token")
        this.isOnline = navigator.onLine
        window.addEventListener("online", () => {
          this.isOnline = true
        })
        window.addEventListener("offline", () => {
          this.isOnline = false
        })
      } catch (error) {
        console.warn("Failed to initialize API client:", error instanceof Error ? error.message : "Unknown error")
        this.token = null
      }
    }
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("auth_token", token)
      } catch (error) {
        console.warn(
          "Failed to save token to localStorage:",
          error instanceof Error ? error.message : "Storage unavailable",
        )
      }
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("auth_token")
      } catch (error) {
        console.warn(
          "Failed to remove token from localStorage:",
          error instanceof Error ? error.message : "Storage unavailable",
        )
      }
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    if (!this.isOnline) {
      throw new Error("No internet connection available")
    }

    const url = `${this.baseURL}${endpoint}`
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      })

      if (!response.ok) {
        let errorText = `HTTP ${response.status}`
        try {
          const responseText = await response.text()
          errorText = responseText || errorText
        } catch (textError) {
          console.warn(
            "Failed to read error response:",
            textError instanceof Error ? textError.message : "Unknown error",
          )
        }
        throw new Error(errorText)
      }

      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        try {
          return await response.json()
        } catch (jsonError) {
          console.warn(
            "Failed to parse JSON response:",
            jsonError instanceof Error ? jsonError.message : "Invalid JSON",
          )
          return null
        }
      } else {
        return await response.text()
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          console.warn(`API request timeout: ${endpoint}`)
          throw new Error(`Request timeout: ${endpoint}`)
        }
        console.warn(`API request failed: ${endpoint} - ${error.message}`)
        throw new Error(`API request to ${endpoint} failed: ${error.message}`)
      }
      console.warn(`API request failed: ${endpoint} - Unknown error`)
      throw new Error(`API request to ${endpoint} failed: Unknown error`)
    }
  }

  // Auth methods
  async login(email: string, password: string) {
    try {
      if (!email || !password) {
        throw new Error("Email and password are required")
      }

      const formData = new FormData()
      formData.append("username", email)
      formData.append("password", password)

      const response = await fetch(`${this.baseURL}/token`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(15000), // 15 second timeout for login
      })

      if (!response.ok) {
        throw new Error("Invalid credentials")
      }

      const data = await response.json()
      if (data.access_token) {
        this.setToken(data.access_token)
      }
      return data
    } catch (error) {
      console.warn("Login failed:", error instanceof Error ? error.message : "Unknown error")
      throw error
    }
  }

  async register(email: string, password: string, role = "staff") {
    return this.request(
      `/register?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&role=${encodeURIComponent(role)}`,
      {
        method: "POST",
      },
    )
  }

  // Client methods
  async getClients() {
    return this.request("/clients")
  }

  async createClient(clientData: { name: string; phone: string; email?: string; address?: string }) {
    if (!clientData.name || !clientData.phone) {
      throw new Error("Name and phone are required")
    }
    return this.request("/clients", {
      method: "POST",
      body: JSON.stringify(clientData),
    })
  }

  async searchClients(query: string) {
    if (!query || query.trim().length === 0) {
      return []
    }
    if (query.length > 100) {
      console.warn("Search query too long, truncating")
      query = query.substring(0, 100)
    }
    return this.request(`/clients/search?q=${encodeURIComponent(query)}`)
  }

  // Dashboard methods
  async getDashboardSummary() {
    return this.request("/dashboard/summary")
  }

  // Staff methods
  async getStaff() {
    return this.request("/staff")
  }

  // Invoice methods
  async getInvoices() {
    return this.request("/invoices")
  }

  async createInvoice(invoiceData: any) {
    if (!invoiceData) {
      throw new Error("Invoice data is required")
    }
    return this.request("/invoices", {
      method: "POST",
      body: JSON.stringify(invoiceData),
    })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
export default apiClient
