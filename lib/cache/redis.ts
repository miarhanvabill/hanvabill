import Redis from "ioredis"

const redis = new Redis(process.env.REDIS_URL!)

export class CacheManager {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error("Cache get error:", error)
      return null
    }
  }

  static async set(key: string, value: any, ttl = 3600): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value))
    } catch (error) {
      console.error("Cache set error:", error)
    }
  }

  static async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      console.error("Cache invalidation error:", error)
    }
  }

  // Salon-specific cache methods
  static async cacheAppointments(date: string, appointments: any[]): Promise<void> {
    await this.set(`appointments:${date}`, appointments, 1800) // 30 minutes
  }

  static async getCachedAppointments(date: string): Promise<any[] | null> {
    return this.get(`appointments:${date}`)
  }

  static async invalidateAppointments(date?: string): Promise<void> {
    const pattern = date ? `appointments:${date}` : "appointments:*"
    await this.invalidate(pattern)
  }

  // Customer cache methods
  static async cacheCustomer(customerId: string, customer: any): Promise<void> {
    await this.set(`customer:${customerId}`, customer, 7200) // 2 hours
  }

  static async getCachedCustomer(customerId: string): Promise<any | null> {
    return this.get(`customer:${customerId}`)
  }

  // Dashboard stats cache
  static async cacheDashboardStats(stats: any): Promise<void> {
    await this.set("dashboard:stats", stats, 900) // 15 minutes
  }

  static async getCachedDashboardStats(): Promise<any | null> {
    return this.get("dashboard:stats")
  }

  // Services cache
  static async cacheServices(services: any[]): Promise<void> {
    await this.set("services:all", services, 3600) // 1 hour
  }

  static async getCachedServices(): Promise<any[] | null> {
    return this.get("services:all")
  }

  static async invalidateServices(): Promise<void> {
    await this.invalidate("services:*")
  }
}
