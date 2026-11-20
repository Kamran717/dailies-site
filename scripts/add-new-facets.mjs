// scripts/add-new-facets.mjs
// Adds seven new sidebar categories: Use Case, Scene Beats, Transitions,
// Speed & Time, Lens & Focus, Weather & Atmosphere, Era.
// Like every facet, a chip only shows once it has real clips wired
// (REAL_TAG_META ids "tag-<facet>-<chip-slug>-<n>"), so the full chip lists
// can ship now and fill in collection by collection.
// Run from repo root: node scripts/add-new-facets.mjs
import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('index.html', 'utf8');

if (s.includes('var USECASE_CHIPS')) { console.log('Already added — nothing to do.'); process.exit(0); }

const NEW_CHIPS =
  '  // Scene-level categories (Nov 2026). Facet keys are single lowercase words\n'
+ '  // so clip ids stay "tag-<facet>-<chip>-<n>". Chips appear once wired.\n'
+ '  var USECASE_CHIPS = ["Product Ad","Music Video","Movie Trailer","Real Estate","Vertical Social","Title Sequence","Food","Fashion"];\n'
+ '  var BEAT_CHIPS = ["Walk and Talk","Chase","Fight","The Reveal","Arrival","Confrontation","Dance","The Fall","Explosion","Escape"];\n'
+ '  var TRANSITION_CHIPS = ["Match Cut","Whip Transition","Smash Cut","Morph Transition","Light-Leak Wipe","Object Wipe","Zoom-Through","Seamless Loop"];\n'
+ '  var SPEED_CHIPS = ["Slow Motion","Speed Ramp","Time-Lapse","Hyperlapse","Reverse Motion","Freeze Frame","Stop-Motion Stutter"];\n'
+ '  var LENS_CHIPS = ["Rack Focus","Shallow Depth of Field","Tilt-Shift","Fisheye","Macro","Lens Flare"];\n'
+ '  var WEATHER_CHIPS = ["Rain","Fog","Snow","Dust Storm","Smoke","Haze","Underwater","Heat Shimmer"];\n'
+ '  var ERA_CHIPS = ["1920s","1950s","1980s","Victorian","Medieval","Near Future"];\n'
+ '  var CHIP_LISTS = { usecase: USECASE_CHIPS, beat: BEAT_CHIPS, transition: TRANSITION_CHIPS, speed: SPEED_CHIPS, lens: LENS_CHIPS, weather: WEATHER_CHIPS, era: ERA_CHIPS };\n\n';

const edits = [
  // 1. chip lists, just before the sidebar labels
  [ '  // Left sidebar: main categories as an accordion.',
    NEW_CHIPS + '  // Left sidebar: main categories as an accordion.' ],
  // 2. sidebar labels
  [ "    emotion: 'Emotion', lighting: 'Light', impossible: 'Impossible', format: 'Format'\n  };",
    "    emotion: 'Emotion', lighting: 'Light', impossible: 'Impossible', format: 'Format',\n"
  + "    usecase: 'Use Case', beat: 'Scene Beats', transition: 'Transitions', speed: 'Speed & Time',\n"
  + "    lens: 'Lens & Focus', weather: 'Weather', era: 'Era'\n  };" ],
  // 3. chip values for the new facets
  [ "    var values = (facetKey === 'style') ? STYLE_CHIPS.slice() :",
    "    var values = CHIP_LISTS[facetKey] ? CHIP_LISTS[facetKey].slice() : (facetKey === 'style') ? STYLE_CHIPS.slice() :" ],
  // 4. sidebar order: what you're making first, then camera language, then look
  [ "    ['style','genre','cameraMove','shotType','emotion','lighting','impossible','format'].forEach(function(facetKey){",
    "    ['style','genre','usecase','beat','cameraMove','shotType','transition','speed','lens','emotion','lighting','weather','era','impossible','format'].forEach(function(facetKey){" ],
  // 5. band label = the chip name, as genre does
  [ '    if (facetKey === "genre") bandLabel = tagValue;',
    '    if (facetKey === "genre" || ["usecase","beat","transition","speed","lens","weather","era"].indexOf(facetKey) !== -1) bandLabel = tagValue;' ],
];
for (const [o, n] of edits) {
  const c = s.split(o).length - 1;
  if (c !== 1) { console.error(`ABORT: an anchor matched ${c} times (expected 1). No changes written.\n  ${o.slice(0, 90)}`); process.exit(1); }
  s = s.replace(o, n);
}
writeFileSync('index.html', s);
console.log('Added 7 new categories (53 chips). Chips appear as clips are wired.');
