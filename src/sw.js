/* sw.js — Service worker: makes MarsWalk an installable app that works with NO network.
   Astronauts on Mars have no live internet link, so everything the planner needs is stored on the device.

   Strategy:
     - App shell + data (HTML, CSS, JS, grids, overlays, photos): network-first, fall back to cache.
       (Online you always get the newest version; offline you get the last one you saw.)
     - HiRISE tiles + Leaflet library: cache-first (they never change).
     - Global basemap tiles (OpenPlanetaryMap): cache-first with a size cap.
   Bump CACHE_VERSION when the shell list changes. */

const CACHE_VERSION = 'marswalk-v6';
const SHELL_CACHE = CACHE_VERSION + '-shell';
const TILE_CACHE  = CACHE_VERSION + '-tiles';
const OPM_CACHE   = CACHE_VERSION + '-opm';
const OPM_MAX_ENTRIES = 600;   // global basemap tiles kept for offline context

const SHELL_FILES = [
  './', './index.html', './manifest.webmanifest',
  './css/styles.css', './css/hud.css', './css/marsclock.css', './css/app.css',
  './js/config.js', './js/state.js', './js/map.js', './js/search.js', './js/grid.js', './js/layers.js',
  './js/site-layers.js', './js/route.js', './js/route-worker.js', './js/safety.js', './js/consumables.js', './js/hazards.js', './js/interact.js', './js/traverse.js',
  './js/targets.js', './js/pov.js', './js/profile.js', './js/ui.js', './js/hud.js', './js/marsclock.js',
  './js/brief.js', './js/tour.js', './js/terrain3d.js', './js/app.js', './js/main.js', './css/terrain3d.css',
  './data/hirise-texture.jpg',
  './data/aoi.json', './data/elevation.bin', './data/slope.bin', './data/roughness.bin',
  './data/hillshade.png', './data/slope-overlay.png', './data/relief-overlay.png', './data/los-overlay.png',
  './data/rad-overlay.png', './data/themis-day.png', './data/themis-night.png',
  './data/targets.geojson', './data/curiosity-traverse.geojson', './data/pov-images.json',
  './data/rad-baseline.json', './data/rems-temps.json',
  './icons/icon-192.png', './icons/icon-512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

/* Install: store the app shell. Missing optional files do not break the install. */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.all(SHELL_FILES.map(url =>
      cache.add(new Request(url, { cache: 'reload' })).catch(() => null)));
    // POV photos are listed in pov-images.json
    try {
      const pov = await (await fetch('./data/pov-images.json', { cache: 'reload' })).json();
      await Promise.all((pov.images || []).map(p => cache.add('./data/pov/' + p.filename).catch(() => null)));
    } catch (e) { /* offline install: photos cached on first view */ }
    self.skipWaiting();
  })());
});

/* Activate: delete caches from older versions. */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !k.startsWith(CACHE_VERSION)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* Removes the oldest entries so a cache stays under maxEntries. */
async function trimCache(name, maxEntries) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - maxEntries; i++) await cache.delete(keys[i]);
}

/* Cache-first: answer from cache, else fetch and store. */
async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  try {
    const resp = await fetch(request);
    if (resp && (resp.ok || resp.type === 'opaque')) {
      cache.put(request, resp.clone());
      if (maxEntries) trimCache(cacheName, maxEntries);
    }
    return resp;
  } catch (e) {
    return new Response('', { status: 504, statusText: 'offline' });
  }
}

/* Network-first: fresh when online, cached copy when offline. */
async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const resp = await fetch(request);
    if (resp && resp.ok) cache.put(request, resp.clone());
    return resp;
  } catch (e) {
    const hit = await cache.match(request, { ignoreSearch: true });
    if (hit) return hit;
    if (request.mode === 'navigate') return cache.match('./index.html');
    return new Response('', { status: 504, statusText: 'offline' });
  }
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.includes('/tiles/hirise/') || url.hostname === 'unpkg.com' || url.href.startsWith('https://cdn.jsdelivr.net/npm/three@0.160.0/')) {
    event.respondWith(cacheFirst(req, TILE_CACHE));
  } else if (url.hostname.includes('cartocdn') || url.hostname.includes('fastly.net')) {
    event.respondWith(cacheFirst(req, OPM_CACHE, OPM_MAX_ENTRIES));
  } else if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(req));
  }
});

/* Message from the page: download every HiRISE tile for full offline use. Reports progress back. */
self.addEventListener('message', event => {
  if (!event.data || event.data.type !== 'download-offline-pack') return;
  const client = event.source;
  event.waitUntil((async () => {
    const cache = await caches.open(TILE_CACHE);
    const index = await (await fetch('./tiles/hirise/index.json')).json();
    let done = 0;
    const urls = index.tiles;
    const BATCH = 12;
    for (let i = 0; i < urls.length; i += BATCH) {
      await Promise.all(urls.slice(i, i + BATCH).map(async u => {
        if (!(await cache.match(u))) { try { await cache.add(u); } catch (e) { /* skip */ } }
        done++;
      }));
      client && client.postMessage({ type: 'offline-pack-progress', done, total: urls.length });
    }
    client && client.postMessage({ type: 'offline-pack-done', total: urls.length });
  })());
});
