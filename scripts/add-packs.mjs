import { readFileSync, writeFileSync } from 'fs';
let s = readFileSync('index.html', 'utf8');
const report = [];
const cssAnchor = '  #aidm-paywall .pw-fine{';
const packCss =
`  #aidm-paywall .pw-packs{ display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:0 0 14px; }
  #aidm-paywall .pw-pack{ position:relative; display:flex; flex-direction:column; align-items:flex-start; gap:3px;
    background:transparent; border:1px solid var(--line); border-radius:8px; padding:12px 14px; cursor:pointer;
    transition:border-color .15s, background .15s; font-family:inherit; text-align:left; }
  #aidm-paywall .pw-pack:hover:not(:disabled){ border-color:var(--amber); background:rgba(232,163,61,.06); }
  #aidm-paywall .pw-pack b{ color:var(--ink); font-size:15px; }
  #aidm-paywall .pw-pack span{ color:var(--amber); font-family:var(--ff-mono); font-size:13px; }
  #aidm-paywall .pw-pack em{ position:absolute; top:8px; right:8px; font-style:normal; font-family:var(--ff-mono);
    font-size:8px; letter-spacing:.12em; text-transform:uppercase; color:#1a1408; background:var(--amber); padding:1px 5px; border-radius:8px; }
  #aidm-paywall .pw-pack-best{ border-color:var(--amber-dim); }
  #aidm-paywall .pw-pack:disabled{ opacity:.5; cursor:default; }
`;
if (s.includes('.pw-packs{')) { report.push('CSS: already present'); }
else if (s.includes(cssAnchor)) { s = s.replace(cssAnchor, packCss + cssAnchor); report.push('CSS: inserted'); }
else { console.error('ABORT: css anchor not found'); process.exit(1); }
const mkStart = '      <ul class="pw-list">';
const iStart = s.indexOf(mkStart);
const iEnd = s.indexOf('no charge, no card.</p>');
if (iStart === -1 || iEnd === -1) { console.error('ABORT: markup block not found'); process.exit(1); }
const blockEnd = s.indexOf('</p>', iEnd) + 4;
const newMarkup =
`      <div class="pw-packs">
        <button class="pw-pack" data-pack="starter"><b>5 casts</b><span>$3.25</span></button>
        <button class="pw-pack" data-pack="standard"><b>10 casts</b><span>$6.40</span></button>
        <button class="pw-pack" data-pack="value"><b>20 casts</b><span>$12.25</span></button>
        <button class="pw-pack pw-pack-best" data-pack="best"><b>50 casts</b><span>$29.99</span><em>Best value</em></button>
      </div>
      <p class="pw-fine" id="aidm-pw-note">Secure checkout via Stripe &mdash; casts never expire. Unlimited monthly &amp; 10-second clips coming soon.</p>`;
s = s.slice(0, iStart) + newMarkup + s.slice(blockEnd);
report.push('Markup: pack grid installed');
const jsAnchor =
`    if (window.AIDM_track) window.AIDM_track('membership_interest', {
      from: 'paywall',
      prompt: scenePrompt.slice(0,200)
    });
  });`;
const buyJs = `

  function aidmBuyPack(pack, btn){
    getAccessToken().then(function(token){
      var note = $('aidm-pw-note');
      if (!token){ if (note) note.textContent = 'Please sign in to buy casts.'; return; }
      if (btn) btn.disabled = true;
      if (note) note.textContent = 'Opening secure checkout\\u2026';
      postJSON('/api/create-checkout', { pack: pack }, { Authorization: 'Bearer ' + token })
        .then(function(r){
          if (r.data && r.data.url){ window.location.href = r.data.url; return; }
          if (btn) btn.disabled = false;
          if (note) note.textContent = (r.data && r.data.error) ? r.data.error : 'Could not start checkout. Try again.';
        })
        .catch(function(){
          if (btn) btn.disabled = false;
          if (note) note.textContent = 'Network error. Try again.';
        });
    });
  }
  var pwPacks = document.querySelector('#aidm-paywall .pw-packs');
  if (pwPacks) pwPacks.addEventListener('click', function(e){
    var b = e.target.closest ? e.target.closest('.pw-pack') : null;
    if (b && b.getAttribute('data-pack')) aidmBuyPack(b.getAttribute('data-pack'), b);
  });`;
if (!s.includes(jsAnchor)) { console.error('ABORT: js anchor not found'); process.exit(1); }
s = s.replace(jsAnchor, jsAnchor + buyJs);
report.push('JS: buy handler wired');
writeFileSync('index.html', s);
console.log(report.join('\n'));