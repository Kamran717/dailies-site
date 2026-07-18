// scripts/pin-facet-labels.mjs
// Pins the facet labels (Camera/Shot/Emotion/Light/Format) so horizontal
// chip-scroll no longer slides them off. Run from repo root: node scripts/pin-facet-labels.mjs
import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('index.html', 'utf8');

if (!s.includes('function assetSrc') || !s.includes('var origin = raw.slice')) {
  console.error('ABORT: index.html is not current main.'); process.exit(1);
}
if (s.includes('position:sticky; left:0; z-index:2; align-self:stretch;')) {
  console.log('Already pinned — nothing to do.'); process.exit(0);
}

const edits = [
  [ "    width:78px; flex-shrink:0; text-transform:uppercase;\n  }",
    "    width:78px; flex-shrink:0; text-transform:uppercase;\n"
    + "    position:sticky; left:0; z-index:2; align-self:stretch;\n"
    + "    display:flex; align-items:center;\n"
    + "    background:var(--bg-panel); padding-right:10px;\n"
    + "    box-shadow:8px 0 8px -6px var(--bg-panel);\n  }" ],
  [ ".facet-row.fade-left{ -webkit-mask-image:linear-gradient(to right, transparent, black 48px); mask-image:linear-gradient(to right, transparent, black 48px); }",
    ".facet-row.fade-left{ -webkit-mask-image:none; mask-image:none; }" ],
  [ ".facet-row.fade-left.fade-right{ -webkit-mask-image:linear-gradient(to right, transparent, black 48px, black calc(100% - 48px), transparent); mask-image:linear-gradient(to right, transparent, black 48px, black calc(100% - 48px), transparent); }",
    ".facet-row.fade-left.fade-right{ -webkit-mask-image:linear-gradient(to right, black calc(100% - 48px), transparent); mask-image:linear-gradient(to right, black calc(100% - 48px), transparent); }" ],
];

for (const [oldStr, newStr] of edits) {
  const n = s.split(oldStr).length - 1;
  if (n !== 1) { console.error(`ABORT: an anchor matched ${n} times (expected 1) — file drifted.`); process.exit(1); }
  s = s.replace(oldStr, newStr);
}
writeFileSync('index.html', s);
console.log('Pinned facet labels (sticky-left + opaque bg, right-fade kept).');