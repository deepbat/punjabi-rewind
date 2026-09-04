/* PIXEL STAGE v2 — cinematic, high-fidelity, 5s cycle, smooth dissolve */
(function(){
  const canvas=document.getElementById('pixelCanvas');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const badgeLabel=document.getElementById('sceneBadgeLabel');
  const badgeIdx=document.getElementById('sceneBadgeIdx');
  const dotsWrap=document.getElementById('sceneDots');
  const W=640, H=360;
  canvas.width=W; canvas.height=H;
  const THEMES=[
    {name:'MUSTARD FIELDS', tag:'SARSON • DAWN'},
    {name:'TRUCK ART', tag:'PHULKARI • DAY'},
    {name:'GOLDEN TEMPLE', tag:'HARIMANDIR • NIGHT'},
    {name:'DHOL STAGE', tag:'BHANGRA • SPOTLIGHT'},
    {name:'HIGHWAY SYNTH', tag:'GT ROAD • 1989'},
    {name:'WEDDING NEON', tag:'VIAH • MIDNIGHT'},
  ];
  let current=0, autoTimer=null, t=0, rafId=null;
  let prevCanvas=document.createElement('canvas'); prevCanvas.width=W; prevCanvas.height=H;
  let prevCtx=prevCanvas.getContext('2d');
  let transition=1; // 0-1 dissolve

  function buildDots(){
    if(!dotsWrap) return;
    dotsWrap.innerHTML=THEMES.map((_,i)=>`<button type="button" data-i="${i}" aria-label="Scene ${i+1}" class="${i===current?'active':''}"></button>`).join('');
    dotsWrap.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>goTo(+b.dataset.i,true)));
  }
  function updateDots(){ dotsWrap?.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('active',i===current)); }
  function goTo(idx, manual){
    if(idx===current && !manual) return;
    // capture prev
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
  const fill=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h)};
  const stars=Array.from({length:90},()=>({x:Math.random()*W,y:Math.random()*H*0.62,s:Math.random()<0.6?1:2,ph:Math.random()*Math.PI*2, col: Math.random()<0.3?'#00E5FF': Math.random()<0.5?'#FFC300':'#FFF'}));
  function drawStars(alpha=1, dense=false){
    stars.forEach(s=>{
      const tw=0.55+Math.sin(t*0.0015+s.ph)*0.45;
      ctx.globalAlpha=alpha*tw;
      ctx.fillStyle=s.col; ctx.fillRect(s.x,s.y,s.s,s.s);
      if(s.s===2){ ctx.fillRect(s.x-2,s.y,1,1); ctx.fillRect(s.x+2,s.y,1,1); }
    }); ctx.globalAlpha=1;
    if(dense) { // extra sparkle
      for(let i=0;i<8;i++){ const x=(t*0.04+i*80)%W; ctx.fillStyle='rgba(255,255,255,.9)'; ctx.fillRect(x, 18+Math.sin(i)*8,1,1); }
    }
  }
  function skyGrad(colors){
    const g=ctx.createLinearGradient(0,0,0,H*0.68);
    colors.forEach((c,i)=>g.addColorStop(i/(colors.length-1),c));
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H*0.68);
  }
  function ditherRect(x,y,w,h,c1,c2){
    for(let yy=y; yy<y+h; yy+=4) for(let xx=x; xx<x+w; xx+=4){
      ctx.fillStyle=((xx+yy)%8===0)?c2:c1; ctx.fillRect(xx,yy,4,4);
    }
  }

  // SCENES — more detailed, layered
  function scene0(){ // Mustard dawn - layered fog, flying birds, drifting tractor
    skyGrad(['#FFB86A','#FFD48A','#FFF1B8','#BFE8FF']);
    // sun soft
    const sx=520, sy=52; ctx.fillStyle='#FFF7D1'; ctx.beginPath(); ctx.arc(sx,sy,22,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,195,0,.18)'; ctx.beginPath(); ctx.arc(sx,sy,46,0,Math.PI*2); ctx.fill();
    drawStars(0);
    // distant haze hills
    ctx.fillStyle='#7BC47A'; ctx.beginPath(); ctx.moveTo(0,150); ctx.quadraticCurveTo(140,120,260,144); ctx.quadraticCurveTo(380,168,520,132); ctx.quadraticCurveTo(590,118,W,148); ctx.lineTo(W,170); ctx.lineTo(0,170); ctx.fill();
    ctx.fillStyle='#6AB56A'; ctx.beginPath(); ctx.moveTo(0,168); ctx.quadraticCurveTo(180,158,320,172); ctx.lineTo(W,172); ctx.lineTo(W,176); ctx.lineTo(0,176); ctx.fill();
    // fields with parallax furrows — animated wind
    for(let row=0; row<6; row++){
      const y=178+row*28; const col=row%2?'#FFC300':'#FFD84A';
      fill(0,y,W,26,col);
      // mustard flowers — wind sway
      for(let x=8;x<W;x+=22){
        const sway=Math.sin(t*0.001 + x*0.01 + row)*3;
        ctx.fillStyle='#FFB000'; ctx.fillRect(x+sway, y+8, 8,8);
        ctx.fillStyle='#2A1A00'; ctx.fillRect(x+sway+3, y+11,2,2);
      }
      ctx.fillStyle='rgba(0,0,0,.11)'; ctx.fillRect(0,y+24,W,2);
    }
    // tractor moving slowly across
    const tx=( (t*0.04) % (W+120) )-60, ty=268;
    ctx.fillStyle='#D92B2B'; fill(tx,ty,56,18,'#D92B2B');
    ctx.fillStyle='#B81E1E'; ctx.fillRect(tx,ty+14,56,4);
    fill(tx+10,ty-16,28,16,'#D92B2B'); ctx.fillStyle='#AEEBFF'; ctx.fillRect(tx+12,ty-12,16,8);
    ctx.fillStyle='#111'; ctx.fillRect(tx+4,ty+16,16,16); ctx.fillRect(tx+34,ty+16,16,16);
    ctx.fillStyle='#FFF'; ctx.fillRect(tx+8,ty+22,6,6); ctx.fillRect(tx+38,ty+22,6,6);
    ctx.fillStyle='rgba(0,0,0,.18)'; ctx.fillRect(tx-8,ty+30,72,3);
    // birds
    for(let i=0;i<5;i++){ const bx=(t*0.08+i*110)%(W+40)-20; const by=44+i*9+Math.sin(t*0.002+i)*6; ctx.fillStyle='#1A1A1A'; ctx.fillRect(bx,by,10,2); ctx.fillRect(bx+8,by-2,4,2); ctx.fillRect(bx-2,by-2,4,2); }
    ctx.fillStyle='rgba(0,0,0,.55)'; ctx.font='10px "JetBrains Mono"'; ctx.fillText('SARSON  •  PUNJAB DAWN', 16, H-14);
  }
  function scene1(){ // Truck art — richer, truck bounces
    skyGrad(['#0B0B1E','#1A1450','#2A0E5A']);
    drawStars(0.85);
    // road
    fill(0,220,W,140,'#0F0F14'); fill(0,218,W,3,'#FFC300');
    for(let x=-((t*0.18)%40); x<W; x+=48){ ctx.fillStyle='#FFF'; ctx.fillRect(x,298,22,4); }
    // roadside mustard hint
    ditherRect(0,202,W,18,'#FFC300','#FFD84A');
    // truck — bounce
    const bounce=Math.sin(t*0.008)*2; const cx=W/2, ty=118+bounce;
    // cargo
    ctx.fillStyle='#0A0A0A'; ctx.fillRect(cx-92,ty+34,184,72);
    ctx.fillStyle='#00D1FF'; fill(cx-88,ty+38,176,64,'#00D1FF');
    // phulkari tiles with subtle glow
    for(let r=0;r<4;r++) for(let c=0;c<11;c++){
      const x=cx-84+c*16, y=ty+42+r*14; const cols=['#E93030','#FFC300','#1BFF6B','#FF2B8A']; ctx.fillStyle=cols[(r+c)%4]; ctx.fillRect(x,y,12,10);
      ctx.fillStyle='rgba(0,0,0,.18)'; ctx.fillRect(x,y+8,12,2);
    }
    ctx.fillStyle='#FFC300'; ctx.fillRect(cx-88,ty+38,176,3); ctx.fillStyle='#E93030'; ctx.fillRect(cx-88,ty+99,176,3);
    // cabin
    ctx.fillStyle='#E93030'; ctx.fillRect(cx-60,ty,62,40);
    ctx.fillStyle='#AEEBFF'; ctx.fillRect(cx-54,ty+8,30,16); ctx.fillStyle='#FFC300'; ctx.fillRect(cx-18,ty+8,8,16);
    ctx.fillStyle='#FFF'; ctx.fillRect(cx-72,ty+14,10,3); ctx.fillRect(cx+6,ty+14,10,3);
    // wheels spin illusion
    const spin=((t*0.02)%6)|0; ctx.fillStyle='#0A0A0A'; ctx.fillRect(cx-66,ty+100,26,26); ctx.fillRect(cx+38,ty+100,26,26);
    ctx.fillStyle='#FFC300'; ctx.fillRect(cx-56,ty+110,8,8); ctx.fillStyle='#FFF'; ctx.fillRect(cx-54+(spin%2)*4,ty+112,2,2);
    ctx.fillStyle='#FFC300'; ctx.fillRect(cx+48,ty+110,8,8);
    // puff
    const px=cx+70+Math.sin(t*0.01)*3; ctx.fillStyle='rgba(255,255,255,.92)'; ctx.fillRect(px,ty+10,14,8); ctx.fillStyle='rgba(255,255,255,.55)'; ctx.fillRect(px+12,ty+6,8,5);
    ctx.fillStyle='#FFC300'; ctx.font='10px "JetBrains Mono"'; ctx.fillText('PHULKARI  •  TRUCK ART', 16, H-14);
  }
  function scene2(){ // Golden temple night — reflection ripple
    skyGrad(['#040718','#0A1030','#1A1450']);
    drawStars(1,true);
    // moon
    ctx.fillStyle='#FFF1B8'; ctx.beginPath(); ctx.arc(W/2,42,14,0,Math.PI*2); ctx.fill(); ctx.fillStyle='rgba(255,241,184,.25)'; ctx.beginPath(); ctx.arc(W/2,42,26,0,Math.PI*2); ctx.fill();
    // far city lights
    for(let x=0;x<W;x+=18){ const h=6+Math.sin(x*0.1)*3; ctx.fillStyle=Math.random()<0.5?'rgba(255,195,0,.9)':'rgba(0,229,255,.7)'; ctx.fillRect(x,158-h,4,h); }
    // water
    ctx.fillStyle='#0A1E46'; ctx.fillRect(0,178,W,182);
    // shimmer columns
    for(let x=0;x<W;x+=22){ const sh=Math.sin(t*0.0008 + x*0.02)*4; ctx.fillStyle='rgba(255,195,0,.18)'; ctx.fillRect(x+sh,182,2,160); }
    // ripple lines
    ctx.fillStyle='rgba(255,255,255,.06)'; for(let y=188;y<H;y+=6){ const off=Math.sin(t*0.001 + y*0.08)*6; ctx.fillRect(0+off,y,W,1); }
    // temple complex
    const tx=W/2-54;
    ctx.fillStyle='#FFD23F'; fill(tx+18,118,72,28,'#FFD23F'); // base
    ctx.fillStyle='#C99800'; ctx.fillRect(tx+18,142,72,4);
    ctx.fillStyle='#FFD23F'; ctx.fillRect(tx+12,110,96,10); // terrace
    // pillars
    for(let i=0;i<5;i++){ ctx.fillStyle='#FFF7D1'; ctx.fillRect(tx+20+i*16,118,4,28); }
    // arches dark
    ctx.fillStyle='#0A1E46'; ctx.fillRect(tx+26,126,10,20); ctx.fillRect(tx+48,126,10,20); ctx.fillRect(tx+70,126,10,20);
    // dome
    ctx.fillStyle='#FFD23F'; ctx.beginPath(); ctx.arc(W/2,98,28,Math.PI,0); ctx.fill();
    ctx.fillStyle='#FFF'; ctx.fillRect(W/2-3,68,6,14); ctx.fillStyle='#E93030'; ctx.fillRect(W/2-8,62,16,8);
    // reflection — soft
    ctx.globalAlpha=.38; ctx.fillStyle='#FFD23F'; ctx.fillRect(tx+18,206,72,52); ctx.beginPath(); ctx.arc(W/2,206,28,0,Math.PI); ctx.fill(); ctx.globalAlpha=1;
    // diyas
    for(let x=8;x<W;x+=34){ const flick=Math.sin(t*0.01+x)*1.5+2; ctx.fillStyle='#FF8A00'; ctx.fillRect(x,174,12,6); ctx.fillStyle='#FFC300'; ctx.fillRect(x+4,170-flick,4,4); ctx.fillStyle='rgba(255,195,0,.5)'; ctx.fillRect(x+2,172,8,2); }
    ctx.fillStyle='#FFC300'; ctx.font='10px "JetBrains Mono"'; ctx.fillText('HARIMANDIR  •  REFLECTION', W-230, H-14);
  }
  function scene3(){ // Dhol stage — curtains, spotlights sweep
    skyGrad(['#0A0A1A','#1A0A14','#2A0A0A']);
    // curtains with depth
    for(let x=0;x<W;x+=20){ const col=x%40?'#6A0000':'#A80000'; ctx.fillStyle=col; ctx.fillRect(x,0,20,170); ctx.fillStyle='rgba(0,0,0,.2)'; ctx.fillRect(x,0,4,170); ctx.fillStyle='rgba(255,255,255,.04)'; ctx.fillRect(x+12,0,1,170); }
    // stage
    fill(0,170,W,14,'#0F0F0F'); fill(0,184,W,3,'#FFC300');
    // spotlights sweep
    for(let i=0;i<5;i++){
      const lx=70+i*130; const sweep=Math.sin(t*0.001 + i)*18;
      ctx.fillStyle=i%2?'#FFC300':'#00E5FF'; ctx.beginPath(); ctx.arc(lx+sweep,26,10,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=i%2?'rgba(255,195,0,.14)':'rgba(0,229,255,.12)'; ctx.beginPath(); ctx.moveTo(lx+sweep,36); ctx.lineTo(lx-30+sweep*0.5, H); ctx.lineTo(lx+30+sweep*0.5,H); ctx.closePath(); ctx.fill();
    }
    // floor lights pulse
    for(let x=18;x<W;x+=48){ const on=Math.sin(t*0.006+x*0.01)>0; ctx.fillStyle=on?(x%96?'#E93030':'#00E5FF'):'rgba(255,255,255,.08)'; ctx.fillRect(x,210,W*0.02,8); }
    // dhols — hit animation
    const hit=Math.sin(t*0.015)>0.6; const hit2=Math.sin(t*0.015+1)>0.6;
    // left dhol
    ctx.fillStyle='#8B4513'; ctx.fillRect(110,150,70,38); ctx.fillStyle='#FFC300'; ctx.fillRect(104,154,8,30); ctx.fillRect(176,154,8,30);
    ctx.fillStyle='#FFF'; for(let i=0;i<7;i++) ctx.fillRect(114,156+i*5,62,2);
    ctx.fillStyle='#FFF7D1'; const sx1=148+(hit?6:0); ctx.fillRect(sx1,126-hit*4,4,22);
    // right dhol
    ctx.fillStyle='#8B4513'; ctx.fillRect(360,158,62,34); ctx.fillStyle='#FFC300'; ctx.fillRect(354,162,8,26); ctx.fillRect(418,162,8,26);
    ctx.fillStyle='#FFF'; for(let i=0;i<6;i++) ctx.fillRect(364,164+i*5,54,2);
    ctx.fillStyle='#FFF7D1'; const sx2=386+(hit2? -6:0); ctx.fillRect(sx2,132-hit2*4,4,20);
    // silhouette jumper
    ctx.fillStyle='#000'; ctx.fillRect(250,148,18,34); ctx.fillRect(246,142,26,10); ctx.fillRect(238,154,12,14); ctx.fillRect(272,154,12,14);
    ctx.fillStyle='rgba(0,0,0,.4)'; ctx.fillRect(0, H-2, W,2);
    ctx.fillStyle='#FFC300'; ctx.font='10px "JetBrains Mono"'; ctx.fillText('DHOL  •  BHANGRA STAGE', 16, H-14);
  }
  function scene4(){ // Highway synthwave — moving grid, car
    const g=ctx.createLinearGradient(0,0,0,168);
    g.addColorStop(0,'#140A2E'); g.addColorStop(0.38,'#FF2B8A'); g.addColorStop(0.72,'#FF8A00'); g.addColorStop(1,'#FFC300');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,168);
    ctx.fillStyle='#FFF3B0'; ctx.beginPath(); ctx.arc(W/2,108,26,0,Math.PI*2); ctx.fill(); ctx.fillStyle='rgba(255,243,176,.28)'; ctx.beginPath(); ctx.arc(W/2,108,46,0,Math.PI*2); ctx.fill();
    // hills
    ctx.fillStyle='#1A0F4A'; ctx.beginPath(); ctx.moveTo(0,168); ctx.lineTo(80,132); ctx.lineTo(180,148); ctx.lineTo(300,116); ctx.lineTo(420,144); ctx.lineTo(540,124); ctx.lineTo(W,168); ctx.closePath(); ctx.fill();
    // grid ground — scrolling
    fill(0,168,W,192,'#070912');
    ctx.strokeStyle='rgba(0,229,255,.42)'; ctx.lineWidth=1;
    const off=(t*0.06)%24;
    for(let y=168;y<H;y+=24){ ctx.beginPath(); ctx.moveTo(0,y+off%24); ctx.lineTo(W,y+off%24); ctx.stroke(); }
    for(let x=0;x<W;x+=48){ ctx.beginPath(); ctx.moveTo(x,168); ctx.lineTo((x-W/2)*2.2+W/2, H); ctx.stroke(); }
    // road perspective
    ctx.fillStyle='#0F0F14'; ctx.beginPath(); ctx.moveTo(W/2-70,168); ctx.lineTo(W/2+70,168); ctx.lineTo(W/2+170,H); ctx.lineTo(W/2-170,H); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#FFC300'; ctx.fillRect(W/2-1,168,2,H-168);
    for(let y=168;y<H;y+=34){ const w=7+(y-168)*0.22; ctx.fillStyle='#FFF'; const yy=y+off%34; if(yy<H) ctx.fillRect(W/2-w/2, yy, w, 6); }
    // car
    const carX=W/2-22, carY=H-46; ctx.fillStyle='#E93030'; ctx.fillRect(carX,carY,44,14); ctx.fillStyle='#AEEBFF'; ctx.fillRect(carX+4,carY-8,36,10); ctx.fillStyle='#FF2B8A'; ctx.fillRect(carX+2,carY+8,8,5); ctx.fillRect(carX+34,carY+8,8,5);
    ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(carX-10,carY+14,64,4);
    // palm
    ctx.fillStyle='#5A3A00'; ctx.fillRect(44,118,8,50); ctx.fillStyle='#1BFF6B'; ctx.fillRect(26,112,44,10); ctx.fillRect(30,104,36,8);
    ctx.fillStyle='#5A3A00'; ctx.fillRect(W-52,122,8,46); ctx.fillStyle='#1BFF6B'; ctx.fillRect(W-70,116,44,10);
    ctx.fillStyle='#FFC300'; ctx.font='10px "JetBrains Mono"'; ctx.fillText('GT ROAD  •  SYNTH 1989', 16, H-14);
  }
  function scene5(){ // Wedding neon — lights twinkle, beams flicker
    skyGrad(['#0F0A1E','#1A0A2E','#2A1050']);
    drawStars(0.85);
    // strings
    ctx.strokeStyle='#2A2A2A'; ctx.lineWidth=2;
    // top string
    ctx.beginPath(); ctx.moveTo(0,56); for(let x=0;x<W;x+=18) ctx.lineTo(x,56+Math.sin(x*0.04)*5); ctx.stroke();
    for(let x=12;x<W;x+=18){ const base=56+Math.sin(x*0.04)*5; const cols=['#FF2B8A','#FFC300','#00E5FF']; const c=cols[x%36/18|0]; const twinkle=Math.sin(t*0.008+x)*0.35+0.65; ctx.globalAlpha=twinkle; ctx.fillStyle=c; ctx.fillRect(x-4,base-4,8,8); ctx.fillStyle='#FFF'; ctx.fillRect(x-2,base-2,4,2); }
    ctx.globalAlpha=1;
    // second string
    ctx.beginPath(); ctx.moveTo(0,88); for(let x=0;x<W;x+=16) ctx.lineTo(x,88+Math.sin(x*0.05+1)*4); ctx.stroke();
    for(let x=16;x<W;x+=16){ const base=88+Math.sin(x*0.05+1)*4; ctx.fillStyle=x%32?'#1BFF6B':'#FF8A00'; const tw=Math.sin(t*0.01+x)*0.4+0.6; ctx.globalAlpha=tw; ctx.fillRect(x-3,base-3,6,6); }
    ctx.globalAlpha=1;
    // floor
    ditherRect(0,210,W,150,'#1A1A1A','#202020');
    ctx.fillStyle='rgba(255,255,255,.05)'; for(let y=210;y<H;y+=18) ctx.fillRect(0,y,W,1);
    // beams flicker
    for(let i=0;i<4;i++){ const lx=80+i*160; const flick=Math.sin(t*0.005+i)*0.08+0.14; const col=i%2?'rgba(255,43,138,':'rgba(0,229,255,'; ctx.fillStyle=col+flick+')'; ctx.beginPath(); ctx.moveTo(lx,118); ctx.lineTo(lx-32,H); ctx.lineTo(lx+32,H); ctx.closePath(); ctx.fill(); }
    // speakers
    ctx.fillStyle='#000'; ctx.fillRect(32,164,40,34); ctx.fillStyle='#2A2A2A'; ctx.fillRect(38,172,12,12); ctx.fillRect(56,172,12,12); ctx.fillStyle='#111'; ctx.fillRect(44,190,12,6);
    ctx.fillStyle='#000'; ctx.fillRect(W-72,164,40,34); ctx.fillStyle='#2A2A2A'; ctx.fillRect(W-66,172,12,12); ctx.fillRect(W-48,172,12,12);
    // couple — gentle sway
    const sway=Math.sin(t*0.002)*4;
    ctx.fillStyle='#FF2B8A'; ctx.fillRect(250+sway,182,16,34); ctx.fillStyle='#00E5FF'; ctx.fillRect(274-sway,182,16,34);
    ctx.fillStyle='#1A1A1A'; ctx.fillRect(248+sway,176,20,10); ctx.fillRect(272-sway,176,20,10);
    // floor sparkle
    if(((t*0.005)|0)%2===0){ ctx.fillStyle='rgba(255,195,0,.07)'; ctx.fillRect(0,0,W,H); }
    ctx.fillStyle='#FFC300'; ctx.font='10px "JetBrains Mono"'; ctx.fillText('VIAH  •  NEON NIGHT', 16, H-14);
  }

  const DRAWERS=[scene0,scene1,scene2,scene3,scene4,scene5];

  function render(){
    // handle dissolve
    if(transition<1){
      transition=Math.min(1, transition+0.06);
      ctx.clearRect(0,0,W,H);
      ctx.globalAlpha=1-transition; ctx.drawImage(prevCanvas,0,0);
      ctx.globalAlpha=transition;
      try{ DRAWERS[current](); }catch(e){ console.error(e); }
      ctx.globalAlpha=1;
      // pixel dissolve overlay
      if(transition<1){
        ctx.fillStyle='rgba(0,0,0,.08)';
        for(let y=0;y<H;y+=8) for(let x=0;x<W;x+=8) if((x+y+((t*0.1)|0))%16===0) ctx.fillRect(x,y,8,8);
      }
    } else {
      ctx.clearRect(0,0,W,H);
      try{ DRAWERS[current](); }catch(e){ console.error(e); }
    }
    // subtle scanline inside canvas
    ctx.fillStyle='rgba(0,0,0,.05)';
    for(let y=0;y<H;y+=4) ctx.fillRect(0,y,W,1);
    ctx.strokeStyle='rgba(0,0,0,.22)'; ctx.lineWidth=2; ctx.strokeRect(0,0,W,H);
  }
  function loop(){ t=performance.now(); render(); rafId=requestAnimationFrame(loop); }
  buildDots(); goTo(0,false); resetAuto(); loop();
  window.__pixelStage={goTo,next,prev, themes:THEMES};
  window.__setPixelMood=function(idx){
    const palettes=[0xFFC300,0xFF2B8A,0xFFD23F,0xE93030,0xFF8A00,0x7A5CFF];
    const c=palettes[idx % palettes.length];
    const ev=new CustomEvent('pixelTheme',{detail:{idx,color:c}}); window.dispatchEvent(ev);
  };
})();
