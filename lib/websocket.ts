"use client"

import { useEffect, useRef, useState } from "react"

export interface SyncEvent {
  type: string
  data: any
  timestamp: number
  userId?: string
}

export class WebSocketManager {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private eventListeners = new Map<string, Set<(event: SyncEvent) => void>>()
  private isConnected = false
  private reconnectTimer: NodeJS.Timeout | null = null
  private connectionState: "connecting" | "connected" | "disconnected" | "error" = "disconnected"

  constructor(private url = "ws://localhost:8080") {
    if (typeof window !== "undefined") {
      this.connect()
    }
  }

  private connect() {
    try {
      this.connectionState = "connecting"
      // For demo purposes, we'll simulate WebSocket functionality
      this.isConnected = true
      this.connectionState = "connected"
      this.reconnectAttempts = 0
      console.log("WebSocket connected (simulated)")

      // Simulate connection events
      this.notifyConnectionChange()
    } catch (error) {
      this.connectionState = "error"
      console.warn("WebSocket connection failed:", error instanceof Error ? error.message : "Unknown error")
      this.handleReconnect()
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      this.connectionState = "connecting"
      this.reconnectTimer = setTimeout(() => {
        console.log(`Reconnecting WebSocket... Attempt ${this.reconnectAttempts}`)
        this.connect()
      }, this.reconnectDelay * this.reconnectAttempts)
    } else {
      console.warn("Max WebSocket reconnection attempts reached")
      this.isConnected = false
      this.connectionState = "error"
      this.notifyConnectionChange()
    }
  }

  private notifyConnectionChange() {
    const event: SyncEvent = {
      type: "connection_change",
      data: { connected: this.isConnected },
      timestamp: Date.now(),
    }
    this.broadcast(event)
  }

  addEventListener(eventType: string, callback: (event: SyncEvent) => void) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    this.eventListeners.get(eventType)!.add(callback)
  }

  removeEventListener(eventType: string, callback: (event: SyncEvent) => void) {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      listeners.delete(callback)
      if (listeners.size === 0) {
        this.eventListeners.delete(eventType)
      }
    }
  }

  broadcast(event: SyncEvent) {
    if (!event || typeof event !== "object") {
      console.warn("Invalid event data for broadcast")
      return
    }

    // Simulate broadcasting to other users
    setTimeout(() => {
      const listeners = this.eventListeners.get(event.type)
      if (listeners) {
        listeners.forEach((callback) => {
          try {
            callback(event)
          } catch (error) {
            console.warn("Error in WebSocket event listener:", error instanceof Error ? error.message : "Unknown error")
          }
        })
      }
    }, 100)
  }

  send(data: any) {
    if (this.isConnected) {
      try {
        if (!data) {
          console.warn("Cannot send empty data via WebSocket")
          return
        }

        // Simulate sending data
        console.log("Sending WebSocket data:", data)

        // Simulate receiving a response
        const event: SyncEvent = {
          type: data.type || "update",
          data: data,
          timestamp: Date.now(),
          userId: "current-user",
        }

        this.broadcast(event)
      } catch (error) {
        console.warn("Error sending WebSocket data:", error instanceof Error ? error.message : "Unknown error")
      }
    } else {
      console.warn("WebSocket not connected, cannot send data")
    }
  }

  getConnectionState() {
    return this.connectionState
  }

  getConnectionStatus() {
    return this.isConnected
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
    this.connectionState = "disconnected"
    this.eventListeners.clear()
  }
}

export const wsManager = new WebSocketManager()

// Hook for real-time sync functionality
export function useRealTimeSync(eventTypes: string[] = []) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const callbacksRef = useRef<Map<string, (event: SyncEvent) => void>>(new Map())
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    setIsConnected(wsManager.getConnectionStatus())

    const validEventTypes = eventTypes.filter((type) => typeof type === "string" && type.length > 0)
    if (validEventTypes.length !== eventTypes.length) {
      console.warn("Some invalid event types were filtered out")
    }

    // Set up event listeners for specified event types
    const cleanupFunctions: (() => void)[] = []

    validEventTypes.forEach((eventType) => {
      const callback = (event: SyncEvent) => {
        if (mountedRef.current) {
          if (!event || !event.timestamp) {
            console.warn(`Invalid event received for ${eventType}`)
            return
          }

          setLastUpdate(new Date(event.timestamp))
          const userCallback = callbacksRef.current.get(eventType)
          if (userCallback) {
            try {
              userCallback(event)
            } catch (error) {
              console.warn(
                `Error in user callback for ${eventType}:`,
                error instanceof Error ? error.message : "Unknown error",
              )
            }
          }
        }
      }

      wsManager.addEventListener(eventType, callback)
      cleanupFunctions.push(() => wsManager.removeEventListener(eventType, callback))
    })

    // Listen for connection changes
    const connectionCallback = (event: SyncEvent) => {
      if (mountedRef.current && event.type === "connection_change") {
        setIsConnected(event.data.connected)
      }
    }

    wsManager.addEventListener("connection_change", connectionCallback)
    cleanupFunctions.push(() => wsManager.removeEventListener("connection_change", connectionCallback))

    return () => {
      mountedRef.current = false
      cleanupFunctions.forEach((cleanup) => {
        try {
          cleanup()
        } catch (error) {
          console.warn("Error during WebSocket cleanup:", error instanceof Error ? error.message : "Unknown error")
        }
      })
    }
  }, [eventTypes])

  const subscribe = (eventType: string, callback: (event: SyncEvent) => void) => {
    if (!eventType || typeof eventType !== "string") {
      console.warn("Invalid event type for subscription")
      return
    }
    if (!callback || typeof callback !== "function") {
      console.warn("Invalid callback for subscription")
      return
    }
    callbacksRef.current.set(eventType, callback)
  }

  const broadcast = (eventType: string, data: any) => {
    try {
      if (!eventType || typeof eventType !== "string") {
        console.warn("Invalid event type for broadcast")
        return
      }

      wsManager.broadcast({
        type: eventType,
        data,
        timestamp: Date.now(),
        userId: "current-user",
      })
    } catch (error) {
      console.warn("Error broadcasting event:", error instanceof Error ? error.message : "Unknown error")
    }
  }

  return {
    isConnected,
    lastUpdate,
    subscribe,
    broadcast,
  }
}

// Function to get the WebSocket manager instance
export function getWebSocketManager(): WebSocketManager {
  return wsManager
}
