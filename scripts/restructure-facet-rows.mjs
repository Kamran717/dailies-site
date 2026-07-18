// scripts/restructure-facet-rows.mjs
// Put facet chips in their own scroll container that starts AFTER the label,
// so chips never scroll under the label/arrow. Reverts the sticky-label hack.
// Run from repo root: node scripts/restructure-facet-rows.mjs
import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('index.html', 'utf8');

if (!s.includes('function assetSrc') || !s.includes('var origin = raw.slice')) { console.error('ABORT: not current main.'); process.exit(1); }
if (s.includes('.facet-scroll{')) { console.log('Already restructured — nothing to do.'); process.exit(0); }

const edits = [
  [ '.facet-row{ display:flex; align-items:center; gap:10px; overflow-x:auto; scrollbar-width:none; }',
    '.facet-row{ display:flex; align-items:stretch; gap:10px; }\n  .facet-scroll{ flex:1; min-width:0; display:flex; align-items:center; gap:10px; overflow-x:auto; scrollbar-width:none; }' ],
  [ '.facet-row::-webkit-scrollbar{ display:none; }',
    '.facet-scroll::-webkit-scrollbar{ display:none; }' ],
  [ '.facet-row.fade-right{ -webkit-mask-image:linear-gradient(to right, black calc(100% - 48px), transparent); mask-image:linear-gradient(to right, black calc(100% - 48px), transparent); }',
    '.facet-scroll.fade-right{ -webkit-mask-image:linear-gradient(to right, black calc(100% - 40px), transparent); mask-image:linear-gradient(to right, black calc(100% - 40px), transparent); }' ],
  [ '.facet-row.fade-left{ -webkit-mask-image:none; mask-image:none; }',
    '.facet-scroll.fade-left{ -webkit-mask-image:linear-gradient(to right, transparent, black 32px); mask-image:linear-gradient(to right, transparent, black 32px); }' ],
  [ '.facet-row.fade-left.fade-right{ -webkit-mask-image:linear-gradient(to right, black calc(100% - 48px), transparent); mask-image:linear-gradient(to right, black calc(100% - 48px), transparent); }',
    '.facet-scroll.fade-left.fade-right{ -webkit-mask-image:linear-gradient(to right, transparent, black 32px, black calc(100% - 40px), transparent); mask-image:linear-gradient(to right, transparent, black 32px, black calc(100% - 40px), transparent); }' ],
  [ '    width:78px; flex-shrink:0; text-transform:uppercase;\n    position:sticky; left:0; z-index:2; align-self:stretch;\n    display:flex; align-items:center;\n    background:var(--bg-panel); padding-right:10px;\n    box-shadow:8px 0 8px -6px var(--bg-panel);\n  }',
    '    width:78px; flex-shrink:0; text-transform:uppercase;\n    display:flex; align-items:center;\n  }' ],
  [ "    var row = document.querySelector('.facet-row[data-facet=\"' + facetKey + '\"]');\n    var values = unique(facetKey);",
    "    var row = document.querySelector('.facet-row[data-facet=\"' + facetKey + '\"]');\n    var scroll = row.querySelector('.facet-scroll');\n    if(!scroll){ scroll = document.createElement('div'); scroll.className = 'facet-scroll'; row.appendChild(scroll); }\n    var values = unique(facetKey);" ],
  [ "      btn.addEventListener('click', function(){ openTagCollection(facetKey, val, btn); });\n      row.appendChild(btn);",
    "      btn.addEventListener('click', function(){ openTagCollection(facetKey, val, btn); });\n      scroll.appendChild(btn);" ],
  [ '    row.parentNode.insertBefore(wrap, row);\n    wrap.appendChild(row);',
    '    row.parentNode.insertBefore(wrap, row);\n    wrap.appendChild(row);\n\n    var sc = row.querySelector(\'.facet-scroll\') || row;' ],
  [ "    function update(){\n      var max = row.scrollWidth - row.clientWidth;\n      var canL = row.scrollLeft > 4;\n      var canR = row.scrollLeft < max - 4;\n      row.classList.toggle('fade-left', canL);\n      row.classList.toggle('fade-right', canR);\n      btnL.classList.toggle('visible', canL);\n      btnR.classList.toggle('visible', canR);\n    }\n    btnL.addEventListener('click', function(){ row.scrollBy({ left: -row.clientWidth * 0.7, behavior: 'smooth' }); });\n    btnR.addEventListener('click', function(){ row.scrollBy({ left: row.clientWidth * 0.7, behavior: 'smooth' }); });\n    row.addEventListener('scroll', update, { passive: true });",
    "    function update(){\n      var max = sc.scrollWidth - sc.clientWidth;\n      var canL = sc.scrollLeft > 4;\n      var canR = sc.scrollLeft < max - 4;\n      sc.classList.toggle('fade-left', canL);\n      sc.classList.toggle('fade-right', canR);\n      btnL.classList.toggle('visible', canL);\n      btnR.classList.toggle('visible', canR);\n    }\n    btnL.addEventListener('click', function(){ sc.scrollBy({ left: -sc.clientWidth * 0.7, behavior: 'smooth' }); });\n    btnR.addEventListener('click', function(){ sc.scrollBy({ left: sc.clientWidth * 0.7, behavior: 'smooth' }); });\n    sc.addEventListener('scroll', update, { passive: true });" ],
];

for (const [o,n] of edits){
  const c = s.split(o).length - 1;
  if (c !== 1){ console.error(`ABORT: an anchor matched ${c} times (expected 1). No changes written.`); process.exit(1); }
  s = s.replace(o,n);
}
writeFileSync('index.html', s);
console.log('Restructured facet rows: chips now scroll in their own region after the label.');