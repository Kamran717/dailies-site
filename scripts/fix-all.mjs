// scripts/fix-all.mjs — batch-rewire every collection in the manifest to clean root
// URLs, trimmed to real clip count, and make each collection auto-size to its footage.
import { readFileSync, writeFileSync } from 'fs';
const manifest = JSON.parse(readFileSync(new URL('./remap-manifest.json', import.meta.url), 'utf8'));
let s = readFileSync('index.html', 'utf8');

// 1) Make the per-collection visible limit auto-size to real REAL_VIDEOS entries.
const oldLimit = 'var visibleLimit = TAG_VISIBLE_LIMITS[tagValue] || 10;';
const newLimit = 'var __pfx = "tag-" + slugify(facetKey) + "-" + slugify(tagValue) + "-"; var __rc = 0; while (REAL_VIDEOS[__pfx + __rc]) __rc++; var visibleLimit = __rc > 0 ? __rc : (TAG_VISIBLE_LIMITS[tagValue] || 10);';
if (!s.includes(oldLimit)) { console.error('ABORT: visibleLimit line not found'); process.exit(1); }
s = s.replace(oldLimit, newLimit);

// 2) Rewrite each collection's REAL_VIDEOS block -> N clean root entries.
let lines = s.split('\n');
function rewrite(fullTag, count){
  const esc = fullTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('"' + esc + '-\\d+":');
  let first=-1,last=-1;
  for(let i=0;i<lines.length;i++){ if(re.test(lines[i])){ if(first===-1)first=i; last=i; } }
  if(first===-1) return 'NOT-FOUND';
  const eol=/\r$/.test(lines[first])?'\r':'';
  const indent=(lines[first].match(/^\s*/)||[''])[0].replace(/\r$/,'');
  const clean=[];
  for(let i=0;i<count;i++) clean.push(`${indent}"${fullTag}-${i}": "https://videos.aidirectorme.com/${fullTag}-${i}.mp4",${eol}`);
  const removed=last-first+1;
  lines = lines.slice(0,first).concat(clean).concat(lines.slice(last+1));
  return `${removed} -> ${count}`;
}
const report=[];
for(const [tag,count] of Object.entries(manifest)) report.push(`  ${tag.padEnd(42)} ${rewrite(tag,count)}`);
writeFileSync('index.html', lines.join('\n'));
console.log('visible-limit made dynamic; collections rewritten:\n' + report.join('\n'));
