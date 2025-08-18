"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRealTimeSync } from "./websocket"

export interface RealtimeStats {
  totalRevenue: number
  todayBookings: number
  activeCustomers: number
  pendingAppointments: number
  lowStockItems: number
  lastUpdated: Date
}

export interface StatsConfig {
  refreshInterval?: number
  enableWebSocket?: boolean
  onError?: (error: Error) => void
}

const DEFAULT_STATS: RealtimeStats = {
  totalRevenue: 0,
  todayBookings: 0,
  activeCustomers: 0,
  pendingAppointments: 0,
  lowStockItems: 0,
  lastUpdated: new Date(),
}

export function useRealtimeStats(config: StatsConfig = {}) {
  const {
    refreshInterval = 30000, // 30 seconds
    enableWebSocket = true,
    onError,
  } = config

  const [stats, setStats] = useState<RealtimeStats>(DEFAULT_STATS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)
  const lastFetchRef = useRef<number>(0)

  const {
    isConnected: wsConnected,
    subscribe,
    broadcast,
  } = useRealTimeSync(enableWebSocket ? ["stats_update", "booking_created", "sale_completed", "inventory_updated"] : [])

  const fetchStats = useCallback(async () => {
    // Prevent duplicate requests
    const now = Date.now()
    if (now - lastFetchRef.current < 1000) {
      return
    }
    lastFetchRef.current = now

    try {
      setError(null)

      const [dashboardResponse, bookingsResponse, customersResponse, inventoryResponse] = await Promise.allSettled([
        fetch("/api/dashboard/stats").then((res) =>
          res.ok ? res.json() : Promise.reject(new Error("Dashboard API failed")),
        ),
        fetch("/api/bookings?status=pending").then((res) =>
          res.ok ? res.json() : Promise.reject(new Error("Bookings API failed")),
        ),
        fetch("/api/customers/stats").then((res) =>
          res.ok ? res.json() : Promise.reject(new Error("Customers API failed")),
        ),
        fetch("/api/inventory?lowStock=true").then((res) =>
          res.ok ? res.json() : Promise.reject(new Error("Inventory API failed")),
        ),
      ])

      const newStats: RealtimeStats = { ...DEFAULT_STATS, lastUpdated: new Date() }

      // Process dashboard stats
      if (dashboardResponse.status === "fulfilled" && dashboardResponse.value) {
        const dashboardData = dashboardResponse.value
        newStats.totalRevenue = Number(dashboardData.totalRevenue) || 0
        newStats.todayBookings = Number(dashboardData.todayBookings) || 0
      }

      // Process bookings
      if (bookingsResponse.status === "fulfilled" && bookingsResponse.value) {
        const bookingsData = bookingsResponse.value
        newStats.pendingAppointments = Array.isArray(bookingsData.data) ? bookingsData.data.length : 0
      }

      // Process customers
      if (customersResponse.status === "fulfilled" && customersResponse.value) {
        const customersData = customersResponse.value
        newStats.activeCustomers = Number(customersData.total) || 0
      }

      // Process inventory
      if (inventoryResponse.status === "fulfilled" && inventoryResponse.value) {
        const inventoryData = inventoryResponse.value
        newStats.lowStockItems = Array.isArray(inventoryData.data) ? inventoryData.data.length : 0
      }

      if (mountedRef.current) {
        setStats(newStats)
        setIsLoading(false)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred")
      console.error("Error fetching realtime stats:", error)

      if (mountedRef.current) {
        setError(error.message)
        setIsLoading(false)
      }

      if (onError) {
        try {
          onError(error)
        } catch (handlerError) {
          console.error("Error in stats error handler:", handlerError)
        }
      }
    }
  }, [onError])

  // WebSocket event handlers
  useEffect(() => {
    if (!enableWebSocket) return

    setIsConnected(wsConnected)

    const handleStatsUpdate = (event: any) => {
      try {
        if (event.data && typeof event.data === "object" && mountedRef.current) {
          setStats((prevStats) => ({
            ...prevStats,
            ...event.data,
            lastUpdated: new Date(),
          }))
        }
      } catch (error) {
        console.error("Error handling stats update:", error)
      }
    }

    const handleBookingCreated = () => {
      if (mountedRef.current) {
        setStats((prevStats) => ({
          ...prevStats,
          todayBookings: prevStats.todayBookings + 1,
          pendingAppointments: prevStats.pendingAppointments + 1,
          lastUpdated: new Date(),
        }))
      }
    }

    const handleSaleCompleted = (event: any) => {
      try {
        if (event.data?.amount && typeof event.data.amount === "number" && mountedRef.current) {
          setStats((prevStats) => ({
            ...prevStats,
            totalRevenue: prevStats.totalRevenue + event.data.amount,
            lastUpdated: new Date(),
          }))
        }
      } catch (error) {
        console.error("Error handling sale completed:", error)
      }
    }

    const handleInventoryUpdated = () => {
      // Trigger a fresh fetch for inventory data
      fetchStats()
    }

    subscribe("stats_update", handleStatsUpdate)
    subscribe("booking_created", handleBookingCreated)
    subscribe("sale_completed", handleSaleCompleted)
    subscribe("inventory_updated", handleInventoryUpdated)
  }, [wsConnected, enableWebSocket, subscribe, fetchStats])

  // Polling mechanism
  useEffect(() => {
    mountedRef.current = true

    // Initial fetch
    fetchStats()

    // Set up polling
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        if (mountedRef.current) {
          fetchStats()
        }
      }, refreshInterval)
    }

    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fetchStats, refreshInterval])

  const refreshStats = useCallback(() => {
    setIsLoading(true)
    setError(null)
    fetchStats()
  }, [fetchStats])

  const broadcastStatsUpdate = useCallback(
    (updatedStats: Partial<RealtimeStats>) => {
      if (enableWebSocket) {
        try {
          broadcast("stats_update", updatedStats)
        } catch (error) {
          console.error("Error broadcasting stats update:", error)
        }
      }
    },
    [broadcast, enableWebSocket],
  )

  return {
    stats,
    isLoading,
    error,
    isConnected: enableWebSocket ? isConnected : false,
    refreshStats,
    broadcastStatsUpdate,
  }
}

