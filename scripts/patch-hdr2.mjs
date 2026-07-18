import { readFileSync, writeFileSync } from 'fs';
let s = readFileSync('index.html', 'utf8');
const rep=[]; function must(c,m){ if(!c){ console.error('ABORT: '+m); process.exit(1); } }
const rOld = 'background:var(--amber); padding:5px 10px; border-radius:20px; white-space:nowrap; margin-right:6px;';
const rNew = 'background:var(--amber); padding:9px 14px; border-radius:3px; white-space:nowrap; margin-right:6px; font-weight:600; letter-spacing:.03em; text-transform:uppercase;';
must(s.includes(rOld),'balance reshape target'); s=s.replace(rOld,rNew); rep.push('1: casts box -> rectangle + category format');
const aOld = 'background:none; color:var(--ink-dim); border:1px solid var(--line);';
const aNew = 'background:none; color:var(--amber); border:1px solid var(--line);';
must(s.includes(aOld),'assets-btn target'); s=s.replace(aOld,aNew); rep.push('2: My assets text -> amber');
writeFileSync('index.html', s);
console.log(rep.join('\n'));