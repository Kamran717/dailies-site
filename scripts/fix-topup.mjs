// scripts/fix-topup.mjs — extend the topped-up collections to 10 clean root entries.
// Dynamic per-collection sizing is already installed, so no limit edits needed.
import { readFileSync, writeFileSync } from 'fs';
const TARGETS = [
  'tag-format-drone-aerial-camera','tag-format-gopro-action-pov','tag-format-security-cctv-camera',
  'tag-format-spherical-50mm-digital-cinema','tag-format-vintage-vhs-camcorder','tag-format-dashcam',
  'tag-format-selfie-vlogger-front-camera','tag-format-super-8-home-movie',
  'tag-cameramove-orbit-left','tag-cameramove-overhead-drop'
];
let lines = readFileSync('index.html','utf8').split('\n');
function rewrite(fullTag, count){
  const esc = fullTag.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re = new RegExp('"'+esc+'-\\d+":');
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
for(const t of TARGETS) report.push(`  ${t.padEnd(44)} ${rewrite(t,10)}`);
writeFileSync('index.html', lines.join('\n'));
console.log('extended to 10 entries:\n'+report.join('\n'));
