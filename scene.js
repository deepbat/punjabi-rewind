import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const mount = document.getElementById('scene-mount');
const SONGS = window.SONGS || [];

let renderer, labelRenderer, scene, camera, controls;
let markerGroup, core, coreGlowMaterial, nebula;
let raycaster, pointerNDC = new THREE.Vector2(-10, -10);
let hoveredIndex = -1, selectedIndex = -1;
let focusTarget = null;
let autopilot = false, autopilotT = 0;
let lastFrame = performance.now();
let markers = [];
let radioMoodColor = null;
let pixelThemeIdx = 0;

const COLOR_PUNJABI = 0xEAB308;
const COLOR_HINDI = 0xDC2626;
const COLOR_BEACON = 0x06B6D4;
const COLOR_CORE = 0xEAB308;

init();

function init() {
  if (typeof THREE === 'undefined' || !window.WebGLRenderingContext) { showFallback(); return; }
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070A14, 0.016);

  camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 9, 27);

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: true });
  } catch (e) { showFallback(); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x070A14, 0);
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  mount.appendChild(renderer.domElement);

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.zIndex = '3';
  labelRenderer.domElement.style.pointerEvents = 'none';
  mount.appendChild(labelRenderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.38;
  controls.minDistance = 4;
  controls.maxDistance = 55;
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI * 0.82;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.addEventListener('start', onUserInteract);

  raycaster = new THREE.Raycaster();
  raycaster.params.Points = { threshold: 0.5 };

  buildStarfield();
  buildNebula();
  buildCore();
  buildSongMarkers();
  buildBeacons();

  scene.add(new THREE.AmbientLight(0xffffff, 1.0));
  const dir = new THREE.DirectionalLight(0xFFF8E6, 1.1); dir.position.set(5,10,7); scene.add(dir);

  window.addEventListener('resize', onResize);
  renderer.domElement.addEventListener('pointermove', onPointerMove, { passive: true });
  renderer.domElement.addEventListener('pointerdown', onPointerDownTrack, { passive: true });
  renderer.domElement.addEventListener('pointerup', onPointerUpTrack, { passive: true });
  renderer.domElement.addEventListener('wheel', onUserInteract, { passive: true });

  window.__focusMarker = focusMarkerByIndex;
  window.__setRadioMood = setRadioMood;
  window.__enterAutopilot = enterAutopilot;
  window.__exitAutopilot = exitAutopilot;
  window.__setPixelMood = setPixelMood;
  window.addEventListener('pixelTheme', e=>{
    if(e.detail && typeof e.detail.idx==='number') setPixelMood(e.detail.idx);
  });
  animate();
}

function showFallback(){ const fb=document.getElementById('sceneFallback'); if(fb) fb.hidden=false; }

/* soft glow */
function glowTexture(hex){
  const s=128; const c=document.createElement('canvas'); c.width=c.height=s;
  const ctx=c.getContext('2d'); const col=new THREE.Color(hex);
  const r=Math.round(col.r*255), g=Math.round(col.g*255), b=Math.round(col.b*255);
  const g2=ctx.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
  g2.addColorStop(0,'rgba(255,255,255,1)'); g2.addColorStop(0.18,`rgba(${r},${g},${b},1)`); g2.addColorStop(0.45,`rgba(${r},${g},${b},.42)`); g2.addColorStop(1,`rgba(${r},${g},${b},0)`);
  ctx.fillStyle=g2; ctx.fillRect(0,0,s,s);
  const tex=new THREE.CanvasTexture(c); tex.needsUpdate=true; return tex;
}
function starTexture(){
  const s=64; const c=document.createElement('canvas'); c.width=c.height=s;
  const ctx=c.getContext('2d');
  const g=ctx.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
  g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.3,'rgba(255,255,255,.9)'); g.addColorStop(0.5,'rgba(255,255,255,.28)'); g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,s,s);
  const tex=new THREE.CanvasTexture(c); tex.needsUpdate=true; return tex;
}

function buildStarfield(){
  const count = window.innerWidth < 640 ? 3200 : 6500;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette=[new THREE.Color(0xFFF8E6), new THREE.Color(0x9AA3BD), new THREE.Color(0x06B6D4), new THREE.Color(0xEAB308)];
  for(let i=0;i<count;i++){
    const r=42+Math.random()*155;
    const theta=Math.random()*Math.PI*2; const phi=Math.acos((Math.random()*2)-1);
    positions[i*3]=r*Math.sin(phi)*Math.cos(theta);
    positions[i*3+1]=r*Math.cos(phi)*0.58;
    positions[i*3+2]=r*Math.sin(phi)*Math.sin(theta);
    const c=palette[Math.floor(Math.random()*palette.length)];
    colors[i*3]=c.r; colors[i*3+1]=c.g; colors[i*3+2]=c.b;
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions,3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors,3));
  const mat=new THREE.PointsMaterial({size:0.62, map:starTexture(), vertexColors:true, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, sizeAttenuation:true});
  const stars=new THREE.Points(geo,mat); scene.add(stars); stars.userData.isStarfield=true; scene.userData.starfield=stars;
}

