/* AURORA STAGE — non-pixel, cinematic gradients, 5s cycle, smooth crossfade */
(function(){
  const canvas=document.getElementById('pixelCanvas');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const badgeLabel=document.getElementById('sceneBadgeLabel');
  const badgeIdx=document.getElementById('sceneBadgeIdx');
  const dotsWrap=document.getElementById('sceneDots');
  const W=1400, H=900;
  canvas.width=W; canvas.height=H;
  const THEMES=[
    {name:'MUSTARD HAZE', tag:'SARSON • DAWN'},
    {name:'TRUCK NOIR', tag:'PHULKARI • STUDIO'},
    {name:'GOLDEN HOUR', tag:'HARIMANDIR • REFLECTION'},
    {name:'DHOL PULSE', tag:'RHYTHM • STAGE'},
    {name:'HIGHWAY DUSK', tag:'GT ROAD • 1989'},
    {name:'VIAH GLOW', tag:'WEDDING • NEON'},
  ];
  let current=0, autoTimer=null, t=0, rafId=null;
  let prevCanvas=document.createElement('canvas'); prevCanvas.width=W; prevCanvas.height=H;
  let prevCtx=prevCanvas.getContext('2d');
  let transition=1;

  function buildDots(){
    if(!dotsWrap) return;
    dotsWrap.innerHTML=THEMES.map((_,i)=>`<button type="button" data-i="${i}" aria-label="Scene ${i+1}" class="${i===current?'active':''}"></button>`).join('');
    dotsWrap.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>goTo(+b.dataset.i,true)));
  }
  function updateDots(){ dotsWrap?.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('active',i===current)); }
  function goTo(idx, manual){
    if(idx===current && !manual) return;
    prevCtx.drawImage(canvas,0,0);
    transition=0;
    current=((idx%THEMES.length)+THEMES.length)%THEMES.length;
    document.body.classList.remove(...THEMES.map((_,i)=>'theme-'+i));
    document.body.classList.add('theme-'+current);
    if(badgeLabel) badgeLabel.textContent=THEMES[current].name;
    if(badgeIdx) badgeIdx.textContent=String(current+1).padStart(2,'0')+'/06';
    updateDots();
    if(window.__setPixelMood) window.__setPixelMood(current);
    if(manual) resetAuto();
  }
  function next(){ goTo(current+1,false) }
  function resetAuto(){ clearInterval(autoTimer); autoTimer=setInterval(next,5000); }
  document.getElementById('nextSceneBtn')?.addEventListener('click',()=>goTo(current+1,true));
  document.getElementById('prevSceneBtn')?.addEventListener('click',()=>goTo(current-1,true));
  document.addEventListener('keydown',e=>{
    if(e.target.matches('input')) return;
    if(e.key==='ArrowRight') goTo(current+1,true);
    if(e.key==='ArrowLeft') goTo(current-1,true);
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){ clearInterval(autoTimer); cancelAnimationFrame(rafId); }
    else { resetAuto(); loop(); }
  });

  // helpers
  function orb(x,y,r, col, blur=70){
    ctx.fillStyle=col;
    const g=ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0, col);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle=g;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  }
  function grain(){
    ctx.fillStyle='rgba(255,255,255,.015)';
    for(let i=0;i<600;i++){ const x=Math.random()*W, y=Math.random()*H; ctx.fillRect(x,y,1,1); }
  }

  // SCENES — soft, premium, non-pixel
  function scene0(){ // Mustard Haze
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#0B0F1E'); g.addColorStop(0.35,'#1A1440'); g.addColorStop(0.62,'#3A2A60'); g.addColorStop(0.78,'#7A5A2E'); g.addColorStop(1,'#0B0F1E');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    orb(W*0.62, H*0.18, 520, 'rgba(234,179,8,.22)');
    orb(W*0.18, H*0.58, 480, 'rgba(245,158,11,.14)');
    orb(W*0.82, H*0.72, 420, 'rgba(16,185,129,.10)');
    // horizon mist
    ctx.fillStyle='rgba(255,248,230,.06)'; ctx.beginPath(); ctx.ellipse(W/2, H*0.68, W*0.42, 60, 0, 0, Math.PI*2); ctx.fill();
    // subtle field lines
    ctx.strokeStyle='rgba(234,179,8,.08)'; ctx.lineWidth=1;
    for(let y=H*0.68; y<H; y+=18){ ctx.beginPath(); ctx.moveTo(0,y); ctx.bezierCurveTo(W*0.33, y-6, W*0.66, y+6, W, y); ctx.stroke(); }
    // drifting dust
    for(let i=0;i<40;i++){ const x=(Math.sin(t*0.0004+i)*W*0.1 + W*0.5 + i*37)%W; const y=H*0.58+Math.sin(t*0.0006+i)*18 + (i%4)*6; ctx.fillStyle='rgba(255,248,230,.28)'; ctx.beginPath(); ctx.arc(x,y,1.2,0,Math.PI*2); ctx.fill(); }
    ctx.fillStyle='rgba(255,248,230,.55)'; ctx.font='10px "JetBrains Mono"'; ctx.fillText('SARSON  •  MIST AT DAWN', 28, H-22);
  }
  function scene1(){ // Truck Noir studio
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#070A14'); g.addColorStop(1,'#14182E');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    orb(W*0.5, H*0.38, 620, 'rgba(220,38,38,.18)');
    orb(W*0.18, H*0.82, 380, 'rgba(6,182,212,.14)');
    orb(W*0.88, H*0.22, 360, 'rgba(234,179,8,.12)');
    // studio vignette rectangle
    ctx.fillStyle='rgba(255,255,255,.04)'; ctx.fillRect(W*0.5-420, H*0.5-220, 840, 440);
    ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.lineWidth=1; ctx.strokeRect(W*0.5-420, H*0.5-220, 840, 440);
    // truck abstract: three color blocks
    ctx.fillStyle='rgba(6,182,212,.42)'; ctx.fillRect(W*0.5-300, H*0.5-40, 220, 130);
    ctx.fillStyle='rgba(220,38,38,.52)'; ctx.fillRect(W*0.5-60, H*0.5-80, 180, 170);
    ctx.fillStyle='rgba(234,179,8,.38)'; ctx.fillRect(W*0.5+140, H*0.5-30, 160, 110);
    // chrome highlight
    ctx.fillStyle='rgba(255,255,255,.14)'; ctx.fillRect(W*0.5-300, H*0.5-40, 220, 3); ctx.fillRect(W*0.5-60, H*0.5-80, 180, 2);
    // floor reflection
    ctx.fillStyle='rgba(255,255,255,.05)'; ctx.fillRect(W*0.5-420, H*0.5+220, 840, 1);
    ctx.fillStyle='rgba(255,255,255,.025)'; for(let y=H*0.5+224; y<H; y+=10) ctx.fillRect(W*0.5-420, y, 840, 1);
    ctx.fillStyle='rgba(255,248,230,.55)'; ctx.font='10px "JetBrains Mono"'; ctx.fillText('PHULKARI  •  STUDIO LIGHT', 28, H-22);
  }
  function scene2(){ // Golden Hour reflection
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#070A14'); g.addColorStop(0.42,'#1A1240'); g.addColorStop(0.72,'#6B3A12'); g.addColorStop(1,'#0B1E3A');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    orb(W*0.5, H*0.18, 420, 'rgba(255,248,230,.22)');
    orb(W*0.5, H*0.72, 520, 'rgba(234,179,8,.16)');
    // water
    ctx.fillStyle='#081A3A'; ctx.fillRect(0, H*0.62, W, H*0.38);
    // temple silhouette glow
    ctx.fillStyle='rgba(234,179,8,.92)'; ctx.beginPath(); ctx.arc(W/2, H*0.56, 44, Math.PI, 0); ctx.fill();
    ctx.fillRect(W/2-72, H*0.56, 144, 36);
    // reflection
    ctx.globalAlpha=.22; ctx.fillRect(W/2-72, H*0.62, 144, 120); ctx.beginPath(); ctx.arc(W/2, H*0.62, 44, 0, Math.PI); ctx.fill(); ctx.globalAlpha=1;
    // ripples
    ctx.strokeStyle='rgba(255,248,230,.07)'; for(let y=H*0.64;y<H;y+=12){ ctx.beginPath(); ctx.moveTo(0,y+Math.sin(t*0.0006+y*0.01)*4); ctx.bezierCurveTo(W*0.33, y, W*0.66, y+2, W, y); ctx.stroke(); }
    // diya row
    for(let x=60;x<W;x+=90){ const flick=Math.sin(t*0.004+x)*2; ctx.fillStyle='rgba(245,158,11,.9)'; ctx.beginPath(); ctx.arc(x, H*0.60-6+flick, 3,0,Math.PI*2); ctx.fill(); ctx.fillStyle='rgba(234,179,8,.18)'; ctx.beginPath(); ctx.arc(x, H*0.60-6, 10,0,Math.PI*2); ctx.fill(); }
    ctx.fillStyle='rgba(255,248,230,.55)'; ctx.font='10px "JetBrains Mono"'; ctx.fillText('HARIMANDIR  •  GOLDEN HOUR', 28, H-22);
  }
  function scene3(){ // Dhol Pulse
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#070A14'); g.addColorStop(0.55,'#1A0A14'); g.addColorStop(1,'#2A0A0A');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    orb(W*0.22, H*0.22, 420, 'rgba(220,38,38,.18)');
    orb(W*0.78, H*0.28, 380, 'rgba(6,182,212,.14)');
    orb(W*0.5, H*0.78, 520, 'rgba(234,179,8,.08)');
    // stage spot cones
    for(let i=0;i<3;i++){
      const x=W*0.22+i*W*0.28; const sweep=Math.sin(t*0.0007+i)*24;
      const col=i===1?'rgba(234,179,8,.10)': i===0?'rgba(220,38,38,.10)':'rgba(6,182,212,.10)';
      ctx.fillStyle=col; ctx.beginPath(); ctx.moveTo(x+sweep, 80); ctx.lineTo(x-120+sweep*0.4, H); ctx.lineTo(x+120+sweep*0.4,H); ctx.closePath(); ctx.fill();
      // light
      ctx.fillStyle=i===1?'rgba(234,179,8,.9)': i===0?'rgba(220,38,38,.85)':'rgba(6,182,212,.85)';
      ctx.beginPath(); ctx.arc(x+sweep, 62, 14,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.22)'; ctx.beginPath(); ctx.arc(x+sweep-4,58,3,0,Math.PI*2); ctx.fill();
    }
    // floor
    ctx.fillStyle='rgba(255,255,255,.04)'; ctx.fillRect(0, H*0.72, W, H*0.28);
    ctx.strokeStyle='rgba(255,255,255,.06)'; for(let y=H*0.72;y<H;y+=22){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    ctx.fillStyle='rgba(255,248,230,.55)'; ctx.font='10px "JetBrains Mono"'; ctx.fillText('DHOL  •  STAGE PULSE', 28, H-22);
  }
  function scene4(){ // Highway Dusk — synth gradient
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#0F0B2A'); g.addColorStop(0.42,'#8B2C6A'); g.addColorStop(0.62,'#FF7A3D'); g.addColorStop(0.76,'#FFC53D'); g.addColorStop(1,'#0B0F1E');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    orb(W*0.5, H*0.32, 360, 'rgba(255,248,230,.26)');
    // hills
    ctx.fillStyle='rgba(15,11,42,.72)'; ctx.beginPath(); ctx.moveTo(0,H*0.52); ctx.bezierCurveTo(W*0.22,H*0.42,W*0.42,H*0.48,W*0.62,H*0.40); ctx.bezierCurveTo(W*0.78,H*0.36,W*0.92,H*0.44,W,H*0.52); ctx.lineTo(W,H*0.58); ctx.lineTo(0,H*0.58); ctx.fill();
    // road
    ctx.fillStyle='#0A0E1E'; ctx.beginPath(); ctx.moveTo(W*0.5-110, H*0.58); ctx.lineTo(W*0.5+110, H*0.58); ctx.lineTo(W*0.5+260, H); ctx.lineTo(W*0.5-260, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(234,179,8,.9)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(W/2, H*0.58); ctx.lineTo(W/2, H); ctx.stroke();
    const off=(t*0.05)%42;
    ctx.fillStyle='#FFF'; for(let y=H*0.58;y<H;y+=42){ const yy=y+off%42; if(yy<H){ const w=6+(yy-H*0.58)*0.06; ctx.fillRect(W/2-w/2, yy, w, 5);} }
    // palm silhouettes
    ctx.fillStyle='rgba(0,0,0,.42)'; ctx.fillRect(W*0.08, H*0.40, 10, H*0.18); ctx.beginPath(); ctx.arc(W*0.08+5, H*0.38, 22,0,Math.PI*2); ctx.fill();
    ctx.fillRect(W*0.92-10, H*0.42, 10, H*0.16); ctx.beginPath(); ctx.arc(W*0.92-5, H*0.40, 20,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,248,230,.55)'; ctx.font='10px "JetBrains Mono"'; ctx.fillText('GT ROAD  •  DUSK 1989', 28, H-22);
  }
  function scene5(){ // Viah Glow
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#0F0A1E'); g.addColorStop(0.55,'#1E0F3A'); g.addColorStop(1,'#0B0F1E');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    orb(W*0.22, H*0.30, 380, 'rgba(236,72,153,.16)');
    orb(W*0.78, H*0.24, 400, 'rgba(234,179,8,.14)');
    orb(W*0.5, H*0.82, 520, 'rgba(139,92,246,.10)');
    // string lights bokeh
    for(let x=40;x<W;x+=72){
      const y=120+Math.sin(x*0.015)*12; const hue=x%144? 'rgba(236,72,153,.92)':'rgba(234,179,8,.92)';
      if(x%216===0) hue='rgba(6,182,212,.92)';
      const twinkle=Math.sin(t*0.005+x)*0.3+0.7;
      ctx.globalAlpha=twinkle; ctx.fillStyle=hue; ctx.beginPath(); ctx.arc(x,y,6,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(x-2,y-2,1.5,0,Math.PI*2); ctx.fill();
      // glow
      ctx.fillStyle=hue.replace('.92','.14'); ctx.beginPath(); ctx.arc(x,y,18,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
    // second row
    for(let x=70;x<W;x+=64){ const y=168+Math.sin(x*0.02+1)*8; ctx.fillStyle=x%128?'rgba(16,185,129,.85)':'rgba(245,158,11,.85)'; ctx.globalAlpha=Math.sin(t*0.006+x)*0.25+0.75; ctx.beginPath(); ctx.arc(x,y,4.5,0,Math.PI*2); ctx.fill(); }
    ctx.globalAlpha=1;
    // floor reflection
    ctx.fillStyle='rgba(255,255,255,.04)'; ctx.fillRect(0,H*0.68,W,H*0.32);
    for(let y=H*0.68;y<H;y+=18){ ctx.fillStyle='rgba(255,255,255,.03)'; ctx.fillRect(0,y,W,1); }
    // beams
    for(let i=0;i<3;i++){ const x=W*0.22+i*W*0.28; const flick=Math.sin(t*0.003+i)*0.06+0.10; ctx.fillStyle=i%2?'rgba(236,72,153,'+flick+')':'rgba(234,179,8,'+flick+')'; ctx.beginPath(); ctx.moveTo(x,220); ctx.lineTo(x-70,H); ctx.lineTo(x+70,H); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle='rgba(255,248,230,.55)'; ctx.font='10px "JetBrains Mono"'; ctx.fillText('VIAH  •  NEON GLOW', 28, H-22);
  }

  const DRAWERS=[scene0,scene1,scene2,scene3,scene4,scene5];

  function render(){
    if(transition<1){
      transition=Math.min(1, transition+0.07);
      ctx.clearRect(0,0,W,H);
      ctx.globalAlpha=1-transition; ctx.drawImage(prevCanvas,0,0,W,H);
      ctx.globalAlpha=transition;
      try{ DRAWERS[current](); }catch(e){ console.error(e); }
      ctx.globalAlpha=1;
      grain();
    } else {
      ctx.clearRect(0,0,W,H);
      try{ DRAWERS[current](); }catch(e){ console.error(e); }
      grain();
    }
  }
  function loop(){ t=performance.now(); render(); rafId=requestAnimationFrame(loop); }
  buildDots(); goTo(0,false); transition=1; resetAuto(); loop();
  window.__pixelStage={goTo,next,prev, themes:THEMES};
  window.__setPixelMood=function(idx){
    const palettes=[0xEAB308,0xDC2626,0xEAB308,0x06B6D4,0xF59E0B,0xEC4899];
    const c=palettes[idx%palettes.length];
    const ev=new CustomEvent('pixelTheme',{detail:{idx,color:c}}); window.dispatchEvent(ev);
  };
})();
