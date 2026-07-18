import { readFileSync, writeFileSync } from 'fs';
let s = readFileSync('index.html', 'utf8');
if (!s.includes('AIDM_celebrate')) { console.error('ABORT: fireworks code not present (run add-fireworks first)'); process.exit(1); }
if (s.includes('AIDM_purchaseCelebrate')) { console.error('ABORT: already added'); process.exit(1); }
if (!s.includes('</body>')) { console.error('ABORT: no </body>'); process.exit(1); }
const SCRIPT = `<script>
(function(){
  function onReturn(){
    try{
      var params = new URLSearchParams(window.location.search);
      if(params.get('purchased') !== '1') return;
      var tries = 0;
      var iv = setInterval(function(){
        tries++;
        var box = document.getElementById('aidm-balance');
        var ready = box && box.getBoundingClientRect().width > 0;
        if(ready){
          clearInterval(iv);
          if(window.AIDM_refreshBalance){ try{ window.AIDM_refreshBalance(); }catch(e){} }
          setTimeout(function(){ if(window.AIDM_celebrate) window.AIDM_celebrate(); }, 500);
        } else if(tries > 40){ clearInterval(iv); }
      }, 150);
    }catch(e){}
  }
  window.AIDM_purchaseCelebrate = onReturn;
  if(document.readyState !== 'loading') onReturn(); else document.addEventListener('DOMContentLoaded', onReturn);
})();
</script>
`;
s = s.replace('</body>', SCRIPT + '</body>');
writeFileSync('index.html', s);
console.log('fireworks now fire on ?purchased=1 return');