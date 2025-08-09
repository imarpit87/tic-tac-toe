const VERSION_URL = './version.json';
let RUNTIME_CACHE = 'ttt-cache-v1';

async function getVersion() {
  try {
    const res = await fetch(VERSION_URL, { cache: 'no-store' });
    const data = await res.json();
    return data.version || 'dev';
  } catch {
    return 'dev';
  }
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const ver = await getVersion();
    RUNTIME_CACHE = `ttt-cache-${ver}`;
    // Precache core with cache-busting
    const assets = [
      `./`,
      `./index.html`,
      `./styles.css?v=${ver}`,
      `./app.js?v=${ver}`,
      `./ai.js`,
      `./confetti.js`,
      `./version.json`
    ];
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.addAll(assets);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const ver = await getVersion();
    RUNTIME_CACHE = `ttt-cache-${ver}`;
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('ttt-cache-') && k !== RUNTIME_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // Network-first for latest assets; fallback to cache
  e.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: 'no-store' });
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      throw err;
    }
  })());
});