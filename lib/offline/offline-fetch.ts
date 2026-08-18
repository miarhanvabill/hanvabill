export async function offlineFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = init?.method?.toUpperCase() || "GET";
  const isWrite = ["POST", "PUT", "DELETE"].includes(method);

  // --- Handle writes ---
  if (isWrite) {
    if (navigator.onLine) {
      return fetch(input, init);
    } else {
      // If offline, let SW handle queueing (just try fetch, it will be intercepted)
      return fetch(input, init).catch(() => {
        return new Response(
          JSON.stringify({ queued: true, offline: true }),
          { status: 202, headers: { "Content-Type": "application/json" } }
        );
      });
    }
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
