"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

interface AppearanceSettings {
  theme: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fontSize: string
  compactMode: boolean
  showAnimations: boolean
  customLogo: string
  brandColors: boolean
  sidebarStyle: string
  headerStyle: string
  cardStyle: string
}

interface ThemeContextType {
  appearance: AppearanceSettings
  updateAppearance: (settings: Partial<AppearanceSettings>) => void
  isLoading: boolean
}

const defaultAppearance: AppearanceSettings = {
  theme: "light",
  primaryColor: "#3B82F6",
  secondaryColor: "#6B7280",
  accentColor: "#10B981",
  fontSize: "medium",
  compactMode: false,
  showAnimations: true,
  customLogo: "",
  brandColors: true,
  sidebarStyle: "expanded",
  headerStyle: "default",
  cardStyle: "elevated",
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearance] = useState<AppearanceSettings>(defaultAppearance)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchAppearanceSettings() {
      try {
        console.log("[v0] Fetching appearance settings...")
        const response = await fetch("/api/settings")

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log("[v0] Settings API response:", data)

        if (data.success && data.settings?.appearance) {
          console.log("[v0] Applying appearance settings:", data.settings.appearance)
          setAppearance((prev) => ({ ...prev, ...data.settings.appearance }))
        } else {
          console.log("[v0] No appearance settings found, using defaults")
        }
      } catch (error) {
        console.error("[v0] Error fetching appearance settings:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAppearanceSettings()
  }, [])

  useEffect(() => {
    console.log("[v0] Applying theme:", appearance.theme)

    // Apply theme class to html element
    const html = document.documentElement
    html.classList.remove("light", "dark")

    if (appearance.theme === "dark") {
      html.classList.add("dark")
    } else if (appearance.theme === "light") {
      html.classList.add("light")
    } else {
      // Auto theme - detect system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      html.classList.add(prefersDark ? "dark" : "light")
    }

    // Apply custom CSS properties for colors
    if (appearance.brandColors) {
      html.style.setProperty("--primary-color", appearance.primaryColor)
      html.style.setProperty("--secondary-color", appearance.secondaryColor)
      html.style.setProperty("--accent-color", appearance.accentColor)
    }

    // Apply font size
    html.classList.remove("text-sm", "text-base", "text-lg")
    if (appearance.fontSize === "small") {
      html.classList.add("text-sm")
    } else if (appearance.fontSize === "large") {
      html.classList.add("text-lg")
    } else {
      html.classList.add("text-base")
    }

    // Apply compact mode
    if (appearance.compactMode) {
      html.classList.add("compact-mode")
    } else {
      html.classList.remove("compact-mode")
    }

    // Apply animations
    if (!appearance.showAnimations) {
      html.classList.add("no-animations")
    } else {
      html.classList.remove("no-animations")
    }
  }, [appearance])

  const updateAppearance = (settings: Partial<AppearanceSettings>) => {
    console.log("[v0] Updating appearance settings:", settings)
    setAppearance((prev) => ({ ...prev, ...settings }))
  }

  return <ThemeContext.Provider value={{ appearance, updateAppearance, isLoading }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
