import { Redis } from "@upstash/redis"

// Singleton Redis client
let redis: Redis | null = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  } else {
    console.warn("[Cache] UPSTASH_REDIS_REST_URL or TOKEN is missing. Redis cache will be disabled.");
  }
} catch (error) {
  console.warn("[Cache] Failed to initialize Redis client:", error);
}

/**
 * Save a value in cache with optional TTL
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  if (!redis) return;
  try {
    const payload = typeof value === "string" ? value : JSON.stringify(value)
    if (ttlSeconds) {
      await redis.set(key, payload, { ex: ttlSeconds })
    } else {
      await redis.set(key, payload)
    }
  } catch (error) {
    console.warn(`[Cache] Error setting ${key}:`, error);
  }
}

/**
 * Get a cached value
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const data = await redis.get(key)
    if (!data) return null

    // If it's already an object, return directly
    if (typeof data === "object") {
      return data as T
    }

    // If it's a string, try parsing JSON
    return JSON.parse(data as string) as T
  } catch (err) {
    console.warn(`[cacheGet] Failed to parse cache for key=${key}, returning raw value`, err)
    return null
  }
}

/**
 * Delete a cached value
 */
export async function cacheDel(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key)
  } catch (error) {
    console.warn(`[Cache] Error deleting ${key}:`, error);
  }
}

/**
 * Simple cache wrapper: check cache first, otherwise fetch + store
 */
export async function cacheFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds = 60
): Promise<T> {
  if (!redis) {
    return fetchFn();
  }

  try {
    const cached = await cacheGet<T>(key)
    if (cached) return cached

    const fresh = await fetchFn()
    await cacheSet(key, fresh, ttlSeconds)
    return fresh
  } catch (error) {
    console.warn(`[Cache] cacheFetch error for ${key}, falling back to fetchFn:`, error);
    return fetchFn();
  }
}

export default redis
