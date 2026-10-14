const DB_NAME = "offline-sync-db"
const STORE = "offlineQueue"
const DB_VERSION = 1

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" })
        store.createIndex("byTenant", "tenant_id", { unique: false })
        store.createIndex("bySynced", "synced", { unique: false })
        store.createIndex("byTime", "timestamp", { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbGetAllPendingByTenant(tenantId) {
  return idbOpen().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly")
        const store = tx.objectStore(STORE)
        const req = store.getAll()
        req.onsuccess = () => {
          const arr = req.result
            .filter((r) => !r.synced && r.tenant_id === tenantId)
            .sort((a, b) => a.timestamp - b.timestamp)
          resolve(arr)
        }
        req.onerror = () => reject(req.error)
      }),
  )
}

function idbPut(rec) {
  return idbOpen().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite")
        tx.objectStore(STORE).put(rec)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
  )
}

function idbDelete(id) {
  return idbOpen().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite")
        tx.objectStore(STORE).delete(id)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
  )
}

self.addEventListener("install", (event) => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("fetch", (event) => {
  const req = event.request
  const url = new URL(req.url)
  const method = req.method.toUpperCase()

  // Only intercept /api/ routes in Service Worker
  if (!url.pathname.startsWith("/api/")) {
    return
  }

  // 1. Handle GET API requests with stale-while-revalidate / network-first with cache fallback
  if (method === "GET") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req.clone())
          if (res.ok) {
            const clone = res.clone()
            const cache = await caches.open("offline-api-cache")
            await cache.put(req, clone)
            return res
          }
          throw new Error("Bad response")
        } catch (err) {
          const cache = await caches.open("offline-api-cache")
          const cachedRes = await cache.match(req)
          if (cachedRes) return cachedRes
          return new Response(
            JSON.stringify({ error: "Offline and no cached data", offline: true }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          )
        }
      })(),
    )
    return
  }

  // 2. Handle POST / PUT / DELETE mutations: attempt network first, queue in IndexedDB on failure
  const isWrite = method === "POST" || method === "PUT" || method === "DELETE"
  if (!isWrite) return

  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req.clone())
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        return res
      } catch (err) {
        // Network failure or explicitly offline: queue into IndexedDB
        let body
        try {
          body = await req.clone().json()
        } catch {
          body = {}
        }
        const tenant_id = req.headers.get("x-tenant-id") || body?.tenant_id || "default"

        const headersObj = {}
        req.headers.forEach((v, k) => (headersObj[k] = v))

        const record = {
          id: `sw_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          tenant_id,
          endpoint: url.pathname + url.search,
          method,
          payload: body || {},
          headers: headersObj,
          synced: false,
          timestamp: Date.now(),
        }
        await idbPut(record)

        if ("sync" in self.registration) {
          try {
            await self.registration.sync.register(`sync-tenant-${tenant_id}`)
          } catch {}
        }

        return new Response(JSON.stringify({ queued: true, offline: true, id: record.id }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        })
      }
    })(),
  )
})

async function drainQueueForTenant(tenantId) {
  const pending = await idbGetAllPendingByTenant(tenantId)
  for (const rec of pending) {
    try {
      const res = await fetch(rec.endpoint, {
        method: rec.method,
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
          ...(rec.headers || {}),
        },
        body: JSON.stringify(rec.payload),
      })
      // Delete if success or if unretryable 4xx client error
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        await idbDelete(rec.id)
      } else {
        break
      }
    } catch {
      break
    }
  }

  const clientsArr = await self.clients.matchAll({ type: "window" })
  clientsArr.forEach((client) => client.postMessage({ type: "SYNC_COMPLETE", tenant_id: tenantId }))
}

self.addEventListener("sync", (event) => {
  if (!event.tag.startsWith("sync-tenant-")) return
  const tenantId = event.tag.replace("sync-tenant-", "")
  event.waitUntil(drainQueueForTenant(tenantId))
})

self.addEventListener("message", (event) => {
  if (event.data?.type === "REPLAY_QUEUE") {
    const tenantId = event.data.tenant_id || "default"
    event.waitUntil(drainQueueForTenant(tenantId))
  }
})
