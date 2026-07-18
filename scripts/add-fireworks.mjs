import { readFileSync, writeFileSync } from 'fs';
let s = readFileSync('index.html', 'utf8');
if (s.includes('AIDM_celebrate')) { console.error('ABORT: already added'); process.exit(1); }
if (!s.includes('</body>')) { console.error('ABORT: no </body>'); process.exit(1); }
const SCRIPT = `<script>
(function(){
  function celebrate(){
    var target = document.getElementById('aidm-balance');
    if(!target) return;
    var r = target.getBoundingClientRect();
    var cx = r.left + r.width/2, cy = r.top + r.height/2;
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:100000;';
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var colors = ['#ff4d4d','#ffa534','#ffe14d','#4dd964','#3d9bff','#8b5cf6','#ec4899'];
    var parts = [];
    function burst(x,y){
      for(var i=0;i<12;i++){
        var a = (Math.PI*2*i)/12 + Math.random()*0.3;
        var sp = 1.6 + Math.random()*2.4;
        parts.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,c:colors[(Math.random()*colors.length)|0]});
      }
    }
    burst(cx, cy);
    var bi = 1;
    var spawner = setInterval(function(){
      var ox = (Math.random()-0.5)*r.width*1.4;
      var oy = (Math.random()-0.5)*44 - 8;
      burst(cx+ox, cy+oy);
      if(++bi >= 4) clearInterval(spawner);
    }, 170);
    var start = Date.now();
    (function frame(){
      var t = Date.now()-start;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      for(var i=0;i<parts.length;i++){
        var p = parts[i];
        if(p.life<=0) continue;
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.05; p.vx*=0.98; p.vy*=0.98; p.life-=0.02;
        ctx.globalAlpha = Math.max(0,p.life);
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x,p.y,2.2,0,Math.PI*2); ctx.fill();
      }
      if(t < 1900) requestAnimationFrame(frame); else canvas.remove();
    })();
  }
  window.AIDM_celebrate = celebrate;
  function hook(){
    var go = document.getElementById('aidm-thanks-go');
    if(go) go.addEventListener('click', function(){ setTimeout(celebrate, 130); });
  }
  if(document.readyState !== 'loading') hook(); else document.addEventListener('DOMContentLoaded', hook);
})();
</script>
`;
s = s.replace('</body>', SCRIPT + '</body>');
writeFileSync('index.html', s);
console.log('fireworks celebration added');