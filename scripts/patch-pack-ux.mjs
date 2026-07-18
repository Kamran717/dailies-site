import { readFileSync, writeFileSync } from 'fs';
let s = readFileSync('index.html', 'utf8');
const rep = [];
function must(cond, msg){ if(!cond){ console.error('ABORT: '+msg); process.exit(1); } }
const packMap = [
  ['<button class="pw-pack" data-pack="starter"><b>5 casts</b><span>$3.25</span></button>',
   '<button class="pw-pack" data-pack="starter"><b>5 casts</b><span>$3.25 <i>($0.65/cast)</i></span></button>'],
  ['<button class="pw-pack" data-pack="standard"><b>10 casts</b><span>$6.40</span></button>',
   '<button class="pw-pack" data-pack="standard"><b>10 casts</b><span>$6.40 <i>($0.64/cast)</i></span></button>'],
  ['<button class="pw-pack" data-pack="value"><b>20 casts</b><span>$12.25</span></button>',
   '<button class="pw-pack" data-pack="value"><b>20 casts</b><span>$12.25 <i>($0.61/cast)</i></span></button>'],
  ['<button class="pw-pack pw-pack-best" data-pack="best"><b>50 casts</b><span>$29.99</span><em>Best value</em></button>',
   '<button class="pw-pack pw-pack-best" data-pack="best"><b>50 casts</b><span>$29.99 <i>($0.60/cast)</i></span><em>Best value</em></button>'],
];
for (const [oldB, newB] of packMap){ must(s.includes(oldB), 'pack button not found'); s = s.replace(oldB, newB); }
rep.push('A: per-cast breakdowns added');
const oldNote = '<p class="pw-fine" id="aidm-pw-note">Secure checkout via Stripe &mdash; casts never expire. Unlimited monthly &amp; 10-second clips coming soon.</p>';
const newBlock = '<button class="pw-cta" id="aidm-pw-proceed" disabled>Select a pack</button>\n      <p class="pw-fine" id="aidm-pw-note">All sales final &mdash; casts are non-refundable. Secure checkout via Stripe; casts never expire.</p>';
must(s.includes(oldNote), 'note line not found'); s = s.replace(oldNote, newBlock);
rep.push('B: proceed button + disclaimer added');
const cssAnchor = '  #aidm-paywall .pw-pack:disabled{ opacity:.5; cursor:default; }';
const newCss = cssAnchor + `
  #aidm-paywall .pw-pack span i{ font-style:normal; color:var(--ink-dim); font-size:11px; }
  #aidm-paywall .pw-pack.pw-sel{ border-color:var(--amber); background:rgba(232,163,61,.14); box-shadow:inset 0 0 0 1px var(--amber); }
  #aidm-paywall #aidm-pw-proceed{ width:100%; margin:2px 0 10px; }
  #aidm-paywall #aidm-pw-proceed:disabled{ opacity:.5; }`;
must(s.includes(cssAnchor), 'css anchor not found'); s = s.replace(cssAnchor, newCss);
rep.push('C: selection + proceed CSS added');
const oldJs = `  var pwPacks = document.querySelector('#aidm-paywall .pw-packs');
  if (pwPacks) pwPacks.addEventListener('click', function(e){
    var b = e.target.closest ? e.target.closest('.pw-pack') : null;
    if (b && b.getAttribute('data-pack')) aidmBuyPack(b.getAttribute('data-pack'), b);
  });`;
const newJs = `  var pwSelected = null;
  var pwPacks = document.querySelector('#aidm-paywall .pw-packs');
  var pwProceed = $('aidm-pw-proceed');
  if (pwPacks) pwPacks.addEventListener('click', function(e){
    var b = e.target.closest ? e.target.closest('.pw-pack') : null;
    if (!b || !b.getAttribute('data-pack')) return;
    var all = pwPacks.querySelectorAll('.pw-pack');
    for (var i=0;i<all.length;i++) all[i].classList.remove('pw-sel');
    b.classList.add('pw-sel');
    pwSelected = b.getAttribute('data-pack');
    if (pwProceed){ pwProceed.disabled = false; pwProceed.textContent = 'Proceed to payment'; }
  });
  if (pwProceed) pwProceed.addEventListener('click', function(){
    if (pwSelected) aidmBuyPack(pwSelected, pwProceed);
  });`;
must(s.includes(oldJs), 'pack JS handler not found'); s = s.replace(oldJs, newJs);
rep.push('D: select-then-proceed handler wired');
writeFileSync('index.html', s);
console.log(rep.join('\n'));