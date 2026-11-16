import { useState, useEffect, useRef, useMemo, useContext, createContext } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url'
import fontDisplay from './fonts/bricolage.woff2'
import fontBody from './fonts/figtree.woff2'
import { textFeatures, guessChild, guessAmount, findDuplicatePairs, matchesFor, LEVELS, pairKey, CATEGORIES, CAT, guessCategory, extractPayment, stripPayment, schoolYearOf } from './doublons.js'
import { createPortal } from 'react-dom'
import * as cloud from './cloud.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

// ─── Constantes ──────────────────────────────────────────────────────────────
const PhotoContext = createContext({})

const MONTHS_FR    = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const MONTHS_SHORT = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.']
const CHILDREN = {
  NINA: { label: 'Nina', cls: 'nina' },
  NOAH: { label: 'Noah', cls: 'noah' },
}

const fmt      = (n) => new Intl.NumberFormat('fr-FR', { style:'currency', currency:'EUR' }).format(n || 0)
const fmtDate  = (d) => new Date(d).toLocaleDateString('fr-FR')
const fmtLong  = (d) => new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })
const today    = () => new Date().toISOString().split('T')[0]
const num      = (v) => parseFloat(String(v || '0').replace(',', '.')) || 0
const shareOf  = (inv) => (inv.share === undefined || inv.share === null || inv.share === '' ? 50 : Number(inv.share))
const halfOf   = (inv) => inv.amount * shareOf(inv) / 100        // ta part de la facture
const sumHalf  = (list) => list.reduce((s, i) => s + halfOf(i), 0)
const plural   = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`

const isImage  = (mime) => (mime || '').startsWith('image/')
const safeName = (s) => (s || 'facture').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90)
const extOf    = (mime) => ({ 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' }[mime] || 'bin')
function dataUrlBytes(dataUrl) {
  const bin = atob(dataUrl.split(',')[1] || '')
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function bytesToDataUrl(bytes, mime) {
  return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(new Blob([bytes], { type: mime })) })
}

// ─── Lecture d'un fichier pour l'analyse (empreinte + texte) ──────────────────
async function hashBytes(bytes) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', bytes)
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    let h = 2166136261
    for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 16777619) }
    return 'fnv' + (h >>> 0).toString(16) + '-' + bytes.length
  }
}
// Renvoie { fp, text } : fp est l'empreinte enregistrée avec la facture (pour ne pas relire le PDF)
async function analyseFile(bytes, mime = 'application/pdf') {
  const hash = await hashBytes(bytes)
  let text = ''
  if (!isImage(mime)) {
    try {
      const pdf = await pdfjsLib.getDocument({ data: bytes.slice() }).promise
      for (let p = 1; p <= Math.min(pdf.numPages, 4); p++) {
        const content = await (await pdf.getPage(p)).getTextContent()
        text += content.items.map(i => i.str).join(' ') + '\n'
      }
      pdf.destroy()
    } catch { /* PDF scanné ou illisible */ }
  }
  // Scan ou photo sans texte : Google Drive en fait la lecture (OCR)
  let ocr = false
  if (text.replace(/\s/g, '').length < 40) {
    try { const t = await cloud.ocrText(bytes, mime); if (t && t.trim()) { text = t; ocr = true } } catch {}
  }
  const f = textFeatures(text)
  return { fp: { hash, tokens: [...f.tokens], nums: [...f.nums], ...(ocr ? { ocr: true } : {}) }, text }
}
const featOf = (fp) => fp ? { hash: fp.hash, tokens: new Set(fp.tokens || []), nums: new Set(fp.nums || []) } : null

// ─── Icônes ───────────────────────────────────────────────────────────────────
const PATHS = {
  file:    'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
  send:    'M4 12h12M12 6l6 6-6 6M20 4v16',
  chart:   'M4 20V10M10 20V4M16 20v-7M22 20H2',
  save:    'M12 3v12M7 10l5 5 5-5M5 21h14',
  upload:  'M12 21V9M7 14l5-5 5 5M5 3h14',
  eye:     'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  edit:    'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  trash:   'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  close:   'M6 6l12 12M18 6L6 18',
  check:   'M5 12.5l4.5 4.5L19 7',
  undo:    'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  plus:    'M12 5v14M5 12h14',
  search:  'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  chevL:   'M15 6l-6 6 6 6',
  chevR:   'M9 6l6 6-6 6',
  link:    'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
  note:    'M5 5h14v10l-4 4H5zM15 19v-4h4',
  copy:    'M8 8h11v11H8zM5 16V5h11',
  card:    'M3 6h18v12H3zM3 10h18M7 15h3',
  print:   'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  clip:    'M16 7l-7.5 7.5a2.5 2.5 0 0 0 3.5 3.5L20 10a4.5 4.5 0 0 0-6.4-6.4L5.5 11.7a6.5 6.5 0 0 0 9.2 9.2L19 16.5',
  gear:    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  spark:   'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18',
}
function Icon({ name, size = 18, stroke = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="icon">
      <path d={PATHS[name]} />
    </svg>
  )
}

// ─── Petits composants ───────────────────────────────────────────────────────
function Avatar({ child, size = 20 }) {
  const c = CHILDREN[child]
  if (!c) return null
  const photos = useContext(PhotoContext)
  if (!photos[child]) return <span className={`avatar initial ${c.cls}`} style={{ width: size, height: size, fontSize: size * 0.48 }} aria-hidden="true">{c.label[0]}</span>
  return <img className={`avatar ${c.cls}`} src={photos[child]} alt="" width={size} height={size} style={{ width: size, height: size }}/>
}
function ChildLabel({ child, size = 20 }) {
  return <span className="child-label"><Avatar child={child} size={size}/>{CHILDREN[child].label}</span>
}
function ChildTag({ child }) {
  const c = CHILDREN[child]
  if (!c) return <span className="child-tag none">Non attribuée</span>
  return <span className={`child-tag ${c.cls}`}><Avatar child={child} size={18}/>{c.label}</span>
}

function Field({ label, hint, children, wide }) {
  return (
    <label className={`field${wide ? ' wide' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

function Segmented({ value, onChange, options, ariaLabel }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={ariaLabel}>
      {options.map(o => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value}
          className={`seg-btn ${o.cls || ''}${value === o.value ? ' on' : ''}`}
          onClick={() => onChange(o.value)}>
          {o.label}{o.count !== undefined && <span className="seg-count">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

function Modal({ title, onClose, children, width = 560, tone }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal${tone ? ' ' + tone : ''}`} style={{ maxWidth: width }} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer"><Icon name="close" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Lecteur de fichier (PDF ou photo) ───────────────────────────────────────
function useFileBytes(fileId, bytes) {
  const [state, setState] = useState({ bytes: bytes || null, error: '' })
  useEffect(() => {
    if (bytes) { setState({ bytes, error: '' }); return }
    if (!fileId) { setState({ bytes: null, error: 'Aucun fichier joint.' }); return }
    let alive = true
    setState({ bytes: null, error: '' })
    cloud.getFileBytes(fileId)
      .then(b => alive && setState({ bytes: b, error: '' }))
      .catch(e => alive && setState({ bytes: null, error: 'Impossible de récupérer le fichier dans Drive : ' + e.message }))
    return () => { alive = false }
  }, [fileId, bytes])
  return state
}
function FileViewer({ fileId, bytes, mime = 'application/pdf', height = 480 }) {
  const st = useFileBytes(fileId, bytes)
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!st.bytes || !isImage(mime)) return
    const u = URL.createObjectURL(new Blob([st.bytes], { type: mime }))
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [st.bytes, mime])
  if (st.error) return <div className="pdf-state" style={{ height }}><Icon name="file" size={28}/>{st.error}</div>
  if (!st.bytes) return <div className="pdf-state" style={{ height }}><span className="spinner"/>Chargement depuis Drive…</div>
  if (isImage(mime)) return <div className="img-viewer" style={{ maxHeight: height }}>{url && <img src={url} alt="Facture"/>}</div>
  return <PdfViewer data={st.bytes} height={height}/>
}

function PdfViewer({ data, height = 480 }) {
  const canvasRef    = useRef()
  const [page,     setPage]     = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const pdfDocRef    = useRef(null)
  const renderingRef = useRef(false)
  const taskRef      = useRef(null)

  useEffect(() => {
    if (!data) return
    setLoading(true); setError(''); setPage(1)
    const task = pdfjsLib.getDocument({ data: data.slice() })
    taskRef.current = task
    task.promise
      .then(pdf => { pdfDocRef.current = pdf; setNumPages(pdf.numPages); setLoading(false) })
      .catch(e  => { if (e?.name !== 'PasswordException') setError('Impossible d’ouvrir ce PDF.') })
    return () => {
      if (taskRef.current)   { taskRef.current.destroy();   taskRef.current = null }
      if (pdfDocRef.current) { pdfDocRef.current.destroy(); pdfDocRef.current = null }
    }
  }, [data])

  useEffect(() => {
    if (loading || !pdfDocRef.current || renderingRef.current) return
    renderingRef.current = true
    pdfDocRef.current.getPage(page).then(pdfPage => {
      const canvas = canvasRef.current
      if (!canvas) { renderingRef.current = false; return }
      const w        = canvas.parentElement?.clientWidth || 560
      const ratio    = window.devicePixelRatio || 1
      const vp0      = pdfPage.getViewport({ scale: 1 })
      const viewport = pdfPage.getViewport({ scale: (w / vp0.width) * ratio })
      canvas.width   = viewport.width
      canvas.height  = viewport.height
      pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
        .then(() => { renderingRef.current = false })
        .catch(() => { renderingRef.current = false })
    })
  }, [page, loading])

  if (error)   return <div className="pdf-state" style={{ height }}><Icon name="file" size={28}/>{error}</div>
  if (loading) return <div className="pdf-state" style={{ height }}><span className="spinner"/>Ouverture du PDF…</div>

  return (
    <div className="pdf-viewer">
      <div className="pdf-scroll" style={{ maxHeight: numPages > 1 ? height - 44 : height }}>
        <canvas ref={canvasRef}/>
      </div>
      {numPages > 1 && (
        <div className="pdf-pager">
          <button className="icon-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Page précédente"><Icon name="chevL"/></button>
          <span>Page {page} sur {numPages}</span>
          <button className="icon-btn" onClick={() => setPage(p => Math.min(numPages, p + 1))} disabled={page === numPages} aria-label="Page suivante"><Icon name="chevR"/></button>
        </div>
      )}
    </div>
  )
}

// ─── Formulaire facture (import + modification) ─────────────────────────────
function CategorySelect({ value, onChange, allLabel }) {
  return (
    <div className="select-wrap">
      {value && CAT[value] && <i className="cat-dot" style={{ background: CAT[value].color }}/>}
      <select className="input select" value={value} onChange={e => onChange(e.target.value)} aria-label="Catégorie">
        <option value="">{allLabel || 'Choisir…'}</option>
        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
    </div>
  )
}
function CategoryTag({ id }) {
  const c = CAT[id]
  if (!c) return null
  return <span className="cat-tag"><i className="cat-dot" style={{ background: c.color }}/>{c.label}</span>
}
function Secret({ value }) {
  const [show, setShow] = useState(false)
  return (
    <span className="secret">
      <code>{show ? value : '••••••••'}</code>
      <button type="button" className="mini-btn" onClick={() => setShow(v => !v)}>{show ? 'Masquer' : 'Afficher'}</button>
    </span>
  )
}
function CopyBtn({ value, label }) {
  const [done, setDone] = useState(false)
  return (
    <button type="button" className="mini-btn" onClick={async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500) } catch {} }}>
      {done ? 'Copié' : (label || 'Copier')}
    </button>
  )
}
function PayInfo({ inv }) {
  if (!inv.payUrl && !inv.payLogin && !inv.payPassword) return null
  return (
    <div className="pay-info">
      {inv.payUrl && <a className="pay-link" href={inv.payUrl} target="_blank" rel="noreferrer"><Icon name="card" size={15}/>Payer en ligne</a>}
      {inv.payLogin && <span className="pay-item">Identifiant <code>{inv.payLogin}</code><CopyBtn value={inv.payLogin}/></span>}
      {inv.payPassword && <span className="pay-item">Mot de passe <Secret value={inv.payPassword}/><CopyBtn value={inv.payPassword}/></span>}
    </div>
  )
}

function InvoiceFields({ form, setForm, showStatus }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const [showPwd, setShowPwd] = useState(false)
  const share = form.share === '' || form.share === undefined ? '50' : String(form.share)
  const shareMode = share === '50' || share === '100' ? share : 'autre'
  const part = num(form.amount) * num(share) / 100
  return (
    <div className="form-grid">
      <Field label="Description" wide>
        <input className="input" value={form.description} onChange={set('description')} placeholder="Ex : cantine 2e trimestre"/>
      </Field>
      <Field label="Enfant concerné" wide>
        <Segmented ariaLabel="Enfant" value={form.child} onChange={v => setForm({ ...form, child: v })}
          options={[{ value:'NINA', label:<ChildLabel child="NINA" size={22}/>, cls:'nina' }, { value:'NOAH', label:<ChildLabel child="NOAH" size={22}/>, cls:'noah' }, { value:'', label:'Aucun' }]}/>
      </Field>
      <Field label="Catégorie">
        <CategorySelect value={form.category || ''} onChange={v => setForm({ ...form, category: v })}/>
      </Field>
      <Field label="Montant total" hint={form.amount ? `Ta part : ${fmt(part)}` : undefined}>
        <div className="input-euro">
          <input className="input" type="number" step="0.01" min="0" value={form.amount} onChange={set('amount')} placeholder="0,00"/>
          <span>€</span>
        </div>
      </Field>
      <Field label="Ta part" wide>
        <div className="share-row">
          <Segmented ariaLabel="Ta part" value={shareMode} onChange={v => setForm({ ...form, share: v === 'autre' ? (shareMode === 'autre' ? share : '30') : v })}
            options={[{ value: '50', label: 'Moitié' }, { value: '100', label: 'Tout pour moi' }, { value: 'autre', label: 'Autre' }]}/>
          {shareMode === 'autre' && (
            <div className="input-euro share-input">
              <input className="input" type="number" min="0" max="100" step="1" value={share} onChange={set('share')} aria-label="Pourcentage"/>
              <span>%</span>
            </div>
          )}
        </div>
      </Field>
      <Field label="Date de réception">
        <input className="input" type="date" value={form.date} onChange={set('date')}/>
      </Field>
      <Field label="Numéro de facture">
        <input className="input" value={form.invoiceNumber} onChange={set('invoiceNumber')} placeholder="Ex : FAC-2026-0042"/>
      </Field>
      <Field label="Date d’édition">
        <input className="input" type="date" value={form.editionDate} onChange={set('editionDate')}/>
      </Field>
      {showStatus && (
        <Field label="Statut" wide>
          <Segmented ariaLabel="Statut" value={form.status} onChange={v => setForm({ ...form, status: v })}
            options={[{ value:'en_cours', label:'À payer', cls:'pending' }, { value:'paye', label:'Payée', cls:'paid' }]}/>
        </Field>
      )}
      <Field label="Lien de paiement" wide>
        <input className="input" type="url" value={form.payUrl || ''} onChange={set('payUrl')} placeholder="https://…"/>
      </Field>
      <Field label="Identifiant">
        <input className="input" value={form.payLogin || ''} onChange={set('payLogin')} autoComplete="off"/>
      </Field>
      <Field label="Mot de passe">
        <div className="input-euro">
          <input className="input" type={showPwd ? 'text' : 'password'} value={form.payPassword || ''} onChange={set('payPassword')} autoComplete="new-password"/>
          <button type="button" className="mini-btn in-input" onClick={() => setShowPwd(v => !v)}>{showPwd ? 'Masquer' : 'Afficher'}</button>
        </div>
      </Field>
      <Field label="Commentaire" wide>
        <textarea className="input" rows={2} value={form.comment} onChange={set('comment')} placeholder="Contexte, période, remarque…"/>
      </Field>
    </div>
  )
}

// ─── Doublons ────────────────────────────────────────────────────────────────
function MiniInvoice({ inv, vir, onView, onDelete }) {
  const paid = inv.status === 'paye'
  return (
    <div className="mini-inv">
      <div className="mini-inv-top">
        <strong>{inv.description}</strong>
        <ChildTag child={inv.child}/>
      </div>
      <div className="mini-inv-meta">
        <span>Reçue le {fmtDate(inv.date)}</span>
        {inv.invoiceNumber && <span>N° {inv.invoiceNumber}</span>}
      </div>
      <div className="mini-inv-bottom">
        <span className="mini-inv-amt">{fmt(inv.amount)}</span>
        <span className={`pill ${paid ? 'paid' : 'pending'}`}>{paid ? (vir ? `Payée · virement du ${fmtDate(vir.date)}` : 'Payée') : 'À payer'}</span>
        <span className="mini-inv-actions">
          {inv.fileId && onView && <button className="icon-btn" onClick={() => onView(inv)} aria-label="Voir le PDF" title="Voir le PDF"><Icon name="eye"/></button>}
          {onDelete && <button className="icon-btn danger" onClick={() => onDelete(inv)} aria-label="Supprimer" title="Supprimer"><Icon name="trash"/></button>}
        </span>
      </div>
    </div>
  )
}

function DupPanel({ pairs, analysing, total, virByInvoice, onView, onDelete, onIgnore }) {
  if (analysing) return <div className="dup-status"><span className="spinner small"/>Analyse des doublons en cours…</div>
  if (pairs.length === 0) return total > 1 ? <div className="dup-status ok"><Icon name="check" size={16} stroke={2.4}/>Aucun doublon parmi tes {total} factures.</div> : null
  return (
    <div className="dup-panel" id="doublons">
      <div className="dup-head">
        <Icon name="copy" size={20}/>
        <h2>{pairs.length === 1 ? 'Un doublon à vérifier' : `${pairs.length} doublons à vérifier`}</h2>
      </div>
      {pairs.map(p => (
        <div key={p.key} className="dup-pair">
          <div className="dup-why">
            <span className={`level ${p.level}`}>{LEVELS[p.level].label}</span>
            <span>{p.reasons.join(' · ')}</span>
          </div>
          <div className="dup-cols">
            <MiniInvoice inv={p.a} vir={virByInvoice[p.a.id]} onView={onView} onDelete={onDelete}/>
            <MiniInvoice inv={p.b} vir={virByInvoice[p.b.id]} onView={onView} onDelete={onDelete}/>
          </div>
          <button className="link-btn" onClick={() => onIgnore(p.key)}>Ce ne sont pas des doublons</button>
        </div>
      ))}
    </div>
  )
}

function ImportCheck({ state, matches, guess, virByInvoice, onView }) {
  if (state === 'analysing') return <div className="check-box neutral"><span className="spinner small"/>Lecture du PDF et recherche de doublons…</div>
  const top = matches[0]
  return (
    <>
      {top ? (
        <div className={`check-box ${top.level}`}>
          <div className="check-title"><Icon name="copy" size={18}/>{LEVELS[top.level].label} : cette facture semble déjà enregistrée</div>
          <p className="check-reasons">{top.reasons.join(' · ')}</p>
          {matches.slice(0, 3).map(m => <MiniInvoice key={m.inv.id} inv={m.inv} vir={virByInvoice[m.inv.id]} onView={onView}/>)}
        </div>
      ) : (
        <div className="check-box ok"><Icon name="check" size={16} stroke={2.4}/>Aucun doublon : cette facture n’est pas encore enregistrée.</div>
      )}
      {(guess?.child || guess?.amount || guess?.category || guess?.pay?.url || guess?.pay?.login) && (
        <p className="guess"><Icon name="spark" size={15}/>{guess.ocr ? 'Lu dans le scan' : 'Lu dans le PDF'} : {[
          guess.child && CHILDREN[guess.child].label, guess.amount && fmt(guess.amount), guess.category && CAT[guess.category]?.label,
          (guess.pay?.url || guess.pay?.login) && 'infos de paiement',
        ].filter(Boolean).join(', ')}. Vérifie avant d’enregistrer.</p>
      )}
    </>
  )
}

// ─── Modale virement ─────────────────────────────────────────────────────────
function VirementModal({ title, form, setForm, invoices, onCancel, onSubmit, toggleInvoice }) {
  const invoiceMap = useMemo(() => Object.fromEntries(invoices.map(i => [i.id, i])), [invoices])
  const selected   = form.invoiceIds.map(id => invoiceMap[id]).filter(Boolean)
  const totalSel   = sumHalf(selected)
  const amount     = num(form.amount)
  const delta      = amount - totalSel
  const balanced   = Math.abs(delta) < 0.005
  const canSubmit  = form.amount && form.date
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <Modal title={title} onClose={onCancel} width={820}>
      <div className="vir-modal">
        <div className="vir-modal-left">
          <Field label="Date du virement"><input className="input" type="date" value={form.date} onChange={set('date')}/></Field>
          <Field label="Montant viré">
            <div className="input-euro">
              <input className="input" type="number" step="0.01" min="0" value={form.amount} onChange={set('amount')} placeholder="0,00"/>
              <span>€</span>
            </div>
          </Field>
          <Field label="Note"><input className="input" value={form.note} onChange={set('note')} placeholder="Ex : payé sur le site de la cantine"/></Field>
          <Field label="Justificatif (capture, reçu…)">
            {form.proof || (form.proofFileId && !form.removeProof) ? (
              <div className="proof-row">
                <Icon name="clip" size={16}/>
                <span>{form.proof ? form.proof.name : 'Justificatif enregistré dans Drive'}</span>
                <button type="button" className="mini-btn" onClick={() => setForm({ ...form, proof: null, removeProof: !!form.proofFileId })}>Retirer</button>
              </div>
            ) : (
              <label className="proof-pick">
                <Icon name="clip" size={16}/>Joindre un fichier
                <input type="file" accept="application/pdf,image/*" hidden onChange={async e => {
                  const f = e.target.files[0]; e.target.value = ''
                  if (f) setForm({ ...form, proof: { bytes: new Uint8Array(await f.arrayBuffer()), mime: f.type || 'application/pdf', name: f.name }, removeProof: false })
                }}/>
              </label>
            )}
          </Field>

          <div className="balance">
            <div><span>Virement</span><strong>{fmt(amount)}</strong></div>
            <div><span>Ta part des factures cochées</span><strong>{fmt(totalSel)}</strong></div>
            <div className={`balance-delta ${balanced ? 'ok' : delta > 0 ? 'over' : 'under'}`}>
              <span>{balanced ? 'Le compte est bon' : delta > 0 ? 'Tu verses en plus' : 'Il manque'}</span>
              <strong>{balanced ? <Icon name="check"/> : fmt(Math.abs(delta))}</strong>
            </div>
            {!balanced && totalSel > 0 && (
              <button type="button" className="link-btn" onClick={() => setForm({ ...form, amount: totalSel.toFixed(2) })}>
                Mettre le montant à {fmt(totalSel)}
              </button>
            )}
          </div>
        </div>

        <div className="vir-modal-right">
          <div className="picker-head">
            <span>Factures réglées par ce virement</span>
            <span className="seg-count">{form.invoiceIds.length}</span>
          </div>
          <div className="picker">
            {invoices.length === 0
              ? <p className="picker-empty">Aucune facture pour l’instant. Importe d’abord une facture.</p>
              : invoices.map(inv => {
                  const sel = form.invoiceIds.includes(inv.id)
                  return (
                    <button type="button" key={inv.id} onClick={() => toggleInvoice(inv.id)} className={`pick-row${sel ? ' sel' : ''}`} aria-pressed={sel}>
                      <span className="pick-box">{sel && <Icon name="check" size={13} stroke={2.6}/>}</span>
                      <span className="pick-main">
                        <span className="pick-title">{inv.description}</span>
                        <span className="pick-meta"><ChildTag child={inv.child}/> {fmtDate(inv.date)}</span>
                      </span>
                      <span className="pick-amount">
                        {fmt(halfOf(inv))}
                        <span className={`pick-status ${inv.status === 'paye' ? 'paid' : 'pending'}`}>{inv.status === 'paye' ? 'Payée' : 'À payer'}</span>
                      </span>
                    </button>
                  )
                })}
          </div>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onCancel}>Annuler</button>
        <button className="btn primary" onClick={onSubmit} disabled={!canSubmit}><Icon name="check"/>Enregistrer le virement</button>
      </div>
    </Modal>
  )
}

// ─── Graphique mensuel (SVG) ─────────────────────────────────────────────────
function MonthChart({ data, virByMonth }) {
  const W = 760, H = 220, padL = 8, padB = 28, padT = 16
  const max = Math.max(1, ...data.map(d => d.part), ...virByMonth)
  const colW = (W - padL * 2) / 12
  const barW = Math.min(30, colW * 0.46)
  const y = (v) => H - padB - (v / max) * (H - padB - padT)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Ta part par mois, payée et à payer">
      {[0.25, 0.5, 0.75, 1].map(t => (
        <line key={t} x1={0} x2={W} y1={y(max * t)} y2={y(max * t)} className="chart-grid"/>
      ))}
      <line x1={0} x2={W} y1={H - padB} y2={H - padB} className="chart-base"/>
      {data.map((d, i) => {
        const cx = padL + colW * i + colW / 2
        const paid = d.paid, pending = d.pending
        return (
          <g key={i}>
            <title>{`${MONTHS_FR[i]} — payé ${fmt(paid)}, à payer ${fmt(pending)}, virements ${fmt(virByMonth[i])}`}</title>
            {paid > 0 && <rect x={cx - barW / 2} y={y(paid)} width={barW} height={H - padB - y(paid)} rx={3} className="bar-paid"/>}
            {pending > 0 && <rect x={cx - barW / 2} y={y(paid + pending)} width={barW} height={y(paid) - y(paid + pending) - (paid > 0 ? 2 : 0)} rx={3} className="bar-pending"/>}
            {virByMonth[i] > 0 && <line x1={cx - barW / 2 - 5} x2={cx + barW / 2 + 5} y1={y(virByMonth[i])} y2={y(virByMonth[i])} className="vir-mark"/>}
            <text x={cx} y={H - 8} textAnchor="middle" className="chart-label">{MONTHS_SHORT[i]}</text>
          </g>
        )
      })}
    </svg>
  )
}

// Recadre une photo en carré 320 px (pour les portraits des enfants)
async function squarePhoto(file) {
  const img = await createImageBitmap(file)
  const side = Math.min(img.width, img.height)
  const sx = (img.width - side) / 2, sy = Math.max(0, (img.height - side) * 0.4)
  const c = document.createElement('canvas'); c.width = c.height = 320
  c.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, 320, 320)
  return new Promise(res => c.toBlob(res, 'image/jpeg', 0.88))
}

function Gate({ message, onLogin }) {
  return (
    <div className="gate">
      <div className="gate-card">
        <span className="brand-title gate-title">Factures</span>
        <p className="gate-sub">Nina &amp; Noah</p>
        <p className="gate-text">Tes factures et leurs PDF sont rangés dans ton Google Drive. Connecte-toi pour y accéder.</p>
        <button className="btn primary gate-btn" onClick={onLogin}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
          Se connecter avec Google
        </button>
        {message && <p className="gate-err">{message}</p>}
        <p className="gate-note">Accès réservé au compte {cloud.CONFIG.EMAIL}.</p>
      </div>
    </div>
  )
}

function Migration({ onRestore, onStartEmpty }) {
  const [step, setStep] = useState('choose')   // choose | running | done
  const [prog, setProg] = useState({ i: 0, n: 0, label: '' })
  const [error, setError] = useState('')
  const [count, setCount] = useState(0)
  const ref = useRef()
  const run = async (file) => {
    if (!file) return
    setError(''); setStep('running')
    try {
      const n = await onRestore(file, (i, n, label) => setProg({ i, n, label }))
      setCount(n); setStep('done')
    } catch (e) { setError(e.message); setStep('choose') }
  }
  return (
    <div className="gate">
      <div className="gate-card wide">
        <span className="brand-title gate-title">Bienvenue</span>
        {step === 'choose' && <>
          <p className="gate-text">Ton dossier « Factures Enfants » vient d’être créé dans Google Drive. Pour retrouver tes factures, importe la dernière sauvegarde de l’ancienne appli (fichier <em>factures-enfants-backup-….json</em>, dans le dossier « save JSON »). Chaque PDF sera rangé dans Drive par année et par enfant.</p>
          <input ref={ref} type="file" accept="application/json,.json" hidden onChange={e => run(e.target.files[0])}/>
          <button className="btn primary gate-btn" onClick={() => ref.current?.click()}><Icon name="upload"/>Importer ma sauvegarde</button>
          <button className="link-btn" onClick={onStartEmpty}>Commencer sans données</button>
          {error && <p className="gate-err">{error}</p>}
        </>}
        {step === 'running' && <>
          <p className="gate-text">Envoi des factures dans Drive : {prog.i} sur {prog.n}</p>
          <div className="progress-big"><span style={{ width: `${prog.n ? (prog.i / prog.n) * 100 : 0}%` }}/></div>
          <p className="gate-note">{prog.label}</p>
        </>}
        {step === 'done' && <>
          <p className="gate-text"><strong>{plural(count, 'facture')}</strong> rangée{count > 1 ? 's' : ''} dans ton Drive. Tu peux ajouter les photos de Nina et Noah dans les Réglages.</p>
          <button className="btn primary gate-btn" onClick={onStartEmpty}><Icon name="check"/>Ouvrir mes factures</button>
        </>}
      </div>
    </div>
  )
}

// ─── Relevé imprimable ───────────────────────────────────────────────────────
function Releve({ invoices, virements, onClose }) {
  const now = new Date()
  const calYears = [...new Set([...invoices, ...virements].map(x => new Date(x.date).getFullYear()))].sort((a, b) => b - a)
  const schYears = [...new Set(invoices.map(i => schoolYearOf(i.date)))].sort((a, b) => b - a)
  const [mode, setMode]   = useState('civile')
  const [cy, setCy]       = useState(calYears[0] || now.getFullYear())
  const [sy, setSy]       = useState(schYears[0] || schoolYearOf(now))
  const [from, setFrom]   = useState(`${now.getFullYear()}-01-01`)
  const [to, setTo]       = useState(today())
  const [child, setChild] = useState('tous')

  const range = mode === 'civile' ? [`${cy}-01-01`, `${cy}-12-31`]
    : mode === 'scolaire' ? [`${sy}-09-01`, `${sy + 1}-08-31`] : [from, to]
  const inRange = (d) => d >= range[0] && d <= range[1]
  const invs = invoices.filter(i => inRange(i.date) && (child === 'tous' || i.child === child)).sort((a, b) => a.date.localeCompare(b.date))
  const ids = new Set(invs.map(i => i.id))
  const virs = virements.filter(v => inRange(v.date) && (child === 'tous' || v.invoiceIds.some(id => ids.has(id)) || !v.invoiceIds.length)).sort((a, b) => a.date.localeCompare(b.date))
  const virOf = {}
  virements.forEach(v => v.invoiceIds.forEach(id => { if (!virOf[id]) virOf[id] = v }))
  const total = invs.reduce((s, i) => s + i.amount, 0)
  const part = sumHalf(invs), paid = sumHalf(invs.filter(i => i.status === 'paye'))
  const virTotal = virs.reduce((s, v) => s + v.amount, 0)
  const periodLabel = mode === 'civile' ? `Année ${cy}` : mode === 'scolaire' ? `Année scolaire ${sy}-${sy + 1}` : `Du ${fmtDate(from)} au ${fmtDate(to)}`
  const who = child === 'tous' ? 'Nina et Noah' : CHILDREN[child].label

  const doc = (
    <div className="releve">
      <header className="rl-head">
        <div>
          <h1>Relevé des factures</h1>
          <p>{who} · {periodLabel}</p>
        </div>
        <p className="rl-date">Édité le {fmtLong(new Date())}</p>
      </header>
      <div className="rl-sum">
        <div><span>Total des factures</span><strong>{fmt(total)}</strong></div>
        <div><span>Ma part</span><strong>{fmt(part)}</strong></div>
        <div><span>Réglé</span><strong>{fmt(paid)}</strong></div>
        <div><span>Reste à régler</span><strong>{fmt(part - paid)}</strong></div>
        <div><span>Virements émis</span><strong>{fmt(virTotal)}</strong></div>
      </div>
      <h2>Factures ({invs.length})</h2>
      {invs.length === 0 ? <p className="rl-empty">Aucune facture sur cette période.</p> : (
        <table className="rl-table">
          <thead><tr><th>Date</th><th>Enfant</th><th>Facture</th><th>Catégorie</th><th className="r">Montant</th><th className="r">Ma part</th><th>Statut</th></tr></thead>
          <tbody>
            {invs.map(i => (
              <tr key={i.id}>
                <td>{fmtDate(i.date)}</td>
                <td>{CHILDREN[i.child]?.label || '–'}</td>
                <td>{i.description}{i.invoiceNumber ? <small>N° {i.invoiceNumber}</small> : null}</td>
                <td>{CAT[i.category]?.label || '–'}</td>
                <td className="r">{fmt(i.amount)}</td>
                <td className="r">{fmt(halfOf(i))}{shareOf(i) !== 50 ? <small>{shareOf(i)} %</small> : null}</td>
                <td>{i.status === 'paye' ? (virOf[i.id] ? `Réglée (virement du ${fmtDate(virOf[i.id].date)})` : 'Réglée') : 'À régler'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={4}>Total</td><td className="r">{fmt(total)}</td><td className="r">{fmt(part)}</td><td/></tr></tfoot>
        </table>
      )}
      <h2>Virements ({virs.length})</h2>
      {virs.length === 0 ? <p className="rl-empty">Aucun virement sur cette période.</p> : (
        <table className="rl-table">
          <thead><tr><th>Date</th><th className="r">Montant</th><th>Note</th><th>Factures réglées</th></tr></thead>
          <tbody>
            {virs.map(v => (
              <tr key={v.id}>
                <td>{fmtDate(v.date)}</td>
                <td className="r">{fmt(v.amount)}</td>
                <td>{v.note || '–'}</td>
                <td>{v.invoiceIds.map(id => invoices.find(i => i.id === id)).filter(Boolean).map(i => `${i.description}${i.child ? ' (' + CHILDREN[i.child]?.label + ')' : ''}`).join(' ; ') || '–'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td>Total</td><td className="r">{fmt(virTotal)}</td><td colSpan={2}/></tr></tfoot>
        </table>
      )}
    </div>
  )

  return (
    <>
      <Modal title="Relevé" onClose={onClose} width={980}>
        <div className="modal-pad releve-opts">
          <Segmented ariaLabel="Période" value={mode} onChange={setMode} options={[{ value: 'civile', label: 'Année civile' }, { value: 'scolaire', label: 'Année scolaire' }, { value: 'perso', label: 'Dates choisies' }]}/>
          {mode === 'civile' && <Segmented ariaLabel="Année" value={cy} onChange={setCy} options={(calYears.length ? calYears : [cy]).map(y => ({ value: y, label: String(y) }))}/>}
          {mode === 'scolaire' && <Segmented ariaLabel="Année scolaire" value={sy} onChange={setSy} options={(schYears.length ? schYears : [sy]).map(y => ({ value: y, label: `${y}-${y + 1}` }))}/>}
          {mode === 'perso' && <div className="date-range"><input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} aria-label="Du"/><span>au</span><input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} aria-label="Au"/></div>}
          <Segmented ariaLabel="Enfant" value={child} onChange={setChild} options={[{ value: 'tous', label: 'Les deux' }, { value: 'NINA', label: 'Nina', cls: 'nina' }, { value: 'NOAH', label: 'Noah', cls: 'noah' }]}/>
        </div>
        <div className="releve-preview">{doc}</div>
        <div className="modal-foot">
          <span className="foot-hint">Dans la fenêtre d’impression, choisis « Enregistrer au format PDF ».</span>
          <button className="btn ghost" onClick={onClose}>Fermer</button>
          <button className="btn primary" onClick={() => window.print()}><Icon name="print"/>Imprimer ou enregistrer en PDF</button>
        </div>
      </Modal>
      {createPortal(<div className="print-root">{doc}</div>, document.body)}
    </>
  )
}

// ─── Application ─────────────────────────────────────────────────────────────
const EMPTY_FORM = { description:'', amount:'', date:'', invoiceNumber:'', editionDate:'', child:'', comment:'', status:'en_cours', category:'', share:'50', payUrl:'', payLogin:'', payPassword:'' }
const formToFields = (f) => ({
  description: f.description, amount: num(f.amount), date: f.date, invoiceNumber: f.invoiceNumber, editionDate: f.editionDate,
  child: f.child, comment: f.comment, category: f.category || '', share: f.share === '' ? 50 : num(f.share),
  payUrl: (f.payUrl || '').trim(), payLogin: (f.payLogin || '').trim(), payPassword: f.payPassword || '',
})

export default function App() {
  // phase : 'boot' (démarrage) → 'gate' (connexion) → 'loading' → 'migrate' (1re fois) → 'ready'
  const [phase,     setPhase]     = useState('boot')
  const [gateMsg,   setGateMsg]   = useState('')
  const [sync,      setSync]      = useState('ok')   // ok | pending | error
  const [invoices,  setInvoices]  = useState([])
  const [virements, setVirements] = useState([])
  const [photoIds,  setPhotoIds]  = useState({})
  const [photoUrls, setPhotoUrls] = useState({})
  const [tab,       setTab]       = useState('factures')
  const [year,      setYear]      = useState(new Date().getFullYear())
  const [filterStatus, setFilterStatus] = useState('tous')
  const [filterChild,  setFilterChild]  = useState('tous')
  const [query,     setQuery]     = useState('')
  const [dragging,  setDragging]  = useState(false)
  const [toast,     setToast]     = useState(null)
  const [busy,      setBusy]      = useState('')

  const [importing,      setImporting]      = useState(null)
  const [formData,       setFormData]       = useState(EMPTY_FORM)
  const [viewingInvoice, setViewingInvoice] = useState(null)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [editForm,       setEditForm]       = useState(EMPTY_FORM)
  const [confirmDelete,  setConfirmDelete]  = useState(null)

  const [addingVirement,        setAddingVirement]        = useState(false)
  const [editingVirement,       setEditingVirement]       = useState(null)
  const [virementForm,          setVirementForm]          = useState({ date:'', amount:'', note:'', invoiceIds:[] })
  const [confirmDeleteVirement, setConfirmDeleteVirement] = useState(null)

  const [ignored,      setIgnored]      = useState([])
  const [queue,        setQueue]        = useState([])     // fichiers en attente d'import
  const queueRef = useRef([])
  queueRef.current = queue
  const [filterCat,    setFilterCat]    = useState('')
  const [showReleve,   setShowReleve]   = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsMsg,  setSettingsMsg]  = useState('')

  const fileInputRef  = useRef()
  const toastTimer    = useRef()
  const dirtyRef      = useRef(false)
  const saveTimer     = useRef()
  const savingRef     = useRef(false)
  const docRef        = useRef(null)
  const fpRunning     = useRef(new Set())

  const notify = (text, tone = 'ok') => {
    clearTimeout(toastTimer.current)
    setToast({ text, tone })
    toastTimer.current = setTimeout(() => setToast(null), tone === 'err' ? 5000 : 2600)
  }

  // ── chargement ──
  const applyDoc = (doc) => {
    setInvoices(Array.isArray(doc?.factures) ? doc.factures : [])
    setVirements(Array.isArray(doc?.virements) ? doc.virements : [])
    setIgnored(Array.isArray(doc?.doublonsIgnores) ? doc.doublonsIgnores : [])
    setPhotoIds(doc?.photos || {})
  }
  const boot = async () => {
    setPhase('loading')
    try {
      const doc = await cloud.loadData()
      if (!doc) { setPhase('migrate'); return }
      applyDoc(doc)
      setPhase('ready')
    } catch (e) {
      setGateMsg('Connexion à Google Drive impossible : ' + e.message)
      setPhase('gate')
    }
  }
  useEffect(() => {
    cloud.resumeSession()
      .then(email => email ? boot() : setPhase('gate'))
      .catch(e => { setGateMsg(e.message); setPhase('gate') })
  }, [])
  const login = async () => {
    setGateMsg('')
    try { await cloud.signIn(); boot() } catch (e) { setGateMsg(e.message) }
  }
  const logout = () => {
    if (dirtyRef.current && !confirm('Des modifications ne sont pas encore enregistrées. Se déconnecter quand même ?')) return
    cloud.signOut()
    applyDoc(null); setShowSettings(false); setPhase('gate')
  }

  // ── photos des enfants (stockées dans Drive) ──
  useEffect(() => {
    let alive = true
    const urls = {}
    ;(async () => {
      for (const c of Object.keys(CHILDREN)) {
        if (!photoIds[c]) continue
        try { urls[c] = URL.createObjectURL(new Blob([await cloud.getFileBytes(photoIds[c])], { type: 'image/jpeg' })) } catch {}
      }
      if (alive) setPhotoUrls(urls)
    })()
    return () => { alive = false; Object.values(urls).forEach(u => URL.revokeObjectURL(u)) }
  }, [photoIds])

  // ── enregistrement automatique dans Drive ──
  docRef.current = { version: 2, updatedAt: new Date().toISOString(), factures: invoices, virements, doublonsIgnores: ignored, photos: photoIds }
  const pushNow = async () => {
    clearTimeout(saveTimer.current)
    if (savingRef.current) { saveTimer.current = setTimeout(pushNow, 400); return }
    savingRef.current = true
    dirtyRef.current = false
    try {
      const r = await cloud.saveData(docRef.current)
      if (r.changedElsewhere) notify('Les données avaient changé sur un autre appareil : ta version les remplace.', 'err')
      if (dirtyRef.current) saveTimer.current = setTimeout(pushNow, 400)
      else setSync('ok')
    } catch (e) {
      dirtyRef.current = true
      setSync('error')
      saveTimer.current = setTimeout(pushNow, 15000)
    } finally { savingRef.current = false }
  }
  const markDirty = () => { dirtyRef.current = true; setSync('pending') }
  useEffect(() => {
    if (phase !== 'ready' || !dirtyRef.current) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(pushNow, 700)
  }, [invoices, virements, ignored, photoIds, phase])
  useEffect(() => {
    const onUnload = (e) => { if (dirtyRef.current || savingRef.current) { e.preventDefault(); e.returnValue = '' } }
    const onVisible = async () => {
      if (document.hidden || phase !== 'ready' || dirtyRef.current || savingRef.current) return
      try { const doc = await cloud.fetchIfChanged(); if (doc) { applyDoc(doc); notify('Données mises à jour depuis un autre appareil') } } catch {}
    }
    window.addEventListener('beforeunload', onUnload)
    document.addEventListener('visibilitychange', onVisible)
    document.addEventListener('click', cloud.keepAlive, true)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      document.removeEventListener('visibilitychange', onVisible)
      document.removeEventListener('click', cloud.keepAlive, true)
    }
  }, [phase])

  const persist  = (inv) => { markDirty(); setInvoices(inv) }
  const persistV = (vir) => { markDirty(); setVirements(vir) }
  const persistIgnored = (list) => { markDirty(); setIgnored(list) }
  const byDateDesc = (a, b) => new Date(b.date) - new Date(a.date)

  // Empreinte manquante (ancienne facture) : on lit le fichier une fois et on l'enregistre
  useEffect(() => {
    if (phase !== 'ready') return
    const todo = invoices.filter(inv => !inv.fp && inv.fileId && !fpRunning.current.has(inv.id))
    if (!todo.length) return
    todo.forEach(inv => fpRunning.current.add(inv.id))
    ;(async () => {
      for (const inv of todo) {
        try {
          const { fp } = await analyseFile(await cloud.getFileBytes(inv.fileId), inv.mime)
          markDirty()
          setInvoices(list => list.map(i => i.id === inv.id ? { ...i, fp } : i))
        } catch {}
        fpRunning.current.delete(inv.id)
      }
    })()
  }, [invoices, phase])

  // Mise à niveau des anciennes factures : catégorie devinée, infos de paiement sorties du commentaire
  useEffect(() => {
    if (phase !== 'ready') return
    const need = invoices.some(i => !i.payParsed || i.category === undefined)
    if (!need) return
    markDirty()
    setInvoices(list => list.map(i => {
      let out = i
      if (i.category === undefined) out = { ...out, category: guessCategory(i.description, i.comment, i.invoiceNumber, i.name, (i.fp?.tokens || []).join(' ')) }
      if (!i.payParsed) {
        const p = extractPayment(i.comment)
        out = { ...out, payParsed: true }
        if (p.url || p.login || p.password) out = { ...out, payUrl: i.payUrl || p.url, payLogin: i.payLogin || p.login, payPassword: i.payPassword || p.password, comment: stripPayment(i.comment, p) }
      }
      return out
    }))
  }, [invoices, phase])

  // ── factures ──
  const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp'
  const openFile = async (file) => {
    if (!file) return
    const mime = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '')
    if (mime !== 'application/pdf' && !isImage(mime)) { notify('Choisis un PDF ou une photo (JPG, PNG).', 'err'); return }
    const bytes = new Uint8Array(await file.arrayBuffer())
    const key = Date.now()
    setImporting({ key, bytes, mime, name: file.name, check: 'analysing' })
    setFormData({ ...EMPTY_FORM, description: file.name.replace(/\.(pdf|jpe?g|png|webp)$/i, '').replace(/[-_]/g, ' '), date: today() })
    const { fp, text } = await analyseFile(bytes, mime)
    const pay = extractPayment(text)
    const guess = { child: guessChild(text), amount: guessAmount(text), category: guessCategory(file.name, text), pay, ocr: !!fp.ocr }
    setImporting(cur => cur && cur.key === key ? { ...cur, fp, feat: featOf(fp), guess, check: 'done' } : cur)
    setFormData(f => ({ ...f,
      child: f.child || guess.child,
      amount: f.amount || (guess.amount ? String(guess.amount) : ''),
      category: f.category || guess.category,
      payUrl: f.payUrl || pay.url, payLogin: f.payLogin || pay.login, payPassword: f.payPassword || pay.password,
    }))
  }
  const okFile = (f) => f && (f.type === 'application/pdf' || isImage(f.type) || /\.pdf$/i.test(f.name))
  const startFiles = (files) => {
    const list = [...files].filter(okFile)
    if (!list.length) { if (files.length) notify('Choisis un PDF ou une photo (JPG, PNG).', 'err'); return }
    if (importing) { setQueue(q => [...q, ...list]); notify(`${plural(list.length, 'fichier')} ajouté${list.length > 1 ? 's' : ''} à la file`); return }
    setQueue(list.slice(1))
    openFile(list[0])
  }
  const nextInQueue = () => {
    const q = queueRef.current
    if (!q.length) return
    setQueue(q.slice(1))
    setTimeout(() => openFile(q[0]), 50)
  }
  const cancelImport = () => { setImporting(null); nextInQueue() }
  const handleFile = (e) => { startFiles(e.target.files); e.target.value = '' }
  const handleDrop = (e) => { e.preventDefault(); setDragging(false); startFiles(e.dataTransfer.files) }

  // Fichiers partagés depuis le téléphone (« Partager » → Factures), déposés par le service worker
  useEffect(() => {
    if (phase !== 'ready' || !('caches' in window)) return
    ;(async () => {
      try {
        const cache = await caches.open('share-inbox')
        const reqs = await cache.keys()
        if (!reqs.length) return
        const files = []
        for (const r of reqs) {
          const res = await cache.match(r)
          const blob = await res.blob()
          const name = decodeURIComponent(res.headers.get('x-name') || 'facture')
          files.push(new File([blob], name, { type: blob.type }))
          await cache.delete(r)
        }
        if (location.search.includes('share')) history.replaceState(null, '', location.pathname)
        setTab('factures')
        startFiles(files)
      } catch {}
    })()
  }, [phase])
  const submitImport = async () => {
    if (!formData.amount || !formData.date || !formData.description || busy) return
    const id = Date.now()
    const childName = CHILDREN[formData.child]?.label || 'Sans enfant'
    const fileName = `${formData.date} - ${safeName(formData.description)}.${extOf(importing.mime)}`
    setBusy('Envoi du fichier dans Drive…')
    try {
      const { id: fileId } = await cloud.uploadFile(new Blob([importing.bytes], { type: importing.mime }), fileName, ['Factures', formData.date.slice(0, 4), childName])
      const newInv = {
        id, name: importing.name, ...formToFields(formData), status: 'en_cours', payParsed: true,
        fileId, fileName, mime: importing.mime, fp: importing.fp,
      }
      persist([...invoices, newInv].sort(byDateDesc))
      setImporting(null)
      notify('Facture enregistrée dans Drive')
      nextInQueue()
    } catch (e) {
      notify('Envoi impossible : ' + e.message + '. La facture n’a pas été enregistrée.', 'err')
    } finally { setBusy('') }
  }
  const toggleStatus = (id) => {
    const inv = invoices.find(i => i.id === id)
    persist(invoices.map(i => i.id === id ? { ...i, status: i.status === 'paye' ? 'en_cours' : 'paye' } : i))
    notify(inv?.status === 'paye' ? 'Facture remise à payer' : 'Facture marquée payée')
  }
  const deleteInvoice = (id) => {
    const inv = invoices.find(i => i.id === id)
    persistV(virements.map(v => ({ ...v, invoiceIds: v.invoiceIds.filter(iid => iid !== id) })))
    persist(invoices.filter(i => i.id !== id))
    setConfirmDelete(null)
    if (inv?.fileId) cloud.trashFile(inv.fileId).catch(() => {})
    notify('Facture supprimée (le fichier est dans la corbeille de Drive)')
  }
  const openEdit = (inv) => {
    setEditForm({ description: inv.description, amount: String(inv.amount), date: inv.date, invoiceNumber: inv.invoiceNumber || '', editionDate: inv.editionDate || '', status: inv.status, child: inv.child || '', comment: inv.comment || '',
      category: inv.category || '', share: String(shareOf(inv)), payUrl: inv.payUrl || '', payLogin: inv.payLogin || '', payPassword: inv.payPassword || '' })
    setEditingInvoice(inv)
  }
  const submitEdit = () => {
    if (!editForm.amount || !editForm.date || !editForm.description) return
    persist(invoices.map(inv => inv.id === editingInvoice.id ? { ...inv, ...formToFields(editForm), status: editForm.status } : inv).sort(byDateDesc))
    setEditingInvoice(null)
    notify('Modifications enregistrées')
  }

  // ── virements ──
  const openAddVirement = (preselect = []) => {
    setVirementForm({ date: today(), amount: preselect.length ? sumHalf(invoices.filter(i => preselect.includes(i.id))).toFixed(2) : '', note: '', invoiceIds: preselect, proof: null, proofFileId: '', proofMime: '', removeProof: false })
    setAddingVirement(true)
  }
  const openEditVirement = (v) => {
    setVirementForm({ date: v.date, amount: String(v.amount), note: v.note || '', invoiceIds: [...v.invoiceIds], proof: null, proofFileId: v.proofFileId || '', proofMime: v.proofMime || '', removeProof: false })
    setEditingVirement(v)
  }
  const toggleVirInvoice = (id) => {
    setVirementForm(f => ({ ...f, invoiceIds: f.invoiceIds.includes(id) ? f.invoiceIds.filter(x => x !== id) : [...f.invoiceIds, id] }))
  }
  // Envoie le justificatif choisi (s'il y en a un) et renvoie { proofFileId, proofMime }
  const saveProof = async (f, oldId) => {
    if (f.proof) {
      const name = `${f.date} - virement ${num(f.amount).toFixed(2)} €.${extOf(f.proof.mime)}`
      const { id } = await cloud.uploadFile(new Blob([f.proof.bytes], { type: f.proof.mime }), name, ['Justificatifs', f.date.slice(0, 4)])
      if (oldId) cloud.trashFile(oldId).catch(() => {})
      return { proofFileId: id, proofMime: f.proof.mime }
    }
    if (f.removeProof && oldId) { cloud.trashFile(oldId).catch(() => {}); return { proofFileId: '', proofMime: '' } }
    return oldId ? { proofFileId: oldId, proofMime: f.proofMime } : {}
  }
  const submitVirement = async () => {
    if (!virementForm.amount || !virementForm.date || busy) return
    setBusy(virementForm.proof ? 'Envoi du justificatif dans Drive…' : '')
    try {
      const proof = await saveProof(virementForm, '')
      const vir = { id: Date.now(), date: virementForm.date, amount: num(virementForm.amount), note: virementForm.note, invoiceIds: virementForm.invoiceIds, ...proof }
      persist(invoices.map(inv => virementForm.invoiceIds.includes(inv.id) ? { ...inv, status: 'paye' } : inv))
      persistV([...virements, vir].sort(byDateDesc))
      setAddingVirement(false)
      notify('Virement enregistré')
    } catch (e) { notify('Envoi impossible : ' + e.message, 'err') } finally { setBusy('') }
  }
  const submitEditVirement = async () => {
    if (!virementForm.amount || !virementForm.date || busy) return
    setBusy(virementForm.proof ? 'Envoi du justificatif dans Drive…' : '')
    try {
      const proof = await saveProof(virementForm, editingVirement.proofFileId || '')
      const updated = virements.map(v => v.id === editingVirement.id ? { ...v, date: virementForm.date, amount: num(virementForm.amount), note: virementForm.note, invoiceIds: virementForm.invoiceIds, ...proof } : v).sort(byDateDesc)
      const allLinked = new Set(updated.flatMap(v => v.invoiceIds))
      persist(invoices.map(inv => allLinked.has(inv.id) ? { ...inv, status: 'paye' } : inv))
      persistV(updated)
      setEditingVirement(null)
      notify('Virement mis à jour')
    } catch (e) { notify('Envoi impossible : ' + e.message, 'err') } finally { setBusy('') }
  }
  const deleteVirement = (id) => {
    const v = virements.find(x => x.id === id)
    if (v?.proofFileId) cloud.trashFile(v.proofFileId).catch(() => {})
    persistV(virements.filter(v => v.id !== id))
    setConfirmDeleteVirement(null)
    notify('Virement supprimé')
  }

  // ── réglages : photos, export complet, restauration ──
  const uploadPhoto = async (child, file) => {
    if (!file || !isImage(file.type)) { setSettingsMsg('Choisis une photo (JPG ou PNG).'); return }
    setBusy('Envoi de la photo dans Drive…')
    try {
      const blob = await squarePhoto(file)
      const { id } = await cloud.uploadFile(blob, `${CHILDREN[child].label}.jpg`, ['Photos'])
      if (photoIds[child]) cloud.trashFile(photoIds[child]).catch(() => {})
      markDirty()
      setPhotoIds(p => ({ ...p, [child]: id }))
      notify(`Photo de ${CHILDREN[child].label} enregistrée`)
    } catch (e) { setSettingsMsg('Envoi impossible : ' + e.message) } finally { setBusy('') }
  }
  const exportAll = async () => {
    setBusy('Préparation de la sauvegarde complète…')
    try {
      const factures = []
      for (const inv of invoices) {
        const { fileId, fileName, mime, fp, ...rest } = inv
        let pdfData
        if (fileId) { try { pdfData = await bytesToDataUrl(await cloud.getFileBytes(fileId), mime || 'application/pdf') } catch {} }
        factures.push({ ...rest, mime, pdfData })
      }
      const data = { version: 1, exportedAt: new Date().toISOString(), factures, virements, doublonsIgnores: ignored }
      downloadBlob(new Blob([JSON.stringify(data)], { type: 'application/json' }), `factures-enfants-backup-${today()}.json`)
      notify('Sauvegarde complète téléchargée')
    } catch (e) { notify('Export impossible : ' + e.message, 'err') } finally { setBusy('') }
  }
  const restoreBackup = async (file, onProgress) => {
    const data = JSON.parse(await file.text())
    if (!Array.isArray(data.factures))  throw new Error('Ce fichier ne contient pas de liste de factures.')
    if (!Array.isArray(data.virements)) throw new Error('Ce fichier ne contient pas de liste de virements.')
    const factures = []
    let i = 0
    for (const f of data.factures) {
      onProgress?.(++i, data.factures.length, f.description)
      const { pdfData, ...rest } = f
      if (pdfData && pdfData.startsWith('data:')) {
        const mime = pdfData.slice(5, pdfData.indexOf(';')) || 'application/pdf'
        const bytes = dataUrlBytes(pdfData)
        const { fp } = await analyseFile(bytes, mime)
        const childName = CHILDREN[f.child]?.label || 'Sans enfant'
        const fileName = `${f.date} - ${safeName(f.description)}.${extOf(mime)}`
        const { id: fileId } = await cloud.uploadFile(new Blob([bytes], { type: mime }), fileName, ['Factures', String(f.date).slice(0, 4), childName])
        factures.push({ ...rest, fileId, fileName, mime, fp })
      } else factures.push(rest)
    }
    const doc = { version: 2, updatedAt: new Date().toISOString(), factures, virements: data.virements, doublonsIgnores: data.doublonsIgnores || [], photos: photoIds }
    await cloud.saveData(doc)
    dirtyRef.current = false
    applyDoc(doc)
    return factures.length
  }

  // ── calculs ──
  const invoiceMap = useMemo(() => Object.fromEntries(invoices.map(i => [i.id, i])), [invoices])
  const virByInvoice = useMemo(() => {
    const m = {}
    virements.forEach(v => v.invoiceIds.forEach(id => { if (!m[id]) m[id] = v }))
    return m
  }, [virements])

  const featById = useMemo(() => Object.fromEntries(invoices.filter(i => i.fp).map(i => [i.id, featOf(i.fp)])), [invoices])
  const analysing = invoices.some(inv => !inv.fp && inv.fileId)
  const dupPairs = useMemo(() => analysing ? [] : findDuplicatePairs(invoices, featById, ignored), [invoices, featById, ignored, analysing])
  const dupIds = useMemo(() => {
    const m = {}
    dupPairs.forEach(p => { [p.a.id, p.b.id].forEach(id => { if (!m[id] || LEVELS[p.level].rank > LEVELS[m[id]].rank) m[id] = p.level }) })
    return m
  }, [dupPairs])
  const importMatches = importing?.feat
    ? matchesFor({ ...formData, amount: num(formData.amount), feat: importing.feat }, invoices, featById)
    : []
  const importBlocking = importMatches.some(m => m.level !== 'possible')

  const years = useMemo(() => {
    const ys = [...new Set([...invoices, ...virements].map(x => new Date(x.date).getFullYear()))].sort((a, b) => b - a)
    return ys.length ? ys : [new Date().getFullYear()]
  }, [invoices, virements])

  const getMonthly = (y) => MONTHS_FR.map((_, idx) => {
    const month = invoices.filter(inv => { const d = new Date(inv.date); return d.getFullYear() === y && d.getMonth() === idx })
    const total = month.reduce((s, i) => s + i.amount, 0)
    const part  = sumHalf(month)
    const paid  = sumHalf(month.filter(i => i.status === 'paye'))
    return { total, part, paid, pending: part - paid, count: month.length }
  })
  const virMonthly = (y) => MONTHS_FR.map((_, idx) => virements.filter(v => { const d = new Date(v.date); return d.getFullYear() === y && d.getMonth() === idx }).reduce((s, v) => s + v.amount, 0))

  const partAll      = sumHalf(invoices)
  const partPaid     = sumHalf(invoices.filter(i => i.status === 'paye'))
  const partPending  = partAll - partPaid
  const totalVir     = virements.reduce((s, v) => s + v.amount, 0)
  const pendingInvs  = invoices.filter(i => i.status === 'en_cours')

  const q = query.trim().toLowerCase()
  const filtered = invoices.filter(inv =>
    (filterStatus === 'tous' || inv.status === filterStatus) &&
    (filterChild === 'tous' || inv.child === filterChild) &&
    (!filterCat || (inv.category || '') === filterCat) &&
    (!q || [inv.description, inv.invoiceNumber, inv.comment, inv.name, CAT[inv.category]?.label].some(t => (t || '').toLowerCase().includes(q)))
  )
  const groups = useMemo(() => {
    const g = []
    filtered.forEach(inv => {
      const d = new Date(inv.date)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      let grp = g.find(x => x.key === key)
      if (!grp) { grp = { key, label: `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`, items: [] }; g.push(grp) }
      grp.items.push(inv)
    })
    return g
  }, [filtered])

  const virFormInvoices = [...invoices].sort((a, b) => {
    const asel = virementForm.invoiceIds.includes(a.id), bsel = virementForm.invoiceIds.includes(b.id)
    if (asel !== bsel) return asel ? -1 : 1
    const aenc = a.status === 'en_cours', benc = b.status === 'en_cours'
    if (aenc !== benc) return aenc ? -1 : 1
    return new Date(b.date) - new Date(a.date)
  })

  if (phase === 'boot' || phase === 'loading') return <div className="boot"><style>{css}</style><span className="spinner"/>{phase === 'loading' && <p>Ouverture de ton Drive…</p>}</div>
  if (phase === 'gate') return <><style>{css}</style><Gate message={gateMsg} onLogin={login}/></>
  if (phase === 'migrate') return (
    <><style>{css}</style>
      <Migration onRestore={restoreBackup} onStartEmpty={() => { if (!invoices.length) { markDirty() } setPhase('ready') }}/>
    </>
  )

  const TABS = [
    { id: 'factures',      label: 'Factures',      icon: 'file',  count: invoices.length },
    { id: 'virement',      label: 'Virements',     icon: 'send',  count: virements.length },
    { id: 'recapitulatif', label: 'Récapitulatif', icon: 'chart' },
  ]

  return (
    <PhotoContext.Provider value={photoUrls}>
    <div className="app">
      <style>{css}</style>

      {/* ── BARRE LATÉRALE ── */}
      <aside className="side">
        <div className="brand">
          <span className="brand-title">Factures</span>
          <span className="brand-kids">
            <span className="brand-kid"><Avatar child="NINA" size={34}/>Nina</span>
            <span className="brand-kid"><Avatar child="NOAH" size={34}/>Noah</span>
          </span>
        </div>

        <nav className="nav" aria-label="Sections">
          {TABS.map(t => (
            <button key={t.id} className={`nav-btn${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
              <Icon name={t.icon}/>{t.label}
              {t.count !== undefined && <span className="nav-count">{t.count}</span>}
            </button>
          ))}
        </nav>

        <div className="ledger">
          <span className="ledger-label">Il te reste à payer</span>
          <span className={`ledger-big${partPending < 0.005 ? ' zero' : ''}`}>{fmt(partPending)}</span>
          <span className="ledger-sub">{pendingInvs.length === 0 ? 'Tout est réglé.' : `${plural(pendingInvs.length, 'facture')} en attente`}</span>
          {pendingInvs.length > 0 && (
            <button className="ledger-btn" onClick={() => { setTab('virement'); openAddVirement(pendingInvs.map(i => i.id)) }}>
              <Icon name="send" size={16}/>Régler par virement
            </button>
          )}
          <dl className="ledger-lines">
            <div><dt>Ta part totale</dt><dd>{fmt(partAll)}</dd></div>
            <div><dt>Déjà payé</dt><dd>{fmt(partPaid)}</dd></div>
            <div><dt>Virements émis</dt><dd>{fmt(totalVir)}</dd></div>
          </dl>
        </div>

        <div className="side-foot">
          <span className={`sync ${sync}`} role="status">
            <i/>{sync === 'ok' ? (cloud.IS_CLOUD ? 'Enregistré dans Drive' : 'Enregistré (mode local)') : sync === 'pending' ? 'Enregistrement…' : 'Pas de connexion, nouvel essai…'}
          </span>
          <button className="side-backup" onClick={() => { setSettingsMsg(''); setShowSettings(true) }}>
            <Icon name="gear" size={16}/>Réglages
          </button>
        </div>
      </aside>

      {/* ── CONTENU ── */}
      <main className="main"
        onDragOver={e => { if (tab === 'factures') { e.preventDefault(); setDragging(true) } }}
        onDragLeave={e => { if (e.currentTarget === e.target) setDragging(false) }}
        onDrop={e => tab === 'factures' ? handleDrop(e) : e.preventDefault()}>
        <input ref={fileInputRef} type="file" accept={ACCEPT} multiple onChange={handleFile} hidden/>

        {/* ══ FACTURES ══ */}
        {tab === 'factures' && (
          <section>
            <header className="page-head">
              <div>
                <h1>Factures</h1>
                <p>{invoices.length === 0 ? 'Aucune facture enregistrée.' : `${plural(invoices.length, 'facture')} · ta part : ${fmt(partAll)}`}</p>
              </div>
              <button className="btn primary" onClick={() => fileInputRef.current?.click()}><Icon name="upload"/>Ajouter une facture</button>
            </header>

            <div className="toolbar">
              <Segmented ariaLabel="Statut" value={filterStatus} onChange={setFilterStatus} options={[
                { value: 'tous',     label: 'Toutes',  count: invoices.length },
                { value: 'en_cours', label: 'À payer', count: invoices.filter(i => i.status === 'en_cours').length, cls: 'pending' },
                { value: 'paye',     label: 'Payées',  count: invoices.filter(i => i.status === 'paye').length, cls: 'paid' },
              ]}/>
              <Segmented ariaLabel="Enfant" value={filterChild} onChange={setFilterChild} options={[
                { value: 'tous', label: 'Les deux' },
                { value: 'NINA', label: <ChildLabel child="NINA"/>, count: invoices.filter(i => i.child === 'NINA').length, cls: 'nina' },
                { value: 'NOAH', label: <ChildLabel child="NOAH"/>, count: invoices.filter(i => i.child === 'NOAH').length, cls: 'noah' },
              ]}/>
              <div className="cat-filter"><CategorySelect value={filterCat} onChange={setFilterCat} allLabel="Toutes catégories"/></div>
              <div className="search">
                <Icon name="search" size={16}/>
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher" aria-label="Rechercher une facture"/>
              </div>
            </div>

            {invoices.length > 0 && (
              <DupPanel pairs={dupPairs} analysing={analysing} total={invoices.length} virByInvoice={virByInvoice}
                onView={setViewingInvoice} onDelete={setConfirmDelete}
                onIgnore={(key) => { persistIgnored([...ignored, key]); notify('Paire retirée de l’analyse') }}/>
            )}

            {invoices.length === 0 ? (
              <button className="drop-empty" onClick={() => fileInputRef.current?.click()}>
                <Icon name="file" size={34} stroke={1.4}/>
                <strong>Dépose ta première facture ici</strong>
                <span>ou clique pour choisir un PDF ou une photo</span>
              </button>
            ) : filtered.length === 0 ? (
              <div className="empty">Aucune facture ne correspond à ces filtres.
                <button className="link-btn" onClick={() => { setFilterStatus('tous'); setFilterChild('tous'); setFilterCat(''); setQuery('') }}>Tout afficher</button>
              </div>
            ) : (
              <div className="groups">
                {groups.map(g => (
                  <div key={g.key} className="group">
                    <h3 className="group-title">{g.label}<span>{fmt(sumHalf(g.items))}</span></h3>
                    <ul className="inv-list">
                      {g.items.map(inv => {
                        const vir = virByInvoice[inv.id]
                        const paid = inv.status === 'paye'
                        return (
                          <li key={inv.id} className={`inv${paid ? ' paid' : ''}`}>
                            <span className={`inv-rail ${CHILDREN[inv.child]?.cls || 'none'}`} aria-hidden="true"/>
                            <div className="inv-main">
                              <div className="inv-title">
                                <span>{inv.description}</span>
                                <ChildTag child={inv.child}/>
                                <CategoryTag id={inv.category}/>
                                {dupIds[inv.id] && <a href="#doublons" className={`dup-badge ${dupIds[inv.id]}`}><Icon name="copy" size={13}/>Doublon ?</a>}
                              </div>
                              <div className="inv-meta">
                                <span>Reçue le {fmtDate(inv.date)}</span>
                                {inv.invoiceNumber && <span>N° {inv.invoiceNumber}</span>}
                                {inv.editionDate && <span>Émise le {fmtDate(inv.editionDate)}</span>}
                              </div>
                              {inv.comment && <p className="inv-comment">{inv.comment}</p>}
                              {!paid && <PayInfo inv={inv}/>}
                              {vir && (
                                <button className="inv-vir" onClick={() => { setTab('virement') }}>
                                  <Icon name="link" size={14}/>Réglée par le virement du {fmtDate(vir.date)}
                                </button>
                              )}
                            </div>
                            <div className="inv-amounts">
                              <span className="inv-half">{fmt(halfOf(inv))}</span>
                              <span className="inv-total">{shareOf(inv) === 50 ? `sur ${fmt(inv.amount)}` : shareOf(inv) === 100 ? 'à ta charge' : `${shareOf(inv)} % de ${fmt(inv.amount)}`}</span>
                            </div>
                            <button className={`status-btn ${paid ? 'paid' : 'pending'}`} onClick={() => toggleStatus(inv.id)}
                              title={paid ? 'Remettre à payer' : 'Marquer comme payée'}>
                              {paid ? <><Icon name="check" size={15} stroke={2.4}/>Payée</> : 'À payer'}
                            </button>
                            <div className="inv-actions">
                              {inv.fileId && <button className="icon-btn" onClick={() => setViewingInvoice(inv)} aria-label="Voir la facture" title="Voir la facture"><Icon name="eye"/></button>}
                              <button className="icon-btn" onClick={() => openEdit(inv)} aria-label="Modifier" title="Modifier"><Icon name="edit"/></button>
                              <button className="icon-btn danger" onClick={() => setConfirmDelete(inv)} aria-label="Supprimer" title="Supprimer"><Icon name="trash"/></button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            {dragging && <div className="drop-veil"><div><Icon name="upload" size={34}/>Lâche le PDF pour l’importer</div></div>}
          </section>
        )}

        {/* ══ VIREMENTS ══ */}
        {tab === 'virement' && (
          <section>
            <header className="page-head">
              <div>
                <h1>Virements</h1>
                <p>{virements.length === 0 ? 'Aucun virement enregistré.' : `${plural(virements.length, 'virement')} · ${fmt(totalVir)} versés`}</p>
              </div>
              <button className="btn primary" onClick={() => openAddVirement()}><Icon name="plus"/>Ajouter un virement</button>
            </header>

            {virements.length === 0 ? (
              <div className="empty">Quand tu règles des factures, ajoute le virement ici pour les relier et les marquer payées.</div>
            ) : (
              <ol className="timeline">
                {virements.map(v => {
                  const linked = v.invoiceIds.map(id => invoiceMap[id]).filter(Boolean)
                  const totalLinked = sumHalf(linked)
                  const delta = v.amount - totalLinked
                  const balanced = Math.abs(delta) < 0.005
                  return (
                    <li key={v.id} className="vir">
                      <div className="vir-date">
                        <span className="vir-day">{new Date(v.date).getDate()}</span>
                        <span>{MONTHS_SHORT[new Date(v.date).getMonth()]} {new Date(v.date).getFullYear()}</span>
                      </div>
                      <div className="vir-body">
                        <div className="vir-top">
                          <div>
                            <span className="vir-amount">{fmt(v.amount)}</span>
                            {v.note && <p className="vir-note">{v.note}</p>}
                          </div>
                          <div className="vir-right">
                            {linked.length > 0 && (
                              <span className={`vir-check ${balanced ? 'ok' : delta > 0 ? 'over' : 'under'}`}>
                                {balanced ? 'Montant juste' : delta > 0 ? `${fmt(delta)} en plus` : `${fmt(-delta)} manquants`}
                              </span>
                            )}
                            {v.proofFileId && <button className="mini-btn proof-btn" onClick={() => setViewingInvoice({ description: `Justificatif du virement du ${fmtDate(v.date)}`, fileId: v.proofFileId, mime: v.proofMime })}><Icon name="clip" size={14}/>Justificatif</button>}
                            <button className="icon-btn" onClick={() => openEditVirement(v)} aria-label="Modifier le virement" title="Modifier"><Icon name="edit"/></button>
                            <button className="icon-btn danger" onClick={() => setConfirmDeleteVirement(v)} aria-label="Supprimer le virement" title="Supprimer"><Icon name="trash"/></button>
                          </div>
                        </div>
                        {linked.length > 0 ? (
                          <ul className="vir-invs">
                            {linked.map(inv => (
                              <li key={inv.id}>
                                <span className={`mini-rail ${CHILDREN[inv.child]?.cls || 'none'}`}/>
                                <span className="vir-inv-name">{inv.description}</span>
                                <ChildTag child={inv.child}/>
                                <span className="vir-inv-amt">{fmt(halfOf(inv))}</span>
                              </li>
                            ))}
                          </ul>
                        ) : <p className="vir-none">Aucune facture reliée.</p>}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        )}

        {/* ══ RÉCAPITULATIF ══ */}
        {tab === 'recapitulatif' && (() => {
          const monthly = getMonthly(year)
          const virM = virMonthly(year)
          const yt = monthly.reduce((a, d) => ({ total: a.total + d.total, part: a.part + d.part, paid: a.paid + d.paid, pending: a.pending + d.pending, count: a.count + d.count }), { total: 0, part: 0, paid: 0, pending: 0, count: 0 })
          const yearInvs = invoices.filter(i => new Date(i.date).getFullYear() === year)
          const byCat = CATEGORIES.map(c => ({ ...c, v: sumHalf(yearInvs.filter(i => (i.category || 'autre') === c.id || (!CAT[i.category] && c.id === 'autre'))) })).filter(c => c.v > 0).sort((a, b) => b.v - a.v)
          const maxCat = Math.max(1, ...byCat.map(c => c.v))
          // Année scolaire en cours (sept → août) et estimation d'après l'année scolaire précédente
          const sy = schoolYearOf(new Date())
          const inSy = (y) => invoices.filter(i => schoolYearOf(i.date) === y)
          const cur = inSy(sy), prev = inSy(sy - 1)
          const fc = CATEGORIES.map(c => {
            const is = (i) => (CAT[i.category] ? i.category : 'autre') === c.id
            const now = sumHalf(cur.filter(is)), before = sumHalf(prev.filter(is))
            return { ...c, now, before, rest: Math.max(0, before - now) }
          }).filter(c => c.now > 0 || c.before > 0)
          const fcNow = fc.reduce((s, c) => s + c.now, 0), fcRest = fc.reduce((s, c) => s + c.rest, 0)
          const prevComplete = prev.length > 0 && prev.some(i => new Date(i.date).getMonth() <= 2 || new Date(i.date).getMonth() >= 8) && prev.some(i => { const m = new Date(i.date).getMonth(); return m >= 3 && m <= 7 })
          const virY = virM.reduce((s, x) => s + x, 0)
          const byChild = (c) => invoices.filter(i => i.child === c && new Date(i.date).getFullYear() === year).reduce((s, i) => s + halfOf(i), 0)
          const nina = byChild('NINA'), noah = byChild('NOAH')
          const pct = yt.part > 0 ? Math.round((yt.paid / yt.part) * 100) : 0
          return (
            <section>
              <header className="page-head">
                <div>
                  <h1>Récapitulatif {year}</h1>
                  <p>{plural(yt.count, 'facture')} · ta part : {fmt(yt.part)}</p>
                </div>
                <div className="head-actions">
                  <Segmented ariaLabel="Année" value={year} onChange={setYear} options={years.map(y => ({ value: y, label: String(y) }))}/>
                  <button className="btn primary" onClick={() => setShowReleve(true)}><Icon name="print"/>Relevé PDF</button>
                </div>
              </header>

              <div className="figures">
                <div><span>Ta part</span><strong>{fmt(yt.part)}</strong></div>
                <div className="paid"><span>Payé</span><strong>{fmt(yt.paid)}</strong></div>
                <div className="pending"><span>À payer</span><strong>{fmt(yt.pending)}</strong></div>
                <div><span>Virements</span><strong>{fmt(virY)}</strong></div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <h2>Ta part mois par mois</h2>
                  <div className="legend">
                    <span><i className="lg paid"/>Payé</span>
                    <span><i className="lg pending"/>À payer</span>
                    <span><i className="lg vir"/>Virement</span>
                  </div>
                </div>
                <MonthChart data={monthly} virByMonth={virM}/>
              </div>

              <div className="split">
                <div className="panel">
                  <h2>Par enfant</h2>
                  {[['NINA', nina], ['NOAH', noah]].map(([c, v]) => (
                    <div key={c} className="kid-row">
                      <span className="kid-name"><Avatar child={c} size={40}/>{CHILDREN[c].label}</span>
                      <div className="kid-bar"><span className={CHILDREN[c].cls} style={{ width: `${(v / Math.max(nina, noah, 1)) * 100}%` }}/></div>
                      <strong>{fmt(v)}</strong>
                    </div>
                  ))}
                </div>
                <div className="panel">
                  <h2>Avancement {year}</h2>
                  <div className="progress-big"><span style={{ width: `${pct}%` }}/></div>
                  <p className="progress-txt"><strong>{pct} %</strong> de ta part est réglée.</p>
                </div>
              </div>

              <div className="split">
                <div className="panel">
                  <h2>Par catégorie</h2>
                  {byCat.length === 0 ? <p className="muted-txt">Aucune facture cette année.</p> : byCat.map(c => (
                    <div key={c.id} className="cat-row">
                      <span className="cat-name"><i className="cat-dot" style={{ background: c.color }}/>{c.label}</span>
                      <div className="kid-bar"><span style={{ width: `${(c.v / maxCat) * 100}%`, background: c.color }}/></div>
                      <strong>{fmt(c.v)}</strong>
                    </div>
                  ))}
                </div>
                <div className="panel">
                  <h2>Année scolaire {sy}-{sy + 1}</h2>
                  <p className="fc-line"><span>Ta part depuis septembre</span><strong>{fmt(fcNow)}</strong></p>
                  {prev.length ? <>
                    <p className="fc-line"><span>Encore à prévoir d’ici août</span><strong className="t-pending">{fmt(fcRest)}</strong></p>
                    <p className="fc-line total"><span>Estimation de l’année</span><strong>{fmt(fcNow + fcRest)}</strong></p>
                    <ul className="fc-list">
                      {fc.map(c => (
                        <li key={c.id}><i className="cat-dot" style={{ background: c.color }}/>{c.label}
                          <span>{fmt(c.now)}{c.rest > 0 ? <em> + {fmt(c.rest)} à venir</em> : ''}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="muted-txt">Estimation à partir de l’année scolaire {sy - 1}-{sy} ({plural(prev.length, 'facture')}){prevComplete ? '' : ', encore incomplète dans l’appli'}.</p>
                  </> : <p className="muted-txt">Pas encore d’année scolaire précédente pour faire une estimation.</p>}
                </div>
              </div>

              <div className="panel table-panel">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mois</th>
                      <th className="r">Total factures</th>
                      <th className="r">Ta part</th>
                      <th className="r">Payé</th>
                      <th className="r">À payer</th>
                      <th className="r">Virements</th>
                      <th className="c">Factures</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.map((d, i) => {
                      const dash = <span className="dash">–</span>
                      return (
                        <tr key={i} className={d.count > 0 || virM[i] > 0 ? '' : 'muted'}>
                          <td>{MONTHS_FR[i]}</td>
                          <td className="r">{d.total > 0 ? fmt(d.total) : dash}</td>
                          <td className="r strong">{d.part > 0 ? fmt(d.part) : dash}</td>
                          <td className="r t-paid">{d.paid > 0 ? fmt(d.paid) : dash}</td>
                          <td className="r t-pending">{d.pending > 0.004 ? fmt(d.pending) : dash}</td>
                          <td className="r">{virM[i] > 0 ? fmt(virM[i]) : dash}</td>
                          <td className="c">{d.count > 0 ? d.count : dash}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Total {year}</td>
                      <td className="r">{fmt(yt.total)}</td>
                      <td className="r">{fmt(yt.part)}</td>
                      <td className="r t-paid">{fmt(yt.paid)}</td>
                      <td className="r t-pending">{fmt(yt.pending)}</td>
                      <td className="r">{fmt(virY)}</td>
                      <td className="c">{yt.count}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {years.length > 1 && (
                <div className="panel">
                  <h2>Toutes les années</h2>
                  <div className="years">
                    {years.map(y => {
                      const m = getMonthly(y)
                      const t = m.reduce((s, d) => s + d.part, 0), p = m.reduce((s, d) => s + d.paid, 0)
                      return (
                        <button key={y} className={`year-row${y === year ? ' on' : ''}`} onClick={() => setYear(y)}>
                          <span className="year-n">{y}</span>
                          <span className="year-bar"><span style={{ width: `${t > 0 ? (p / t) * 100 : 0}%` }}/></span>
                          <span className="year-amt">{fmt(t)}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </section>
          )
        })()}
      </main>

      {/* ══ MODALE IMPORT ══ */}
      {importing && (
        <Modal title={queue.length ? `Nouvelle facture (encore ${queue.length} en attente)` : 'Nouvelle facture'} onClose={cancelImport} width={1040}>
          <div className="import">
            <div className="import-pdf"><FileViewer bytes={importing.bytes} mime={importing.mime} height={560}/></div>
            <div className="import-form">
              <p className="file-name"><Icon name="file" size={15}/>{importing.name}</p>
              <ImportCheck state={importing.check} matches={importMatches} guess={importing.guess} virByInvoice={virByInvoice} onView={setViewingInvoice}/>
              <InvoiceFields form={formData} setForm={setFormData}/>
            </div>
          </div>
          <div className="modal-foot">
            <button className="btn ghost" onClick={cancelImport}>{queue.length ? 'Passer' : 'Annuler'}</button>
            <button className={`btn ${importBlocking ? 'danger' : 'primary'}`} onClick={submitImport} disabled={!formData.amount || !formData.date || !formData.description || !!busy}>
              <Icon name="check"/>{importBlocking ? 'Enregistrer quand même' : 'Enregistrer la facture'}
            </button>
          </div>
        </Modal>
      )}

      {/* ══ MODALE PDF ══ */}
      {viewingInvoice && (
        <Modal title={viewingInvoice.description} onClose={() => setViewingInvoice(null)} width={880}>
          <div className="modal-pad"><FileViewer fileId={viewingInvoice.fileId} mime={viewingInvoice.mime} height={640}/></div>
        </Modal>
      )}

      {/* ══ MODALE MODIFIER FACTURE ══ */}
      {editingInvoice && (
        <Modal title="Modifier la facture" onClose={() => setEditingInvoice(null)} width={editingInvoice.fileId ? 1000 : 560}>
          <div className={editingInvoice.fileId ? 'import' : 'modal-pad'}>
            {editingInvoice.fileId && <div className="import-pdf"><FileViewer fileId={editingInvoice.fileId} mime={editingInvoice.mime} height={520}/></div>}
            <div className="import-form"><InvoiceFields form={editForm} setForm={setEditForm} showStatus/></div>
          </div>
          <div className="modal-foot">
            <button className="btn ghost" onClick={() => setEditingInvoice(null)}>Annuler</button>
            <button className="btn primary" onClick={submitEdit} disabled={!editForm.amount || !editForm.date || !editForm.description}><Icon name="check"/>Enregistrer les modifications</button>
          </div>
        </Modal>
      )}

      {/* ══ CONFIRMER SUPPRESSION FACTURE ══ */}
      {confirmDelete && (
        <Modal title="Supprimer cette facture ?" onClose={() => setConfirmDelete(null)} width={440} tone="danger">
          <div className="modal-pad">
            <div className="recap-box">
              <strong>{confirmDelete.description}</strong>
              <span>{fmtDate(confirmDelete.date)} · {fmt(confirmDelete.amount)}</span>
            </div>
            <p className="warn">La facture et son PDF seront effacés. Elle sera aussi retirée des virements qui la mentionnent.</p>
          </div>
          <div className="modal-foot">
            <button className="btn ghost" onClick={() => setConfirmDelete(null)}>Annuler</button>
            <button className="btn danger" onClick={() => deleteInvoice(confirmDelete.id)}><Icon name="trash"/>Supprimer la facture</button>
          </div>
        </Modal>
      )}

      {/* ══ MODALE VIREMENT ══ */}
      {(addingVirement || editingVirement) && (
        <VirementModal
          title={editingVirement ? 'Modifier le virement' : 'Nouveau virement'}
          form={virementForm} setForm={setVirementForm}
          invoices={virFormInvoices}
          onCancel={() => { setAddingVirement(false); setEditingVirement(null) }}
          onSubmit={editingVirement ? submitEditVirement : submitVirement}
          toggleInvoice={toggleVirInvoice}
        />
      )}

      {/* ══ CONFIRMER SUPPRESSION VIREMENT ══ */}
      {confirmDeleteVirement && (
        <Modal title="Supprimer ce virement ?" onClose={() => setConfirmDeleteVirement(null)} width={440} tone="danger">
          <div className="modal-pad">
            <div className="recap-box">
              <strong>Virement du {fmtLong(confirmDeleteVirement.date)}</strong>
              <span>{fmt(confirmDeleteVirement.amount)} · {plural(confirmDeleteVirement.invoiceIds.length, 'facture')} reliée{confirmDeleteVirement.invoiceIds.length > 1 ? 's' : ''}</span>
            </div>
            <p className="warn">Les factures reliées sont conservées, avec leur statut actuel.</p>
          </div>
          <div className="modal-foot">
            <button className="btn ghost" onClick={() => setConfirmDeleteVirement(null)}>Annuler</button>
            <button className="btn danger" onClick={() => deleteVirement(confirmDeleteVirement.id)}><Icon name="trash"/>Supprimer le virement</button>
          </div>
        </Modal>
      )}

      {showReleve && <Releve invoices={invoices} virements={virements} onClose={() => setShowReleve(false)}/>}

      {/* ══ RÉGLAGES ══ */}
      {showSettings && (
        <Modal title="Réglages" onClose={() => setShowSettings(false)} width={560}>
          <div className="modal-pad settings">
            <h3>Photos des enfants</h3>
            <div className="photo-row">
              {Object.keys(CHILDREN).map(c => (
                <label key={c} className="photo-pick">
                  <Avatar child={c} size={64}/>
                  <span><strong>{CHILDREN[c].label}</strong><small>{photoIds[c] ? 'Changer la photo' : 'Ajouter une photo'}</small></span>
                  <input type="file" accept="image/*" hidden onChange={e => { uploadPhoto(c, e.target.files[0]); e.target.value = '' }}/>
                </label>
              ))}
            </div>

            <h3>Données</h3>
            <a className="backup-opt" href={cloud.folderUrl()} target="_blank" rel="noreferrer">
              <Icon name="file" size={22}/>
              <span><strong>Ouvrir le dossier dans Google Drive</strong><small>Factures rangées par année et par enfant</small></span>
            </a>
            <button className="backup-opt" onClick={exportAll}>
              <Icon name="save" size={22}/>
              <span><strong>Télécharger une sauvegarde complète</strong><small>{plural(invoices.length, 'facture')} et {plural(virements.length, 'virement')}, fichiers compris</small></span>
            </button>
            <label className="backup-opt">
              <Icon name="upload" size={22}/>
              <span><strong>Restaurer une sauvegarde</strong><small>Remplace toutes les données actuelles par celles du fichier</small></span>
              <input type="file" accept="application/json,.json" hidden onChange={async e => {
                const f = e.target.files[0]; e.target.value = ''
                if (!f || !confirm('Remplacer toutes les données actuelles par cette sauvegarde ?')) return
                setBusy('Restauration de la sauvegarde…')
                try { const n = await restoreBackup(f, (i, n) => setBusy(`Restauration : ${i} sur ${n}`)); setShowSettings(false); notify(`Sauvegarde restaurée : ${plural(n, 'facture')}`) }
                catch (err) { setSettingsMsg(err.message) } finally { setBusy('') }
              }}/>
            </label>
            {settingsMsg && <p className="error">{settingsMsg}</p>}

            {cloud.IS_CLOUD && <>
              <h3>Compte</h3>
              <div className="account">
                <span>Connecté avec {cloud.CONFIG.EMAIL}</span>
                <button className="btn ghost" onClick={logout}>Se déconnecter</button>
              </div>
            </>}
          </div>
        </Modal>
      )}

      {busy && <div className="busy"><div><span className="spinner"/>{busy}</div></div>}
      {toast && <div className={`toast ${toast.tone}`} role="status">{toast.tone === 'ok' && <Icon name="check" size={16} stroke={2.4}/>}{toast.text}</div>}
    </div>
    </PhotoContext.Provider>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const css = `
@font-face { font-family: 'Bricolage'; src: url(${fontDisplay}) format('woff2'); font-weight: 200 800; font-display: swap; }
@font-face { font-family: 'Figtree'; src: url(${fontBody}) format('woff2'); font-weight: 300 900; font-display: swap; }

:root {
  --ink: #1D2650;
  --ink-2: #4A5378;
  --ink-3: #8790AE;
  --paper: #F6F8FC;
  --sheet: #FFFFFF;
  --rule: #DDE4F0;
  --rule-2: #ECF0F7;
  --margin: #E0676A;
  --nina: #B8336F;  --nina-bg: #FBEAF2;
  --noah: #2766C9;  --noah-bg: #E7F0FD;
  --paid: #23845A;  --paid-bg: #E3F4EB;
  --pending: #B86B05; --pending-bg: #FDF1DF;
  --danger: #C23B3B; --danger-bg: #FCEBEB;
  --display: 'Bricolage', 'Segoe UI', sans-serif;
  --body: 'Figtree', 'Segoe UI', sans-serif;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; }
body { background: var(--paper); color: var(--ink); font-family: var(--body); font-size: 15px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
button { font: inherit; color: inherit; background: none; border: none; cursor: pointer; }
button:disabled { cursor: default; opacity: .45; }
input, textarea { font: inherit; color: inherit; }
:focus-visible { outline: 2.5px solid var(--noah); outline-offset: 2px; border-radius: 6px; }
.icon { flex-shrink: 0; }
.boot { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: var(--ink-2); }
.gate { min-height: 100vh; display: grid; place-items: center; padding: 24px; background:
  linear-gradient(to right, transparent 40px, var(--margin) 40px, var(--margin) 41.5px, transparent 41.5px),
  repeating-linear-gradient(to bottom, transparent 0 31px, #E3EAF6 31px 32px), var(--paper); }
.gate-card { width: 100%; max-width: 420px; background: var(--sheet); border: 1px solid var(--rule); border-radius: 20px; padding: 36px 32px; box-shadow: 0 20px 50px rgba(29,38,80,.12); display: flex; flex-direction: column; align-items: flex-start; gap: 14px; }
.gate-card.wide { max-width: 560px; }
.gate-title { color: var(--ink); font-size: 44px; }
.gate-sub { color: var(--ink-3); margin-top: -10px; }
.gate-text { color: var(--ink-2); }
.gate-btn { padding: 12px 18px; font-size: 15px; }
.gate-err { color: var(--danger); font-size: 14px; }
.gate-note { color: var(--ink-3); font-size: 13px; }
.gate-card .progress-big { width: 100%; }
.busy { position: fixed; inset: 0; background: rgba(246,248,252,.7); display: grid; place-items: center; z-index: 90; }
.busy div { display: flex; align-items: center; gap: 12px; background: var(--sheet); border: 1px solid var(--rule); padding: 16px 22px; border-radius: 14px; font-weight: 700; box-shadow: 0 10px 30px rgba(20,26,56,.15); }
.avatar.initial { display: inline-grid; place-items: center; color: #fff; font-family: var(--display); font-weight: 700; line-height: 1; }
.avatar.initial.nina { background: var(--nina); } .avatar.initial.noah { background: var(--noah); }
.img-viewer { overflow: auto; background: #E9EDF5; }
.img-viewer img { display: block; width: 100%; height: auto; }
.settings h3 { font-family: var(--display); font-size: 17px; font-weight: 650; margin: 18px 0 10px; }
.settings h3:first-child { margin-top: 0; }
.photo-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.photo-pick { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--rule); border-radius: 12px; cursor: pointer; }
.photo-pick:hover { border-color: var(--ink-3); background: var(--paper); }
.photo-pick span { display: flex; flex-direction: column; }
.photo-pick small { color: var(--noah); font-weight: 700; font-size: 13px; }
a.backup-opt, label.backup-opt { color: inherit; text-decoration: none; cursor: pointer; }
.account { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; color: var(--ink-2); font-size: 14px; }
.spinner { width: 26px; height: 26px; border-radius: 50%; border: 3px solid var(--rule); border-top-color: var(--ink); animation: spin .8s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Cadre ── */
.app { display: grid; grid-template-columns: 272px 1fr; min-height: 100vh; background: linear-gradient(to right, var(--ink) 272px, transparent 272px); }
.side { background: var(--ink); color: #fff; padding: 28px 20px 20px; display: flex; flex-direction: column; gap: 28px; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
.brand { padding: 0 8px; }
.brand-title { display: block; font-family: var(--display); font-weight: 750; font-size: 34px; letter-spacing: -0.03em; line-height: 1; }
.brand-kids { display: flex; align-items: center; gap: 16px; margin-top: 14px; font-size: 14px; color: #D5DBEF; }
.brand-kid { display: inline-flex; align-items: center; gap: 8px; }
.brand-kid .avatar.nina { box-shadow: 0 0 0 2px var(--ink), 0 0 0 4px #F08DBA; }
.brand-kid .avatar.noah { box-shadow: 0 0 0 2px var(--ink), 0 0 0 4px #7FB0F5; }
.avatar { border-radius: 50%; object-fit: cover; display: inline-block; flex-shrink: 0; background: var(--rule-2); }
.child-label { display: inline-flex; align-items: center; gap: 7px; }
.seg-btn .avatar { margin-left: -4px; }
.seg-btn.on .avatar { box-shadow: 0 0 0 2px #fff; }

.nav { display: flex; flex-direction: column; gap: 2px; }
.nav-btn { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; color: #C6CDE6; font-size: 15px; text-align: left; transition: background .15s, color .15s; }
.nav-btn:hover { background: rgba(255,255,255,.07); color: #fff; }
.nav-btn.on { background: #fff; color: var(--ink); font-weight: 700; }
.nav-count { margin-left: auto; font-size: 12px; font-variant-numeric: tabular-nums; opacity: .7; }

.ledger { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 16px; padding: 18px; display: flex; flex-direction: column; }
.ledger-label { font-size: 13px; color: #B9C1DE; }
.ledger-big { font-family: var(--display); font-size: 36px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.15; margin-top: 2px; color: #FFD38A; font-variant-numeric: tabular-nums; }
.ledger-big.zero { color: #8EE0B6; }
.ledger-sub { font-size: 13px; color: #B9C1DE; margin-top: 2px; }
.ledger-btn { margin-top: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; background: #FFD38A; color: var(--ink); font-weight: 700; font-size: 14px; padding: 9px 12px; border-radius: 10px; transition: filter .15s; }
.ledger-btn:hover { filter: brightness(1.06); }
.ledger-lines { margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,.12); display: flex; flex-direction: column; gap: 6px; }
.ledger-lines div { display: flex; justify-content: space-between; font-size: 13px; }
.ledger-lines dt { color: #B9C1DE; }
.ledger-lines dd { font-variant-numeric: tabular-nums; font-weight: 700; }
.side-foot { margin-top: auto; display: flex; flex-direction: column; gap: 4px; }
.sync { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #B9C1DE; padding: 0 12px; }
.sync i { width: 8px; height: 8px; border-radius: 50%; background: #8EE0B6; flex-shrink: 0; }
.sync.pending i { background: #FFD38A; animation: pulse 1s ease-in-out infinite; }
.sync.error i { background: #F28B8B; }
.sync.error { color: #F7B3B3; }
@keyframes pulse { 50% { opacity: .35; } }
.side-backup { display: flex; align-items: center; gap: 10px; color: #C6CDE6; font-size: 14px; padding: 10px 12px; border-radius: 10px; }
.side-backup:hover { background: rgba(255,255,255,.07); color: #fff; }

/* Le cahier : marge rouge à gauche, lignes fines en tête de page */
.main { position: relative; padding: 36px 48px 64px 72px; min-width: 0;
  background:
    linear-gradient(to right, transparent 40px, var(--margin) 40px, var(--margin) 41.5px, transparent 41.5px, transparent 45px, rgba(224,103,106,.45) 45px, rgba(224,103,106,.45) 46px, transparent 46px),
    repeating-linear-gradient(to bottom, transparent 0 31px, #E3EAF6 31px 32px) top / 100% 128px no-repeat,
    var(--paper);
}
.main > section { max-width: 1080px; }

.page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; margin-bottom: 28px; min-height: 64px; }
.page-head h1 { font-family: var(--display); font-weight: 700; font-size: 40px; letter-spacing: -0.03em; line-height: 1; }
.page-head p { color: var(--ink-2); margin-top: 8px; font-size: 15px; }

/* ── Boutons ── */
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 10px; font-weight: 700; font-size: 14px; transition: background .15s, box-shadow .15s; }
.btn.primary { background: var(--ink); color: #fff; box-shadow: 0 1px 0 rgba(29,38,80,.2); }
.btn.primary:hover:not(:disabled) { background: #2A3570; }
.btn.ghost { color: var(--ink-2); }
.btn.ghost:hover { background: var(--rule-2); }
.btn.danger { background: var(--danger); color: #fff; }
.icon-btn { width: 34px; height: 34px; display: inline-grid; place-items: center; border-radius: 9px; color: var(--ink-3); transition: background .15s, color .15s; }
.icon-btn:hover:not(:disabled) { background: var(--rule-2); color: var(--ink); }
.icon-btn.danger:hover { background: var(--danger-bg); color: var(--danger); }
.link-btn { color: var(--noah); font-weight: 700; font-size: 14px; text-decoration: underline; text-underline-offset: 3px; }

/* ── Segmented ── */
.segmented { display: inline-flex; background: var(--sheet); border: 1px solid var(--rule); border-radius: 11px; padding: 3px; gap: 2px; flex-wrap: wrap; }
.seg-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; font-size: 14px; color: var(--ink-2); transition: background .15s, color .15s; }
.seg-btn:hover { color: var(--ink); background: var(--rule-2); }
.seg-btn.on { background: var(--ink); color: #fff; font-weight: 700; }
.seg-btn.on.nina { background: var(--nina); } .seg-btn.on.noah { background: var(--noah); }
.seg-btn.on.paid { background: var(--paid); } .seg-btn.on.pending { background: var(--pending); }
.seg-count { font-size: 12px; font-variant-numeric: tabular-nums; opacity: .7; }

.toolbar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 24px; }
.search { margin-left: auto; display: flex; align-items: center; gap: 8px; background: var(--sheet); border: 1px solid var(--rule); border-radius: 11px; padding: 0 12px; color: var(--ink-3); min-width: 220px; }
.search input { border: none; outline: none; background: none; padding: 9px 0; width: 100%; color: var(--ink); }
.search:focus-within { border-color: var(--noah); }

/* ── Étiquettes enfant ── */
.child-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; padding: 1px 9px; border-radius: 999px; line-height: 1.6; white-space: nowrap; }
.child-tag .avatar { margin: 1px 0 1px -7px; }
.child-tag.nina { background: var(--nina-bg); color: var(--nina); }
.child-tag.noah { background: var(--noah-bg); color: var(--noah); }
.child-tag.none { background: var(--rule-2); color: var(--ink-3); font-weight: 400; }

/* ── Liste des factures ── */
.groups { display: flex; flex-direction: column; gap: 28px; }
.group-title { font-family: var(--display); font-weight: 650; font-size: 18px; letter-spacing: -0.01em; display: flex; justify-content: space-between; align-items: baseline; padding: 0 4px 8px; }
.group-title span { font-family: var(--body); font-size: 14px; font-weight: 400; color: var(--ink-3); font-variant-numeric: tabular-nums; }
.inv-list { list-style: none; background: var(--sheet); border: 1px solid var(--rule); border-radius: 14px; overflow: hidden; }
.inv { position: relative; display: grid; grid-template-columns: 1fr auto 104px auto; align-items: center; gap: 20px; padding: 16px 16px 16px 24px; }
.inv + .inv { border-top: 1px solid var(--rule-2); }
.inv-rail { position: absolute; left: 0; top: 12px; bottom: 12px; width: 4px; border-radius: 0 4px 4px 0; }
.inv-rail.nina, .mini-rail.nina { background: var(--nina); }
.inv-rail.noah, .mini-rail.noah { background: var(--noah); }
.inv-rail.none, .mini-rail.none { background: var(--rule); }
.inv-main { min-width: 0; }
.inv-title { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-weight: 700; font-size: 16px; }
.inv-title > span:first-child { min-width: 0; overflow-wrap: anywhere; }
.inv-meta { display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 13px; color: var(--ink-3); margin-top: 3px; }
.inv-comment { font-size: 13px; color: var(--ink-2); margin-top: 6px; white-space: pre-wrap; overflow-wrap: anywhere; max-width: 72ch; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.inv-vir { display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 13px; color: var(--paid); font-weight: 700; }
.inv-vir:hover { text-decoration: underline; }
.inv-amounts { text-align: right; display: flex; flex-direction: column; }
.inv-half { font-family: var(--display); font-weight: 650; font-size: 20px; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; }
.inv-total { font-size: 12px; color: var(--ink-3); font-variant-numeric: tabular-nums; }
.inv.paid .inv-half { color: var(--ink-2); }
.status-btn { display: inline-flex; justify-content: center; align-items: center; gap: 5px; padding: 6px 10px; border-radius: 999px; font-size: 13px; font-weight: 700; transition: filter .15s; }
.status-btn.pending { background: var(--pending-bg); color: var(--pending); }
.status-btn.paid { background: var(--paid-bg); color: var(--paid); }
.status-btn:hover { filter: brightness(.96); }
.inv-actions { display: flex; gap: 2px; }

.drop-empty { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 64px 20px; border: 2px dashed var(--rule); border-radius: 16px; background: var(--sheet); color: var(--ink-3); }
.drop-empty strong { color: var(--ink); font-size: 17px; margin-top: 8px; }
.drop-empty:hover { border-color: var(--ink-3); }
.empty { padding: 40px 24px; text-align: center; color: var(--ink-2); background: var(--sheet); border: 1px solid var(--rule); border-radius: 14px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.drop-veil { position: fixed; inset: 0 0 0 272px; background: rgba(246,248,252,.86); display: grid; place-items: center; z-index: 40; pointer-events: none; }
.drop-veil div { display: flex; flex-direction: column; align-items: center; gap: 10px; font-family: var(--display); font-size: 22px; font-weight: 650; color: var(--ink); padding: 48px 64px; border: 2.5px dashed var(--ink); border-radius: 20px; background: var(--sheet); }

/* ── Virements ── */
.timeline { list-style: none; display: flex; flex-direction: column; gap: 16px; }
.vir { display: grid; grid-template-columns: 92px 1fr; gap: 20px; }
.vir-date { text-align: right; padding-top: 14px; color: var(--ink-3); font-size: 13px; display: flex; flex-direction: column; }
.vir-day { font-family: var(--display); font-size: 32px; font-weight: 700; color: var(--ink); line-height: 1; letter-spacing: -0.02em; }
.vir-body { background: var(--sheet); border: 1px solid var(--rule); border-radius: 14px; padding: 18px 20px; }
.vir-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.vir-amount { font-family: var(--display); font-weight: 700; font-size: 26px; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.vir-note { color: var(--ink-2); font-size: 14px; margin-top: 2px; }
.vir-right { display: flex; align-items: center; gap: 4px; }
.vir-check { font-size: 13px; font-weight: 700; padding: 3px 10px; border-radius: 999px; margin-right: 8px; }
.vir-check.ok { background: var(--paid-bg); color: var(--paid); }
.vir-check.over { background: var(--noah-bg); color: var(--noah); }
.vir-check.under { background: var(--danger-bg); color: var(--danger); }
.vir-invs { list-style: none; margin-top: 14px; border-top: 1px solid var(--rule-2); }
.vir-invs li { display: flex; align-items: center; gap: 10px; padding: 9px 0; font-size: 14px; }
.vir-invs li + li { border-top: 1px dashed var(--rule-2); }
.mini-rail { width: 3px; height: 18px; border-radius: 2px; flex-shrink: 0; }
.vir-inv-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vir-inv-amt { margin-left: auto; font-weight: 700; font-variant-numeric: tabular-nums; }
.vir-none { margin-top: 10px; font-size: 14px; color: var(--ink-3); }

/* ── Récap ── */
.figures { display: grid; grid-template-columns: repeat(4, 1fr); background: var(--sheet); border: 1px solid var(--rule); border-radius: 14px; margin-bottom: 20px; }
.figures div { padding: 18px 22px; display: flex; flex-direction: column; gap: 2px; }
.figures div + div { border-left: 1px solid var(--rule-2); }
.figures span { font-size: 13px; color: var(--ink-2); }
.figures strong { font-family: var(--display); font-size: 26px; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.figures .paid strong { color: var(--paid); } .figures .pending strong { color: var(--pending); }
.panel { background: var(--sheet); border: 1px solid var(--rule); border-radius: 14px; padding: 20px 22px; margin-bottom: 20px; }
.panel h2 { font-family: var(--display); font-weight: 650; font-size: 18px; letter-spacing: -0.01em; margin-bottom: 14px; }
.panel-head { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 10px; }
.legend { display: flex; gap: 16px; font-size: 13px; color: var(--ink-2); }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.lg { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
.lg.paid { background: var(--paid); } .lg.pending { background: #F0B45A; }
.lg.vir { height: 3px; background: var(--ink); border-radius: 2px; }
.chart { width: 100%; height: auto; display: block; }
.chart-grid { stroke: var(--rule-2); stroke-width: 1; }
.chart-base { stroke: var(--rule); stroke-width: 1; }
.bar-paid { fill: var(--paid); } .bar-pending { fill: #F0B45A; }
.vir-mark { stroke: var(--ink); stroke-width: 3; stroke-linecap: round; }
.chart-label { font-size: 12px; fill: var(--ink-3); font-family: var(--body); }
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.split .panel { margin-bottom: 20px; }
.kid-name { display: inline-flex; align-items: center; gap: 10px; font-weight: 700; }
.kid-row { display: grid; grid-template-columns: 100px 1fr auto; align-items: center; gap: 14px; padding: 6px 0; }
.kid-row strong { font-variant-numeric: tabular-nums; }
.kid-bar { height: 10px; background: var(--rule-2); border-radius: 999px; overflow: hidden; }
.kid-bar span { display: block; height: 100%; border-radius: 999px; }
.kid-bar .nina { background: var(--nina); } .kid-bar .noah { background: var(--noah); }
.progress-big { height: 14px; background: var(--pending-bg); border-radius: 999px; overflow: hidden; }
.progress-big span { display: block; height: 100%; background: var(--paid); border-radius: 999px; }
.progress-txt { margin-top: 12px; color: var(--ink-2); }
.progress-txt strong { font-family: var(--display); font-size: 22px; color: var(--ink); margin-right: 4px; }
.table-panel { padding: 6px 0; overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; font-variant-numeric: tabular-nums; }
.table th { text-align: left; font-weight: 700; font-size: 13px; color: var(--ink-2); padding: 12px 22px; border-bottom: 1px solid var(--rule); white-space: nowrap; }
.table td { padding: 10px 22px; border-bottom: 1px solid var(--rule-2); white-space: nowrap; }
.table .r { text-align: right; } .table .c { text-align: center; }
.table .strong { font-weight: 700; }
.table .t-paid { color: var(--paid); } .table .t-pending { color: var(--pending); }
.table tr.muted td { color: var(--ink-3); }
.table .dash { color: #C3CADB; }
.table tfoot td { font-weight: 700; border-bottom: none; border-top: 2px solid var(--ink); padding-top: 14px; }
.years { display: flex; flex-direction: column; gap: 4px; }
.year-row { display: grid; grid-template-columns: 64px 1fr 120px; gap: 16px; align-items: center; padding: 8px 10px; border-radius: 10px; text-align: left; }
.year-row:hover { background: var(--rule-2); }
.year-row.on { background: var(--noah-bg); }
.year-n { font-family: var(--display); font-weight: 700; font-size: 18px; }
.year-bar { height: 8px; background: var(--pending-bg); border-radius: 999px; overflow: hidden; }
.year-bar span { display: block; height: 100%; background: var(--paid); }
.year-amt { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }

/* ── Modales ── */
.overlay { position: fixed; inset: 0; background: rgba(20,26,56,.45); display: grid; place-items: center; padding: 24px; z-index: 50; animation: fade .15s ease-out; }
.modal { width: 100%; max-height: calc(100vh - 48px); overflow-y: auto; background: var(--sheet); border-radius: 18px; box-shadow: 0 24px 60px rgba(20,26,56,.28); animation: rise .18s ease-out; }
@keyframes fade { from { opacity: 0; } }
@keyframes rise { from { opacity: 0; transform: translateY(8px) scale(.99); } }
.modal-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 18px 20px 14px 24px; border-bottom: 1px solid var(--rule-2); position: sticky; top: 0; background: var(--sheet); z-index: 2; }
.modal-head h2 { font-family: var(--display); font-weight: 700; font-size: 22px; letter-spacing: -0.02em; overflow-wrap: anywhere; }
.modal.danger .modal-head h2 { color: var(--danger); }
.modal-pad { padding: 20px 24px; }
.modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 24px 20px; border-top: 1px solid var(--rule-2); position: sticky; bottom: 0; background: var(--sheet); }
.import { display: grid; grid-template-columns: 1.1fr 1fr; gap: 24px; padding: 20px 24px; align-items: start; }
.import-pdf { border: 1px solid var(--rule); border-radius: 12px; overflow: hidden; position: sticky; top: 76px; }
.file-name { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--ink-3); margin-bottom: 14px; overflow-wrap: anywhere; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px; }
.field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.field.wide { grid-column: 1 / -1; }
.field-label { font-size: 13px; font-weight: 700; color: var(--ink-2); }
.field-hint { font-size: 13px; color: var(--ink-3); }
.input { width: 100%; background: var(--paper); border: 1.5px solid var(--rule); border-radius: 10px; padding: 9px 12px; outline: none; transition: border-color .15s, background .15s; }
.input:focus { border-color: var(--noah); background: #fff; }
textarea.input { resize: vertical; min-height: 64px; }
.input-euro { position: relative; }
.input-euro .input { padding-right: 32px; font-variant-numeric: tabular-nums; }
.input-euro span { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--ink-3); pointer-events: none; }
.field .segmented { align-self: flex-start; }

.vir-modal { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 24px; padding: 20px 24px; }
.vir-modal-right { min-width: 0; }
.vir-modal-left { display: flex; flex-direction: column; gap: 14px; }
.balance { background: var(--paper); border: 1px solid var(--rule); border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; font-size: 14px; }
.balance > div { display: flex; justify-content: space-between; gap: 10px; }
.balance span { color: var(--ink-2); }
.balance strong { font-variant-numeric: tabular-nums; }
.balance-delta { border-top: 1px solid var(--rule); padding-top: 10px; margin-top: 2px; }
.balance-delta span, .balance-delta strong { font-weight: 700; }
.balance-delta.ok span, .balance-delta.ok strong { color: var(--paid); }
.balance-delta.over span, .balance-delta.over strong { color: var(--noah); }
.balance-delta.under span, .balance-delta.under strong { color: var(--danger); }
.balance .link-btn { align-self: flex-start; }
.picker-head { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: var(--ink-2); margin-bottom: 8px; }
.picker { border: 1px solid var(--rule); border-radius: 12px; max-height: 400px; overflow-y: auto; }
.picker-empty { padding: 28px; text-align: center; color: var(--ink-3); }
.pick-row { width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 14px; text-align: left; transition: background .12s; }
.pick-row + .pick-row { border-top: 1px solid var(--rule-2); }
.pick-row:hover { background: var(--paper); }
.pick-row.sel { background: var(--noah-bg); }
.pick-box { width: 20px; height: 20px; border-radius: 6px; border: 1.5px solid var(--ink-3); display: grid; place-items: center; flex-shrink: 0; color: #fff; }
.pick-row.sel .pick-box { background: var(--ink); border-color: var(--ink); }
.pick-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.pick-title { font-weight: 700; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pick-meta { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--ink-3); }
.pick-amount { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; font-size: 14px; display: flex; flex-direction: column; }
.pick-status { font-size: 12px; font-weight: 400; }
.pick-status.paid { color: var(--paid); } .pick-status.pending { color: var(--pending); }

.recap-box { background: var(--paper); border: 1px solid var(--rule); border-radius: 12px; padding: 12px 16px; display: flex; flex-direction: column; gap: 2px; }
.recap-box span { font-size: 14px; color: var(--ink-2); }
.warn { margin-top: 14px; font-size: 14px; color: var(--ink-2); }
.backup p { color: var(--ink-2); margin-bottom: 16px; }
.backup-opt { width: 100%; display: flex; align-items: center; gap: 14px; padding: 14px 16px; border: 1px solid var(--rule); border-radius: 12px; text-align: left; margin-bottom: 10px; transition: border-color .15s, background .15s; }
.backup-opt:hover { border-color: var(--ink-3); background: var(--paper); }
.backup-opt span { display: flex; flex-direction: column; }
.backup-opt small { color: var(--ink-3); font-size: 13px; }
.error { color: var(--danger); font-size: 14px; margin-top: 6px; }

/* ── Doublons ── */
.spinner.small { width: 16px; height: 16px; border-width: 2px; }
.dup-status { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--ink-3); margin: -8px 0 20px 4px; }
.dup-status.ok { color: var(--paid); }
.dup-panel { background: var(--sheet); border: 1.5px solid #F2C4C4; border-radius: 14px; padding: 18px 20px; margin-bottom: 28px; scroll-margin-top: 20px; }
.dup-head { display: flex; align-items: center; gap: 10px; color: var(--danger); margin-bottom: 12px; }
.dup-head h2 { font-family: var(--display); font-weight: 700; font-size: 20px; letter-spacing: -0.01em; }
.dup-pair { padding: 14px 0; border-top: 1px solid var(--rule-2); display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }
.dup-why { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 14px; color: var(--ink-2); }
.dup-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%; }
.level { font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 999px; white-space: nowrap; }
.level.certain, .level.probable { background: var(--danger-bg); color: var(--danger); }
.level.possible { background: var(--pending-bg); color: var(--pending); }
.mini-inv { background: var(--paper); border: 1px solid var(--rule); border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.mini-inv + .mini-inv { margin-top: 0; }
.mini-inv-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 14px; }
.mini-inv-top strong { min-width: 0; overflow-wrap: anywhere; }
.mini-inv-meta { display: flex; flex-wrap: wrap; gap: 2px 12px; font-size: 12px; color: var(--ink-3); }
.mini-inv-bottom { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 2px; }
.mini-inv-amt { font-weight: 700; font-variant-numeric: tabular-nums; }
.mini-inv-actions { margin-left: auto; display: flex; }
.pill { font-size: 12px; font-weight: 700; padding: 1px 9px; border-radius: 999px; }
.pill.paid { background: var(--paid-bg); color: var(--paid); }
.pill.pending { background: var(--pending-bg); color: var(--pending); }
.dup-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; padding: 1px 9px; border-radius: 999px; text-decoration: none; line-height: 1.6; }
.dup-badge.certain, .dup-badge.probable { background: var(--danger-bg); color: var(--danger); }
.dup-badge.possible { background: var(--pending-bg); color: var(--pending); }
.check-box { border-radius: 12px; padding: 12px 14px; margin-bottom: 16px; font-size: 14px; display: flex; flex-direction: column; gap: 8px; }
.check-box.neutral, .check-box.ok { flex-direction: row; align-items: center; gap: 8px; }
.check-box.neutral { background: var(--paper); color: var(--ink-2); border: 1px solid var(--rule); }
.check-box.ok { background: var(--paid-bg); color: var(--paid); font-weight: 700; }
.check-box.certain, .check-box.probable { background: var(--danger-bg); border: 1.5px solid #F2C4C4; }
.check-box.possible { background: var(--pending-bg); border: 1.5px solid #F3D9AE; }
.check-title { display: flex; align-items: center; gap: 8px; font-weight: 700; }
.check-box.certain .check-title, .check-box.probable .check-title { color: var(--danger); }
.check-box.possible .check-title { color: var(--pending); }
.check-reasons { color: var(--ink-2); margin-top: -4px; }
.check-box .mini-inv { background: var(--sheet); }
.guess { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--noah); margin: -6px 0 16px; }

/* ── PDF ── */
.pdf-viewer { background: #E9EDF5; }
.pdf-scroll { overflow-y: auto; }
.pdf-scroll canvas { display: block; width: 100%; background: #fff; }
.pdf-pager { display: flex; align-items: center; justify-content: center; gap: 12px; height: 44px; font-size: 13px; color: var(--ink-2); background: var(--sheet); border-top: 1px solid var(--rule); }
.pdf-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: var(--ink-3); font-size: 14px; background: var(--paper); }

/* ── Toast ── */
.toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; background: var(--ink); color: #fff; padding: 10px 18px; border-radius: 999px; font-size: 14px; font-weight: 700; box-shadow: 0 10px 30px rgba(20,26,56,.3); z-index: 80; animation: toast .2s ease-out; }
.toast.err { background: var(--danger); }
@keyframes toast { from { opacity: 0; transform: translate(-50%, 8px); } }

/* ── Petits écrans ── */
@media (max-width: 1100px) {
  .inv { grid-template-columns: 1fr auto; }
  .inv .status-btn { grid-column: 1; justify-self: start; }
  .inv-actions { justify-self: end; }
  .import { grid-template-columns: 1fr; }
  .import-pdf { position: static; }
  .figures { grid-template-columns: 1fr 1fr; }
  .figures div:nth-child(3) { border-left: none; }
  .figures div:nth-child(n+3) { border-top: 1px solid var(--rule-2); }
}
@media (max-width: 900px) {
  .app { grid-template-columns: 1fr; }
  .side { position: static; height: auto; }
  .main { padding: 24px 20px 48px 56px; }
  .drop-veil { inset: 0; }
  .vir-modal, .split, .dup-cols { grid-template-columns: 1fr; }
  .search { margin-left: 0; }
}
/* ── Catégories, part, paiement ── */
.select-wrap { position: relative; display: flex; align-items: center; }
.select-wrap .cat-dot { position: absolute; left: 12px; pointer-events: none; }
.select-wrap .cat-dot + .select { padding-left: 30px; }
.select { appearance: none; padding-right: 34px; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238790AE' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; }
.cat-filter .select { background-color: var(--sheet); padding-top: 8px; padding-bottom: 8px; border-width: 1px; border-radius: 11px; }
.cat-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
.cat-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-2); padding: 1px 9px; border: 1px solid var(--rule); border-radius: 999px; line-height: 1.6; white-space: nowrap; }
.share-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.share-input { width: 96px; }
.mini-btn { font-size: 12px; font-weight: 700; color: var(--noah); padding: 2px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; }
.mini-btn:hover { background: var(--noah-bg); }
.mini-btn.in-input { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); }
.pay-info { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; margin-top: 8px; font-size: 13px; color: var(--ink-2); }
.pay-link { display: inline-flex; align-items: center; gap: 6px; background: var(--ink); color: #fff; font-weight: 700; padding: 4px 12px; border-radius: 999px; text-decoration: none; }
.pay-link:hover { background: #2A3570; }
.pay-item { display: inline-flex; align-items: center; gap: 6px; }
.pay-item code, .secret code { font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace; font-size: 13px; background: var(--rule-2); padding: 1px 6px; border-radius: 5px; color: var(--ink); }
.secret { display: inline-flex; align-items: center; gap: 4px; }
.head-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.cat-row { display: grid; grid-template-columns: 150px 1fr auto; align-items: center; gap: 14px; padding: 5px 0; }
.cat-row strong { font-variant-numeric: tabular-nums; }
.cat-name { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; }
.fc-line { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; color: var(--ink-2); }
.fc-line strong { color: var(--ink); font-variant-numeric: tabular-nums; }
.fc-line strong.t-pending { color: var(--pending); }
.fc-line.total { border-top: 1px solid var(--rule); margin-top: 4px; padding-top: 8px; }
.fc-line.total strong { font-family: var(--display); font-size: 20px; }
.fc-list { list-style: none; margin: 10px 0; font-size: 13px; color: var(--ink-2); display: flex; flex-direction: column; gap: 4px; }
.fc-list li { display: flex; align-items: center; gap: 8px; }
.fc-list span { margin-left: auto; font-variant-numeric: tabular-nums; color: var(--ink); }
.fc-list em { font-style: normal; color: var(--pending); }
.muted-txt { font-size: 13px; color: var(--ink-3); }
.proof-row { display: flex; align-items: center; gap: 8px; font-size: 14px; background: var(--paper); border: 1px solid var(--rule); border-radius: 10px; padding: 8px 10px; }
.proof-row span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.proof-pick { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--noah); border: 1.5px dashed var(--rule); border-radius: 10px; padding: 9px 12px; cursor: pointer; align-self: flex-start; }
.proof-pick:hover { border-color: var(--noah); background: var(--noah-bg); }
.proof-btn { margin-right: 4px; }

/* ── Relevé ── */
.releve-opts { display: flex; flex-wrap: wrap; gap: 10px; border-bottom: 1px solid var(--rule-2); }
.date-range { display: flex; align-items: center; gap: 8px; }
.date-range .input { width: auto; }
.releve-preview { padding: 20px 24px; background: #E9EDF5; }
.releve-preview .releve { background: #fff; padding: 32px 36px; border-radius: 8px; box-shadow: 0 4px 16px rgba(20,26,56,.08); }
.foot-hint { margin-right: auto; font-size: 13px; color: var(--ink-3); align-self: center; }
.releve { color: #1D2650; font-family: var(--body); font-size: 12px; }
.rl-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; border-bottom: 2px solid #1D2650; padding-bottom: 12px; margin-bottom: 16px; }
.rl-head h1 { font-family: var(--display); font-size: 26px; letter-spacing: -0.02em; line-height: 1.1; }
.rl-head p { color: #4A5378; margin-top: 4px; font-size: 13px; }
.rl-head .rl-date { white-space: nowrap; }
.rl-sum { display: grid; grid-template-columns: repeat(5, 1fr); border: 1px solid #DDE4F0; border-radius: 8px; margin-bottom: 18px; }
.rl-sum div { padding: 10px 12px; display: flex; flex-direction: column; }
.rl-sum div + div { border-left: 1px solid #DDE4F0; }
.rl-sum span { font-size: 11px; color: #4A5378; }
.rl-sum strong { font-size: 15px; font-variant-numeric: tabular-nums; }
.releve h2 { font-family: var(--display); font-size: 15px; margin: 16px 0 6px; }
.rl-table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.rl-table th { text-align: left; font-size: 11px; color: #4A5378; border-bottom: 1px solid #1D2650; padding: 5px 6px; }
.rl-table td { padding: 5px 6px; border-bottom: 1px solid #ECF0F7; vertical-align: top; }
.rl-table td small { display: block; color: #8790AE; font-size: 10px; }
.rl-table .r { text-align: right; white-space: nowrap; }
.rl-table tfoot td { font-weight: 700; border-top: 1.5px solid #1D2650; border-bottom: none; }
.rl-empty { color: #8790AE; }
.print-root { display: none; }
@media print {
  @page { size: A4; margin: 14mm; }
  body { background: #fff !important; }
  #root { display: none !important; }
  .print-root { display: block !important; }
  .print-root .releve { font-size: 10.5px; }
  .rl-table tr { break-inside: avoid; }
}

/* ── Téléphone ── */
@media (max-width: 700px) {
  body { font-size: 15px; }
  .side { padding: 16px 16px 14px; gap: 14px; }
  .brand { display: flex; align-items: center; justify-content: space-between; padding: 0; }
  .brand-title { font-size: 28px; }
  .brand-kids { margin-top: 0; gap: 10px; font-size: 0; }
  .nav { flex-direction: row; gap: 4px; }
  .nav-btn { flex: 1; justify-content: center; padding: 8px 6px; font-size: 13px; gap: 6px; }
  .nav-btn .nav-count { display: none; }
  .ledger { padding: 14px; display: grid; grid-template-columns: 1fr auto; align-items: center; column-gap: 12px; }
  .ledger-big { font-size: 28px; }
  .ledger-btn { margin-top: 0; grid-row: 1 / 4; grid-column: 2; }
  .ledger-lines { display: none; }
  .side-foot { flex-direction: row; align-items: center; justify-content: space-between; }
  .main { padding: 20px 14px 40px 34px; background-position: -18px 0, 0 0, 0 0; }
  .page-head h1 { font-size: 32px; }
  .page-head .btn { width: 100%; justify-content: center; }
  .toolbar .segmented { width: 100%; }
  .toolbar .seg-btn { flex: 1; justify-content: center; }
  .search { width: 100%; min-width: 0; }
  .inv { grid-template-columns: 1fr auto; gap: 10px 12px; padding: 14px 12px 14px 18px; }
  .inv-actions .icon-btn { width: 38px; height: 38px; }
  .vir { grid-template-columns: 1fr; gap: 6px; }
  .vir-date { flex-direction: row; gap: 8px; align-items: baseline; text-align: left; padding-top: 0; }
  .vir-day { font-size: 22px; }
  .figures { grid-template-columns: 1fr 1fr; }
  .overlay { padding: 0; align-items: end; }
  .modal { max-height: 94vh; border-radius: 18px 18px 0 0; }
  .import, .vir-modal { padding: 16px; gap: 16px; }
  .form-grid, .photo-row { grid-template-columns: 1fr; }
  .modal-foot { padding: 12px 16px 16px; }
  .modal-foot .btn { flex: 1; justify-content: center; }
  .drop-veil { display: none; }
  .cat-filter { width: 100%; }
  .head-actions { width: 100%; }
  .head-actions .btn { width: 100%; justify-content: center; }
  .cat-row { grid-template-columns: 110px 1fr auto; }
  .releve-preview { padding: 10px; overflow-x: auto; }
  .releve-preview .releve { padding: 16px; min-width: 640px; }
  .foot-hint { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`
