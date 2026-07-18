// scripts/fix-row-arrow.mjs
// Moves the left scroll arrow past the pinned facet label so it sits at the
// start of the chips, not on top of the label. Run: node scripts/fix-row-arrow.mjs
import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('index.html', 'utf8');
const oldStr = '.row-arrow-left{ left:-6px; }';
const newStr = '.row-arrow-left{ left:88px; }';
if (s.includes(newStr)) { console.log('Already fixed — nothing to do.'); process.exit(0); }
if ((s.split(oldStr).length - 1) !== 1) { console.error('ABORT: anchor not found exactly once.'); process.exit(1); }
writeFileSync('index.html', s.replace(oldStr, newStr));
console.log('Moved left row-arrow past the label (left:88px).');