// Construit la version « appli » (Capacitor) : tout en local, sans CDN, utilisable hors ligne.
import fs from 'fs'; import path from 'path';
const out = process.argv[2] || 'www', NM = process.argv[3] || '/home/claude/nideapp/node_modules';
let html = fs.readFileSync('dist/index.html', 'utf8');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out + '/vendor/fonts', { recursive: true });
const V = { 'react.production.min.js': 'react/umd/react.production.min.js', 'react-dom.production.min.js': 'react-dom/umd/react-dom.production.min.js', 'chart.umd.min.js': 'chart.js/dist/chart.umd.js', 'jspdf.umd.min.js': 'jspdf/dist/jspdf.umd.min.js', 'pdf.min.js': 'pdfjs-dist/build/pdf.min.js', 'pdf.worker.min.js': 'pdfjs-dist/build/pdf.worker.min.js' };
for (const [k, v] of Object.entries(V)) fs.copyFileSync(path.join(NM, v), `${out}/vendor/${k}`);
html = html.replace(/<script src="https:\/\/[^"]*\/(react\.production\.min\.js|react-dom\.production\.min\.js|chart\.umd\.min\.js|jspdf\.umd\.min\.js|pdf\.min\.js)"><\/script>/g, (m, f) => `<script src="vendor/${f}"></script>`);
html = html.replace('<script src="vendor/pdf.min.js"></script>', '<script src="vendor/pdf.min.js"></script>\n<script>window.PDF_WORKER = "vendor/pdf.worker.min.js";</script>');
let css = '';
for (const [pkg, files] of [['cormorant-garamond', ['500.css', '600.css', '500-italic.css']], ['jost', ['400.css', '500.css', '600.css']]]) {
  const src = path.join(NM, '@fontsource', pkg);
  for (const f of files) {
    css += fs.readFileSync(path.join(src, f), 'utf8').replace(/url\(\.\/files\//g, `url(fonts/${pkg}/`);
  }
  fs.mkdirSync(`${out}/vendor/fonts/${pkg}`, { recursive: true });
  for (const w of fs.readdirSync(path.join(src, 'files'))) if (/latin(-ext)?-(400|500|600)-(normal|italic)\.woff2$/.test(w)) fs.copyFileSync(path.join(src, 'files', w), `${out}/vendor/fonts/${pkg}/${w}`);
}
// on ne garde que les sous-ensembles latin copiés
css = css.replace(/@font-face\s*{[^}]*}/g, b => /latin(-ext)?-\d+-(normal|italic)\.woff2/.test(b) ? b : '');
fs.writeFileSync(`${out}/vendor/fonts.css`, css);
html = html.replace(/<link rel="preconnect"[^\n]*\n/, '').replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>\n?/, '<link rel="stylesheet" href="vendor/fonts.css">\n');
for (const f of ['icon.svg', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest']) fs.copyFileSync(`dist/${f}`, `${out}/${f}`);
fs.writeFileSync(`${out}/index.html`, html);
if (/(src|href)="https:/.test(html)) throw new Error('Il reste des liens CDN');
console.log('appli construite dans', out);
