// Garde l'appli (pas les données) en cache pour qu'elle s'ouvre vite, même avec un réseau faible.
const CACHE = 'factures-enfants-v2'
self.addEventListener('install', e => { self.skipWaiting() })
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return   // Google : jamais en cache
  e.respondWith(
    fetch(e.request)
      .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r })
      .catch(() => caches.match(e.request))
  )
})
