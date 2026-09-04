/* PIXEL STAGE — stunning changing graphics every 5 seconds */
(function(){
  const canvas = document.getElementById('pixelCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const badgeLabel = document.getElementById('sceneBadgeLabel');
  const badgeIdx = document.getElementById('sceneBadgeIdx');
  const dotsWrap = document.getElementById('sceneDots');

  const W = 320, H = 180;
  canvas.width = W; canvas.height = H;

  const THEMES = [
    {name:'MUSTARD FIELDS', tag:'SARSON • DAY', colors:['#87CEFF','#FFC900','#2EFF7A','#8B5A00']},
    {name:'TRUCK ART', tag:'PHULKARI • COLOR', colors:['#0A0E1E','#FF2E2E','#FFC900','#00E5FF']},
    {name:'GOLDEN TEMPLE', tag:'HARIMANDIR • NIGHT', colors:['#070A14','#FFC900','#FFD700','#1A1E33']},
    {name:'DHOL & BEAT', tag:'BHANGRA • STAGE', colors:['#0A0E1E','#FF2E2E','#FFC900','#FFF8CC']},
    {name:'HIGHWAY SUNSET', tag:'GT ROAD • 1988', colors:['#1A0A2E','#FF2E9A','#FF8A00','#00E5FF']},
    {name:'WEDDING LIGHTS', tag:'VIAH • NEON', colors:['#0F0A1E','#FF2E9A','#FFC900','#00E5FF']},
  ];

  let current = 0;
  let autoTimer = null;
  let t = 0;
  let rafId = null;

  // --- dots
  function buildDots(){
    if(!dotsWrap) return;
    dotsWrap.innerHTML = THEMES.map((_,i)=>`<button type="button" data-i="${i}" aria-label="Scene ${i+1}: ${THEMES[i].name}" class="${i===current?'active':''}"></button>`).join('');
    dotsWrap.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>goTo(+b.dataset.i, true)));
  }
  function updateDots(){
    if(!dotsWrap) return;
    dotsWrap.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('active', i===current));
  }

  function goTo(idx, manual){
    current = ((idx%THEMES.length)+THEMES.length)%THEMES.length;
    document.body.classList.remove(...THEMES.map((_,i)=>'theme-'+i));
    document.body.classList.add('theme-'+current);
    if(badgeLabel) badgeLabel.textContent = THEMES[current].name;
    if(badgeIdx) badgeIdx.textContent = String(current+1).padStart(2,'0')+'/06';
    updateDots();
    // sync 3D mood
    if(window.__setRadioMood){
      // reuse mood palette aligned to theme
      const moodIdx = current % 4;
      // briefly pulse mood then restore radio if active else theme color
      window.__pixelTheme = current;
    }
    if(window.__setPixelMood) window.__setPixelMood(current);
    if(manual) resetAuto();
  }

  function next(){ goTo(current+1,false) }
  function prev(){ goTo(current-1,false) }

  function resetAuto(){
    clearInterval(autoTimer);
    autoTimer = setInterval(next, 5000);
  }

  document.getElementById('nextSceneBtn')?.addEventListener('click',()=>goTo(current+1,true));
  document.getElementById('prevSceneBtn')?.addEventListener('click',()=>goTo(current-1,true));
  // keyboard
  document.addEventListener('keydown',e=>{
    if(e.target.matches('input')) return;
    if(e.key==='ArrowRight') goTo(current+1,true);
    if(e.key==='ArrowLeft') goTo(current-1,true);
  });

  // pause when tab hidden to save battery
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){ clearInterval(autoTimer); cancelAnimationFrame(rafId); }
    else { resetAuto(); loop(); }
  });

  // — pixel helpers
  function fillRect(x,y,w,h,c){ ctx.fillStyle=c; ctx.fillRect(x,y,w,h); }
  function px(x,y,c,s=1){ ctx.fillStyle=c; ctx.fillRect(x*s,y*s,s,s); }

  // star twinkle cache
  const stars = Array.from({length:60},()=>({x:Math.random()*W, y:Math.random()*H*0.55, s: Math.random()<0.5?1:2, ph:Math.random()*Math.PI*2}));

  function drawSky(gradColors){
    const g = ctx.createLinearGradient(0,0,0,H*0.65);
    gradColors.forEach((c,i)=> g.addColorStop(i/(gradColors.length-1), c));
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H*0.65);
  }

  function drawStars(alpha=1){
    stars.forEach(s=>{
      const tw = 0.6 + Math.sin(t*0.003 + s.ph)*0.4;
      ctx.globalAlpha = alpha * tw;
      ctx.fillStyle = '#FFF'; ctx.fillRect(s.x, s.y, s.s, s.s);
      if(s.s===2){ ctx.fillRect(s.x-2,s.y,s.s+4,1); ctx.fillRect(s.x,s.y-2,1,s.s+4); }
    });
    ctx.globalAlpha=1;
  }

  function drawSun(x,y,r, col){
    ctx.fillStyle=col; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    // sun rays pixelated
    for(let a=0;a<12;a++){
      const ang=a/12*Math.PI*2;
      ctx.fillRect(x+Math.cos(ang)*(r+2), y+Math.sin(ang)*(r+2), 3,3);
    }
  }

  // ===== SCENE DRAWERS =====
  function scene0(){ // MUSTARD FIELDS - day, rolling hills, mustard dots, tractor
    drawSky(['#87CEFF','#AEE9FF','#FFF6A0']);
    drawSun(260,28,16,'#FFC900');
    drawStars(0.0);
    // distant hills
    fillRect(0,70,W,18,'#7ED957'); fillRect(0,78,W,12,'#5CB85C');
    for(let i=0;i<W;i+=8){ ctx.fillStyle=i%16?'#6CC24A':'#7ED957'; ctx.fillRect(i,70,8,6); }
    // fields rows
    for(let row=0;row<5;row++){
      const y=88+row*16; const col=row%2?'#FFC900':'#FFD84D';
      fillRect(0,y,W,14,col);
      // mustard dots
      for(let x=4;x<W;x+=12){ if((x+row*6)%24===0) fillRect(x, y+4,6,6,'#FFB700'); }
      // furrows
      ctx.fillStyle='rgba(0,0,0,.18)'; ctx.fillRect(0,y+12,W,2);
    }
    // tractor pixel
    const tx=140, ty=118;
    fillRect(tx,ty,36,12,'#FF2E2E'); fillRect(tx+6,ty-10,20,10,'#FF2E2E'); fillRect(tx+8,ty-8,10,6,'#87CEFF');
    fillRect(tx+2,ty+10,10,10,'#1A1A1A'); fillRect(tx+22,ty+10,10,10,'#1A1A1A');
    ctx.fillStyle='#FFF'; ctx.fillRect(tx+4,ty+14,4,4); ctx.fillRect(tx+24,ty+14,4,4);
    // khet text
    ctx.font='6px "Press Start 2P"'; ctx.fillStyle='#000'; ctx.fillText('SARSON', 8, 172);
    // birds
    for(let i=0;i<4;i++){ const bx=40+i*50+Math.sin(t*0.002+i)*10; fillRect(bx,20+i*4,8,2,'#000'); fillRect(bx+6,20+i*4,2,2,'#000'); }
  }

  function scene1(){ // TRUCK ART
    drawSky(['#0A0E1E','#1A1050','#4A0E4E']);
    drawStars(0.9);
    // road
    fillRect(0,110,W,70,'#1A1A1A'); fillRect(0,108,W,4,'#FFC900');
    for(let x=-((t*0.15)%20);x<W;x+=40){ fillRect(x,144,W*0.05,6,'#FFF'); }
    // truck body - big pixel art truck centered
    const cx=W/2, ty=58;
    // cargo decorated box
    fillRect(cx-58,ty+22,116,44,'#00E5FF'); // base teal
    // phulkari patterns
    for(let r=0;r<4;r++) for(let c=0;c<8;c++){
      const x=cx-54+c*14, y=ty+26+r*10;
      const cols=['#FF2E2E','#FFC900','#2EFF7A','#FF2E9A']; ctx.fillStyle=cols[(r+c)%4]; ctx.fillRect(x,y,10,6);
      ctx.fillStyle='#000'; ctx.fillRect(x+3,y+2,4,2);
    }
    fillRect(cx-58,ty+22,116,4,'#FFC900'); fillRect(cx-58,ty+62,116,4,'#FF2E2E');
    // cabin
    fillRect(cx-38,ty,40,28,'#FF2E2E'); fillRect(cx-34,ty+4,20,12,'#87CEFF'); fillRect(cx-8,ty+4,6,12,'#FFC900');
    ctx.fillStyle='#FFF'; ctx.fillRect(cx-46,ty+10,8,3); ctx.fillRect(cx+4,ty+10,8,3);
    // wheels
    fillRect(cx-42,ty+62,18,18,'#111'); fillRect(cx+22,ty+62,18,18,'#111');
    ctx.fillStyle='#FFC900'; ctx.fillRect(cx-36,ty+68,6,6); ctx.fillRect(cx+28,ty+68,6,6);
    // exhaust puff
    const puffX=cx+46+Math.sin(t*0.01)*2; fillRect(puffX,ty+6,10,6,'#FFF'); fillRect(puffX+8,ty+2,6,4,'#FFF'); fillRect(puffX+12,ty+8,4,4,'rgba(255,255,255,.6)');
    // road side mustard
    fillRect(0,100,W,10,'#FFC900'); for(let x=0;x<W;x+=16) fillRect(x,102,8,4,'#2EFF7A');
    ctx.fillStyle='#FFC900'; ctx.font='6px "Press Start 2P"'; ctx.fillText('PHULKARI TRUCK', 6, 174);
  }

  function scene2(){ // GOLDEN TEMPLE night reflection
    drawSky(['#050714','#0A0E2A','#1A1050']);
    drawStars(1);
    drawSun(160,22,10,'#FFEAA7'); // moon
    ctx.fillStyle='#1A1E33'; ctx.fillRect(0,86,W,12); // far ghat
    // water
    fillRect(0,98,W,82,'#0A1A3A'); // sarovar
    // reflection shimmer
    for(let y=100;y<180;y+=2){ ctx.fillStyle=(y%4?'#123060':'#0E2A55'); ctx.fillRect(0,y,W,1); }
    // glimmer
    for(let x=0;x<W;x+=20){ const sh=Math.sin(t*0.002+x*0.01)*3; ctx.fillStyle='rgba(255,201,0,.5)'; ctx.fillRect(x+sh,110+Math.sin(x)*2,2,50); }
    // temple
    const tx=W/2-36;
    fillRect(tx+16,66,40,22,'#FFD700'); // base gold
    fillRect(tx+12,60,48,8,'#FFC900'); // terrace
    fillRect(tx+20,48,32,14,'#FFD700'); // dome base
    // dome
    ctx.fillStyle='#FFD700'; ctx.beginPath(); ctx.arc(W/2,48,18,Math.PI,0); ctx.fill();
    ctx.fillStyle='#FFF8CC'; ctx.fillRect(W/2-2,24,4,12); // kalash
    fillRect(W/2-6,30,12,6,'#FF2E2E');
    // arches
    ctx.fillStyle='#0A1A3A'; ctx.fillRect(tx+22,72,8,10); ctx.fillRect(tx+42,72,8,10);
    // reflection
    ctx.globalAlpha=.45; fillRect(tx+16,118,40,40,'#FFD700'); ctx.fillStyle='#FFD700'; ctx.beginPath(); ctx.arc(W/2, 118,18,0,Math.PI); ctx.fill(); ctx.globalAlpha=1;
    // diyas on edge
    for(let x=0;x<W;x+=28){ fillRect(x,96,10,4,'#FF8A00'); fillRect(x+3,94,4,2,'#FFC900'); }
    ctx.fillStyle='#FFC900'; ctx.font='6px "Press Start 2P"'; ctx.fillText('HARIMANDIR', W-92, 174);
  }

  function scene3(){ // DHOL STAGE - red curtain, dhol
    drawSky(['#0A0E1E','#1A0A1A','#2A0A0A']);
    // stage curtain
    for(let x=0;x<W;x+=16){ ctx.fillStyle=x%32?'#8B0000':'#FF2E2E'; ctx.fillRect(x,0,16,96); ctx.fillStyle='rgba(0,0,0,.2)'; ctx.fillRect(x,0,4,96); }
    fillRect(0,96,W,14,'#1A1A1A'); fillRect(0,110,W,6,'#FFC900'); // stage edge
    // lights
    for(let i=0;i<5;i++){ const lx=32+i*64; drawSun(lx,18,8, i%2?'#FFC900':'#00E5FF'); ctx.fillStyle='rgba(255,201,0,.15)'; ctx.fillRect(lx-18,26,36,70); }
    // dhol left
    fillRect(68,72,48,28,'#8B4513'); fillRect(64,74,6,24,'#FFC900'); fillRect(112,74,6,24,'#FFC900');
    ctx.fillStyle='#FFF'; for(let i=0;i<6;i++) ctx.fillRect(70,76+i*4,44,2);
    // dhol right
    fillRect(204,78,44,24,'#8B4513'); fillRect(200,80,6,20,'#FFC900'); fillRect(244,80,6,20,'#FFC900');
    // drummer sticks pixel
    fillRect(96,58,4,18,'#FFF8CC'); fillRect(212,64,4,18,'#FFF8CC');
    // floor lights
    for(let x=10;x<W;x+=40){ fillRect(x,122,20,6, x%80?'#FF2E2E':'#00E5FF'); }
    // bhangra silhouettes jumping
    fillRect(140,62,14,28,'#000'); fillRect(138,58,18,8,'#000'); // body
    fillRect(132,66,8,12,'#000'); fillRect(154,66,8,12,'#000');
    ctx.fillStyle='#FFC900'; ctx.font='6px "Press Start 2P"'; ctx.fillText('DHOL BEAT', 8, 174);
  }

  function scene4(){ // HIGHWAY SUNSET synthwave
    // sunset gradient
    const g=ctx.createLinearGradient(0,0,0,90);
    g.addColorStop(0,'#1A0A2E'); g.addColorStop(0.35,'#FF2E9A'); g.addColorStop(0.7,'#FF8A00'); g.addColorStop(1,'#FFC900');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,90);
    drawSun(160,54,22,'#FFEAA7');
    // grid ground
    fillRect(0,90,W,90,'#0A0A14');
    // perspective grid
    ctx.strokeStyle='rgba(0,229,255,.6)'; ctx.lineWidth=1;
    for(let y=90;y<180;y+=12){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    for(let x=0;x<W;x+=32){ ctx.beginPath(); ctx.moveTo(x,90); ctx.lineTo( (x-W/2)*2 + W/2 ,180); ctx.stroke(); }
    // horizon hills
    ctx.fillStyle='#1A1050'; ctx.beginPath(); ctx.moveTo(0,90); ctx.lineTo(40,70); ctx.lineTo(90,78); ctx.lineTo(160,60); ctx.lineTo(220,76); ctx.lineTo(280,68); ctx.lineTo(W,90); ctx.closePath(); ctx.fill();
    // road
    ctx.fillStyle='#1A1A1A'; ctx.beginPath(); ctx.moveTo(W/2-50,90); ctx.lineTo(W/2+50,90); ctx.lineTo(W/2+120,180); ctx.lineTo(W/2-120,180); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#FFC900'; ctx.fillRect(W/2-1,90,2,90);
    for(let y=90;y<180;y+=24){ const w=6+ (y-90)*0.18; ctx.fillStyle='#FFF'; ctx.fillRect(W/2-w/2, y, w, 8); }
    // car silhouette
    fillRect(W/2-18,132,36,12,'#FF2E2E'); fillRect(W/2-14,126,28,8,'#87CEFF'); ctx.fillStyle='#FF2E9A'; ctx.fillRect(W/2-16,142,8,4); ctx.fillRect(W/2+8,142,8,4);
    // palm
    fillRect(26,62,6,28,'#5A3A00'); ctx.fillStyle='#2EFF7A'; ctx.fillRect(14,56,30,8); ctx.fillRect(18,50,22,6);
    fillRect(286,64,6,26,'#5A3A00'); ctx.fillStyle='#2EFF7A'; ctx.fillRect(274,58,30,8);
    ctx.fillStyle='#FFC900'; ctx.font='6px "Press Start 2P"'; ctx.fillText('GT ROAD 88', 6, 174);
  }

  function scene5(){ // WEDDING LIGHTS
    drawSky(['#0F0A1E','#1A0A2E','#2A1050']);
    drawStars(0.8);
    // string lights
    ctx.strokeStyle='#333'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,28); for(let x=0;x<W;x+=20) ctx.lineTo(x,28+Math.sin(x*0.05)*4); ctx.stroke();
    for(let x=6;x<W;x+=14){ const c=x%28?'#FF2E9A':'#FFC900'; if(x%42===0) c='#00E5FF'; ctx.fillStyle=c; ctx.fillRect(x,30+Math.sin(x*0.05)*4,8,8); ctx.fillStyle='rgba(255,255,255,.6)'; ctx.fillRect(x+2,32+Math.sin(x*0.05)*4,4,2); }
    // second string
    ctx.beginPath(); ctx.moveTo(0,52); for(let x=0;x<W;x+=14) ctx.lineTo(x,52+Math.sin(x*0.05+1)*3); ctx.stroke();
    for(let x=10;x<W;x+=14){ ctx.fillStyle=x%28?'#2EFF7A':'#FF8A00'; ctx.fillRect(x,54+Math.sin(x*0.05+1)*3,6,6); }
    // stage floor
    fillRect(0,112,W,68,'#1A1A1A');
    for(let x=0;x<W;x+=8){ ctx.fillStyle=x%16?'#2A2A2A':'#1E1E1E'; ctx.fillRect(x,112,8,68); }
    // light cones
    for(let i=0;i<4;i++){ const lx=40+i*80; const col=i%2?'rgba(255,46,154,.2)':'rgba(255,201,0,.18)'; ctx.fillStyle=col; ctx.beginPath(); ctx.moveTo(lx,60); ctx.lineTo(lx-26,180); ctx.lineTo(lx+26,180); ctx.closePath(); ctx.fill(); }
    // speakers
    fillRect(22,86,28,26,'#000'); ctx.fillStyle='#333'; ctx.fillRect(26,90,8,8); ctx.fillRect(38,90,8,8); ctx.fillRect(30,102,8,6);
    fillRect(W-50,86,28,26,'#000'); ctx.fillStyle='#333'; ctx.fillRect(W-46,90,8,8); ctx.fillRect(W-34,90,8,8);
    // dancing couple pixels
    fillRect(142,84,12,28,'#FF2E9A'); fillRect(166,84,12,28,'#00E5FF');
    fillRect(140,78,16,10,'#000'); fillRect(164,78,16,10,'#000');
    // floor pattern
    ctx.fillStyle='rgba(255,255,255,.06)'; for(let y=120;y<180;y+=16) ctx.fillRect(0,y,W,1);
    ctx.fillStyle='#FFC900'; ctx.font='6px "Press Start 2P"'; ctx.fillText('VIAH LIGHTS', 6, 174);
    // flicker
    if(Math.floor(t*0.008)%2===0){ ctx.fillStyle='rgba(255,201,0,.04)'; ctx.fillRect(0,0,W,H); }
  }

  const DRAWERS=[scene0,scene1,scene2,scene3,scene4,scene5];

  function render(){
    ctx.clearRect(0,0,W,H);
    // base
    ctx.fillStyle='#060914'; ctx.fillRect(0,0,W,H);
    try{ DRAWERS[current](); }catch(e){ console.error(e); }
    // pixel perfect border vignette
    ctx.strokeStyle='rgba(0,0,0,.5)'; ctx.lineWidth=4; ctx.strokeRect(0,0,W,H);
    // subtle scanline inside canvas
    ctx.fillStyle='rgba(0,0,0,.07)';
    for(let y=0;y<H;y+=4) ctx.fillRect(0,y,W,1);
  }

  function loop(){
    t = performance.now();
    render();
    rafId = requestAnimationFrame(loop);
  }

  // init
  buildDots(); goTo(0,false); resetAuto(); loop();

  // expose
  window.__pixelStage = {goTo, next, prev, themes:THEMES};
  window.__setPixelMood = function(idx){
    // called from pixelStage, also patch scene fog
    const moods = [0xFFC900, 0xFF2E2E, 0xFFD700, 0xFF2E2E, 0xFF2E9A, 0xFF2E9A];
    const c = moods[idx % moods.length];
    if(window.__setRadioMood) {
      // we don't override radio if playing, just tint slightly via custom event
      const ev = new CustomEvent('pixelTheme', {detail:{idx, color:c}});
      window.dispatchEvent(ev);
    }
  };
})();
