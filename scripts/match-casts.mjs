import { readFileSync, writeFileSync } from 'fs';
let s = readFileSync('index.html', 'utf8');
const start = s.indexOf('.aidm-balance{');
if (start === -1) { console.error('ABORT: .aidm-balance not found'); process.exit(1); }
const end = s.indexOf('}', start);
if (end === -1) { console.error('ABORT: no closing brace'); process.exit(1); }
const newRule = '.aidm-balance{ font-family:var(--ff-mono); font-size:12px; font-weight:600; letter-spacing:.03em; text-transform:uppercase; background:none; color:var(--amber); border:1px solid var(--line); padding:9px 14px; white-space:nowrap; margin-right:6px; }';
s = s.slice(0, start) + newRule + s.slice(end + 1);
writeFileSync('index.html', s);
console.log('rewrote .aidm-balance to match My assets');
EOF