// ─── Stockage : Google Drive (en ligne) ou local (tests sur l'ordinateur) ─────
// En ligne, tout est rangé dans le Drive de Julien, dossier « Factures Enfants » :
//   factures-enfants-donnees.json   ← factures, virements, réglages (enregistré automatiquement)
//   Factures/<année>/<enfant>/…     ← les PDF et photos de factures
//   Photos/                         ← photos de Nina et Noah
// L'accès « drive.file » ne permet à l'appli de voir QUE les fichiers qu'elle a créés.

export const CONFIG = {
  CLIENT_ID: '1069704452468-mh97qnfbt0n6l2jvdgl65g2g218g4uf7.apps.googleusercontent.com',
  EMAIL:     'grazioso.julien@gmail.com',
  SCOPE:     'https://www.googleapis.com/auth/drive.file openid email',
  FOLDER:    'Factures Enfants',
  DATA:      'factures-enfants-donnees.json',
}

export const IS_CLOUD = typeof location !== 'undefined'
  && /^https?:$/.test(location.protocol)
  && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)
  && !new URLSearchParams(location.search).has('local')

const DAPI = 'https://www.googleapis.com/drive/v3/files'
const UAPI = 'https://www.googleapis.com/upload/drive/v3/files'
const TOKK = 'factures-enfants.tok'
const CONSK = 'factures-enfants.consent'

const G = { token: null, exp: 0, client: null, pend: null, rootId: '', dataId: '', remoteMod: '', folders: {} }
const bytesCache = new Map()

// ── Connexion Google ─────────────────────────────────────────────────────────
function gisReady() {
  return new Promise((res, rej) => {
    let n = 0
    const t = setInterval(() => {
      if (window.google?.accounts?.oauth2) { clearInterval(t); res() }
      else if (++n > 150) { clearInterval(t); rej(new Error('le service de connexion Google ne répond pas')) }
    }, 100)
  })
}
async function initClient() {
  if (G.client) return
  await gisReady()
  G.client = google.accounts.oauth2.initTokenClient({ client_id: CONFIG.CLIENT_ID, scope: CONFIG.SCOPE, login_hint: CONFIG.EMAIL, callback: () => {} })
}
function requestToken(prompt) {
  return new Promise(async (res, rej) => {
    try { await initClient() } catch (e) { return rej(e) }
    G.client.callback = (r) => {
      if (!r || r.error) return rej(new Error(r?.error_description || r?.error || 'connexion refusée'))
      G.token = r.access_token
      G.exp = Date.now() + (Number(r.expires_in || 3600) - 120) * 1000
      try { sessionStorage.setItem(TOKK, JSON.stringify({ token: G.token, exp: G.exp })) } catch {}
      res(G.token)
    }
    G.client.error_callback = (e) => rej(new Error(
      e?.type === 'popup_closed' ? 'fenêtre de connexion fermée'
      : e?.type === 'popup_failed_to_open' ? 'fenêtre de connexion bloquée par le navigateur'
      : (e?.type || 'erreur')))
    G.client.requestAccessToken({ prompt: prompt ?? '' })
  })
}
async function ensureToken() {
  if (G.token && Date.now() < G.exp) return G.token
  if (!G.pend) G.pend = requestToken('').finally(() => { G.pend = null })
  await G.pend
  if (G.token && Date.now() < G.exp) return G.token
  throw new Error('session Google expirée')
}
// Renouvelle la session pendant un clic, avant qu'elle n'expire
export function keepAlive() {
  if (!IS_CLOUD) return
  if (G.token && !G.pend && G.exp - Date.now() < 10 * 60e3) {
    G.pend = requestToken('').catch(() => {}).finally(() => { G.pend = null })
  }
}