function buildNebula(){
  const mk=(hex, opacity, pos, scale)=>{
    const mat=new THREE.SpriteMaterial({map:glowTexture(hex), transparent:true, opacity, depthWrite:false, blending:THREE.AdditiveBlending});
    const s=new THREE.Sprite(mat); s.scale.set(scale,scale,1); s.position.copy(pos); scene.add(s); return s;
  };
  nebula=mk(0x06B6D4,0.11,new THREE.Vector3(-10,4,-30),92);
  mk(0xEC4899,0.09,new THREE.Vector3(22,-6,-25),72);
  mk(0xEAB308,0.07,new THREE.Vector3(0,12,-40),108);
}

function buildCore(){
  const geo=new THREE.IcosahedronGeometry(2.5, 1);
  const mat=new THREE.MeshStandardMaterial({color:COLOR_CORE, emissive:COLOR_CORE, emissiveIntensity:0.18, roughness:0.42, metalness:0.18});
  core=new THREE.Mesh(geo,mat); scene.add(core);
  const wire=new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({color:0xFFF8E6, transparent:true, opacity:0.14}));
  core.add(wire);
  coreGlowMaterial=new THREE.SpriteMaterial({map:glowTexture(COLOR_CORE), transparent:true, opacity:0.42, depthWrite:false, blending:THREE.AdditiveBlending});
  const glow=new THREE.Sprite(coreGlowMaterial); glow.scale.set(11,11,1); core.add(glow);
  const ringGeo=new THREE.TorusGeometry(3.9,0.04,12,28);
  const ringMat=new THREE.MeshBasicMaterial({color:0xFFF8E6, transparent:true, opacity:0.18});
  const ring=new THREE.Mesh(ringGeo,ringMat); ring.rotation.x=Math.PI*0.5; core.add(ring);
  core.userData.ring=ring;
}

function buildSongMarkers(){
  markerGroup=new THREE.Group(); scene.add(markerGroup);
  const total=Math.max(SONGS.length,1);
  SONGS.forEach((song,i)=>{
    const t=i/total; const angle=t*Math.PI*6.2; const radius=7+t*12.5; const y=Math.sin(t*Math.PI*3)*2.2;
    const isHindi=song.lang==='hindi'; const color=isHindi?COLOR_HINDI:COLOR_PUNJABI;
    const mat=new THREE.SpriteMaterial({map:glowTexture(color), transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, color:0xffffff});
    const sprite=new THREE.Sprite(mat);
    sprite.scale.set(1.4,1.4,1);
    sprite.position.set(Math.cos(angle)*radius, y, Math.sin(angle)*radius);
    sprite.userData.index=i; sprite.userData.baseScale=1.4; sprite.userData.bobPhase=Math.random()*Math.PI*2;
    markerGroup.add(sprite);
    const labelDiv=document.createElement('div'); labelDiv.className='star-label'; labelDiv.textContent=song.title;
    const label=new CSS2DObject(labelDiv); label.position.set(0,0.95,0); sprite.add(label); sprite.userData.labelEl=labelDiv;
    markers.push(sprite);
  });
}

function buildBeacons(){
  const stations=window.RADIO_STATIONS||[]; const group=new THREE.Group(); scene.add(group);
  stations.forEach((st,i)=>{
    const angle=(i/Math.max(stations.length,1))*Math.PI*2; const radius=22;
    const mat=new THREE.SpriteMaterial({map:glowTexture(COLOR_BEACON), transparent:true, depthWrite:false, blending:THREE.AdditiveBlending});
    const sprite=new THREE.Sprite(mat); sprite.scale.set(1.7,1.7,1); sprite.position.set(Math.cos(angle)*radius,5,Math.sin(angle)*radius); group.add(sprite);
    const labelDiv=document.createElement('div'); labelDiv.className='star-label visible'; labelDiv.textContent=st.name; const label=new CSS2DObject(labelDiv); label.position.set(0,1.1,0); sprite.add(label);
  });
}

