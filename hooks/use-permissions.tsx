"use client"

import React, { createContext, useContext, useEffect, useState, useMemo } from "react"
import { getMyPermissions, type CurrentUserPermissions } from "@/app/actions/permissions"
import { ALL_SYSTEM_PERMISSIONS } from "@/app/actions/tenant-roles"

interface PermissionsContextType extends CurrentUserPermissions {
  isLoading: boolean
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  canAccessRoute: (pathname: string) => boolean
  refreshPermissions: () => Promise<void>
}

// Map route prefixes to required permissions
const ROUTE_PERMISSION_MAP: { prefix: string; permissions: string[] }[] = [
  { prefix: "/bookings", permissions: ["bookings.view", "bookings.create", "bookings.edit"] },
  { prefix: "/customers", permissions: ["customers.view", "customers.create", "customers.edit"] },
  { prefix: "/new-sale", permissions: ["sales.view", "sales.create"] },
  { prefix: "/services", permissions: ["services.view", "services.create", "services.edit"] },
  { prefix: "/staff", permissions: ["staff.view", "staff.create", "staff.edit"] },
  { prefix: "/inventory", permissions: ["inventory.view", "inventory.manage"] },
  { prefix: "/reports", permissions: ["reports.view", "reports.financial", "reports.advanced"] },
  { prefix: "/manage", permissions: ["settings.view", "settings.manage", "users.view", "users.roles"] },
  { prefix: "/reviews", permissions: ["reviews.view", "reviews.manage"] },
  { prefix: "/analytics", permissions: ["dashboard.analytics", "reports.view"] },
  { prefix: "/marketing", permissions: ["marketing.view", "marketing.manage"] },
  { prefix: "/whatsapp", permissions: ["marketing.view", "customers.view"] },
  { prefix: "/settings", permissions: ["settings.view", "settings.manage", "settings.edit"] },
  { prefix: "/user-management", permissions: ["users.view", "users.roles", "users.permissions"] },
]

const PermissionsContext = createContext<PermissionsContextType>({
  userId: null,
  name: "",
  email: "",
  role: "Admin",
  isAdmin: true,
  permissions: ALL_SYSTEM_PERMISSIONS,
  isLoading: false,
  hasPermission: () => true,
  hasAnyPermission: () => true,
  canAccessRoute: () => true,
  refreshPermissions: async () => {},
})

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<CurrentUserPermissions>({
    userId: null,
    name: "",
    email: "",
    role: "Admin",
    isAdmin: true,
    permissions: ALL_SYSTEM_PERMISSIONS,
  })
  const [isLoading, setIsLoading] = useState(true)

  const fetchPermissions = async () => {
    try {
      const res = await getMyPermissions()
      if (res) {
        setData(res)
      }
    } catch (err) {
      console.error("Failed to load permissions:", err)
      // Always fallback safely to admin on error so owner is never locked out
      setData({
        userId: null,
        name: "Admin",
        email: "",
        role: "Admin",
        isAdmin: true,
        permissions: ALL_SYSTEM_PERMISSIONS,
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPermissions()
  }, [])

  const hasPermission = (permission: string) => {
    if (data.isAdmin) return true
    return data.permissions.includes(permission)
  }

  const hasAnyPermission = (permissions: string[]) => {
    if (data.isAdmin) return true
    return permissions.some((p) => data.permissions.includes(p))
  }

  const canAccessRoute = (routePath: string) => {
    if (data.isAdmin) return true
    if (!routePath || routePath === "/" || routePath === "") return true

    // Check if route matches any restricted prefix
    const match = ROUTE_PERMISSION_MAP.find((m) =>
      routePath.startsWith(m.prefix)
    )
    if (!match) return true // Unmapped route is open by default

    // If user has ANY of the permitted flags for this route, allow access
    return match.permissions.some((p) => data.permissions.includes(p))
  }

  const value = useMemo(
    () => ({
      ...data,
      isLoading,
      hasPermission,
      hasAnyPermission,
      canAccessRoute,
      refreshPermissions: fetchPermissions,
    }),
    [data, isLoading]
  )

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  return useContext(PermissionsContext)
}
