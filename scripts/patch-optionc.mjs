import { readFileSync, writeFileSync } from 'fs';
let s = readFileSync('index.html', 'utf8');
const rep = [];
function must(c,m){ if(!c){ console.error('ABORT: '+m); process.exit(1); } }
const openTag = '<div id="aidm-paywall">';
must(s.includes(openTag), 'paywall open tag');
must(!s.includes('pw-topbar'), 'already patched');
s = s.replace(openTag, openTag + '<div class="pw-topbar"></div>');
rep.push('A: gradient top bar added');
const cssAnchor = '  #aidm-paywall #aidm-pw-proceed:disabled{ opacity:.5; }';
must(s.includes(cssAnchor), 'css anchor');
const css = cssAnchor + `
  #aidm-paywall .pw-topbar{ height:3px; margin:0 -24px 18px; background:linear-gradient(90deg,#3d9bff,#8b5cf6,#ec4899); border-radius:2px; }
  #aidm-paywall .pw-pack{ border-color:#3a3a3a; }
  #aidm-paywall .pw-pack.pw-sel{ border-color:#8b5cf6; background:linear-gradient(180deg,rgba(139,92,246,.16),rgba(61,155,255,.06)); box-shadow:inset 0 0 0 1px #8b5cf6, 0 0 18px rgba(139,92,246,.20); }
  #aidm-paywall .pw-pack em{ background:linear-gradient(90deg,#3d9bff,#8b5cf6,#ec4899); color:#fff; }`;
s = s.replace(cssAnchor, css);
rep.push('B: gradient CSS (topbar, purple-select, gradient BEST tag)');
writeFileSync('index.html', s);
console.log(rep.join('\n'));