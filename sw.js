const CACHE = "tienda-v3";
const CORE = [
  "./", "./index.html", "./manifest.json",
  "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url; try { url = new URL(req.url); } catch (_) { return; }

  // NUNCA cachear la base de datos (Supabase): siempre datos frescos
  if (url.hostname.endsWith("supabase.co") || url.hostname.endsWith("supabase.in")) return;

  const isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  if (isHTML) {
    e.respondWith(
      fetch(req).then(resp => { const copy = resp.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)).catch(()=>{}); return resp; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Archivos propios e íconos: caché primero
  e.respondWith(
    caches.match(req).then(hit =>
      hit || fetch(req).then(resp => { const copy = resp.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{}); return resp; })
        .catch(() => hit)
    )
  );
});