// Hook for specific stat tracking
export function useStatTracker(statName: keyof RealtimeStats, config: StatsConfig = {}) {
  const { stats, isLoading, error, refreshStats } = useRealtimeStats(config)

  const value = stats[statName]
  const isStale = Date.now() - stats.lastUpdated.getTime() > (config.refreshInterval || 30000)

  return {
    value,
    isLoading,
    error,
    isStale,
    refresh: refreshStats,
  }
}

// Utility function to format stats for display
export function formatStatValue(value: number, type: keyof RealtimeStats): string {
  try {
    switch (type) {
      case "totalRevenue":
        return new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value)

      case "todayBookings":
      case "activeCustomers":
      case "pendingAppointments":
      case "lowStockItems":
        return value.toLocaleString()

      default:
        return value.toString()
    }
  } catch (error) {
    console.error("Error formatting stat value:", error)
    return value.toString()
  }
}

// Hook for stats history tracking
export function useStatsHistory(maxEntries = 50) {
  const [history, setHistory] = useState<RealtimeStats[]>([])
  const { stats } = useRealtimeStats()

  useEffect(() => {
    setHistory((prevHistory) => {
      const newHistory = [...prevHistory, stats]
      return newHistory.slice(-maxEntries)
    })
  }, [stats, maxEntries])

  const getStatTrend = useCallback(
    (statName: keyof RealtimeStats) => {
      if (history.length < 2) return "stable"

      const current = history[history.length - 1][statName]
      const previous = history[history.length - 2][statName]

      if (current > previous) return "up"
      if (current < previous) return "down"
      return "stable"
    },
    [history],
  )

  return {
    history,
    getStatTrend,
  }
}
