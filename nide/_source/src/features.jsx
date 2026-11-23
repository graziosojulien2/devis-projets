/* ============================================================
   THÈME BOHÈME — icônes, logo
   ============================================================ */
function Pampa({ size = 44, color = '#B08D57' }) {
  return <svg className="pampa" width={size} height={size * 0.74} viewBox="0 0 54 40" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" aria-hidden="true"><path d="M27 39C27 26 25 14 18 3" /><path d="M22 14c-4-2-7-1-10 1M20 9c-3-2-6-2-8-1M24 20c-4-1-8 0-10 2" /><path d="M27 39c1-13 4-25 12-35" /><path d="M33 14c4-2 7-1 10 1M35 9c3-2 6-2 8-1M31 20c4-1 8 0 10 2" /></svg>;
}
const ICONS = {
  home: 'M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z',
  quotidien: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8.5 14.5s1.2 1.8 3.5 1.8 3.5-1.8 3.5-1.8M9 10h.01M15 10h.01',
  echos: 'M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zM8 15c1-3 3-5 4-5s3 2 4 5',
  resultats: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.5 15h9',
  mesures: 'M4 19h16M6 16l4-5 3 3 5-7',
  agenda: 'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 10h16M8 3v4M16 3v4',
  docs: 'M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13h6M9 17h6',
  ordonnances: 'M8.5 15.5 15.5 8.5a3.5 3.5 0 0 0-5-5L3.5 10.5a3.5 3.5 0 0 0 5 5zM7 7l5 5',
  journal: 'M6 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1zM5 18a2 2 0 0 1 2-2h12M9 8h6',
  naissance: 'M12 21s-7-4.4-9-9c-1.3-3.2.7-7 4.2-7 2 0 3.3 1 4.8 2.8C13.5 6 14.8 5 16.8 5c3.5 0 5.5 3.8 4.2 7-2 4.6-9 9-9 9z',
  plus: 'M5 12h.01M12 12h.01M19 12h.01',
};
function Ico({ name, className = 'ico' }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[name] || ICONS.home} /></svg>;
}

/* ============================================================
   RÉGLAGES (Drive, partage, clé IA, sauvegardes)
   ============================================================ */
function SettingsModalFamille({ onClose, onExport, onImport }) {
  const { data, save, sync, uploadsLeft, cloud, email, isOwner, logout, toast } = useApp();
  const [f, setF] = useState({ apiKey: data.apiKey || '', modelDoc: data.modelDoc || INITIAL_DATA.modelDoc, modelFast: data.modelFast || INITIAL_DATA.modelFast });
  const [test, setTest] = useState('');
  const [sharing, setSharing] = useState(false);
  const importRef = useRef();
  async function tester() {
    setTest('…');
    try { await claude({ apiKey: f.apiKey, model: f.modelDoc, system: 'Réponds OK.', content: [{ type: 'text', text: 'Test' }], max_tokens: 5 }); setTest('Connexion à l\'IA réussie'); }
    catch (e) { setTest('Échec : ' + e.message); }
  }
  const [vpw, setVpw] = useState(''), [vpw2, setVpw2] = useState(''), [vOn, setVOn] = useState(null);
  const [scriptUrl, setScriptUrl0] = useState(() => CLOUD.SCRIPT || '');
  const setScriptUrl = u => { setScriptUrl0(u); try { localStorage.setItem('bebesuivi.script', u); } catch (e) {} CLOUD.SCRIPT = u; };
  const inviteLink = location.origin + location.pathname + '#acces=' + encodeURIComponent(scriptUrl);
  useEffect(() => { if (cloud && isOwner) cloudViewerEnabled().then(setVOn).catch(() => {}); }, []);
  async function setViewerPw() {
    if (vpw.length < 6) return toast('Mot de passe trop court (6 caractères minimum)', 'err');
    if (vpw !== vpw2) return toast('Les deux mots de passe ne correspondent pas', 'err');
    setSharing(true);
    try { await cloudSetViewerPassword(vpw); setVOn(true); setVpw(''); setVpw2(''); toast('Mot de passe d\'Alexandra enregistré.'); }
    catch (e) { toast('Échec : ' + e.message, 'err'); }
    setSharing(false);
  }
  async function disableViewer() {
    if (!confirm('Couper l\'accès d\'Alexandra ?')) return;
    try { await cloudDisableViewer(); setVOn(false); toast('Accès d\'Alexandra coupé.'); } catch (e) { toast('Échec : ' + e.message, 'err'); }
  }
  const syncTxt = sync === 'error' ? 'Enregistrement dans Drive en échec, nouvel essai automatique' : sync === 'pending' ? 'Enregistrement en cours…' : 'Tout est enregistré dans Google Drive';
  return (
    <Modal onClose={onClose}>
      <h2 className="h3" style={{ fontSize: '1.9rem' }}>Réglages</h2>
      {cloud && <div className="card card-sm mb-3" style={{ background: 'var(--lin-2)' }}>
        <div className="h3" style={{ fontSize: '1.25rem' }}>Google Drive</div>
        <div className="kv"><span>Connecté en tant que</span><span>{email || '—'}</span></div>
        <div className="kv"><span>État</span><span className={`sync ${sync}`} style={{ justifyContent: 'flex-end' }}><i />{syncTxt}</span></div>
        {uploadsLeft > 0 && <div className="kv"><span>Fichiers en cours d'envoi</span><span>{uploadsLeft}</span></div>}
        <div className="flex gap-1 mt-2" style={{ flexWrap: 'wrap' }}>
          <a className="btn btn-outline btn-sm" href={folderURL()} target="_blank" rel="noopener">Ouvrir le dossier Drive</a>
          <button className="btn btn-terra btn-sm" onClick={logout}>Se déconnecter</button>
        </div>
      </div>}
      {cloud && isOwner && <div className="card card-sm mb-3" style={{ background: 'var(--lin-2)' }}>
        <div className="h3" style={{ fontSize: '1.25rem' }}>Accès d'Alexandra</div>
        <p className="small muted mb-2">Avec ce mot de passe, Alexandra ouvre le même lien, choisit « Accès Alexandra » et peut tout consulter. La seule chose qu'elle peut changer, c'est son humeur du jour. {vOn === true ? 'Accès actif.' : vOn === false ? 'Accès pas encore activé.' : ''}</p>
        <div className="grid-2 mb-1">
          <div><label htmlFor="vp1">{vOn ? 'Nouveau mot de passe' : 'Mot de passe'}</label><input id="vp1" type="password" autoComplete="new-password" value={vpw} onChange={e => setVpw(e.target.value)} /></div>
          <div><label htmlFor="vp2">Confirmer</label><input id="vp2" type="password" autoComplete="new-password" value={vpw2} onChange={e => setVpw2(e.target.value)} /></div>
        </div>
        <div className="mb-1"><label htmlFor="vsu">Adresse du service d'accès (Apps Script, se termine par /exec)</label><input id="vsu" type="url" value={scriptUrl} onChange={e => setScriptUrl(e.target.value.trim())} placeholder="https://script.google.com/macros/s/…/exec" /></div>
        {/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(scriptUrl) && <div className="mb-2"><label>Lien à envoyer à Alexandra (une seule fois)</label>
          <div className="flex gap-1"><input type="text" readOnly value={inviteLink} onFocus={e => e.target.select()} /><button className="btn btn-outline btn-sm" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(inviteLink); toast('Lien copié'); }}>Copier</button></div>
          <p className="small muted mt-1">Envoie le mot de passe séparément (de vive voix, par exemple).</p></div>}
        <div className="flex gap-1"><button className="btn btn-sm" onClick={setViewerPw} disabled={sharing || !vpw}>{sharing ? 'Enregistrement…' : vOn ? 'Changer le mot de passe' : 'Activer l\'accès'}</button>{vOn && <button className="btn btn-terra btn-sm" onClick={disableViewer}>Couper l'accès</button>}</div>
      </div>}
      <div className="mb-2"><label>Clé API Claude (console.anthropic.com)</label><input type="password" value={f.apiKey} onChange={e => setF({ ...f, apiKey: e.target.value })} placeholder="sk-ant-api03-…" autoComplete="off" />
        <p className="small muted mt-1">La clé reste sur cet appareil : elle n'est jamais envoyée dans Drive ni dans les sauvegardes.</p></div>
      <div className="grid-2 mb-2">
        <div><label>Modèle analyse documents & échos</label><input type="text" value={f.modelDoc} onChange={e => setF({ ...f, modelDoc: e.target.value })} /></div>
        <div><label>Modèle rapide (petits textes)</label><input type="text" value={f.modelFast} onChange={e => setF({ ...f, modelFast: e.target.value })} /></div>
      </div>
      <div className="row-between mb-3">
        <button className="btn btn-outline btn-sm" onClick={tester} disabled={!f.apiKey}>Tester la connexion</button>
        <span className="small muted">{test}</span>
      </div>
      <div className="card card-sm mb-3" style={{ background: 'var(--lin-2)' }}>
        <div className="h3" style={{ fontSize: '1.25rem' }}>Sauvegardes</div>
        <p className="small muted mb-2">{cloud ? 'Drive garde déjà tout. Une sauvegarde complète (avec PDF et images) reste utile pour archiver ou pour importer d\'anciennes données.' : 'Les données sont dans ce navigateur. Faites une sauvegarde régulièrement : elle contient aussi les PDF et images.'}</p>
        <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-sm" onClick={onExport}>Télécharger une sauvegarde</button>
          <input type="file" accept=".json" ref={importRef} style={{ display: 'none' }} onChange={e => { e.target.files[0] && onImport(e.target.files[0]); e.target.value = ''; }} />
          <button className="btn btn-outline btn-sm" onClick={() => importRef.current.click()}>Importer une sauvegarde</button>
        </div>
      </div>
      <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-outline btn-sm" onClick={onClose}>Annuler</button>
        <button className="btn btn-sm" onClick={() => { save(d => ({ ...d, ...f })); onClose(); }}>Enregistrer</button>
      </div>
    </Modal>
  );
}

