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

  if (url.pathname.startsWith("/api/")) {
    return
  }

  if (method === "GET" && url.pathname.startsWith("/api/")) {
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
            JSON.stringify({ error: "Offline and no cached data" }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          )
        }
      })(),
    )
    return
  }

  const isWrite = method === "POST" || method === "PUT" || method === "DELETE"
  const isApi = url.pathname.startsWith("/api/")

  if (!isWrite || !isApi) return

  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req.clone())
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        return res
      } catch (err) {
        if (!self.navigator.onLine) {
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
            endpoint: url.pathname,
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

          return new Response(JSON.stringify({ queued: true, offline: true }), {
            status: 202,
            headers: { "Content-Type": "application/json" },
          })
        }

        return new Response(JSON.stringify({ error: "Network error", detail: String(err) }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      }
    })(),
  )
})

self.addEventListener("sync", (event) => {
  if (!event.tag.startsWith("sync-tenant-")) return
  const tenantId = event.tag.replace("sync-tenant-", "")

  event.waitUntil(
    (async () => {
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
          if (res.ok) {
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
    })(),
  )
})
