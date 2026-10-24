import { openDB, type IDBPDatabase } from "idb"

export type QueueRecord = {
  id: string // uuid or temp_...
  tenant_id: string // "default" for now (Clerk later)
  endpoint: string // e.g. /api/invoices
  method: "POST" | "PUT" | "DELETE"
  payload: any
  headers?: Record<string, string>
  synced: boolean
  timestamp: number
}

let _db: IDBPDatabase | null = null

export async function getDB() {
  if (_db) return _db
  _db = await openDB("offline-sync-db", 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("offlineQueue")) {
        const store = db.createObjectStore("offlineQueue", { keyPath: "id" })
        store.createIndex("byTenant", "tenant_id", { unique: false })
        store.createIndex("bySynced", "synced", { unique: false })
        store.createIndex("byTime", "timestamp", { unique: false })
      }
      if (!db.objectStoreNames.contains("cachedData")) {
        db.createObjectStore("cachedData", { keyPath: "key" })
      }
    },
  })
  return _db
}

export async function saveCachedData(key: string, data: any) {
  try {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`hanva_cache_${key}`, JSON.stringify(data))
      } catch {}
    }
    const db = await getDB()
    await db.put("cachedData", { key, data, updatedAt: Date.now() })
  } catch (err) {
    console.warn(`[idb-queue] Error saving cached data for ${key}:`, err)
  }
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  // Try localStorage first for instant synchronous return
  if (typeof window !== "undefined") {
    try {
      const local = localStorage.getItem(`hanva_cache_${key}`)
      if (local) {
        const parsed = JSON.parse(local)
        if (parsed) return parsed as T
      }
    } catch {}
  }
  try {
    const db = await getDB()
    const rec = await db.get("cachedData", key)
    return rec ? (rec.data as T) : null
  } catch (err) {
    console.warn(`[idb-queue] Error getting cached data for ${key}:`, err)
    return null
  }
}

export async function saveCachedCustomers(customers: any[]) {
  if (!Array.isArray(customers) || customers.length === 0) return
  return await saveCachedData("customers", customers)
}

export async function getCachedCustomers(): Promise<any[]> {
  const data = await getCachedData<any[]>("customers")
  return Array.isArray(data) ? data : []
}

export async function addCachedCustomer(customer: any) {
  const current = await getCachedCustomers()
  const exists = current.some(
    (c) => c.id === customer.id || (c.phone_number && c.phone_number === customer.phone_number)
  )
  const updated = exists
    ? current.map((c) => (c.id === customer.id ? { ...c, ...customer } : c))
    : [customer, ...current]
  await saveCachedCustomers(updated)
}

export async function addToQueue(rec: QueueRecord) {
  const db = await getDB()
  await db.put("offlineQueue", rec)
}

export async function getPendingQueue(tenant_id: string) {
  const db = await getDB()
  const tx = db.transaction("offlineQueue", "readonly")
  const store = tx.objectStore("offlineQueue")
  const all: QueueRecord[] = []
  let cursor = await store.openCursor()
  while (cursor) {
    const v = cursor.value as QueueRecord
    if (!v.synced && v.tenant_id === tenant_id) all.push(v)
    cursor = await cursor.continue()
  }
  // FIFO: oldest first
  return all.sort((a, b) => a.timestamp - b.timestamp)
}

export async function markAsSynced(id: string) {
  const db = await getDB()
  const rec = await db.get("offlineQueue", id)
  if (!rec) return
  rec.synced = true
  await db.put("offlineQueue", rec)
}

export async function removeFromQueue(id: string) {
  const db = await getDB()
  await db.delete("offlineQueue", id)
}

/**
 * Replays all pending requests in the offline queue in FIFO order.
 * Works in all modern browsers (including Safari and Firefox) even without Background Sync API.
 */
export async function replayPendingQueue(tenant_id?: string): Promise<{
  processed: number
  failed: number
  errors: string[]
}> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { processed: 0, failed: 0, errors: ["Offline"] }
  }

  try {
    const db = await getDB()
    const tx = db.transaction("offlineQueue", "readonly")
    const store = tx.objectStore("offlineQueue")
    const pending: QueueRecord[] = []

    let cursor = await store.openCursor()
    while (cursor) {
      const v = cursor.value as QueueRecord
      if (!v.synced && (!tenant_id || v.tenant_id === tenant_id || v.tenant_id === "default")) {
        pending.push(v)
      }
      cursor = await cursor.continue()
    }

    pending.sort((a, b) => a.timestamp - b.timestamp)

    let processed = 0
    let failed = 0
    const errors: string[] = []

    for (const record of pending) {
      try {
        const response = await fetch(record.endpoint, {
          method: record.method,
          headers: {
            "Content-Type": "application/json",
            ...(record.headers || {}),
            ...(record.tenant_id ? { "x-tenant-id": record.tenant_id } : {}),
          },
          body: record.payload ? JSON.stringify(record.payload) : undefined,
        })

        if (response.ok || response.status === 200 || response.status === 201 || response.status === 202 || response.status === 204) {
          await removeFromQueue(record.id)
          processed++
        } else if (response.status >= 400 && response.status < 500) {
          // Client error (e.g. 400 Bad Request, 404) - cannot succeed on retry, discard to unblock queue
          console.warn(`[OfflineQueue] Discarding unretryable client error ${response.status} for record ${record.id}`)
          await removeFromQueue(record.id)
          failed++
          errors.push(`Record ${record.id} rejected (${response.status})`)
        } else {
          // 5xx Server error or other transient issue - stop replay to preserve FIFO order
          failed++
          errors.push(`Server error ${response.status}`)
          break
        }
      } catch (err: any) {
        console.warn(`[OfflineQueue] Network error replaying record ${record.id}:`, err)
        failed++
        errors.push(err?.message || "Network error")
        break // Connection dropped again, abort loop
      }
    }

    if (processed > 0 && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("sync-complete", {
          detail: { tenant_id: tenant_id || "all", count: processed },
        })
      )
    }

    return { processed, failed, errors }
  } catch (err: any) {
    console.error("[OfflineQueue] Error during replayPendingQueue:", err)
    return { processed: 0, failed: 0, errors: [err?.message || "Unknown error"] }
  }
}
