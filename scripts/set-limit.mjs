// set-limit.mjs — reliably set/update TAG_VISIBLE_LIMITS for a manifest's limit_key.
// Usage: node set-limit.mjs scripts/<manifest>.json
// Reads limit_key + visible_limit from the manifest and:
//   - updates the value if the key already exists
//   - inserts "<key>": <limit> before the closing } of TAG_VISIBLE_LIMITS if absent
import { readFileSync, writeFileSync } from 'node:fs';

const manifestPath = process.argv[2];
if (!manifestPath) { console.error('Usage: node set-limit.mjs <manifest.json>'); process.exit(1); }
const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
const key = m.limit_key;
const limit = m.visible_limit || 30;
if (!key) { console.error('ABORT: manifest has no limit_key'); process.exit(1); }

let s = readFileSync('index.html', 'utf8');

// locate the TAG_VISIBLE_LIMITS object literal
const startRe = /var TAG_VISIBLE_LIMITS = \{/;
const startM = s.match(startRe);
if (!startM) { console.error('ABORT: TAG_VISIBLE_LIMITS not found'); process.exit(1); }
const objStart = startM.index + startM[0].length - 1;         // index of the "{"
const objEnd = s.indexOf('}', objStart);                       // first "}" after it (flat object)
if (objEnd === -1) { console.error('ABORT: could not find end of TAG_VISIBLE_LIMITS'); process.exit(1); }
let block = s.slice(objStart, objEnd + 1);                      // "{ ...all entries... }"

const keyRe = new RegExp('(' + JSON.stringify(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:\\s*)\\d+');
if (keyRe.test(block)) {
  block = block.replace(keyRe, '$1' + limit);
  console.log(`Updated "${key}" -> ${limit}`);
} else {
  // insert before the closing brace, keeping it on the same line
  block = block.replace(/\s*\}$/, ', ' + JSON.stringify(key) + ': ' + limit + ' }');
  console.log(`Inserted "${key}": ${limit}`);
}

s = s.slice(0, objStart) + block + s.slice(objEnd + 1);
writeFileSync('index.html', s);

// verify
const after = readFileSync('index.html', 'utf8');
const check = after.match(new RegExp(JSON.stringify(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':\\s*\\d+'));
console.log('Now present:', check ? check[0] : 'NOT FOUND (something went wrong)');
