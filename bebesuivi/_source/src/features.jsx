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
function SettingsModal({ onClose, onExport, onImport }) {
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
  const [scriptUrl, setScriptUrl0] = useState(() => { try { return localStorage.getItem('bebesuivi.script') || ''; } catch (e) { return ''; } });
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
function Baby3DArch({ height = 440, compact }) {
  const { data } = useApp();
  const cur = saAt(data.profil);
  const lb = latestBiometrie(data);
  const curDec = cur ? Math.min(41, cur.dec) : 26;
  const [saV, setSaV] = useState(null); // null = aujourd'hui
  const [mode, setMode] = useState(0);
  const [auto, setAuto] = useState(true);
  const [focus, setFocus] = useState(false);
  const [big, setBig] = useState(false);
  const rr = useRef(null), rrBig = useRef(null);
  const saShown = saV == null ? curDec : saV;
  const measures = measuresForSA(lb, saShown, curDec);
  const rd = v => Math.round(v);
  function snap(ref) { const r = ref.current; if (!r) return; const a = document.createElement('a'); a.href = r.snapshot(); a.download = `bebe_3D_${Math.floor(saShown)}SA.png`; document.body.appendChild(a); a.click(); a.remove(); }
  const dSA = dateForSA(data.profil, saShown);
  const taille = getTaille(Math.floor(saShown));
  return (
    <div className="arch-col ro-ok">
      <div className="arch" style={{ height }}>
        {!big && <Baby3DCanvas measures={measures} mode={mode} auto={auto} focus={focus} height={height} rendererRef={rr} />}
      </div>
      <div style={{ padding: '0 6px' }}>
        <div className="row-between" style={{ alignItems: 'baseline' }}>
          <span className="eyebrow">{saV == null ? 'Aujourd\'hui' : dSA ? fmtDate(dSA, { day: 'numeric', month: 'long' }) : ''} · {fmtSA({ sa: Math.floor(saShown), j: Math.round((saShown % 1) * 7) % 7 })}</span>
          <span className="eyebrow">≈ {taille ? taille[2] + ' cm · ' : ''}{rd(estWeight(saShown))} g</span>
        </div>
        <input type="range" min="12" max="41" step="0.5" value={saShown} aria-label="Semaine de grossesse affichée" onChange={e => { const v = Number(e.target.value); setSaV(Math.abs(v - curDec) < 0.3 ? null : v); }} style={{ marginTop: 8 }} />
        <div className="row-between small muted"><span>12 SA</span>{saV != null && <button className="pill" style={{ padding: '3px 12px' }} onClick={() => setSaV(null)}>Revenir à aujourd'hui</button>}<span>41 SA</span></div>
        <div className="chips" style={{ marginTop: 10 }}>
          <button className={`chip${!focus ? ' on' : ''}`} onClick={() => setFocus(false)}>Dans le ventre</button>
          <button className={`chip${focus ? ' on' : ''}`} onClick={() => setFocus(true)}>Visage</button>
          <button className={`chip${mode === 1 ? ' on' : ''}`} onClick={() => setMode(m => 1 - m)}>Teinte peau</button>
          <button className="chip" onClick={() => setAuto(a => !a)}>{auto ? 'Pause' : 'Animer'}</button>
          {!compact && <button className="chip" onClick={() => setBig(true)}>Plein écran</button>}
          <button className="chip" onClick={() => snap(rr)}>Enregistrer l'image</button>
        </div>
        {!compact && <p className="small muted" style={{ marginTop: 10, lineHeight: 1.55 }}>
          {lb.complete ? <>Proportions de bébé calculées d'après l'écho du {fmtDate(lb.date)} (BIP {rd(lb.m.bip)}, PC {rd(lb.m.pc)}, PA {rd(lb.m.pa)}, fémur {rd(lb.m.lf)} mm), projetées à la semaine choisie.</> : <>Proportions moyennes : elles suivront celles de bébé dès qu'une écho avec biométrie sera analysée.</>}
          {' '}Bébé se retourne tête en bas vers 28–34 SA. Glissez pour tourner, molette pour zoomer. Illustration reconstituée, pas une image réelle.
        </p>}
      </div>
      {big && <div className="lightbox" onClick={() => setBig(false)}>
        <div onClick={e => e.stopPropagation()} style={{ width: 'min(92vw, 92vh)', maxWidth: 900 }}>
          <Baby3DCanvas measures={measures} mode={mode} auto={auto} focus={focus} height={'min(78vh, 86vw)'} rendererRef={rrBig} />
          <div className="flex gap-1" style={{ justifyContent: 'center', flexWrap: 'wrap', marginTop: 10 }}>
            <button className="lb-btn" onClick={() => setFocus(f => !f)}>{focus ? 'Dans le ventre' : 'Visage'}</button>
            <button className="lb-btn" onClick={() => setMode(m => 1 - m)}>{mode === 0 ? 'Teinte peau' : 'Teinte écho'}</button>
            <button className="lb-btn" onClick={() => rrBig.current && rrBig.current.zoomBy(1.15)}>Zoom +</button>
            <button className="lb-btn" onClick={() => rrBig.current && rrBig.current.zoomBy(0.87)}>Zoom −</button>
            <button className="lb-btn" onClick={() => snap(rrBig)}>Enregistrer</button>
            <button className="lb-btn" onClick={() => setBig(false)}>Fermer</button>
          </div>
        </div>
      </div>}
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
      <h2 className="h3" style={{ fontSize: '1.7rem', marginBottom: 12 }}>Aujourd'hui pour Alexandra</h2>
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
  const { data, save, enqueue, job, toast, pendingList } = useApp();
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
      <h1 className="h3" style={{ fontSize: '2.2rem', marginTop: 12 }}>Bienvenue dans BébéSuivi</h1>
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

      {pend.length > 0 && !job && <div className="card mb-3">
        <div className="row-between mb-1"><h2 className="h3" style={{ margin: 0 }}>À analyser</h2>{data.apiKey ? <button className="btn btn-sm" onClick={() => enqueue(pend)}>Tout analyser ({pend.length})</button> : <span className="small muted">Ajoutez la clé IA dans les réglages</span>}</div>
        <ul className="todo-list">{pend.slice(0, 5).map(it => <li key={it.kind + it.id}><span>{pendLabel(it)}</span><span className="small muted">{it.kind === 'seance' ? 'séance d\'écho' : it.kind === 'ordonnances' ? 'ordonnance' : 'document'}</span></li>)}</ul>
        {pend.length > 5 && <p className="small muted">et {pend.length - 5} autre{pend.length - 5 > 1 ? 's' : ''}.</p>}
      </div>}

      <div className="grid-2 mb-3">
        <div className="card">
          <div className="row-between mb-2"><h2 className="h3" style={{ margin: 0 }}>Prochains rendez-vous</h2><button className="btn btn-outline btn-sm ro-ok" onClick={() => go('agenda')}>Agenda</button></div>
          {prochainsRdv.length === 0 && <p className="small muted">Aucun rendez-vous à venir.</p>}
          {prochainsRdv.map(r => <div key={r.id} className="kv"><span>{fmtDate(r.date, { weekday: 'short', day: 'numeric', month: 'short' })}{r.heure ? ' · ' + r.heure : ''}</span><span>{r.titre}{(r.questions || []).length ? ` · ${r.questions.length} question${r.questions.length > 1 ? 's' : ''}` : ''}</span></div>)}
        </div>
        <div className="card">
          <div className="row-between mb-2"><h2 className="h3" style={{ margin: 0 }}>À faire bientôt</h2><button className="btn btn-outline btn-sm ro-ok" onClick={() => go('naissance')}>Naissance</button></div>
          {demarches.length === 0 && <p className="small muted">Rien d'urgent côté démarches.</p>}
          {demarches.map(x => (
            <label key={x.id} className="check-row" style={{ margin: 0, fontWeight: 400, color: 'var(--text)' }}>
              <input type="checkbox" checked={false} onChange={() => save(d => ({ ...d, demarches: { ...(d.demarches || {}), [x.id]: true } }))} />
              <span className="lbl" style={{ flex: 1 }}>{x.label}</span>
              <span className="small muted">{daysBetween(new Date(), x.due) < 0 ? 'dépassé' : 'avant le ' + fmtDate(x.due, { day: 'numeric', month: 'short' })}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="row-between mb-2">
          <h2 className="h3" style={{ margin: 0 }}>Bilan du suivi</h2>
          <button className="btn btn-outline btn-sm" onClick={genBilan} disabled={bilanLoading || !data.apiKey}>{bilanLoading ? 'Lecture du dossier…' : b ? 'Actualiser' : 'Générer le bilan'}</button>
        </div>
        {bilanLoading && <div className="flex gap-1 small muted" style={{ alignItems: 'center' }}><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />Lecture de tout le dossier…</div>}
        {!bilanLoading && !b && <p className="small muted">Le bilan croise les documents analysés, les échographies et l'agenda.</p>}
        {!bilanLoading && b && <div>
          <div className="ai-bubble mb-2"><div className="ai-tag">Synthèse du {fmtDate(b.date.slice(0, 10))} · {b.nbDocs} documents</div><p style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>{b.resume}</p></div>
          <div className="grid-2">
            {[['Points positifs', b.points_positifs, 'var(--euca-d)'], ['À surveiller', b.vigilance, 'var(--terra)'], ['À venir', b.a_venir, 'var(--blue-600)'], ['Questions à poser', b.questions, 'var(--brun)']].map(([t, arr, c]) => (arr && arr.length > 0) && (
              <div key={t}><div style={{ fontWeight: 600, fontSize: '0.88rem', color: c, marginBottom: 4 }}>{t}</div><ul className="list-plain">{arr.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
            ))}
          </div>
          <p className="disclaimer">Synthèse automatique : elle ne remplace pas l'avis de la sage-femme ou du médecin.</p>
        </div>}
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
      <div className="flex gap-1 mt-1"><button className="btn btn-outline btn-sm" onClick={resume} disabled={busy || cr.trim().length < 10}>{busy ? 'Rédaction…' : 'Mettre au propre avec l\'IA'}</button>{r.statut !== 'Fait' && <button className="btn btn-outline btn-sm" onClick={() => upd({ statut: 'Fait', compteRendu: cr })}>Marquer comme fait</button>}</div>
      {r.crResume && <div className="ai-bubble mt-2"><div className="ai-tag">Compte rendu</div><div style={{ whiteSpace: 'pre-wrap', fontSize: '0.92rem', lineHeight: 1.6 }}>{r.crResume}</div></div>}
      <div className="flex gap-1 mt-3" style={{ justifyContent: 'flex-end' }}><button className="btn btn-sm ro-ok" onClick={() => { if (cr !== (r.compteRendu || '')) upd({ compteRendu: cr }); onClose(); }}>Fermer</button></div>
    </Modal>
  );
}

/* ============================================================
   NAISSANCE — projet, Jour J, achats, album ventre
   ============================================================ */
const PROJET_SECTIONS = [
  ['accompagnant', 'Qui sera présent', 'Julien, et si besoin…'],
  ['ambiance', 'Ambiance en salle de naissance', 'Lumière tamisée, musique, calme…'],
  ['douleur', 'Gestion de la douleur', 'Péridurale souhaitée ou non, ballon, bain, respiration…'],
  ['positions', 'Positions et liberté de mouvement', 'Pouvoir bouger, choisir sa position pour pousser…'],
  ['naissance', 'Moment de la naissance', 'Peau à peau immédiat, Julien coupe le cordon, clampage retardé…'],
  ['allaitement', 'Alimentation de bébé', 'Allaitement, biberon, tétée d\'accueil…'],
  ['cesarienne', 'En cas de césarienne', 'Présence de Julien, peau à peau dès que possible…'],
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
  const [sub, setSub] = useState(() => { try { return localStorage.getItem('bebe_naiss') || 'demarches'; } catch (e) { return 'demarches'; } });
  useEffect(() => { try { localStorage.setItem('bebe_naiss', sub); } catch (e) {} }, [sub]);
  const SUBS = [['demarches', 'Démarches & congés'], ['projet', 'Projet de naissance'], ['jourj', 'Fiche Jour J'], ['valise', 'Valise maternité'], ['achats', 'Liste d\'achats'], ['ventre', 'Album du ventre'], ['contractions', 'Contractions'], ['mouvements', 'Mouvements']];
  return (
    <div>
      <h1 className="section-title no-print">Préparer la naissance</h1>
      <div className="subnav no-print">{SUBS.map(([k, l]) => <button key={k} className={`pill${sub === k ? ' active' : ''}`} onClick={() => setSub(k)}>{l}</button>)}</div>
      {sub === 'demarches' && <Demarches />}
      {sub === 'projet' && <ProjetNaissance />}
      {sub === 'jourj' && <FicheJourJ />}
      {sub === 'valise' && <Valise />}
      {sub === 'achats' && <Achats />}
      {sub === 'ventre' && <AlbumVentre />}
      {sub === 'contractions' && <Contractions />}
      {sub === 'mouvements' && <Mouvements />}
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
