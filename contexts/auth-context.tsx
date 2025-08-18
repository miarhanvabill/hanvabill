"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api"

interface User {
  id: number
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const safeLocalStorage = {
    getItem: (key: string): string | null => {
      try {
        if (typeof window === "undefined") {
          return null
        }

        if (!window.localStorage) {
          console.warn("localStorage is not available")
          return null
        }

        if (!key || typeof key !== "string") {
          console.warn("Invalid localStorage key:", key)
          return null
        }

        return localStorage.getItem(key)
      } catch (error) {
        console.warn(
          `Failed to read from localStorage (${key}):`,
          error instanceof Error ? error.message : "Unknown error",
        )
        return null
      }
    },
    setItem: (key: string, value: string): boolean => {
      try {
        if (typeof window === "undefined") {
          return false
        }

        if (!window.localStorage) {
          console.warn("localStorage is not available")
          return false
        }

        if (!key || typeof key !== "string") {
          console.warn("Invalid localStorage key:", key)
          return false
        }

        if (value === null || value === undefined) {
          console.warn("Cannot store null/undefined value in localStorage")
          return false
        }

        localStorage.setItem(key, String(value))
        return true
      } catch (error) {
        console.warn(
          `Failed to write to localStorage (${key}):`,
          error instanceof Error ? error.message : "Unknown error",
        )
        return false
      }
    },
    removeItem: (key: string): boolean => {
      try {
        if (typeof window === "undefined") {
          return false
        }

        if (!window.localStorage) {
          console.warn("localStorage is not available")
          return false
        }

        if (!key || typeof key !== "string") {
          console.warn("Invalid localStorage key:", key)
          return false
        }

        localStorage.removeItem(key)
        return true
      } catch (error) {
        console.warn(
          `Failed to remove from localStorage (${key}):`,
          error instanceof Error ? error.message : "Unknown error",
        )
        return false
      }
    },
  }

  const validateToken = useCallback((token: string): boolean => {
    try {
      if (!token || typeof token !== "string") {
        return false
      }

      const trimmedToken = token.trim()
      if (trimmedToken.length === 0) {
        return false
      }

      // Basic token format validation
      if (trimmedToken.length < 10) {
        console.warn("Token too short, likely invalid")
        return false
      }

      // Check for demo token
      if (trimmedToken === "demo_token") {
        return true
      }

      // Check for API token
      if (trimmedToken === "api_token") {
        return true
      }

      // Add more sophisticated token validation here if needed
      // For now, accept any token longer than 10 characters
      return true
    } catch (error) {
      console.warn("Error validating token:", error instanceof Error ? error.message : "Unknown error")
      return false
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout | null = null

    const initializeAuth = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Add timeout for initialization
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn("Auth initialization timeout")
            setError("Authentication initialization timed out")
            setIsLoading(false)
          }
        }, 5000)

        const token = safeLocalStorage.getItem("auth_token")

        if (token && validateToken(token)) {
          // For demo purposes, create a demo user
          const demoUser: User = {
            id: 1,
            email: "demo@salon.com",
            role: "admin",
          }

          if (isMounted) {
            setUser(demoUser)
            if (timeoutId) {
              clearTimeout(timeoutId)
              timeoutId = null
            }
          }
        } else if (token) {
          // Invalid token found, clean it up
          console.warn("Invalid token found, cleaning up")
          safeLocalStorage.removeItem("auth_token")
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown initialization error"
        console.warn("Auth initialization error:", errorMessage)

        if (isMounted) {
          setError("Failed to initialize authentication")
        }

        // Clean up potentially corrupted data
        safeLocalStorage.removeItem("auth_token")
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }

        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    return () => {
      isMounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [validateToken])

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      setError(null)

      // Input validation
      if (!email || typeof email !== "string" || email.trim() === "") {
        throw new Error("Email is required")
      }

      if (!password || typeof password !== "string" || password.trim() === "") {
        throw new Error("Password is required")
      }

      const trimmedEmail = email.trim().toLowerCase()
      const trimmedPassword = password.trim()

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(trimmedEmail)) {
        throw new Error("Please enter a valid email address")
      }

      // Password strength validation
      if (trimmedPassword.length < 3) {
        throw new Error("Password must be at least 3 characters long")
      }

      try {
        // Attempt API login with timeout
        const loginPromise = apiClient.login(trimmedEmail, trimmedPassword)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Login request timed out")), 10000)
        })

        await Promise.race([loginPromise, timeoutPromise])

        // If API login succeeds, create user from response
        const userData: User = { id: 1, email: trimmedEmail, role: "admin" }
        setUser(userData)

        // Save token
        if (!safeLocalStorage.setItem("auth_token", "api_token")) {
          console.warn("Failed to save API token, session may not persist")
        }
      } catch (apiError) {
        const apiErrorMessage = apiError instanceof Error ? apiError.message : "API login failed"
        console.log("API login failed, using demo login:", apiErrorMessage)

        // For demo purposes, allow any login with valid format
        const userData: User = { id: 1, email: trimmedEmail, role: "admin" }
        setUser(userData)

        // Save demo token
        if (!safeLocalStorage.setItem("auth_token", "demo_token")) {
          console.warn("Failed to save demo token, session may not persist")
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Login failed"
      console.error("Login error:", errorMessage)
      setError(errorMessage)

      // Clean up any partial state
      setUser(null)
      safeLocalStorage.removeItem("auth_token")
    } finally {
      setIsLoading(false)
    }
  }

  const logout = useCallback(() => {
    try {
      setUser(null)
      setError(null)

      // Clear token from storage
      if (!safeLocalStorage.removeItem("auth_token")) {
        console.warn("Failed to remove auth token from localStorage")
      }

      // Clear API client token
      try {
        if (apiClient && typeof apiClient.clearToken === "function") {
          apiClient.clearToken()
        }
      } catch (apiError) {
        console.warn("Error clearing API token:", apiError instanceof Error ? apiError.message : "Unknown error")
      }

      console.log("User logged out successfully")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown logout error"
      console.warn("Logout error:", errorMessage)
      setError("Failed to logout properly")
    }
  }, [])

  const contextValue: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
    error,
    clearError,
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    const error = new Error("useAuth must be used within an AuthProvider")
    console.error("Auth context error:", error.message)
    throw error
  }

  return context
}

export function useAuthUser() {
  const { user } = useAuth()
  return user
}

export function useAuthStatus() {
  const { user, isLoading, error } = useAuth()
  return {
    isAuthenticated: !!user,
    isLoading,
    hasError: !!error,
    error,
  }
}
