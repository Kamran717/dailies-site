// scripts/add-ga.mjs — insert the GA4 (gtag.js) tag right after <head>. Idempotent.
import { readFileSync, writeFileSync } from 'fs';
const ID = 'G-TFZ5X09KTG';
let s = readFileSync('index.html', 'utf8');
if (s.includes(ID)) { console.log('GA4 tag already present — nothing to do.'); process.exit(0); }
const eol = s.includes('\r\n') ? '\r\n' : '\n';
const snippet = [
  '<!-- Google tag (gtag.js) -->',
  `<script async src="https://www.googletagmanager.com/gtag/js?id=${ID}"></script>`,
  '<script>',
  '  window.dataLayer = window.dataLayer || [];',
  '  function gtag(){dataLayer.push(arguments);}',
  "  gtag('js', new Date());",
  `  gtag('config', '${ID}');`,
  '</script>',
].join(eol);
const m = s.match(/<head[^>]*>/i);
if (!m) { console.error('ABORT: no <head> tag found'); process.exit(1); }
s = s.replace(m[0], m[0] + eol + snippet);
writeFileSync('index.html', s);
console.log('GA4 tag inserted right after <head>.');
