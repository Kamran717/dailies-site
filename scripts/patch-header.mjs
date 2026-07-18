import { readFileSync, writeFileSync } from 'fs';
let s = readFileSync('index.html', 'utf8');
const rep=[]; function must(c,m){ if(!c){ console.error('ABORT: '+m); process.exit(1); } }
const pOld='font-size:11px; color:#1a1408; background:var(--amber);';
const pNew='font-size:11px; color:#1746c4; background:var(--amber);';
must(s.includes(pOld),'pill css'); s=s.replace(pOld,pNew); rep.push('1: pill text blue');
const bOld='<button class="aidm-assets-btn aidm-liked-btn">Liked</button>';
must(s.includes(bOld),'liked button'); s=s.replace(bOld,''); rep.push('2: liked button removed from header');
const hOld="        authWrap.querySelector('.aidm-liked-btn').onclick = function(){\n          if (window.AIDM_openLiked) window.AIDM_openLiked();\n        };\n";
must(s.includes(hOld),'liked handler'); s=s.replace(hOld,''); rep.push('3a: liked handler removed');
const iOld="authWrap.querySelectorAll('.aidm-assets-btn')[1].onclick";
const iNew="authWrap.querySelector('.aidm-assets-btn').onclick";
must(s.includes(iOld),'assets index'); s=s.replace(iOld,iNew); rep.push('3b: my-assets selector fixed');
const gOld='<div id="aidm-as-grid"></div>';
const gNew='<button id="aidm-as-liked" class="aidm-assets-btn aidm-liked-btn" style="margin:0 0 14px;" onclick="document.getElementById(\'aidm-as-close\').click(); if(window.AIDM_openLiked) window.AIDM_openLiked();">Liked</button>\n    ' + gOld;
must(s.includes(gOld),'assets grid'); s=s.replace(gOld,gNew); rep.push('4: Liked button added inside My assets');
writeFileSync('index.html', s);
console.log(rep.join('\n'));