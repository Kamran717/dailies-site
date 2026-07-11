import { readFileSync, writeFileSync } from 'fs';
let lines = readFileSync('index.html', 'utf8').split('\n');
const re = /"tag-cameramove-rack-focus-\d+":/;
let first=-1,last=-1;
for(let i=0;i<lines.length;i++){ if(re.test(lines[i])){ if(first===-1)first=i; last=i; } }
if(first===-1){ console.error('rack-focus block not found'); process.exit(1); }
const eol = /\r$/.test(lines[first]) ? '\r' : '';
const indent = (lines[first].match(/^\s*/)||[''])[0].replace(/\r$/,'');
const clean=[];
for(let i=0;i<10;i++){ clean.push(`${indent}"tag-cameramove-rack-focus-${i}": "https://videos.aidirectorme.com/tag-cameramove-rack-focus-${i}.mp4",${eol}`); }
let out = lines.slice(0,first).concat(clean).concat(lines.slice(last+1)).join('\n');
out = out.replace(/(var TAG_VISIBLE_LIMITS = \{[^}]*?)(\s*\};)/, (m,a,b)=> /"Rack Focus"/.test(a)?m:a+', "Rack Focus": 10'+b);
writeFileSync('index.html', out);
console.log(`rack-focus: replaced ${last-first+1} lines -> 10 clean entries, limit 10`);