async function gfetch(url, opt = {}, retry = true) {
  const tok = await ensureToken()
  const r = await fetch(url, { ...opt, headers: { ...(opt.headers || {}), Authorization: 'Bearer ' + tok } })
  if (r.status === 401 && retry) { G.token = null; G.exp = 0; return gfetch(url, opt, false) }
  if (!r.ok) {
    let m = 'erreur ' + r.status
    try { const j = await r.json(); m = j.error?.message || m } catch {}
    throw new Error(m)
  }
  return r
}

const qesc = (v) => String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
async function dFind(name, parent, folder) {
  const q = `name='${qesc(name)}' and trashed=false${parent ? ` and '${parent}' in parents` : ''}${folder ? " and mimeType='application/vnd.google-apps.folder'" : ''}`
  const r = await gfetch(`${DAPI}?q=${encodeURIComponent(q)}&fields=${encodeURIComponent('files(id,modifiedTime)')}&orderBy=modifiedTime%20desc&pageSize=5&spaces=drive`)
  return ((await r.json()).files || [])[0] || null
}
async function dFolder(name, parent) {
  const f = await dFind(name, parent, true)
  if (f) return f.id
  const r = await gfetch(DAPI + '?fields=id', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', ...(parent ? { parents: [parent] } : {}) }),
  })
  return (await r.json()).id
}
async function folderPath(parts) {
  let parent = G.rootId, key = ''
  for (const p of parts) {
    key += '/' + p
    if (!G.folders[key]) G.folders[key] = await dFolder(p, parent)
    parent = G.folders[key]
  }
  return parent
}
async function dCreate(name, parent, blob) {
  const fd = new FormData()
  fd.append('metadata', new Blob([JSON.stringify({ name, parents: [parent] })], { type: 'application/json' }))
  fd.append('file', blob)
  return (await gfetch(UAPI + '?uploadType=multipart&fields=id,modifiedTime', { method: 'POST', body: fd })).json()
}
async function dUpdate(id, blob) {
  return (await gfetch(`${UAPI}/${id}?uploadType=media&fields=id,modifiedTime`, {
    method: 'PATCH', headers: { 'content-type': blob.type || 'application/octet-stream' }, body: blob,
  })).json()
}
async function dMeta(id) { return (await gfetch(`${DAPI}/${id}?fields=id,modifiedTime,trashed`)).json() }

// ── Petit stockage local (mode test sur l'ordinateur) ────────────────────────
const LOCAL_DATA = 'factures-enfants-local-data'
function idb() {
  return new Promise((res, rej) => {
    const rq = indexedDB.open('factures-enfants-local', 1)
    rq.onupgradeneeded = () => rq.result.createObjectStore('files')
    rq.onsuccess = () => res(rq.result)
    rq.onerror = () => rej(rq.error)
  })
}
async function idbDo(mode, fn) {
  const db = await idb()
  return new Promise((res, rej) => {
    const tx = db.transaction('files', mode)
    const rq = fn(tx.objectStore('files'))
    tx.oncomplete = () => res(rq?.result)
    tx.onerror = () => rej(tx.error)
  })
}