/* ============================================================
   BÉBÉ 3D DANS UNE ARCHE, avec curseur du temps
   ============================================================ */
function measuresForSA(lb, saTarget, curDec) {
  const echoSA = lb.x != null ? lb.x : (curDec || 26);
  const refEcho = babyRefAt(echoSA);
  const base = { bip: lb.m.bip || refEcho.bip, pc: lb.m.pc || refEcho.pc, pa: lb.m.pa || refEcho.pa, lf: lb.m.lf || refEcho.lf };
  const rt = babyRefAt(saTarget);
  return { bip: base.bip * rt.bip / refEcho.bip, pc: base.pc * rt.pc / refEcho.pc, pa: base.pa * rt.pa / refEcho.pa, lf: base.lf * rt.lf / refEcho.lf, sa: saTarget };
}
function estWeight(sa) { // poids moyen indicatif (g)
  const T = [[12, 14], [14, 45], [16, 100], [18, 190], [20, 300], [22, 430], [24, 600], [26, 760], [28, 1000], [30, 1300], [32, 1700], [34, 2150], [36, 2600], [38, 3080], [40, 3400], [41, 3550]];
  if (sa <= T[0][0]) return T[0][1];
  for (let i = 0; i < T.length - 1; i++) if (sa <= T[i + 1][0]) { const t = (sa - T[i][0]) / (T[i + 1][0] - T[i][0]); return T[i][1] + t * (T[i + 1][1] - T[i][1]); }
  return T[T.length - 1][1];
}
const BABY_WEEKS = [8, 12, 16, 20, 24, 28, 32, 36, 40];
const POSITIONS = [['cephalique', 'Tête en bas'], ['siege', 'En siège'], ['transverse', 'Transverse']];
function babyImage(sa, pos, vue) {
  let w = BABY_WEEKS[0]; for (const x of BABY_WEEKS) if (sa >= x) w = x;
  const key = w >= 28 ? `${w}-${pos || 'cephalique'}` : String(w).padStart(2, '0');
  return { w, src: `img/${vue === 'seul' ? 's' : 'u'}-${key}.webp` };
}
function Baby3DArch({ height = 440 }) {
  const { data, save, premium, askPremium } = useApp();
  const cur = saAt(data.profil);
  const curDec = cur ? Math.min(41, cur.dec) : 20;
  const [saV, setSaV] = useState(null);
  const [vue, setVue] = useState('ventre');
  const [big, setBig] = useState(false);
  const saShown = saV == null ? curDec : saV;
  const pos = data.profil.presentation || 'cephalique';
  const img = babyImage(saShown, pos, vue);
  const taille = getTaille(Math.floor(saShown));
  const dSA = dateForSA(data.profil, saShown);
  useEffect(() => { // précharge l'autre vue et les étapes voisines
    [babyImage(saShown, pos, vue === 'seul' ? 'ventre' : 'seul').src].forEach(s => { const i = new Image(); i.src = s; });
  }, [img.src]);
  return (
    <div className="arch-col">
      <div className={`baby-pic${vue === 'seul' ? ' seul' : ''}`} style={{ height }}>
        <img key={img.src} src={img.src} alt={`Illustration de bébé vers ${img.w} semaines d'aménorrhée${img.w >= 28 ? ', position ' + (POSITIONS.find(p => p[0] === pos) || [])[1] : ''}`} onClick={() => premium ? setBig(true) : askPremium('3d')} />
        {!premium && <button className="arch-lock" onClick={() => askPremium('3d')}>Voir toutes les semaines</button>}
      </div>
      <div style={{ padding: '0 6px' }}>
        <div className="row-between" style={{ alignItems: 'baseline' }}>
          <span className="eyebrow">{saV == null ? 'Aujourd\'hui' : dSA ? fmtDate(dSA, { day: 'numeric', month: 'long' }) : ''} · {fmtSA({ sa: Math.floor(saShown), j: Math.round((saShown % 1) * 7) % 7 })}</span>
          <span className="eyebrow">≈ {taille ? taille[2] + ' cm · ' : ''}{Math.round(estWeight(saShown))} g</span>
        </div>
        {premium && <input type="range" min="8" max="41" step="1" value={Math.round(saShown)} aria-label="Semaine de grossesse affichée" onChange={e => { const v = Number(e.target.value); setSaV(Math.abs(v - curDec) < 0.6 ? null : v); }} style={{ marginTop: 8 }} />}
        {premium && <div className="row-between small muted"><span>8 SA</span>{saV != null && <button className="pill" style={{ padding: '3px 12px' }} onClick={() => setSaV(null)}>Revenir à aujourd'hui</button>}<span>41 SA</span></div>}
        <div className="chips" style={{ marginTop: 10 }}>
          <button className={`chip${vue === 'ventre' ? ' on' : ''}`} aria-pressed={vue === 'ventre'} onClick={() => setVue('ventre')}>Dans l'utérus</button>
          <button className={`chip${vue === 'seul' ? ' on' : ''}`} aria-pressed={vue === 'seul'} onClick={() => setVue('seul')}>Bébé seul</button>
        </div>
        {saShown >= 28 && <div style={{ marginTop: 10 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Position de bébé (indiquée à l'écho)</div>
          <div className="chips">{POSITIONS.map(([k, l]) => <button key={k} className={`chip${pos === k ? ' on' : ''}`} aria-pressed={pos === k} onClick={() => save(d => ({ ...d, profil: { ...d.profil, presentation: k } }))}>{l}</button>)}</div>
        </div>}
        <p className="small muted" style={{ marginTop: 10, lineHeight: 1.55 }}>Illustration indicative du développement de bébé autour de cette semaine : chaque bébé est unique.</p>
      </div>
      {big && <div className="lightbox" onClick={() => setBig(false)}><img src={img.src} alt="" style={{ maxHeight: '86vh' }} /><div className="lb-bar"><button className="lb-btn" onClick={e => { e.stopPropagation(); setVue(v => v === 'seul' ? 'ventre' : 'seul'); }}>{vue === 'seul' ? 'Dans l\'utérus' : 'Bébé seul'}</button><button className="lb-btn" onClick={() => setBig(false)}>Fermer</button></div></div>}
    </div>
  );
}

/* ============================================================
   QUOTIDIEN — humeur, sommeil, symptômes, compléments
   ============================================================ */
const HUMEURS = ['Sereine', 'Fatiguée', 'Nauséeuse', 'Pleine d\'énergie', 'Anxieuse', 'Émue'];
const SYMPTOMES = ['Nausées', 'Brûlures d\'estomac', 'Maux de dos', 'Jambes lourdes', 'Crampes', 'Contractions', 'Maux de tête', 'Insomnie', 'Essoufflement', 'Gonflements'];
const COMPLEMENTS_DEFAUT = ['Acide folique', 'Fer', 'Vitamine D', 'Magnésium'];
function useDay(date) {
  const { data, save } = useApp();
  const day = (data.quotidien || {})[date] || {};
  const set = patch => save(d => ({ ...d, quotidien: { ...(d.quotidien || {}), [date]: { ...((d.quotidien || {})[date] || {}), ...patch } } }));
  return [day, set];
}
function complementsList(data) {
  const fromOrdo = [];
  (data.ordonnances || []).filter(o => o.status === 'ok').forEach(o => (o.medicaments || []).forEach(m => { const n = String(m.nom).split(/\s/)[0]; if (n && !fromOrdo.some(x => normName(x) === normName(n))) fromOrdo.push(n); }));
  return data.complements || (fromOrdo.length ? fromOrdo.slice(0, 6) : COMPLEMENTS_DEFAUT);
}
function TodayCard({ go }) {
  const { data } = useApp();
  const date = todayISO();
  const [day, set] = useDay(date);
  const comps = complementsList(data);
  const taken = day.complements || {};
  return (
    <div>
      <h2 className="h3" style={{ fontSize: '1.7rem', marginBottom: 12 }}>Aujourd'hui{data.profil.prenom ? ' pour ' + data.profil.prenom : ''}</h2>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Humeur{day.humeurPar ? ` · notée par ${day.humeurPar}` : ''}</div>
      <div className="chips ro-ok" style={{ marginBottom: 14 }}>
        {HUMEURS.slice(0, 5).map(h => <button key={h} className={`chip${day.humeur === h ? ' on' : ''}`} aria-pressed={day.humeur === h} onClick={() => set({ humeur: day.humeur === h ? '' : h })}>{h}</button>)}
      </div>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Compléments du jour</div>
      <div className="chips">
        {comps.map(c => <button key={c} className={`chip${taken[c] ? ' on' : ''}`} aria-pressed={!!taken[c]} onClick={() => set({ complements: { ...taken, [c]: !taken[c] } })}>{taken[c] ? '✓ ' : ''}{c}</button>)}
      </div>
      <button className="side-link ro-ok" style={{ marginTop: 8 }} onClick={() => go('quotidien')}>Sommeil, symptômes et notes du jour</button>
    </div>
  );
}
function QuotidienTab() {
  const { data, save } = useApp();
  const [date, setDate] = useState(todayISO());
  const [day, set] = useDay(date);
  const comps = complementsList(data);
  const [newComp, setNewComp] = useState('');
  const taken = day.complements || {};
  const sym = day.symptomes || [];
  const last = Object.entries(data.quotidien || {}).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 30);
  const o = saAt(data.profil, date);
  return (
    <div>
      <h1 className="section-title">Au quotidien</h1>
      <div className="grid-2 mb-3" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="row-between mb-2">
            <div className="ro-ok"><label>Jour</label><input type="date" value={date} max={todayISO()} onChange={e => e.target.value && setDate(e.target.value)} style={{ width: 180 }} /></div>
            {o && <span className="badge badge-teal">{fmtSA(o)}</span>}
          </div>
          <label>Humeur</label>
          <div className={`chips mb-2${date === todayISO() ? ' ro-ok' : ''}`}>{HUMEURS.map(h => <button key={h} className={`chip${day.humeur === h ? ' on' : ''}`} onClick={() => set({ humeur: day.humeur === h ? '' : h })}>{h}</button>)}</div>
          <label>Sommeil de la nuit</label>
          <div className="chips mb-2">{['Bon', 'Moyen', 'Difficile'].map(h => <button key={h} className={`chip${day.sommeil === h ? ' on' : ''}`} onClick={() => set({ sommeil: day.sommeil === h ? '' : h })}>{h}</button>)}
            <input type="number" min="0" max="14" step="0.5" placeholder="heures" value={day.heures || ''} onChange={e => set({ heures: e.target.value })} style={{ width: 100 }} /></div>
          <label>Symptômes</label>
          <div className="chips mb-2">{SYMPTOMES.map(h => <button key={h} className={`chip${sym.includes(h) ? ' on' : ''}`} onClick={() => set({ symptomes: sym.includes(h) ? sym.filter(x => x !== h) : [...sym, h] })}>{h}</button>)}</div>
          <label>Compléments pris</label>
          <div className="chips mb-1">{comps.map(c => <button key={c} className={`chip${taken[c] ? ' on' : ''}`} onClick={() => set({ complements: { ...taken, [c]: !taken[c] } })}>{taken[c] ? '✓ ' : ''}{c}</button>)}</div>
          <div className="flex gap-1 mb-2"><input type="text" placeholder="Ajouter un complément" value={newComp} onChange={e => setNewComp(e.target.value)} style={{ maxWidth: 240 }} />
            <button className="btn btn-outline btn-sm" onClick={() => { if (!newComp.trim()) return; save(d => ({ ...d, complements: [...complementsList(d), newComp.trim()] })); setNewComp(''); }}>Ajouter</button>
            {data.complements && <button className="btn btn-outline btn-sm" onClick={() => save(d => ({ ...d, complements: null }))}>Liste par défaut</button>}</div>
          <label>Note du jour</label>
          <textarea rows="3" value={day.note || ''} onChange={e => set({ note: e.target.value })} placeholder="Ce qu'elle a ressenti, une envie, une question pour la sage-femme…" />
        </div>
        <div className="card">
          <h2 className="h3">Les 30 derniers jours</h2>
          {last.length === 0 && <p className="small muted">Rien de noté pour l'instant.</p>}
          {last.map(([d, v]) => {
            const nc = Object.values(v.complements || {}).filter(Boolean).length;
            return <button key={d} className="kv" style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--sable-3)', cursor: 'pointer', font: 'inherit', textAlign: 'left' }} onClick={() => setDate(d)}>
              <span>{fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
              <span>{[v.humeur, v.sommeil && 'sommeil ' + v.sommeil.toLowerCase(), (v.symptomes || []).length ? (v.symptomes || []).length + ' symptôme' + ((v.symptomes || []).length > 1 ? 's' : '') : '', nc ? nc + '/' + comps.length + ' compl.' : ''].filter(Boolean).join(' · ') || '—'}</span>
            </button>;
          })}
          {last.length > 0 && <SymptomSummary />}
        </div>
      </div>
    </div>
  );
}
function SymptomSummary() {
  const { data } = useApp();
  const since = toISO(addDays(new Date(), -14));
  const cnt = {};
  Object.entries(data.quotidien || {}).filter(([d]) => d >= since).forEach(([, v]) => (v.symptomes || []).forEach(s => { cnt[s] = (cnt[s] || 0) + 1; }));
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (!top.length) return null;
  return <p className="small muted mt-2">Sur 14 jours : {top.map(([s, n]) => `${s.toLowerCase()} (${n} j)`).join(', ')}. À mentionner au prochain rendez-vous si ça persiste.</p>;
}

/* ============================================================
   ACCUEIL
   ============================================================ */
function Frise({ go }) {
  const { data } = useApp();
  const cur = saAt(data.profil);
  const seKeys = [...new Set(data.echographies.map(e => e.seance))].filter(k => k && k !== 'sans-date');
  const echoDocs = data.documents.filter(d => /cho/i.test(d.type || '') && d.date);
  const dates = [...new Set([...seKeys, ...echoDocs.map(d => d.date)])].sort();
  const pos = sa => Math.max(0, Math.min(100, sa / 41 * 100));
  return (
    <div className="frise" aria-label="Frise de la grossesse">
      <div className="track" />
      <div className="done" style={{ width: pos(cur ? cur.dec : 0) + '%' }} />
      {dates.map(d => { const o = saAt(data.profil, d); if (!o) return null; return <button key={d} className="dot" style={{ left: pos(o.dec) + '%' }} title={`Écho du ${fmtDate(d)} · ${fmtSA(o)}`} aria-label={`Écho du ${fmtDate(d)}`} onClick={() => go('echos')} />; })}
      {cur && <div className="now" style={{ left: pos(cur.dec) + '%' }} />}
      <span className="lbl" style={{ left: 0, top: 44 }}>Début</span>
      {cur && <span className="lbl" style={{ left: `calc(${pos(cur.dec)}% - 30px)`, top: 0, color: 'var(--terra)' }}>Aujourd'hui</span>}
      <span className="lbl" style={{ right: 0, top: 44 }}>Terme</span>
    </div>
  );
}
function HomeTab({ go }) {
  const { data, save, enqueue, job, toast, pendingList, premium } = useApp();
  const p = data.profil;
  const cur = saAt(p);
  const T = termeDate(p);
  const [showProfil, setShowProfil] = useState(false);
  const [bilanLoading, setBilanLoading] = useState(false);
  const sa = cur ? cur.sa : null;
  useEffect(() => {
    if (!sa || !data.apiKey || (data.faits || {})[sa]) return;
    claude({ apiKey: data.apiKey, model: data.modelFast || INITIAL_DATA.modelFast, system: 'Tu es une sage-femme bienveillante. Français, 2 phrases courtes.', content: [{ type: 'text', text: `Un fait marquant du développement du bébé à ${sa} semaines d'aménorrhée, en 2 phrases douces (50 mots max). Ne mentionne pas le sexe.` }], max_tokens: 200 })
      .then(t => save(d => ({ ...d, faits: { ...(d.faits || {}), [sa]: t.trim() } }))).catch(() => {});
  }, [sa, data.apiKey]);
  async function genBilan() {
    if (!data.apiKey) return toast('Ajoutez votre clé API dans les réglages', 'err');
    setBilanLoading(true);
    try { const b = await analyseBilan(data); save(d => ({ ...d, bilan: b })); } catch (e) { toast('Bilan : ' + e.message, 'err'); }
    setBilanLoading(false);
  }
  if (!p.ddr && !p.dg) return (
    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
      {showProfil && <ProfilModal onClose={() => setShowProfil(false)} />}
      <Pampa size={64} />
      <h1 className="h3" style={{ fontSize: '2.2rem', marginTop: 12 }}>Bienvenue dans {APP_NAME}</h1>
      <p className="muted mb-3">Commencez par renseigner le profil de grossesse, ou importez une sauvegarde depuis les réglages.</p>
      <button className="btn" onClick={() => setShowProfil(true)}>Créer le profil</button>
    </div>
  );
  const taille = getTaille(sa);
  const fact = (data.faits || {})[sa] || FAITS_SA[sa] || FAITS_SA[Math.floor(sa / 2) * 2] || '';
  const jRest = T ? Math.max(0, daysBetween(new Date(new Date().toDateString()), T)) : null;
  const today = todayISO();
  const prochainsRdv = [...data.rdv].filter(r => r.date >= today && r.statut !== 'Annulé').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const demarches = buildDemarches(p).filter(x => !(data.demarches || {})[x.id] && daysBetween(new Date(), x.due) <= 45).slice(0, 4);
  const b = data.bilan;
  const pend = pendingList();
  const pendLabel = it => { if (it.kind === 'seance') return 'Écho du ' + fmtShort(it.id); const x = data[it.kind].find(y => y.id === it.id); return x ? (x.titre || x.nom) : ''; };
  const mois = Math.min(9, Math.max(1, Math.floor((cur.days - 14) / 30.44) + 1));
  const prenomBebe = p.prenomBebe || 'bébé';
  return (
    <div>
      {showProfil && <ProfilModal onClose={() => setShowProfil(false)} />}
      <header className="home-head">
        <div>
          <h1>{sa} semaines{cur.j ? ` et ${cur.j} jour${cur.j > 1 ? 's' : ''}` : ''}</h1>
          <p>{mois}<sup>{mois === 1 ? 'er' : 'e'}</sup> mois · {trimestreOf(sa)}<sup>{trimestreOf(sa) === 1 ? 'er' : 'e'}</sup> trimestre · terme le {fmtDate(T, { day: 'numeric', month: 'long' })}{jRest != null ? `, dans ${jRest} jours` : ''}</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => setShowProfil(true)}>Profil de grossesse</button>
      </header>
      <section className="home-hero">
        <Baby3DArch height={460} />
        <div className="side-col">
          <div className="card">
            <h2 className="h3" style={{ fontSize: '1.7rem' }}>Cette semaine</h2>
            <div className="week-figs">
              <div><b>{taille ? taille[2] : '—'} cm</b><span>taille moyenne</span></div>
              <div><b>{Math.round(estWeight(cur.dec))} g</b><span>poids moyen</span></div>
            </div>
            {taille && <p className="small muted" style={{ marginBottom: 8 }}>{prenomBebe === 'bébé' ? 'Bébé' : prenomBebe} a la taille d'un(e) {taille[1]}.</p>}
            {fact && <p style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', lineHeight: 1.45, color: 'var(--encre-2)' }}>{fact}</p>}
            <Frise go={go} />
          </div>
          <div className="card"><TodayCard go={go} /></div>
        </div>
      </section>

      <div className="grid-2 mb-3">
        <div className="card">
          <div className="row-between mb-2"><h2 className="h3" style={{ margin: 0 }}>Prochains rendez-vous</h2><button className="btn btn-outline btn-sm ro-ok" onClick={() => go('agenda')}>Agenda</button></div>
          {prochainsRdv.length === 0 && <p className="small muted">Aucun rendez-vous à venir.</p>}
          {prochainsRdv.map(r => <div key={r.id} className="kv"><span>{fmtDate(r.date, { weekday: 'short', day: 'numeric', month: 'short' })}{r.heure ? ' · ' + r.heure : ''}</span><span>{r.titre}{(r.questions || []).length ? ` · ${r.questions.length} question${r.questions.length > 1 ? 's' : ''}` : ''}</span></div>)}
        </div>
        <div className="card">
          <div className="row-between mb-2"><h2 className="h3" style={{ margin: 0 }}>À faire bientôt</h2><button className="btn btn-outline btn-sm ro-ok" onClick={() => go('naissance')}>Naissance</button></div>
          {!premium && <p className="small muted">Congé maternité, paternité, CAF, mutuelle : les dates calculées selon votre terme sont dans la version complète.</p>}
          {premium && demarches.length === 0 && <p className="small muted">Rien d'urgent côté démarches.</p>}
          {premium && demarches.map(x => (
            <label key={x.id} className="check-row" style={{ margin: 0, fontWeight: 400, color: 'var(--text)' }}>
              <input type="checkbox" checked={false} onChange={() => save(d => ({ ...d, demarches: { ...(d.demarches || {}), [x.id]: true } }))} />
              <span className="lbl" style={{ flex: 1 }}>{x.label}</span>
              <span className="small muted">{daysBetween(new Date(), x.due) < 0 ? 'dépassé' : 'avant le ' + fmtDate(x.due, { day: 'numeric', month: 'short' })}</span>
            </label>
          ))}
        </div>
      </div>

    </div>
  );
}

/* ============================================================
   ANALYSES — vue matrice par date
   ============================================================ */
function AnalysesMatrix({ groups }) {
  const { data } = useApp();
  const dates = [...new Set(groups.flatMap(g => g.items.map(it => it.date)).filter(Boolean))].sort();
  const isAno = it => ['bas', 'haut', 'anormal', 'positif', 'non_immunise'].includes(it.statut);
  if (!dates.length) return <p className="muted">Aucune date d'analyse.</p>;
  return (
    <div className="card" style={{ padding: '0.5rem 0.75rem', overflowX: 'auto' }}>
      <table className="matrix">
        <thead><tr><th scope="col">Analyse</th>{dates.map(d => { const o = saAt(data.profil, d); return <th key={d} scope="col">{fmtDate(d, { day: 'numeric', month: 'short' })}{o ? <div style={{ fontWeight: 400 }}>{o.sa} SA</div> : null}</th>; })}</tr></thead>
        <tbody>{groups.map(g => <tr key={g.key}><th scope="row">{g.nom}<div className="small muted" style={{ fontWeight: 400 }}>{g.items[g.items.length - 1].unite || g.categorie}</div></th>
          {dates.map(d => { const it = g.items.filter(x => x.date === d).pop(); return <td key={d}>{it ? <span className={isAno(it) ? `rv rv-${it.statut}` : ''} title={it.reference ? 'Réf. ' + it.reference : ''}>{it.valeur}</span> : <span className="na">—</span>}</td>; })}</tr>)}</tbody>
      </table>
    </div>
  );
}

/* ============================================================
   RENDEZ-VOUS — questions avant, compte rendu après
   ============================================================ */
function RdvPrepModal({ rdv, onClose }) {
  const { data, save, toast } = useApp();
  const r = data.rdv.find(x => x.id === rdv.id) || rdv;
  const [q, setQ] = useState('');
  const [cr, setCr] = useState(r.compteRendu || '');
  const [busy, setBusy] = useState(false);
  const upd = patch => save(d => ({ ...d, rdv: d.rdv.map(x => x.id === r.id ? { ...x, ...patch } : x) }));
  const qs = r.questions || [];
  const suggestions = [...new Set([...((data.bilan || {}).questions || []), ...data.documents.filter(d => d.status === 'ok').slice(-4).flatMap(d => d.questions || [])])].filter(s => !qs.includes(s)).slice(0, 5);
  async function resume() {
    if (!data.apiKey) return toast('Ajoutez la clé IA dans les réglages', 'err');
    setBusy(true);
    try {
      const t = await claude({ apiKey: data.apiKey, model: data.modelFast || INITIAL_DATA.modelFast, system: 'Tu es une sage-femme. Tu résumes clairement, en français, sans rien inventer.', content: [{ type: 'text', text: `Rendez-vous « ${r.titre} » du ${fmtDate(r.date)}.\nQuestions préparées : ${qs.join(' | ') || 'aucune'}\nNotes prises pendant le rendez-vous :\n${cr}\n\nRédige un compte rendu en 4 à 6 puces courtes : ce qui a été dit, les réponses aux questions, ce qu'il faut faire ensuite (examens, traitements, prochain RDV).` }], max_tokens: 600 });
      upd({ compteRendu: cr, crResume: t.trim() });
    } catch (e) { toast('Résumé : ' + e.message, 'err'); }
    setBusy(false);
  }
  return (
    <Modal onClose={onClose} width={640}>
      <h2 className="h3" style={{ fontSize: '1.7rem', marginBottom: 2 }}>{r.titre}</h2>
      <p className="small muted mb-2">{fmtDate(r.date, { weekday: 'long', day: 'numeric', month: 'long' })}{r.heure ? ' · ' + r.heure : ''}{r.lieu ? ' · ' + r.lieu : ''}</p>
      <h3 className="h3" style={{ fontSize: '1.25rem' }}>Questions à poser</h3>
      {qs.map((x, i) => <div key={i} className="check-row"><input type="checkbox" checked={!!(r.qDone || {})[i]} onChange={e => upd({ qDone: { ...(r.qDone || {}), [i]: e.target.checked } })} /><span className="lbl" style={{ flex: 1 }}>{x}</span><button className="btn btn-outline btn-sm" aria-label="Retirer la question" onClick={() => upd({ questions: qs.filter((_, j) => j !== i), qDone: {} })}>✕</button></div>)}
      <div className="flex gap-1 mt-1 mb-1"><input type="text" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && q.trim()) { upd({ questions: [...qs, q.trim()] }); setQ(''); } }} placeholder="Nouvelle question" /><button className="btn btn-sm" onClick={() => { if (q.trim()) { upd({ questions: [...qs, q.trim()] }); setQ(''); } }}>Ajouter</button></div>
      {suggestions.length > 0 && <div className="mb-3"><div className="eyebrow mb-1">Idées tirées du dossier</div><div className="chips">{suggestions.map(s => <button key={s} className="chip" style={{ textAlign: 'left', height: 'auto', padding: '8px 14px' }} onClick={() => upd({ questions: [...qs, s] })}>+ {s}</button>)}</div></div>}
      <h3 className="h3" style={{ fontSize: '1.25rem', marginTop: 12 }}>Après le rendez-vous</h3>
      <textarea rows="5" value={cr} onChange={e => setCr(e.target.value)} onBlur={() => cr !== (r.compteRendu || '') && upd({ compteRendu: cr })} placeholder="Notes en vrac : ce que la sage-femme a dit, tension, poids, prochains examens…" />
      <div className="flex gap-1 mt-1">{r.statut !== 'Fait' && <button className="btn btn-outline btn-sm" onClick={() => upd({ statut: 'Fait', compteRendu: cr })}>Marquer comme fait</button>}</div>
      {r.crResume && <div className="ai-bubble mt-2"><div className="ai-tag">Compte rendu</div><div style={{ whiteSpace: 'pre-wrap', fontSize: '0.92rem', lineHeight: 1.6 }}>{r.crResume}</div></div>}
      <div className="flex gap-1 mt-3" style={{ justifyContent: 'flex-end' }}><button className="btn btn-sm ro-ok" onClick={() => { if (cr !== (r.compteRendu || '')) upd({ compteRendu: cr }); onClose(); }}>Fermer</button></div>
    </Modal>
  );
}

/* ============================================================
   NAISSANCE — projet, Jour J, achats, album ventre
   ============================================================ */
const PROJET_SECTIONS = [
  ['accompagnant', 'Qui sera présent', 'Le papa ou la personne de confiance…'],
  ['ambiance', 'Ambiance en salle de naissance', 'Lumière tamisée, musique, calme…'],
  ['douleur', 'Gestion de la douleur', 'Péridurale souhaitée ou non, ballon, bain, respiration…'],
  ['positions', 'Positions et liberté de mouvement', 'Pouvoir bouger, choisir sa position pour pousser…'],
  ['naissance', 'Moment de la naissance', 'Peau à peau immédiat, le papa coupe le cordon, clampage retardé…'],
  ['allaitement', 'Alimentation de bébé', 'Allaitement, biberon, tétée d\'accueil…'],
  ['cesarienne', 'En cas de césarienne', 'Présence du papa, peau à peau dès que possible…'],
  ['sejour', 'Séjour à la maternité', 'Chambre seule, visites, soins de bébé dans la chambre…'],
];
function ProjetNaissance() {
  const { data, save } = useApp();
  const pr = data.projetNaissance || {};
  const set = (k, v) => save(d => ({ ...d, projetNaissance: { ...(d.projetNaissance || {}), [k]: v } }));
  const p = data.profil;
  return (
    <div>
      <div className="row-between mb-2 no-print"><p className="small muted" style={{ maxWidth: 620 }}>À remplir à deux, puis à imprimer pour la sage-femme et la maternité. Ce sont des souhaits : l'équipe s'adapte au déroulé de l'accouchement.</p><button className="btn btn-sm ro-ok" onClick={() => window.print()}>Imprimer</button></div>
      <div className="card">
        <div className="print-only" style={{ marginBottom: 16 }}><h1 style={{ fontSize: 32 }}>Projet de naissance</h1><p>{[p.prenom, p.nom].filter(Boolean).join(' ')} · terme prévu le {fmtDate(termeDate(p))} · {p.maternite || ''}</p></div>
        {PROJET_SECTIONS.map(([k, t, ph]) => <div key={k} className="mb-2"><label htmlFor={'pn-' + k} style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', color: 'var(--encre)', fontWeight: 600 }}>{t}</label>
          <textarea id={'pn-' + k} className="no-print" rows="2" value={pr[k] || ''} onChange={e => set(k, e.target.value)} placeholder={ph} />
          <p className="print-only" style={{ whiteSpace: 'pre-wrap' }}>{pr[k] || '—'}</p></div>)}
      </div>
    </div>
  );
}
function findResult(data, re) {
  const g = collectResultats(data).filter(g => re.test(g.nom));
  return g.map(x => { const l = x.items[x.items.length - 1]; return `${x.nom} : ${l.valeur}${l.unite ? ' ' + l.unite : ''}`; });
}
function FicheJourJ() {
  const { data, save } = useApp();
  const p = data.profil, j = data.jourJ || {};
  const set = (k, v) => save(d => ({ ...d, jourJ: { ...(d.jourJ || {}), [k]: v } }));
  const pheno = findResult(data, /ph[ée]notype|rh[ée]sus|\brh\b|kell|groupe/i).slice(0, 4);
  const rai = findResult(data, /\brai\b|agglutinines/i).slice(0, 2);
  const strepto = findResult(data, /strepto/i).slice(0, 1);
  const traitements = [];
  (data.ordonnances || []).filter(o => o.status === 'ok').sort((a, b) => (b.date || '').localeCompare(a.date || '')).forEach(o => (o.medicaments || []).forEach(m => { if (!traitements.some(t => normName(t).startsWith(normName(m.nom).slice(0, 8)))) traitements.push(`${m.nom}${m.posologie ? ' — ' + m.posologie : ''}`); }));
  const vig = ((data.bilan || {}).vigilance || []).slice(0, 3);
  const Row = ({ k, v }) => <div className="kv"><span>{k}</span><span>{v || '—'}</span></div>;
  return (
    <div>
      <div className="row-between mb-2 no-print"><p className="small muted">Une page à garder dans la valise et sur le téléphone : tout ce qu'on vous demandera à l'arrivée.</p><button className="btn btn-sm ro-ok" onClick={() => window.print()}>Imprimer</button></div>
      <div className="card jourj">
        <div className="jourj-head"><Pampa size={46} /><h2 className="h3" style={{ fontSize: '2rem', margin: '6px 0 0' }}>Fiche Jour J</h2><p className="muted">{[p.prenom, p.nom].filter(Boolean).join(' ')}</p></div>
        <div className="grid-2">
          <div>
            <Row k="Terme prévu" v={fmtDate(termeDate(p))} />
            <Row k="Groupe sanguin" v={p.groupage} />
            {pheno.map(x => <Row key={x} k="Immuno-hématologie" v={x} />)}
            {rai.map(x => <Row key={x} k="RAI" v={x} />)}
            {strepto.map(x => <Row key={x} k="Prélèvement vaginal" v={x} />)}
            <Row k="Grossesses précédentes" v={p.parite ? `${p.parite} accouchement${p.parite > 1 ? 's' : ''}` : '0'} />
            <Row k="Allergies" v={j.allergies} />
          </div>
          <div>
            <Row k="Maternité" v={p.maternite} />
            <Row k="Adresse" v={j.adresse} />
            <Row k="Téléphone salle de naissance" v={j.tel} />
            <Row k="Sage-femme" v={p.sageFemme} />
            <Row k="Gynécologue" v={p.gyneco} />
            <Row k="Personne à prévenir" v={j.contact} />
          </div>
        </div>
        <h3 className="h3 mt-2" style={{ fontSize: '1.25rem' }}>Traitements en cours</h3>
        {traitements.length ? <ul className="list-plain">{traitements.slice(0, 8).map(t => <li key={t}>{t}</li>)}</ul> : <p className="small muted">Aucun traitement relevé dans les ordonnances analysées.</p>}
        {vig.length > 0 && <><h3 className="h3 mt-2" style={{ fontSize: '1.25rem' }}>Points signalés dans le dossier</h3><ul className="list-plain">{vig.map(t => <li key={t}>{t}</li>)}</ul></>}
        {(data.projetNaissance || {}).douleur && <><h3 className="h3 mt-2" style={{ fontSize: '1.25rem' }}>Souhait pour la douleur</h3><p className="small">{data.projetNaissance.douleur}</p></>}
      </div>
      <div className="card mt-3 no-print">
        <h3 className="h3" style={{ fontSize: '1.25rem' }}>Compléter la fiche</h3>
        <div className="grid-2">
          {[['adresse', 'Adresse de la maternité'], ['tel', 'Téléphone salle de naissance'], ['contact', 'Personne à prévenir (nom, tél.)'], ['allergies', 'Allergies']].map(([k, l]) => <div key={k} className="mb-1"><label>{l}</label><input type="text" value={j[k] || ''} onChange={e => set(k, e.target.value)} /></div>)}
        </div>
        <p className="small muted">Le groupe sanguin, la maternité et les praticiens viennent du profil ; phénotype, RAI et traitements sont lus dans les analyses et ordonnances.</p>
      </div>
    </div>
  );
}
const ACHATS_DEFAUT = [
  ['Sommeil', 'Lit ou berceau + matelas'], ['Sommeil', 'Gigoteuses (2)'], ['Sommeil', 'Draps housse (3)'], ['Balade', 'Poussette'], ['Balade', 'Siège auto groupe 0+'], ['Balade', 'Porte-bébé ou écharpe'],
  ['Toilette', 'Baignoire ou transat de bain'], ['Toilette', 'Table ou matelas à langer'], ['Toilette', 'Couches taille 1'], ['Toilette', 'Thermomètre de bain'],
  ['Vêtements', 'Bodies naissance et 1 mois (8)'], ['Vêtements', 'Pyjamas (6)'], ['Vêtements', 'Bonnet et chaussettes'], ['Repas', 'Biberons et goupillon'], ['Repas', 'Coussin d\'allaitement'], ['Maison', 'Babyphone'],
];
function Achats() {
  const { data, save } = useApp();
  const list = data.achats || ACHATS_DEFAUT.map(([cat, label], i) => ({ id: 'a' + i, cat, label, prix: '', done: false }));
  const budget = data.budgetAchats || '';
  const setList = fn => save(d => ({ ...d, achats: fn(d.achats || list) }));
  const [f, setF] = useState({ label: '', cat: 'Divers', prix: '' });
  const total = list.reduce((s, x) => s + (Number(x.prix) || 0), 0), spent = list.filter(x => x.done).reduce((s, x) => s + (Number(x.prix) || 0), 0);
  const cats = [...new Set(list.map(x => x.cat))];
  const eur = n => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  return (
    <div>
      <div className="grid-3 mb-3">
        <div className="stat-card"><div className="stat-label">Budget prévu</div><input type="number" min="0" value={budget} onChange={e => save(d => ({ ...d, budgetAchats: e.target.value }))} placeholder="€" style={{ marginTop: 6 }} /></div>
        <div className="stat-card"><div className="stat-label">Total de la liste</div><div className="stat-value money">{eur(total)}</div>{budget ? <div className="stat-sub" style={{ color: total > budget ? 'var(--terra)' : undefined }}>{total > budget ? `${eur(total - budget)} au-dessus du budget` : `${eur(budget - total)} de marge`}</div> : null}</div>
        <div className="stat-card"><div className="stat-label">Déjà acheté</div><div className="stat-value money">{eur(spent)}</div><div className="stat-sub">{list.filter(x => x.done).length}/{list.length} articles</div></div>
      </div>
      <div className="card mb-3">
        {cats.map(c => <div key={c} className="mb-2"><div className="eyebrow" style={{ marginBottom: 4 }}>{c}</div>
          {list.filter(x => x.cat === c).map(x => <div key={x.id} className={`check-row${x.done ? ' done' : ''}`}>
            <input type="checkbox" checked={x.done} onChange={e => setList(l => l.map(y => y.id === x.id ? { ...y, done: e.target.checked } : y))} aria-label={'Acheté : ' + x.label} />
            <span className="lbl" style={{ flex: 1 }}>{x.label}</span>
            <input type="number" min="0" value={x.prix} onChange={e => setList(l => l.map(y => y.id === x.id ? { ...y, prix: e.target.value } : y))} placeholder="€" style={{ width: 90 }} aria-label={'Prix : ' + x.label} />
            <button className="btn btn-outline btn-sm" aria-label={'Supprimer ' + x.label} onClick={() => setList(l => l.filter(y => y.id !== x.id))}>✕</button>
          </div>)}</div>)}
        <div className="grid-3 mt-2" style={{ alignItems: 'end' }}>
          <div><label>Article</label><input type="text" value={f.label} onChange={e => setF({ ...f, label: e.target.value })} /></div>
          <div><label>Catégorie</label><input type="text" list="achat-cats" value={f.cat} onChange={e => setF({ ...f, cat: e.target.value })} /><datalist id="achat-cats">{cats.map(c => <option key={c} value={c} />)}</datalist></div>
          <div className="flex gap-1"><input type="number" min="0" placeholder="€" value={f.prix} onChange={e => setF({ ...f, prix: e.target.value })} /><button className="btn btn-sm" onClick={() => { if (!f.label.trim()) return; setList(l => [...l, { id: newId(), ...f, label: f.label.trim(), done: false }]); setF({ ...f, label: '', prix: '' }); }}>Ajouter</button></div>
        </div>
      </div>
    </div>
  );
}
function VentrePhoto({ v, onOpen }) { const url = useFile(v.fileId); return <div className="ph" onClick={() => url && onOpen(url)}>{url ? <img src={url} alt={'Ventre à ' + v.sa + ' SA'} /> : 'Chargement…'}</div>; }
function AlbumVentre() {
  const { data, save, toast } = useApp();
  const list = [...(data.ventre || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const ref = useRef();
  const [open, setOpen] = useState(null);
  async function add(files) {
    const out = [];
    for (const f of files) { if (!isImg(f)) continue; const url = await compressImage(f); const fileId = await putFile(url); const date = toISO(new Date(f.lastModified || Date.now())); const o = saAt(data.profil, date); out.push({ id: newId(), date, sa: o ? o.sa : '', fileId }); }
    if (!out.length) return toast('Choisissez des photos (JPG, PNG)', 'err');
    save(d => ({ ...d, ventre: [...(d.ventre || []), ...out] })); toast(`${out.length} photo${out.length > 1 ? 's' : ''} ajoutée${out.length > 1 ? 's' : ''}`);
  }
  return (
    <div>
      <div className="row-between mb-2"><p className="small muted">Une photo par semaine ou par mois, prise au même endroit : l'album montre le ventre s'arrondir.</p>
        <input type="file" accept="image/*" multiple ref={ref} style={{ display: 'none' }} onChange={e => { add([...e.target.files]); e.target.value = ''; }} />
        <button className="btn btn-sm" onClick={() => ref.current.click()}>Ajouter des photos</button></div>
      {list.length === 0 ? <div className="drop-zone" onClick={() => ref.current.click()} style={{ cursor: 'pointer' }}><p className="muted">Aucune photo pour l'instant.</p></div> :
        <div className="album">{list.map(v => <figure key={v.id}><VentrePhoto v={v} onOpen={setOpen} />
          <figcaption>{v.sa ? v.sa + ' SA' : ''} · {fmtDate(v.date, { day: 'numeric', month: 'short' })} <button className="side-link" style={{ display: 'inline', padding: 0, marginLeft: 4 }} aria-label="Supprimer la photo" onClick={() => { if (!confirm('Supprimer cette photo ?')) return; delFile(v.fileId); save(d => ({ ...d, ventre: (d.ventre || []).filter(x => x.id !== v.id) })); }}>✕</button></figcaption></figure>)}</div>}
      {open && <div className="lightbox" onClick={() => setOpen(null)}><img src={open} alt="" /></div>}
    </div>
  );
}
function NaissanceTab() {
  const { premium } = useApp();
  const [sub, setSub] = useState(() => { try { return localStorage.getItem('bebe_naiss') || 'demarches'; } catch (e) { return 'demarches'; } });
  useEffect(() => { try { localStorage.setItem('bebe_naiss', sub); } catch (e) {} }, [sub]);
  const SUBS = [['demarches', 'Démarches & congés'], ['projet', 'Projet de naissance'], ['jourj', 'Fiche Jour J'], ['valise', 'Valise maternité'], ['achats', 'Liste d\'achats'], ['ventre', 'Album du ventre'], ['contractions', 'Contractions'], ['mouvements', 'Mouvements']];
  return (
    <div>
      <h1 className="section-title no-print">Préparer la naissance</h1>
      <div className="subnav no-print">{SUBS.map(([k, l]) => <button key={k} className={`pill${sub === k ? ' active' : ''}`} onClick={() => setSub(k)}>{l}{!premium && !['valise', 'contractions'].includes(k) ? ' ◆' : ''}</button>)}</div>
      {sub === 'valise' && <Valise />}
      {sub === 'contractions' && <Contractions />}
      {!['valise', 'contractions'].includes(sub) && !premium && <Locked what={'n_' + sub} />}
      {premium && <>
      {sub === 'demarches' && <Demarches />}
      {sub === 'projet' && <ProjetNaissance />}
      {sub === 'jourj' && <FicheJourJ />}
      {sub === 'achats' && <Achats />}
      {sub === 'ventre' && <AlbumVentre />}
      {sub === 'mouvements' && <Mouvements />}
      </>}
    </div>
  );
}

/* ============================================================
   NAVIGATION
   ============================================================ */
const NAV = [
  ['home', 'Accueil'], ['quotidien', 'Au quotidien'], ['echos', 'Échographies'], ['resultats', 'Analyses'], ['mesures', 'Courbes'],
  ['agenda', 'Rendez-vous'], ['docs', 'Documents'], ['ordonnances', 'Ordonnances'], ['journal', 'Journal'], ['naissance', 'Naissance'],
];
const BOTTOM = ['home', 'quotidien', 'echos', 'agenda'];

/* ============================================================
   PLANCHES D'ÉCHO EN PDF — découpe automatique des images
   (pages scannées avec plusieurs vignettes en grille)
   ============================================================ */
async function pdfLib() {
  const L = window.pdfjsLib;
  if (!L) throw new Error('Lecteur PDF indisponible');
  if (!L.GlobalWorkerOptions.workerSrc) L.GlobalWorkerOptions.workerSrc = window.PDF_WORKER || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  return L;
}
function findTiles(gray, W, H, AR = 1.33) {
  const hist = new Uint32Array(256); for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  let acc = 0, bg = 255; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= gray.length * 0.97) { bg = v; break; } }
  const TH = bg * 0.8, minS = Math.floor(W * 0.1);
  const segs = (mask, minLen) => { const out = []; let s = -1; for (let i = 0; i <= mask.length; i++) { const v = i < mask.length && mask[i]; if (v && s < 0) s = i; else if (!v && s >= 0) { if (i - s >= minLen) out.push([s, i]); s = -1; } } return out; };
  const rowInk = (c0, c1, r0, r1) => { const p = []; for (let y = r0; y < r1; y++) { let n = 0; for (let x = c0; x < c1; x++) if (gray[y * W + x] < TH) n++; p.push(n / (c1 - c0)); } return p; };
  const colInk = (c0, c1, r0, r1) => { const p = []; for (let x = c0; x < c1; x++) { let n = 0; for (let y = r0; y < r1; y++) if (gray[y * W + x] < TH) n++; p.push(n / (r1 - r0)); } return p; };
  const rowLum = (c0, c1, r0, r1) => { const p = []; for (let y = r0; y < r1; y++) { let s = 0; for (let x = c0; x < c1; x++) s += gray[y * W + x]; p.push(s / (c1 - c0)); } return p; };
  const colLum = (c0, c1, r0, r1) => { const p = []; for (let x = c0; x < c1; x++) { let s = 0; for (let y = r0; y < r1; y++) s += gray[y * W + x]; p.push(s / (r1 - r0)); } return p; };
  const split = (prof, n) => { const L = prof.length, cuts = [0]; for (let k = 1; k < n; k++) { const e = Math.floor(L * k / n), r = Math.floor(L * 0.08); let best = e - r; for (let i = e - r; i < e + r; i++) if (prof[i] > prof[best]) best = i; cuts.push(best); } cuts.push(L); return cuts.slice(0, -1).map((c, i) => [c, cuts[i + 1]]); };
  const res = [];
  for (const [r0, r1] of segs(rowInk(0, W, 0, H).map(v => v > 0.2), minS)) {
    for (const [c0, c1] of segs(colInk(0, W, r0, r1).map(v => v > 0.4), minS)) {
      const w = c1 - c0, h = r1 - r0;
      // grille la plus probable : vignettes au format ~4/3, assez grandes (≥ 30 % de la page en largeur)
      let nr = 1, nc = 1, bestErr = Math.abs(Math.log((w / h) / AR));
      for (let c = 1; c <= 3; c++) for (let r = 1; r <= 4; r++) {
        if (c * r === 1 || w / c < W * 0.3 || h / r < W * 0.18) continue;
        const err = Math.abs(Math.log((w / c) / (h / r) / AR));
        if (err + 0.15 < bestErr) { bestErr = err; nr = r; nc = c; }
      }
      for (const [a, b] of split(rowLum(c0, c1, r0, r1), nr))
        for (const [x, y] of split(colLum(c0, c1, r0 + a, r0 + b), nc)) res.push({ x: c0 + x, y: r0 + a, w: y - x, h: b - a });
    }
  }
  return res;
}
async function extractEchoTiles(pdfDataURL, onProgress) {
  const L = await pdfLib();
  const bin = atob(pdfDataURL.split(',')[1]); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const pdf = await L.getDocument({ data: bytes }).promise;
  const out = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    onProgress && onProgress(p, pdf.numPages);
    const page = await pdf.getPage(p);
    const vp1 = page.getViewport({ scale: 891 / page.getViewport({ scale: 1 }).width });
    const big = 2.4;
    const vp = page.getViewport({ scale: vp1.scale * big });
    const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const s = document.createElement('canvas'); s.width = Math.round(vp1.width); s.height = Math.round(vp1.height);
    const sx = s.getContext('2d', { willReadFrequently: true }); sx.drawImage(c, 0, 0, s.width, s.height);
    const px = sx.getImageData(0, 0, s.width, s.height).data, gray = new Uint8Array(s.width * s.height);
    for (let i = 0; i < gray.length; i++) gray[i] = (px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114) | 0;
    const tiles = findTiles(gray, s.width, s.height);
    // une page = une seule grande image et du texte autour : ce n'est pas une planche
    if (tiles.length === 1 && tiles[0].w * tiles[0].h > s.width * s.height * 0.45) continue;
    tiles.forEach((t, i) => {
      const k = c.width / s.width, m = 2;
      const o = document.createElement('canvas'); o.width = Math.round((t.w - m * 2) * k); o.height = Math.round((t.h - m * 2) * k);
      o.getContext('2d').drawImage(c, (t.x + m) * k, (t.y + m) * k, o.width, o.height, 0, 0, o.width, o.height);
      out.push({ page: p, index: i + 1, url: o.toDataURL('image/jpeg', 0.9) });
    });
  }
  return out;
}

/* ============================================================
   VERSION COMMERCIALE : déblocage, réglages, mentions
   ============================================================ */
const PAID_TABS = ['echos', 'resultats', 'mesures', 'docs', 'ordonnances'];
const PAYWALL_TXT = {
  '3d': 'Faites défiler les semaines et voyez bébé grandir, de l\'embryon jusqu\'à la naissance, en grand écran.',
  echos: 'Rangez les photos de chaque échographie par séance, même les planches PDF, découpées automatiquement.',
  resultats: 'Notez vos résultats d\'analyses et retrouvez-les dans un tableau par date.',
  mesures: 'Saisissez les mesures de vos échos et comparez-les aux moyennes.',
  docs: 'Gardez tous vos comptes rendus, ordonnances et résultats au même endroit, consultables à tout moment.',
  ordonnances: 'Gardez vos ordonnances et retrouvez vos traitements dans la fiche Jour J.',
  pdf: 'Exportez tout votre dossier en PDF pour la sage-femme ou la maternité.',
  n_demarches: 'Congé maternité, paternité, congé de naissance, CAF, mutuelle : toutes les dates calculées selon votre terme.',
  n_projet: 'Préparez votre projet de naissance et imprimez-le pour l\'équipe.',
  n_jourj: 'Une fiche à imprimer avec tout ce que la maternité vous demandera à l\'arrivée.',
  n_achats: 'La liste d\'achats de bébé, avec votre budget.',
  n_ventre: 'L\'album photo de votre ventre, semaine après semaine.',
  n_mouvements: 'Comptez les mouvements de bébé.',
};
const PAYWALL_LIST = ['Bébé illustré semaine après semaine, de 8 à 41 SA', 'Échographies rangées par séance', 'Courbes de croissance avec les vraies mesures', 'Résultats d\'analyses par date', 'Démarches et congés calculés pour vous', 'Projet de naissance et fiche Jour J', 'Liste d\'achats, album du ventre, mouvements', 'Export PDF du dossier complet'];
function Paywall({ why, onClose, onUnlock }) {
  const [code, setCode] = useState('');
  return (
    <Modal onClose={onClose} width={520}>
      <div style={{ textAlign: 'center' }}><Pampa size={52} /></div>
      <h2 className="h3" style={{ fontSize: '2rem', textAlign: 'center', margin: '6px 0 4px' }}>Toute la grossesse, en un seul achat</h2>
      {PAYWALL_TXT[why] && <p className="muted" style={{ textAlign: 'center', marginBottom: 14 }}>{PAYWALL_TXT[why]}</p>}
      <ul className="list-plain mb-3">{PAYWALL_LIST.map(x => <li key={x}>{x}</li>)}</ul>
      <button className="btn" style={{ width: '100%', padding: '14px' }} onClick={() => alert('L\'achat se fera par l\'App Store ou Google Play dans la version publiée.')}>Débloquer pour {PREMIUM_PRICE}</button>
      <p className="small muted mt-1" style={{ textAlign: 'center' }}>Paiement unique, sans abonnement. Vos données restent sur votre téléphone.</p>
      <details className="mt-2"><summary className="small muted" style={{ cursor: 'pointer' }}>J'ai un code</summary>
        <div className="flex gap-1 mt-1"><input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="Code" aria-label="Code de déblocage" /><button className="btn btn-outline btn-sm" onClick={() => { if (code.trim().toUpperCase() === 'NIDE-TEST') onUnlock(); else alert('Code invalide'); }}>Valider</button></div>
      </details>
      <div style={{ textAlign: 'center' }}><button className="side-link mt-2" onClick={onClose}>Plus tard</button></div>
    </Modal>
  );
}
function Locked({ what }) {
  const { askPremium } = useApp();
  const TITLES = { echos: 'Échographies', resultats: 'Analyses', mesures: 'Courbes de croissance', docs: 'Documents', ordonnances: 'Ordonnances' };
  return (
    <div>
      {TITLES[what] && <h1 className="section-title">{TITLES[what]}</h1>}
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <Pampa size={56} />
        <p style={{ fontFamily: 'var(--serif)', fontSize: '1.5rem', margin: '10px auto 8px', maxWidth: 520, lineHeight: 1.35 }}>{PAYWALL_TXT[what] || 'Inclus dans la version complète.'}</p>
        <p className="small muted mb-3">Inclus dans la version complète, en un seul achat de {PREMIUM_PRICE}.</p>
        <button className="btn" onClick={() => askPremium(what)}>Découvrir la version complète</button>
      </div>
    </div>
  );
}
function SettingsModal({ onClose, onExport, onImport }) {
  const { data, save, premium, askPremium, toast } = useApp();
  const importRef = useRef();
  const [est, setEst] = useState(null);
  useEffect(() => { try { navigator.storage && navigator.storage.estimate && navigator.storage.estimate().then(setEst); } catch (e) {} }, []);
  return (
    <Modal onClose={onClose}>
      <h2 className="h3" style={{ fontSize: '1.9rem' }}>Réglages</h2>
      <div className="card card-sm mb-3" style={{ background: 'var(--lin-2)' }}>
        <div className="h3" style={{ fontSize: '1.25rem' }}>Version</div>
        {premium ? <p className="small">Version complète débloquée. Merci !</p> : <><p className="small muted mb-1">Version gratuite.</p><button className="btn btn-sm" onClick={() => { onClose(); askPremium('tout'); }}>Tout débloquer · {PREMIUM_PRICE}</button></>}
      </div>
      <div className="card card-sm mb-3" style={{ background: 'var(--lin-2)' }}>
        <div className="h3" style={{ fontSize: '1.25rem' }}>Vos données</div>
        <p className="small muted mb-2">Tout reste sur cet appareil{est ? ` (${(est.usage / 1048576).toFixed(1)} Mo utilisés)` : ''} : rien n'est envoyé sur internet. Pensez à télécharger une sauvegarde de temps en temps, par exemple dans votre iCloud ou Google Drive. Elle contient aussi les photos et documents.</p>
        <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-sm" onClick={onExport}>Télécharger une sauvegarde</button>
          <input type="file" accept=".json" ref={importRef} style={{ display: 'none' }} onChange={e => { e.target.files[0] && onImport(e.target.files[0]); e.target.value = ''; }} />
          <button className="btn btn-outline btn-sm" onClick={() => importRef.current.click()}>Restaurer une sauvegarde</button>
        </div>
      </div>
      <details className="mb-3"><summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>À propos et mentions</summary>
        <div className="small muted mt-1" style={{ lineHeight: 1.6 }}>
          <p className="mb-1">{APP_NAME} est un carnet personnel pour organiser le suivi de votre grossesse. Il ne pose aucun diagnostic et ne remplace pas l'avis de votre sage-femme, de votre médecin ou de la maternité. En cas de doute ou de symptôme inhabituel, contactez-les ou appelez le 15.</p>
          <p className="mb-1">Les valeurs moyennes (taille, poids, mesures) sont indicatives. Les dates de démarches et de congés sont calculées à partir de votre terme et des règles connues : vérifiez votre situation sur ameli.fr, caf.fr et service-public.fr.</p>
          <p className="mb-1">Les illustrations de bébé sont indicatives : ce ne sont pas des images réelles.</p>
          <p className="mb-1">Vos données restent sur cet appareil : aucun compte, aucune publicité, aucun traceur. <a href="https://graziosojulien2.github.io/devis-projets/nide/confidentialite.html" target="_blank" rel="noopener">Politique de confidentialité</a></p>
          <p style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>Éditée par <b style={{ color: 'var(--encre)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>KJN <span className="flag-fr" role="img" aria-label="France"><i /><i /><i /></span></b> · <a href="mailto:ilario.commercial@gmail.com">ilario.commercial@gmail.com</a></p>
        </div>
      </details>
      <div className="row-between">
        <button className="btn btn-terra btn-sm" onClick={() => { if (confirm('Effacer toutes les données de cet appareil ? Pensez à télécharger une sauvegarde avant.') && confirm('Vraiment tout effacer ?')) { save({ ...INITIAL_DATA }); onClose(); toast('Données effacées.'); } }}>Tout effacer</button>
        <button className="btn btn-sm" onClick={onClose}>Fermer</button>
      </div>
    </Modal>
  );
}

const ANALYSES_COURANTES = ['Hémoglobine', 'Hématocrite', 'Plaquettes', 'Leucocytes', 'Ferritine', 'Glycémie à jeun', 'HGPO à jeun', 'HGPO 1 h', 'HGPO 2 h', 'TSH', 'Toxoplasmose IgG', 'Toxoplasmose IgM', 'Rubéole IgG', 'Syphilis', 'Hépatite B (Ag HBs)', 'VIH', 'RAI (agglutinines irrégulières)', 'Groupe sanguin', 'Rhésus', 'Phénotype Kell', 'Streptocoque B', 'Protéinurie', 'Glycosurie', 'ECBU', 'Vitamine D'];
function AddResultsModal({ onClose }) {
  const { save, toast } = useApp();
  const emptyRow = () => ({ nom: '', valeur: '', unite: '', reference: '', statut: 'normal' });
  const [date, setDate] = useState(todayISO());
  const [labo, setLabo] = useState('');
  const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()]);
  const set = (i, k, v) => setRows(r => r.map((x, j) => j === i ? { ...x, [k]: v } : x));
  function ok() {
    const res = rows.filter(r => r.nom.trim() && String(r.valeur).trim()).map(r => ({ ...r, nom: r.nom.trim(), categorie: /urine|ecbu|protéin|glycosur/i.test(r.nom) ? 'Urines' : /toxo|rubéole|syphilis|hépatite|vih/i.test(r.nom) ? 'Sérologie' : /rai|groupe|rhésus|kell/i.test(r.nom) ? 'Immuno-hématologie' : /glyc|hgpo|tsh|ferritine|vitamine/i.test(r.nom) ? 'Biochimie' : 'Hématologie' }));
    if (!res.length) return toast('Ajoutez au moins une analyse avec sa valeur', 'err');
    save(d => ({ ...d, documents: [...d.documents, { id: newId(), nom: 'Saisie', titre: `Résultats du ${fmtDate(date)}${labo ? ' · ' + labo : ''}`, type: 'Bilan sanguin', date, etablissement: labo, status: 'ok', manuel: true, resultats: res, alertes: [] }] }));
    toast(`${res.length} résultat${res.length > 1 ? 's' : ''} enregistré${res.length > 1 ? 's' : ''}`); onClose();
  }
  return (
    <Modal onClose={onClose} width={760}>
      <h2 className="h3" style={{ fontSize: '1.7rem' }}>Ajouter des résultats</h2>
      <div className="grid-2 mb-2"><div><label htmlFor="ar-d">Date du prélèvement</label><input id="ar-d" type="date" value={date} onChange={e => setDate(e.target.value)} /></div><div><label htmlFor="ar-l">Laboratoire (facultatif)</label><input id="ar-l" type="text" value={labo} onChange={e => setLabo(e.target.value)} /></div></div>
      <datalist id="analyses-courantes">{ANALYSES_COURANTES.map(a => <option key={a} value={a} />)}</datalist>
      <div style={{ overflowX: 'auto' }}>
        <table className="res-table"><thead><tr><th>Analyse</th><th>Valeur</th><th>Unité</th><th>Normes du labo</th><th>Le labo indique</th></tr></thead><tbody>
          {rows.map((r, i) => <tr key={i}>
            <td><input type="text" list="analyses-courantes" value={r.nom} onChange={e => set(i, 'nom', e.target.value)} aria-label="Analyse" style={{ minWidth: 170 }} /></td>
            <td><input type="text" value={r.valeur} onChange={e => set(i, 'valeur', e.target.value)} aria-label="Valeur" style={{ width: 90 }} /></td>
            <td><input type="text" value={r.unite} onChange={e => set(i, 'unite', e.target.value)} aria-label="Unité" style={{ width: 80 }} /></td>
            <td><input type="text" value={r.reference} onChange={e => set(i, 'reference', e.target.value)} aria-label="Normes" style={{ width: 120 }} placeholder="ex. 11,5 - 15" /></td>
            <td><select value={r.statut} onChange={e => set(i, 'statut', e.target.value)} aria-label="Résultat selon le labo"><option value="normal">Dans les normes</option><option value="bas">Bas</option><option value="haut">Haut</option><option value="positif">Positif</option><option value="negatif">Négatif</option><option value="immunise">Immunisée</option><option value="non_immunise">Non immunisée</option><option value="info">—</option></select></td>
          </tr>)}
        </tbody></table>
      </div>
      <button className="side-link" onClick={() => setRows(r => [...r, emptyRow()])}>+ Une ligne de plus</button>
      <p className="small muted mt-1">Recopiez les valeurs et l'avis du laboratoire tels qu'ils figurent sur le compte rendu.</p>
      <div className="flex gap-1 mt-2" style={{ justifyContent: 'flex-end' }}><button className="btn btn-outline btn-sm" onClick={onClose}>Annuler</button><button className="btn btn-sm" onClick={ok}>Enregistrer</button></div>
    </Modal>
  );
}
