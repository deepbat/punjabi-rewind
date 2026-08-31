/* LIVE MODE — full-screen, beat-synced generative visualizer.
   No raw audio access is possible from a cross-origin YouTube iframe, so the
   "beat" is a simulated groove: a deterministic per-song pattern driven by
   wall-clock time. Reads the live palette so it always matches the deck. */
(function(){
  const $=id=>document.getElementById(id);
  let canvas,ctx,raf=null,active=false,paused=false;
  let startedAt=0,pausedAt=0,pausedTotal=0;
  let particles=[],rings=[];
  let wasPlayingBeforePause=false;
  let lastSubIndex=-1;

  function colors(){
    const cs=getComputedStyle(document.documentElement);
    const v=n=>cs.getPropertyValue(n).trim();
    return {ink:v('--ink'),metal2:v('--metal-2'),marigold:v('--marigold'),crimson:v('--crimson'),cobalt:v('--cobalt'),emerald:v('--emerald'),paper:v('--paper')};
  }

  function patternFor(index){
    const v=index%4;
    const kicks=[0,8].concat(v>=2?[12]:[]);
    const snares=[4,12];
    const hats=[2,6,10,14].concat(v%2===0?[0,8]:[]);
    return {kicks,snares,hats};
  }

  function resize(){
    if(!canvas)return;
    const dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=window.innerWidth*dpr;
    canvas.height=window.innerHeight*dpr;
    canvas.style.width=window.innerWidth+'px';
    canvas.style.height=window.innerHeight+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function spawnKick(){
    const col=colors();
    rings.push({x:window.innerWidth/2,y:window.innerHeight*0.5,r:20,alpha:.9,color:[col.marigold,col.crimson,col.cobalt][Math.floor(Math.random()*3)],speed:9+Math.random()*3});
  }
  function spawnSnare(){
    const col=colors();
    const cx=window.innerWidth/2,cy=window.innerHeight*0.5;
    const n=14;
    for(let i=0;i<n;i++){
      const a=(Math.PI*2*i)/n+Math.random()*.3;
      const speed=2.5+Math.random()*4.5;
      particles.push({x:cx,y:cy,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-1.5,r:2+Math.random()*3,alpha:1,
        color:[col.cobalt,col.emerald,col.paper][Math.floor(Math.random()*3)],grav:.06});
    }
  }
  function spawnHat(){
    const col=colors();
    particles.push({
      x:Math.random()*window.innerWidth, y:window.innerHeight*(0.1+Math.random()*0.5),
      vx:0,vy:.3, r:1+Math.random()*1.6, alpha:.8, color:col.marigold, grav:0, twinkle:true
    });
  }

  function tick(now){
    if(!active||paused)return;
    const el=now-startedAt-pausedTotal;
    const np=(window.__nowPlaying&&window.__nowPlaying())||{title:'—',artist:'',beatMs:900};
    const beatMs=np.beatMs||900;
    const step=beatMs/4;
    const subIndex=Math.floor(el/step)%16;
    if(subIndex!==lastSubIndex){
      lastSubIndex=subIndex;
      const pat=patternFor(np.index||0);
      if(pat.kicks.includes(subIndex))spawnKick();
      if(pat.snares.includes(subIndex))spawnSnare();
      if(pat.hats.includes(subIndex))spawnHat();
    }
    draw();
    raf=requestAnimationFrame(tick);
  }

  function draw(){
    const col=colors();
    const w=window.innerWidth,h=window.innerHeight;
    ctx.fillStyle=col.ink;
    ctx.fillRect(0,0,w,h);
    const g=ctx.createRadialGradient(w/2,h*0.5,10,w/2,h*0.5,Math.max(w,h)*0.6);
    g.addColorStop(0,hexA(col.metal2,.9));g.addColorStop(1,hexA(col.ink,0));
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);

    // slow rotating dial sweep — echoes the tuner's frequency face
    ctx.save();
    ctx.translate(w/2,h*0.5);
    ctx.rotate((performance.now()/12000)%(Math.PI*2));
    ctx.globalAlpha=.16;
    ctx.strokeStyle=col.marigold;ctx.lineWidth=2;
    for(let rr=60;rr<=Math.min(w,h)*0.42;rr+=70){ctx.beginPath();ctx.arc(0,0,rr,0,Math.PI*2);ctx.stroke()}
    ctx.restore();
    ctx.globalAlpha=1;

    rings.forEach(r=>{
      ctx.beginPath();
      ctx.strokeStyle=hexA(r.color,r.alpha);
      ctx.lineWidth=4;
      ctx.arc(r.x,r.y,r.r,0,Math.PI*2);
      ctx.stroke();
    });
    rings.forEach(r=>{r.r+=r.speed;r.alpha-=.014});
    rings=rings.filter(r=>r.alpha>0);

    particles.forEach(p=>{
      ctx.beginPath();
      ctx.fillStyle=hexA(p.color,Math.max(p.alpha,0));
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fill();
    });
    particles.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;p.vy+=p.grav||0;
      p.alpha-=p.twinkle?.02:.018;
    });
    particles=particles.filter(p=>p.alpha>0);
  }

  function hexA(hex,a){
    hex=(hex||'#ffffff').trim();
    if(hex[0]!=='#')return hex;
    let r,g,b;
    if(hex.length===4){r=parseInt(hex[1]+hex[1],16);g=parseInt(hex[2]+hex[2],16);b=parseInt(hex[3]+hex[3],16)}
    else{r=parseInt(hex.slice(1,3),16);g=parseInt(hex.slice(3,5),16);b=parseInt(hex.slice(5,7),16)}
    return `rgba(${r},${g},${b},${Math.max(0,Math.min(1,a))})`;
  }

  function updateUI(){
    const np=(window.__nowPlaying&&window.__nowPlaying())||{};
    $('liveTitle').textContent=np.title||'—';
    $('liveArtist').textContent=[np.artist,np.year].filter(Boolean).join(' · ');
  }

  function enterLive(){
    canvas=$('liveCanvas');ctx=canvas.getContext('2d');
    resize();
    window.addEventListener('resize',resize);
    $('liveMode').classList.add('active');
    $('liveMode').setAttribute('aria-hidden','false');
    active=true;paused=false;
    startedAt=performance.now();pausedTotal=0;lastSubIndex=-1;
    particles=[];rings=[];
    updateUI();
    const np=(window.__nowPlaying&&window.__nowPlaying())||{};
    if(!np.playing && window.__playCurrentSong)window.__playCurrentSong();
    $('livePause').textContent='Ⅱ';
    $('liveMode').classList.remove('paused');
    raf=requestAnimationFrame(tick);
    document.body.style.overflow='hidden';
  }
  function exitLive(){
    active=false;
    if(raf)cancelAnimationFrame(raf);
    window.removeEventListener('resize',resize);
    $('liveMode').classList.remove('active');
    $('liveMode').setAttribute('aria-hidden','true');
    document.body.style.overflow='';
  }
  function togglePauseLive(){
    if(!active)return;
    paused=!paused;
    $('liveMode').classList.toggle('paused',paused);
    if(paused){
      pausedAt=performance.now();
      const np=(window.__nowPlaying&&window.__nowPlaying())||{};
      wasPlayingBeforePause=np.playing;
      if(wasPlayingBeforePause && window.__togglePlayback)window.__togglePlayback();
      $('livePause').textContent='▶';
    }else{
      pausedTotal+=performance.now()-pausedAt;
      if(wasPlayingBeforePause && window.__togglePlayback)window.__togglePlayback();
      $('livePause').textContent='Ⅱ';
      raf=requestAnimationFrame(tick);
    }
  }

  async function shareLiveMoment(){
    if(!canvas)return;
    const shot=document.createElement('canvas');
    shot.width=canvas.width;shot.height=canvas.height;
    const sctx=shot.getContext('2d');
    sctx.drawImage(canvas,0,0);
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const col=colors();
    sctx.fillStyle='rgba(0,0,0,.4)';
    sctx.fillRect(0,shot.height-260*dpr,shot.width,260*dpr);
    const np=(window.__nowPlaying&&window.__nowPlaying())||{};
    try{await document.fonts.load(`400 ${40*dpr}px Anton`)}catch(e){}
    sctx.fillStyle=col.marigold;
    sctx.font=`600 ${20*dpr}px 'Work Sans', sans-serif`;
    sctx.fillText('NOW JAMMING — LIVE MODE', 40*dpr, shot.height-180*dpr);
    sctx.fillStyle=col.paper;
    sctx.font=`400 ${46*dpr}px Anton, sans-serif`;
    sctx.fillText((np.title||'').toUpperCase(), 40*dpr, shot.height-120*dpr);
    sctx.fillStyle=col.cobalt;
    sctx.font=`500 ${22*dpr}px 'Work Sans', sans-serif`;
    sctx.fillText(np.artist||'', 40*dpr, shot.height-70*dpr);
    shot.toBlob(async blob=>{
      if(!blob)return;
      const file=new File([blob],'live-mode-moment.png',{type:'image/png'});
      if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
        try{await navigator.share({files:[file],title:'Now Jamming — Live Mode'});return}catch(e){}
      }
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);a.download='live-mode-moment.png';a.click();
    },'image/png');
  }

  document.addEventListener('DOMContentLoaded',()=>{
    $('liveModeBtn')?.addEventListener('click',enterLive);
    $('liveExit')?.addEventListener('click',exitLive);
    $('livePause')?.addEventListener('click',togglePauseLive);
    $('liveNext')?.addEventListener('click',()=>{window.__nextSong&&window.__nextSong();setTimeout(updateUI,60)});
    $('livePrev')?.addEventListener('click',()=>{window.__prevSong&&window.__prevSong();setTimeout(updateUI,60)});
    $('liveShare')?.addEventListener('click',shareLiveMoment);
    document.addEventListener('keydown',e=>{
      if(!active)return;
      if(e.code==='Escape')exitLive();
      if(e.code==='Space'){e.preventDefault();togglePauseLive()}
    });
  });
})();
