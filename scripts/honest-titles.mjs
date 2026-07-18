import { readFileSync, writeFileSync } from 'fs';
let s = readFileSync('index.html', 'utf8');
const rep=[]; function must(c,m){ if(!c){ console.error('ABORT: '+m); process.exit(1); } }
if (s.includes('function aidmTitle')) { console.error('ABORT: already added'); process.exit(1); }
const anchor='function aidmPrompt(c){';
must(s.includes(anchor),'aidmPrompt anchor');
const helper="function aidmTitle(c){ if(!c) return ''; if(c.__meta && c.title) return c.title; return (c.shotType||'Cinematic shot') + ' \\u00b7 ' + (c.lighting||'natural light'); }\n  ";
s=s.replace(anchor, helper+anchor); rep.push('1: aidmTitle helper added');
const mOld="document.getElementById('modalTitle').textContent = (currentClip.title || currentClip.emotion) + (currentClip.__meta ? '' : ' \\u2014 ' + currentClip.setting);";
const mNew="document.getElementById('modalTitle').textContent = aidmTitle(currentClip);";
must(s.includes(mOld),'modal title line'); s=s.replace(mOld,mNew); rep.push('2: modal title -> honest');
const cOld="'<div class=\"cap-line\"><b>' + (clip.title || clip.emotion) + '</b>' + (clip.__meta ? '' : ' \\u00b7 ' + clip.action) + '</div>' +";
const cNew="'<div class=\"cap-line\"><b>' + aidmTitle(clip) + '</b></div>' +";
must(s.includes(cOld),'card caption line'); s=s.replace(cOld,cNew); rep.push('3: card caption -> honest');
writeFileSync('index.html', s);
console.log(rep.join('\n'));