function onResize(){
  camera.aspect=window.innerWidth/window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight); labelRenderer.setSize(window.innerWidth, window.innerHeight);
}
function onPointerMove(e){ pointerNDC.x=(e.clientX/window.innerWidth)*2-1; pointerNDC.y=-(e.clientY/window.innerHeight)*2+1; }
let downX=0,downY=0;
function onPointerDownTrack(e){ downX=e.clientX; downY=e.clientY; }
function onPointerUpTrack(e){
  onUserInteract(); document.getElementById('onboardHint')?.classList.add('faded');
  const moved=Math.hypot(e.clientX-downX,e.clientY-downY); if(moved>6) return;
  pointerNDC.x=(e.clientX/window.innerWidth)*2-1; pointerNDC.y=-(e.clientY/window.innerHeight)*2+1;
  raycaster.setFromCamera(pointerNDC,camera);
  const hits=raycaster.intersectObjects(markerGroup.children);
  if(hits.length){ const idx=hits[0].object.userData.index; if(window.selectSong) window.selectSong(idx,true); focusMarkerByIndex(idx); }
}
let idleTimer=null;
function onUserInteract(){
  window.__enterExperience?.(); if(autopilot) exitAutopilot();
  document.getElementById('onboardHint')?.classList.add('faded');
  clearTimeout(idleTimer);
}
function focusMarkerByIndex(i){
  const marker=markers[i]; if(!marker) return; selectedIndex=i;
  const worldPos=new THREE.Vector3(); marker.getWorldPosition(worldPos);
  focusTarget={position:worldPos, distance:6.5};
  markers.forEach((m,idx)=>{
    m.userData.labelEl?.classList.toggle('visible', idx===i || idx===hoveredIndex);
    m.userData.labelEl?.classList.toggle('playing', idx===i);
  });
  const art=document.getElementById('trackArt'); if(art) art.textContent = SONGS[i]?.title?.[0] || '♪';
}
function setRadioMood(stationIndex){
  if(stationIndex===null||stationIndex===undefined){ radioMoodColor=null; scene.fog.color.set(0x070A14); coreGlowMaterial.color.set(0xffffff); document.querySelector('.live-radio')?.classList.remove('playing'); return; }
  const moods=[0xEAB308,0xDC2626,0x06B6D4,0x10B981];
  const c=new THREE.Color(moods[stationIndex % moods.length]); radioMoodColor=c;
  scene.fog.color.copy(c).multiplyScalar(0.20);
  coreGlowMaterial.color.copy(c);
  document.querySelector('.live-radio')?.classList.add('playing');
}
function setPixelMood(idx){
  pixelThemeIdx=idx;
  const palettes=[0xEAB308,0xDC2626,0xFFD23F,0x06B6D4,0xF59E0B,0xEC4899];
  const c=new THREE.Color(palettes[idx % palettes.length]);
  if(!radioMoodColor){
    scene.fog.color.copy(c).multiplyScalar(0.15);
    scene.fog.color.offsetHSL(0, -0.08, -0.06);
    coreGlowMaterial.color.copy(c);
    core.material.color.copy(c);
    core.material.emissive.copy(c);
    core.userData.ring.material.color.copy(c);
  }
}
function enterAutopilot(){ autopilot=true; autopilotT=0; controls.enabled=false; focusTarget=null; document.getElementById('liveModeBtn')?.setAttribute('aria-pressed','true'); }
function exitAutopilot(){ if(!autopilot) return; autopilot=false; controls.enabled=true; document.getElementById('liveModeBtn')?.setAttribute('aria-pressed','false'); }

function animate(){
  requestAnimationFrame(animate);
  const now=performance.now(); const dt=Math.min((now-lastFrame)/1000,0.05); lastFrame=now;
  if(core){ core.rotation.y+=dt*0.14; core.rotation.x+=dt*0.04; if(core.userData.ring) core.userData.ring.rotation.z+=dt*0.30; }
  if(scene.userData.starfield) scene.userData.starfield.rotation.y+=dt*0.005;
  const np=(window.__nowPlaying && window.__nowPlaying())||null;
  markers.forEach((m,idx)=>{
    const isPlaying=np&&np.playing&&idx===selectedIndex;
    const bob=Math.sin(now*0.0016 + m.userData.bobPhase)*0.10;
    m.position.y += (bob - (m.userData.lastBob||0))*0.08; m.userData.lastBob=bob;
    const pulse=isPlaying?1+Math.sin(now*0.006)*0.26:1;
    const selectedBoost=idx===selectedIndex?1.75:(idx===hoveredIndex?1.32:1);
    const s=m.userData.baseScale*selectedBoost*pulse;
    m.scale.set(s,s,1);
  });
  if(!autopilot){
    raycaster.setFromCamera(pointerNDC,camera);
    const hits=raycaster.intersectObjects(markerGroup.children);
    const newHover=hits.length?hits[0].object.userData.index:-1;
    if(newHover!==hoveredIndex){ hoveredIndex=newHover; markers.forEach((m,idx)=>{ m.userData.labelEl?.classList.toggle('visible', idx===hoveredIndex || idx===selectedIndex); }); }
  }
  if(autopilot){
    autopilotT+=dt; const beatMs=(np&&np.beatMs)||900; const speed=0.16+(18000/beatMs)*0.002;
    const radius=14+Math.sin(autopilotT*0.15)*4; const angle=autopilotT*speed;
    camera.position.set(Math.cos(angle)*radius, 4+Math.sin(autopilotT*0.3)*2.5, Math.sin(angle)*radius);
    controls.target.set(0,0,0); camera.lookAt(0,0,0);
  } else if(focusTarget){
    controls.target.lerp(focusTarget.position,0.06);
    const dir=new THREE.Vector3().subVectors(camera.position, controls.target); const currentDist=dir.length(); dir.normalize();
    const nextDist=THREE.MathUtils.lerp(currentDist, focusTarget.distance,0.06);
    const desired=new THREE.Vector3().copy(controls.target).add(dir.multiplyScalar(nextDist));
    camera.position.lerp(desired,0.06); if(Math.abs(nextDist-focusTarget.distance)<0.05) focusTarget=null;
  }
  if(!autopilot) controls.update();
  renderer.render(scene,camera); labelRenderer.render(scene,camera);
}
