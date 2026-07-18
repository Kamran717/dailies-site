import { readFileSync, writeFileSync } from 'fs';
let s = readFileSync('index.html', 'utf8');
const rep=[]; function must(c,m){ if(!c){ console.error('ABORT: '+m); process.exit(1); } }
if (s.includes('function aidmPrompt')) { console.error('ABORT: already added'); process.exit(1); }
const anchor='var HERO_PROMPT =';
must(s.includes(anchor),'HERO_PROMPT');
const helper = "function aidmPrompt(c){ if(!c) return ''; if(c.__meta && c.prompt) return c.prompt; var sh=c.shotType||'Cinematic shot'; var cm=(c.cameraMove||'static').toLowerCase(); var lt=c.lighting||'natural light'; return sh + ', ' + cm + '. ' + lt + ' lighting. Cinematic, shallow depth of field, natural motion blur, 24fps.'; }\n  ";
s=s.replace(anchor, helper+anchor); rep.push('1: aidmPrompt helper added');
const gc='var CLIPS = buildClips(84).concat(buildExpressionClips(84, 40)).concat(GENRE_CLIPS);';
must(s.includes(gc),'CLIPS concat');
s=s.replace(gc, 'GENRE_CLIPS.forEach(function(c){ c.__meta=true; });\n  '+gc); rep.push('2: genre clips flagged curated');
const d="document.getElementById('modalPrompt').textContent = currentClip.prompt;";
must(s.includes(d),'modal prompt line');
s=s.replace(d, "document.getElementById('modalPrompt').textContent = aidmPrompt(currentClip);"); rep.push('3: modal prompt -> honest');
const cp="copyText(currentClip.prompt, this)";
must(s.includes(cp),'copy line');
s=s.replace(cp, "copyText(aidmPrompt(currentClip), this)"); rep.push('4: copy prompt -> honest');
writeFileSync('index.html', s);
console.log(rep.join('\n'));