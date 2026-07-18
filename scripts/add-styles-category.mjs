// scripts/add-styles-category.mjs
// Adds a new "Styles" facet category (first row) with 20 fixed sub-category chips.
// Run from repo root: node scripts/add-styles-category.mjs
import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('index.html', 'utf8');

if (!s.includes('.facet-scroll{')) { console.error('ABORT: run the facet-row restructure first.'); process.exit(1); }
if (s.includes('data-facet="style"')) { console.log('Already added — nothing to do.'); process.exit(0); }

const STYLE_CHIPS_SRC =
  '  var STYLE_CHIPS = [\n'
+ '    "Cinematic","Realistic","Hyperrealistic","Anime","Cartoon","Pixar-style","3D CGI",\n'
+ '    "Sci-Fi","Cyberpunk","Fantasy","Ghibli-inspired","Comic Book","Digital Painting",\n'
+ '    "Watercolor","Sketch","Clay Animation","Pixel Art","Luxury Commercial","Minimalist","Documentary"\n'
+ '  ];\n';

const edits = [
  [ '  <div class="facet-rail">\n    <div class="facet-row" data-facet="cameraMove"><span class="facet-label">Camera</span></div>',
    '  <div class="facet-rail">\n    <div class="facet-row" data-facet="style"><span class="facet-label">Styles</span></div>\n    <div class="facet-row" data-facet="cameraMove"><span class="facet-label">Camera</span></div>' ],
  [ '    "Reflection Shot","Frame Within a Frame","Snorricam","Split Diopter","Through the Keyhole"\n  ];\n',
    '    "Reflection Shot","Frame Within a Frame","Snorricam","Split Diopter","Through the Keyhole"\n  ];\n\n' + STYLE_CHIPS_SRC ],
  [ "    var values = unique(facetKey);\n    if (facetKey === 'shotType'){ values = values.concat(EXTRA_SHOT_CHIPS); }",
    "    var values = (facetKey === 'style') ? STYLE_CHIPS.slice() : unique(facetKey);\n    if (facetKey === 'shotType'){ values = values.concat(EXTRA_SHOT_CHIPS); }" ],
  [ "  ['cameraMove','shotType','emotion','lighting','format'].forEach(buildFacetRow);",
    "  ['style','cameraMove','shotType','emotion','lighting','format'].forEach(buildFacetRow);" ],
];
for (const [o,n] of edits){
  const c = s.split(o).length - 1;
  if (c !== 1){ console.error(`ABORT: an anchor matched ${c} times (expected 1). No changes written.`); process.exit(1); }
  s = s.replace(o,n);
}
writeFileSync('index.html', s);
console.log('Added Styles category with 20 sub-category chips.');
