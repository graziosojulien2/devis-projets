// ─── Analyse des doublons ────────────────────────────────────────────────────
// Logique pure (sans PDF.js) pour pouvoir être testée à part.
// Chaque facture est comparée à partir de :
//   - l'empreinte du fichier (SHA-256) → même PDF importé deux fois
//   - le texte lu dans le PDF → même facture enregistrée/scannée à nouveau
//   - le numéro, le montant, l'enfant et la date saisis

export const LEVELS = {
  certain:  { rank: 3, label: 'Doublon certain' },
  probable: { rank: 2, label: 'Doublon très probable' },
  possible: { rank: 1, label: 'Doublon possible' },
}

const strip = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
export const normText = (s) => strip(s).replace(/[^a-z0-9€,.\/-]+/g, ' ').replace(/\s+/g, ' ').trim()
const normNum = (s) => strip(s).replace(/[^a-z0-9]/g, '')

export function textFeatures(text) {
  const t = normText(text)
  const tokens = new Set(t.split(' ').filter(w => w.length > 1))
  const nums = new Set([...tokens].filter(w => /\d/.test(w) && w.replace(/\D/g, '').length >= 2))
  return { tokens, nums, length: t.length }
}

function jaccard(a, b) {
  if (!a || !b || a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

// Devine l'enfant à partir du texte du PDF (prénom présent)
export function guessChild(text) {
  const t = ' ' + normText(text) + ' '
  const nina = / nina /.test(t), noah = / noa[hm] /.test(t)
  if (nina && !noah) return 'NINA'
  if (noah && !nina) return 'NOAH'
  return ''
}

// Cherche le montant total dans le texte du PDF (ex. « Total 240,00 € »)
export function guessAmount(text) {
  const t = (text || '').replace(/\s+/g, ' ')
  const re = /(net a payer|net à payer|total ttc|montant total|total a payer|total à payer|montant d[uû]|total)[^0-9]{0,25}(\d{1,5}(?:[ .]\d{3})*[,.]\d{2})\s*(€|eur)?/gi
  const found = []
  let m
  while ((m = re.exec(t))) found.push(parseFloat(m[2].replace(/[ .](?=\d{3})/g, '').replace(',', '.')))
  const vals = found.filter(v => v > 0)
  return vals.length ? vals[vals.length - 1] : null
}

const days = (a, b) => Math.abs(new Date(a) - new Date(b)) / 86400000

// a, b : { amount, child, invoiceNumber, date, feat?: { hash, tokens, nums } }
export function compareInvoices(a, b) {
  const reasons = []
  const fa = a.feat || {}, fb = b.feat || {}

  const childConflict = a.child && b.child && a.child !== b.child

  if (fa.hash && fb.hash && fa.hash === fb.hash) {
    if (childConflict) return { level: 'probable', reasons: ['Le même fichier PDF est enregistré pour Nina et pour Noah', 'Vérifie que chaque enfant a bien sa propre facture'] }
    return { level: 'certain', reasons: ['Le fichier PDF est exactement le même'] }
  }

  const sameChild     = a.child && b.child && a.child === b.child
  const amtA = Number(a.amount), amtB = Number(b.amount)
  const sameAmount    = amtA > 0 && amtB > 0 && Math.abs(amtA - amtB) < 0.01
  const numA = normNum(a.invoiceNumber), numB = normNum(b.invoiceNumber)
  const sameNum = numA.length >= 3 && numA === numB
  const diffNum = numA.length >= 3 && numB.length >= 3 && numA !== numB
  const textSim = jaccard(fa.tokens, fb.tokens)
  const numSim  = jaccard(fa.nums, fb.nums)
  const hasText = fa.tokens?.size > 15 && fb.tokens?.size > 15

  // Deux enfants différents : ce sont deux factures distinctes (sauf fichier identique, vu plus haut)
  if (childConflict) return null

  // Contenu du PDF identique (même facture re-téléchargée ou ré-imprimée)
  if (hasText && textSim >= 0.97 && numSim >= 0.97) {
    reasons.push(`Le contenu du PDF est identique à ${Math.round(textSim * 100)} %`)
    if (sameAmount) reasons.push('Même montant')
    if (sameNum) reasons.push('Même numéro de facture')
    return { level: 'probable', reasons }
  }

  // Même numéro + même montant
  if (sameNum && sameAmount) {
    reasons.push('Même numéro de facture', 'Même montant')
    if (sameChild) reasons.push('Même enfant')
    return { level: 'probable', reasons }
  }

  // Numéros différents et contenu différent : factures distinctes
  if (diffNum) return null
  if (hasText && numSim < 0.6) return null

  if (sameAmount && (sameChild || !a.child || !b.child)) {
    if (hasText && textSim >= 0.85) {
      return { level: 'possible', reasons: ['Même montant', `Contenu du PDF très proche (${Math.round(textSim * 100)} %)`] }
    }
    if (a.date && b.date && days(a.date, b.date) <= 45) {
      const r = ['Même montant']
      if (sameChild) r.push('Même enfant')
      r.push(`Reçues à ${Math.round(days(a.date, b.date))} jour${days(a.date, b.date) >= 2 ? 's' : ''} d’écart`)
      return { level: 'possible', reasons: r }
    }
  }
  return null
}

const pairKey = (x, y) => [x, y].sort((m, n) => m - n).join('-')
export { pairKey }

// Tous les doublons entre factures déjà enregistrées
export function findDuplicatePairs(invoices, featById, ignored = []) {
  const ign = new Set(ignored)
  const pairs = []
  for (let i = 0; i < invoices.length; i++) {
    for (let j = i + 1; j < invoices.length; j++) {
      const a = invoices[i], b = invoices[j]
      if (ign.has(pairKey(a.id, b.id))) continue
      const res = compareInvoices({ ...a, feat: featById[a.id] }, { ...b, feat: featById[b.id] })
      if (res) pairs.push({ key: pairKey(a.id, b.id), a, b, ...res })
    }
  }
  return pairs.sort((p, q) => LEVELS[q.level].rank - LEVELS[p.level].rank)
}

// Correspondances pour une facture en cours d'import
export function matchesFor(candidate, invoices, featById) {
  return invoices
    .map(inv => {
      const res = compareInvoices(candidate, { ...inv, feat: featById[inv.id] })
      return res ? { inv, ...res } : null
    })
    .filter(Boolean)
    .sort((p, q) => LEVELS[q.level].rank - LEVELS[p.level].rank)
}
