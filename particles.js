/* ═══════════════════════════════════════════════════
   PARTICLE SYSTEM — Futuristic connected-dot mesh
   with floating holographic orbs and mouse attraction
   ═══════════════════════════════════════════════════ */
(function(){
  const canvas=document.createElement('canvas');
  canvas.id='particleCanvas';
  canvas.style.cssText='position:fixed;inset:0;z-index:1;pointer-events:none';
  document.body.prepend(canvas);
  const ctx=canvas.getContext('2d');

  let W,H,dpr;
  const PARTICLE_COUNT=70;
  const CONNECTION_DIST=160;
  const MOUSE_RADIUS=200;
  let particles=[];
  let orbs=[];
  let mouseX=-9999,mouseY=-9999;

  function resize(){
    dpr=Math.min(window.devicePixelRatio||1,2);
    W=window.innerWidth;H=window.innerHeight;
    canvas.width=W*dpr;canvas.height=H*dpr;
    canvas.style.width=W+'px';canvas.style.height=H+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function colors(){
    const cs=getComputedStyle(document.documentElement);
    const v=n=>cs.getPropertyValue(n).trim();
    return [v('--marigold'),v('--gulabi'),v('--peacock'),v('--zafran')];
  }

  function hexToRgb(hex){
    hex=(hex||'#ffffff').trim();
    if(hex[0]!=='#')return{r:255,g:255,b:255};
    if(hex.length===4)return{r:parseInt(hex[1]+hex[1],16),g:parseInt(hex[2]+hex[2],16),b:parseInt(hex[3]+hex[3],16)};
    return{r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16)};
  }

  function createParticle(){
    const col=colors();
    const c=col[Math.floor(Math.random()*col.length)];
    const rgb=hexToRgb(c);
    return{
      x:Math.random()*W,y:Math.random()*H,
      vx:(Math.random()-.5)*.6,vy:(Math.random()-.5)*.6,
      r:Math.random()*2.5+1.5,
      color:c,rgb,
      alpha:Math.random()*.5+.4,
      pulsePhase:Math.random()*Math.PI*2,
      pulseSpeed:.005+Math.random()*.01
    };
  }

  function createOrb(){
    const col=colors();
    const c=col[Math.floor(Math.random()*col.length)];
    return{
      x:Math.random()*W,y:Math.random()*H,
      vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,
      r:60+Math.random()*100,
      color:c,rgb:hexToRgb(c),
      alpha:.03+Math.random()*.04,
      pulsePhase:Math.random()*Math.PI*2
    };
  }

  function init(){
    resize();
    particles=[];orbs=[];
    for(let i=0;i<PARTICLE_COUNT;i++)particles.push(createParticle());
    for(let i=0;i<6;i++)orbs.push(createOrb());
    window.addEventListener('resize',resize);
    document.addEventListener('mousemove',e=>{mouseX=e.clientX;mouseY=e.clientY});
    document.addEventListener('mouseleave',()=>{mouseX=-9999;mouseY=-9999});
    requestAnimationFrame(tick);
  }

  function tick(now){
    ctx.clearRect(0,0,W,H);
    const col=colors();

    // draw orbs (background glow)
    orbs.forEach(orb=>{
      orb.x+=orb.vx;orb.y+=orb.vy;
      if(orb.x<-orb.r)orb.x=W+orb.r;
      if(orb.x>W+orb.r)orb.x=-orb.r;
      if(orb.y<-orb.r)orb.y=H+orb.r;
      if(orb.y>H+orb.r)orb.y=-orb.r;
      const pulse=Math.sin(now*.001+orb.pulsePhase)*.02;
      const g=ctx.createRadialGradient(orb.x,orb.y,0,orb.x,orb.y,orb.r);
      g.addColorStop(0,`rgba(${orb.rgb.r},${orb.rgb.g},${orb.rgb.b},${orb.alpha+pulse})`);
      g.addColorStop(1,`rgba(${orb.rgb.r},${orb.rgb.g},${orb.rgb.b},0)`);
      ctx.fillStyle=g;
      ctx.fillRect(orb.x-orb.r,orb.y-orb.r,orb.r*2,orb.r*2);
    });

    // update particles
    particles.forEach(p=>{
      // mouse attraction
      const dx=mouseX-p.x,dy=mouseY-p.y;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<MOUSE_RADIUS&&dist>0){
        const force=(MOUSE_RADIUS-dist)/MOUSE_RADIUS*.015;
        p.vx+=dx/dist*force;
        p.vy+=dy/dist*force;
      }
      // damping
      p.vx*=.99;p.vy*=.99;
      // move
      p.x+=p.vx;p.y+=p.vy;
      // wrap
      if(p.x<-10)p.x=W+10;if(p.x>W+10)p.x=-10;
      if(p.y<-10)p.y=H+10;if(p.y>H+10)p.y=-10;
      // pulse
      p.alpha=.3+Math.sin(now*p.pulseSpeed+p.pulsePhase)*.2;
    });

    // draw connections
    for(let i=0;i<particles.length;i++){
      for(let j=i+1;j<particles.length;j++){
        const a=particles[i],b=particles[j];
        const dx=a.x-b.x,dy=a.y-b.y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<CONNECTION_DIST){
          const alpha=(1-dist/CONNECTION_DIST)*.28;
          ctx.beginPath();
          ctx.strokeStyle=`rgba(${a.rgb.r},${a.rgb.g},${a.rgb.b},${alpha})`;
          ctx.lineWidth=.8;
          ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
        }
      }
    }

    // draw particles
    particles.forEach(p=>{
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(${p.rgb.r},${p.rgb.g},${p.rgb.b},${p.alpha})`;
      ctx.fill();
      // glow
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r*3,0,Math.PI*2);
      ctx.fillStyle=`rgba(${p.rgb.r},${p.rgb.g},${p.rgb.b},${p.alpha*.2})`;
      ctx.fill();
    });

    requestAnimationFrame(tick);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
