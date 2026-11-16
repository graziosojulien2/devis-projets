// Garde l'appli (pas les données) en cache pour qu'elle s'ouvre vite, et reçoit les fichiers
// partagés depuis le téléphone (« Partager » → Factures) pour les proposer à l'import.
const CACHE = 'factures-enfants-v3'
self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== 'share-inbox').map(k => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  if (e.request.method === 'POST' && url.origin === location.origin && url.searchParams.has('share')) {
    e.respondWith((async () => {
      try {
        const form = await e.request.formData()
        const inbox = await caches.open('share-inbox')
        let n = 0
        for (const f of form.getAll('file')) {
          if (!(f instanceof File)) continue
          await inbox.put(new Request(`./__share/${Date.now()}-${n++}`), new Response(f, { headers: { 'content-type': f.type || 'application/octet-stream', 'x-name': encodeURIComponent(f.name || 'facture') } }))
        }
      } catch {}
      return Response.redirect(new URL('./?share=1', self.registration.scope).href, 303)
    })())
    return
  }
  if (e.request.method !== 'GET' || url.origin !== location.origin) return   // Google : jamais en cache
  e.respondWith(
    fetch(e.request)
      .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r })
      .catch(() => caches.match(e.request))
  )
})