// ── API utilisée par l'application ───────────────────────────────────────────
export async function resumeSession() {
  if (!IS_CLOUD) return CONFIG.EMAIL
  try {
    const t = JSON.parse(sessionStorage.getItem(TOKK) || 'null')
    if (t && t.exp > Date.now()) { G.token = t.token; G.exp = t.exp; return await checkAccount() }
  } catch (e) { if (e.message?.includes('autorisé')) throw e }
  return null
}
export async function signIn() {
  if (!IS_CLOUD) return CONFIG.EMAIL
  let consent = false
  try { consent = localStorage.getItem(CONSK) === '1' } catch {}
  await requestToken(consent ? '' : 'consent')
  try { localStorage.setItem(CONSK, '1') } catch {}
  return checkAccount()
}
async function checkAccount() {
  const u = await (await gfetch('https://www.googleapis.com/oauth2/v3/userinfo')).json()
  const email = (u.email || '').toLowerCase()
  if (email !== CONFIG.EMAIL) {
    signOut()
    throw new Error(`Le compte ${u.email || 'inconnu'} n’est pas autorisé. Connecte-toi avec ${CONFIG.EMAIL}.`)
  }
  return email
}
export function signOut() {
  try { sessionStorage.removeItem(TOKK) } catch {}
  if (G.token && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(G.token, () => {})
  Object.assign(G, { token: null, exp: 0, rootId: '', dataId: '', remoteMod: '', folders: {} })
  bytesCache.clear()
}

// Charge le fichier de données (null si c'est la première fois)
export async function loadData() {
  if (!IS_CLOUD) {
    try { return JSON.parse(localStorage.getItem(LOCAL_DATA) || 'null') } catch { return null }
  }
  G.rootId = await dFolder(CONFIG.FOLDER)
  const df = await dFind(CONFIG.DATA, G.rootId)
  if (!df) return null
  G.dataId = df.id
  G.remoteMod = df.modifiedTime
  return (await gfetch(`${DAPI}/${df.id}?alt=media`)).json()
}

// Enregistre tout le fichier de données. Renvoie { changedElsewhere }
export async function saveData(doc) {
  const blob = new Blob([JSON.stringify(doc)], { type: 'application/json' })
  if (!IS_CLOUD) { localStorage.setItem(LOCAL_DATA, JSON.stringify(doc)); return {} }
  if (!G.rootId) G.rootId = await dFolder(CONFIG.FOLDER)
  if (!G.dataId) {
    const r = await dCreate(CONFIG.DATA, G.rootId, blob)
    G.dataId = r.id; G.remoteMod = r.modifiedTime
    return {}
  }
  let changedElsewhere = false
  try { const m = await dMeta(G.dataId); changedElsewhere = !!(G.remoteMod && m.modifiedTime > G.remoteMod) } catch {}
  const r = await dUpdate(G.dataId, blob)
  G.remoteMod = r.modifiedTime
  return { changedElsewhere }
}

// Données modifiées depuis un autre appareil ? (renvoie les nouvelles données ou null)
export async function fetchIfChanged() {
  if (!IS_CLOUD || !G.dataId || !(G.token && Date.now() < G.exp)) return null
  const m = await dMeta(G.dataId)
  if (m.modifiedTime <= G.remoteMod) return null
  const doc = await (await gfetch(`${DAPI}/${G.dataId}?alt=media`)).json()
  G.remoteMod = m.modifiedTime
  return doc
}

// Envoie un fichier dans un sous-dossier, ex. ['Factures', '2026', 'Nina']
export async function uploadFile(blob, name, path) {
  if (!IS_CLOUD) {
    const id = 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
    const buf = new Uint8Array(await blob.arrayBuffer())
    await idbDo('readwrite', s => s.put({ buf, type: blob.type }, id))
    bytesCache.set(id, buf)
    return { id }
  }
  if (!G.rootId) G.rootId = await dFolder(CONFIG.FOLDER)
  const parent = await folderPath(path)
  const r = await dCreate(name, parent, blob)
  const buf = new Uint8Array(await blob.arrayBuffer())
  bytesCache.set(r.id, buf)
  return { id: r.id }
}

export async function getFileBytes(id) {
  if (bytesCache.has(id)) return bytesCache.get(id)
  let buf
  if (!IS_CLOUD) {
    const rec = await idbDo('readonly', s => s.get(id))
    if (!rec) throw new Error('fichier introuvable')
    buf = rec.buf
  } else {
    buf = new Uint8Array(await (await gfetch(`${DAPI}/${id}?alt=media`)).arrayBuffer())
  }
  bytesCache.set(id, buf)
  return buf
}

export async function trashFile(id) {
  bytesCache.delete(id)
  if (!id) return
  if (!IS_CLOUD) { await idbDo('readwrite', s => s.delete(id)); return }
  await gfetch(`${DAPI}/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ trashed: true }) })
}

export function folderUrl() {
  return G.rootId ? `https://drive.google.com/drive/folders/${G.rootId}` : 'https://drive.google.com/drive/my-drive'
}
