import { readFileSync, writeFileSync } from 'fs';
let s = readFileSync('index.html', 'utf8');
const rep = [];
function must(c,m){ if(!c){ console.error('ABORT: '+m); process.exit(1); } }
const cssAnchor = '  .aidm-auth-btn{ font-family:var(--ff-mono);';
must(s.includes(cssAnchor),'css anchor');
const css = `  .aidm-balance{ font-family:var(--ff-mono); font-size:11px; color:#1a1408; background:var(--amber); padding:5px 10px; border-radius:20px; white-space:nowrap; margin-right:6px; }
  #aidm-thanks-ov{ display:none; position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.72); align-items:center; justify-content:center; }
  #aidm-thanks-ov.open{ display:flex; }
  #aidm-thanks-card{ background:#141414; border:1px solid var(--line); border-radius:12px; padding:28px 30px; max-width:420px; width:90%; text-align:center; }
  #aidm-thanks-card h3{ margin:0 0 10px; font-size:20px; color:var(--ink); }
  #aidm-thanks-card p{ margin:0 0 20px; font-size:14px; line-height:1.6; color:var(--ink-dim); }
  #aidm-thanks-card .pw-cta{ width:100%; }
`;
s = s.replace(cssAnchor, css + cssAnchor); rep.push('1: pill + thanks CSS');
const thanksHtml = `<div id="aidm-thanks-ov"><div id="aidm-thanks-card">
  <h3>Payment complete</h3>
  <p id="aidm-thanks-msg">Your casts are ready \u2014 keep casting.</p>
  <button id="aidm-thanks-go" class="pw-cta">Keep casting</button>
</div></div>
</body>`;
must(s.includes('</body>'),'</body>'); s = s.replace('</body>', thanksHtml); rep.push('2: thanks overlay markup');
const ihOld = 'authWrap.innerHTML = \'<button class="aidm-assets-btn aidm-liked-btn">Liked</button><button class="aidm-assets-btn">My assets</button><span class="aidm-auth-email"></span><button class="aidm-auth-out">Sign out</button>\';';
const ihNew = 'authWrap.innerHTML = \'<span class="aidm-balance" id="aidm-balance" title="Casts available"></span><button class="aidm-assets-btn aidm-liked-btn">Liked</button><button class="aidm-assets-btn">My assets</button><span class="aidm-auth-email"></span><button class="aidm-auth-out">Sign out</button>\';';
must(s.includes(ihOld),'innerHTML'); s = s.replace(ihOld, ihNew);
const emOld = "authWrap.querySelector('.aidm-auth-email').textContent = currentUser.email || 'Account';";
const emNew = emOld + "\n        if(window.AIDM_refreshBalance) window.AIDM_refreshBalance();";
must(s.includes(emOld),'email line'); s = s.replace(emOld, emNew); rep.push('3: pill in header');
const gsOld = "sb.auth.getSession().then(function(r){ currentUser = r.data.session ? r.data.session.user : null; renderHeader(); });";
const gsNew = `function aidmRenderBalance(txt){ var el=document.getElementById('aidm-balance'); if(el) el.textContent=txt; }
    window.AIDM_refreshBalance = function(){
      if(!currentUser || !window.AIDM_SB){ aidmRenderBalance(''); return Promise.resolve(null); }
      return window.AIDM_SB.from('profiles').select('is_member,casts_used,cast_credits').eq('id', currentUser.id).single()
        .then(function(r){ var p=r&&r.data; if(!p){ aidmRenderBalance(''); return null; }
          if(p.is_member){ aidmRenderBalance('\\u2605 Member'); return { member:true, total:null }; }
          var free=Math.max(0,5-(p.casts_used||0)); var total=free+(p.cast_credits||0);
          aidmRenderBalance(total+(total===1?' cast':' casts')); return { free:free, credits:(p.cast_credits||0), total:total }; })
        .catch(function(){ aidmRenderBalance(''); return null; });
    };
    function aidmMaybeThanks(){
      try{ var params=new URLSearchParams(window.location.search);
        if(params.get('purchased')!=='1') return;
        var ov=document.getElementById('aidm-thanks-ov'), go=document.getElementById('aidm-thanks-go'), msg=document.getElementById('aidm-thanks-msg');
        function show(){ if(ov) ov.classList.add('open'); }
        if(window.AIDM_refreshBalance){ window.AIDM_refreshBalance().then(function(b){
          if(msg&&b&&b.total!=null){ msg.textContent='You\\u2019ve got '+b.total+' cast'+(b.total===1?'':'s')+' ready \\u2014 keep casting.'; }
          show(); }); } else { show(); }
        if(go) go.onclick=function(){ if(ov) ov.classList.remove('open'); };
        history.replaceState({}, '', window.location.pathname);
      }catch(e){}
    }
    sb.auth.getSession().then(function(r){ currentUser = r.data.session ? r.data.session.user : null; renderHeader(); aidmMaybeThanks(); });`;
must(s.includes(gsOld),'getSession'); s = s.replace(gsOld, gsNew); rep.push('4: balance fetch + thanks wired');
const cdOld = "if (window.AIDM_track) window.AIDM_track('cast_done', { seconds: Math.round((Date.now()-t_start)/1000), remaining: r.data.remaining });";
must(s.includes(cdOld),'cast_done'); s = s.replace(cdOld, cdOld + "\n        if(window.AIDM_refreshBalance) window.AIDM_refreshBalance();"); rep.push('5: refresh after cast');
const before = (s.match(/ Shot on Higgsfield/g)||[]).length;
s = s.split(' Shot on Higgsfield').join(' Shot on AiDirectorMe');
rep.push('6: hero rebranded ('+before+'x)');
writeFileSync('index.html', s);
console.log(rep.join('\n'));