import { addToQueue, type QueueRecord } from "./idb-queue"

export async function offlineFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = init?.method?.toUpperCase() || "GET";
  const isWrite = ["POST", "PUT", "DELETE"].includes(method);

  // --- Handle writes ---
  if (isWrite) {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      try {
        const res = await fetch(input, init);
        return res;
      } catch (err) {
        // Network drop during online state; fall through to offline queueing
        console.warn("[offlineFetch] Network request failed, queueing offline:", err);
      }
    }

    // Direct IndexedDB queue fallback
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
    let parsedBody: any = {};
    if (init?.body) {
      try {
        parsedBody = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
      } catch {
        parsedBody = init.body;
      }
    }

    const headersObj: Record<string, string> = {};
    if (init?.headers) {
      if (typeof Headers !== "undefined" && init.headers instanceof Headers) {
        init.headers.forEach((v, k) => { headersObj[k] = v });
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([k, v]) => { headersObj[k] = v });
      } else {
        Object.assign(headersObj, init.headers);
      }
    }

    const tenantId = headersObj["x-tenant-id"] || parsedBody?.tenant_id || "default";

    const record: QueueRecord = {
      id: `client_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      tenant_id: tenantId,
      endpoint: urlStr,
      method: method as "POST" | "PUT" | "DELETE",
      payload: parsedBody,
      headers: headersObj,
      synced: false,
      timestamp: Date.now()
    };

    try {
      await addToQueue(record);
    } catch (e) {
      console.warn("[offlineFetch] Failed to queue record in IDB:", e);
    }

    return new Response(
      JSON.stringify({ queued: true, offline: true, id: record.id }),
      { status: 202, headers: { "Content-Type": "application/json" } }
    );
  }

  // --- Handle reads (GET) ---
  if (method === "GET") {
    try {
      if (navigator.onLine) {
        const res = await fetch(input, init);

        // Clone & update cache so SW has backup
        if (res.ok) {
          const cache = await caches.open("offline-api-cache");
          cache.put(input, res.clone());
        }

        return res;
      } else {
        // Offline → try SW cache
        const cache = await caches.open("offline-api-cache");
        const cachedRes = await cache.match(input);

        if (cachedRes) {
          return cachedRes;
        } else {
          return new Response(
            JSON.stringify({ error: "Offline and no cached data" }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          );
        }
      }
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Fetch failed", detail: String(err) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Fallback
  return fetch(input, init);
}
