"use client"

import { useState, useEffect, useContext, createContext, type ReactNode } from "react"
import { getBusinessSettings, type BusinessSettings } from "@/app/actions/settings"

interface SettingsContextType {
  settings: BusinessSettings | null
  loading: boolean
  refreshSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType>({
  settings: null,
  loading: true,
  refreshSettings: async () => {},
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshSettings = async () => {
    try {
      const businessSettings = await getBusinessSettings()
      setSettings(businessSettings)
    } catch (error) {
      console.error("Failed to load settings:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshSettings()
  }, [])

  return <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}

export function useBusinessSettings() {
  const { settings } = useSettings()
  return (
    settings?.business || {
      taxRate: 18,
      serviceCharge: 0,
      currency: "INR",
      language: "English",
      timezone: "Asia/Kolkata",
      dateFormat: "DD/MM/YYYY",
    }
  )
}

export function useNotificationSettings() {
  const { settings } = useSettings()
  return (
    settings?.notifications || {
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      staffNotifications: true,
    }
  )
}

export function useProfileSettings() {
  const { settings } = useSettings()
  return (
    settings?.profile || {
      businessName: "Glamour Salon",
      email: "contact@glamour.com",
      phone: "+91 9876543210",
      whatsapp: "+91 9876543210",
    }
  )
}
