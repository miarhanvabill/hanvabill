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
  _db = await openDB("offline-sync-db", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("offlineQueue")) {
        const store = db.createObjectStore("offlineQueue", { keyPath: "id" })
        store.createIndex("byTenant", "tenant_id", { unique: false })
        store.createIndex("bySynced", "synced", { unique: false })
        store.createIndex("byTime", "timestamp", { unique: false })
      }
    },
  })
  return _db
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
