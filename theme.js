/* Theme switcher ("worlds"), hero parallax tilt, and the shareable "Now Jamming" card. */
(function(){
  const $=id=>document.getElementById(id);
  const WORLDS=['truck','cinema','loom','basera'];
  const WORLD_NAMES={truck:'TRUCK ART',cinema:'CINEMA DHABA',loom:'PHULKARI LOOM',basera:'BASERA NIGHT'};

  function initTheme(){
    const saved=(()=>{try{return localStorage.getItem('pr_theme')}catch(e){return null}})()||'truck';
    applyTheme(saved,false);
    document.querySelectorAll('.world-btn').forEach(btn=>{
      btn.addEventListener('click',()=>applyTheme(btn.dataset.world,true));
    });
  }
  function applyTheme(world,persist){
    if(!WORLDS.includes(world))world='truck';
    document.documentElement.dataset.theme=world;
    document.querySelectorAll('.world-btn').forEach(b=>{
      const active=b.dataset.world===world;
      b.classList.toggle('active',active);
      b.setAttribute('aria-pressed',String(active));
    });
    const worldName=document.getElementById('worldName');
    if(worldName)worldName.textContent=WORLD_NAMES[world];
    if(persist){
      try{localStorage.setItem('pr_theme',world)}catch(e){}
      // reflect the choice in the URL so a themed link can be shared/bookmarked
      try{
        const url=new URL(location.href);
        url.hash='world='+world;
        history.replaceState(null,'',url);
      }catch(e){}
    }
  }
  // allow #world=cinema style deep links to preselect a theme on load
  (function readHash(){
    const m=/world=([a-z]+)/.exec(location.hash);
    if(m && WORLDS.includes(m[1])){
      try{localStorage.setItem('pr_theme',m[1])}catch(e){}
      document.documentElement.dataset.theme=m[1];
    }
  })();

  // ---- parallax tilt on the kinetic hero title (desktop pointer only) ----
  function initParallax(){
    const wrap=document.querySelector('.kinetic-wrap');
    const tilt=$('kineticTilt');
    if(!wrap||!tilt || !window.matchMedia('(hover:hover) and (pointer:fine)').matches)return;
    let raf=null;
    wrap.addEventListener('mousemove',e=>{
      const r=wrap.getBoundingClientRect();
      const px=(e.clientX-r.left)/r.width-0.5;
      const py=(e.clientY-r.top)/r.height-0.5;
      if(raf)cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        tilt.style.transform=`rotateX(${(-py*10).toFixed(2)}deg) rotateY(${(px*14).toFixed(2)}deg)`;
      });
    });
    wrap.addEventListener('mouseleave',()=>{
      if(raf)cancelAnimationFrame(raf);
      tilt.style.transform='rotateX(0deg) rotateY(0deg)';
    });
  }

  // ---- shareable "Now Jamming" card (canvas-rendered, downloadable / Web-Share-able) ----
  function themeColors(){
    const cs=getComputedStyle(document.documentElement);
    const v=n=>cs.getPropertyValue(n).trim();
    return {night:'#0a0612',night2:'#150c24',marigold:v('--gold'),gulabi:v('--coral'),peacock:v('--teal'),zafran:v('--orange'),chrome:v('--txt')};
  }
  async function buildShareCard(title,artist){
    const W=1080,H=1350;
    const c=document.createElement('canvas');c.width=W;c.height=H;
    const ctx=c.getContext('2d');
    const col=themeColors();
    const grad=ctx.createLinearGradient(0,0,W,H);
    grad.addColorStop(0,col.night2);grad.addColorStop(1,col.night);
    ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    // corner rivets / frame
    ctx.strokeStyle=col.marigold;ctx.lineWidth=6;ctx.strokeRect(40,40,W-80,H-80);
    ctx.fillStyle=col.peacock;
    [[60,60],[W-60,60],[60,H-60],[W-60,H-60]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,10,0,7);ctx.fill()});
    try{await document.fonts.load('700 60px Bungee');await document.fonts.load('600 34px Outfit')}catch(e){}
    ctx.fillStyle=col.marigold;
    ctx.font='700 32px Outfit, sans-serif';
    ctx.fillText('NOW JAMMING', 90, 200);
    ctx.fillStyle=col.chrome;
    wrapText(ctx,title.toUpperCase(),90,340,W-180,84,'70px Bungee, cursive');
    ctx.fillStyle=col.peacock;
    ctx.font='600 40px Outfit, sans-serif';
    ctx.fillText(artist, 90, H-220);
    ctx.fillStyle=col.gulabi;
    ctx.font='700 28px Outfit, sans-serif';
    ctx.fillText('PUNJABI WAVE', 90, H-120);
    ctx.fillStyle=col.chrome;
    ctx.globalAlpha=.65;
    ctx.font='500 22px Outfit, sans-serif';
    ctx.fillText('Hindi & Punjabi Hits 2024-2026', 90, H-80);
    ctx.globalAlpha=1;
    return c;
  }
  function wrapText(ctx,text,x,y,maxWidth,lineHeight,font){
    ctx.font=font;
    const words=text.split(' ');let line='',lines=[];
    for(const w of words){
      const test=line?line+' '+w:w;
      if(ctx.measureText(test).width>maxWidth && line){lines.push(line);line=w}else{line=test}
    }
    lines.push(line);
    lines.slice(0,3).forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));
  }
  function showToast(msg){
    const t=$('shareToast');if(!t)return;
    if(msg)t.textContent=msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer=setTimeout(()=>t.classList.remove('show'),2600);
  }
  async function handleShare(){
    const titleEl=$('playerTitle'),metaEl=$('playerMeta');
    const title=(titleEl?.textContent||'Punjabi Wave').trim();
    const meta=(metaEl?.textContent||'').trim();
    if(!title || title==='SELECT A SONG'){showToast('Play a song first, then share it ✦');return}
    try{
      const canvas=await buildShareCard(title,meta);
      canvas.toBlob(async blob=>{
        if(!blob)return;
        const file=new File([blob],'now-jamming.png',{type:'image/png'});
        if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
          try{await navigator.share({files:[file],title:'Now Jamming',text:`${title} — ${meta}`});return}catch(e){/* fall through to download */}
        }
        const a=document.createElement('a');
        a.href=URL.createObjectURL(blob);a.download='now-jamming.png';a.click();
        showToast('Card downloaded ✦ share it anywhere');
      },'image/png');
    }catch(e){showToast("Couldn't build the card — try again")}
  }

  document.addEventListener('DOMContentLoaded',()=>{
    initTheme();
    initParallax();
    $('shareBtn')?.addEventListener('click',handleShare);
  });
})();
