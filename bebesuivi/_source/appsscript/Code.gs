/**
 * BébéSuivi — accès d'Alexandra par mot de passe (lecture seule + humeur du jour)
 * Déployé en « Application Web » : exécuter en tant que moi, accès : tout le monde.
 * Le mot de passe n'est jamais stocké en clair : l'appli de Julien écrit son empreinte
 * (SHA-256 salé) dans « bebesuivi-acces.json » du dossier Drive BébéSuivi.
 */
var FOLDER = 'BébéSuivi', DATA = 'bebesuivi-donnees.json', ACCES = 'bebesuivi-acces.json', FILES = 'Fichiers';
var HUMEURS = ['Sereine', 'Fatiguée', 'Nauséeuse', "Pleine d'énergie", 'Anxieuse', 'Émue', ''];

function doGet(e) { return route_(e.parameter || {}); }
function doPost(e) { var p = {}; try { p = JSON.parse(e.postData.contents); } catch (x) {} return route_(p); }

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function root_() {
  var it = DriveApp.getFoldersByName(FOLDER);
  var me = Session.getEffectiveUser().getEmail();
  while (it.hasNext()) { var f = it.next(); if (f.getOwner() && f.getOwner().getEmail() === me) return f; }
  throw new Error('Dossier BébéSuivi introuvable');
}
function fileIn_(folder, name) { var it = folder.getFilesByName(name); return it.hasNext() ? it.next() : null; }

function hash_(pw, salt) {
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + pw, Utilities.Charset.UTF_8);
  return Utilities.base64Encode(d);
}
function check_(pw, root) {
  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get('fails') || 0);
  if (fails >= 8) throw new Error('Trop d\'essais. Réessaie dans 15 minutes.');
  var f = fileIn_(root, ACCES);
  if (!f) throw new Error('Accès pas encore activé par Julien.');
  var a = JSON.parse(f.getBlob().getDataAsString());
  if (!a.hash || !pw || hash_(String(pw), a.salt) !== a.hash) { cache.put('fails', String(fails + 1), 900); throw new Error('Mot de passe incorrect.'); }
}

function route_(p) {
  try {
    var root = root_();
    check_(p.pw, root);
    var df = fileIn_(root, DATA);
    if (!df) throw new Error('Pas encore de données.');
    if (p.a === 'data') {
      var d = JSON.parse(df.getBlob().getDataAsString());
      d.apiKey = '';
      return out_({ ok: true, data: d, mod: df.getLastUpdated().toISOString() });
    }
    if (p.a === 'file') {
      var data = JSON.parse(df.getBlob().getDataAsString());
      var did = (data.driveFiles || {})[p.id];
      if (!did) throw new Error('Fichier inconnu');
      var file = DriveApp.getFileById(did);
      var files = fileIn_folder_(root);
      var parents = file.getParents(), inside = false;
      while (parents.hasNext()) if (parents.next().getId() === files.getId()) inside = true;
      if (!inside) throw new Error('Fichier hors du dossier');
      var b = file.getBlob();
      return out_({ ok: true, url: 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()) });
    }
    if (p.a === 'humeur') {
      if (HUMEURS.indexOf(p.humeur) < 0) throw new Error('Humeur inconnue');
      var today = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
      var lock = LockService.getScriptLock(); lock.waitLock(20000);
      try {
        var cur = JSON.parse(df.getBlob().getDataAsString());
        cur.quotidien = cur.quotidien || {};
        var day = cur.quotidien[today] || {};
        day.humeur = p.humeur; day.humeurAt = new Date().toISOString(); day.humeurPar = 'Alexandra';
        cur.quotidien[today] = day;
        df.setContent(JSON.stringify(cur));
      } finally { lock.releaseLock(); }
      return out_({ ok: true, date: today });
    }
    throw new Error('Action inconnue');
  } catch (err) {
    return out_({ ok: false, error: String(err.message || err) });
  }
}
function fileIn_folder_(root) { var it = root.getFoldersByName(FILES); if (!it.hasNext()) throw new Error('Dossier Fichiers introuvable'); return it.next(); }
