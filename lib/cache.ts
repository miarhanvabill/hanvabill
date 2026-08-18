import { Redis } from "@upstash/redis"

// Singleton Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

/**
 * Save a value in cache with optional TTL
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  const payload = typeof value === "string" ? value : JSON.stringify(value)
  if (ttlSeconds) {
    await redis.set(key, payload, { ex: ttlSeconds })
  } else {
    await redis.set(key, payload)
  }
}

/**
 * Get a cached value
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await redis.get(key)

  if (!data) return null

  try {
    // If it's already an object, return directly
    if (typeof data === "object") {
      return data as T
    }

    // If it's a string, try parsing JSON
    return JSON.parse(data as string) as T
  } catch (err) {
    console.warn(`[cacheGet] Failed to parse cache for key=${key}, returning raw value`, err)
    return data as T
  }
}

/**
 * Delete a cached value
 */
export async function cacheDel(key: string): Promise<void> {
  await redis.del(key)
}

/**
 * Simple cache wrapper: check cache first, otherwise fetch + store
 */
export async function cacheFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds = 60
): Promise<T> {
  const cached = await cacheGet<T>(key)
  if (cached) return cached

  const fresh = await fetchFn()
  await cacheSet(key, fresh, ttlSeconds)
  return fresh
}

export default redis
