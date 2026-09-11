/* ============================================================
   PUNJABI REWIND — STUDIO WORLD scene
   Original concept: a futuristic personal studio / control room.
   NOT a copy of any existing site. All music logic lives in
   assets/app.bundle.js and is only *triggered* from here —
   nothing is reimplemented or removed.
   ============================================================ */
/* ---------- resilient loader: never a blank page ----------
   The 3D world is progressive enhancement over the fully working
   music site. If the CDN, WebGL, or first frame fails, we drop to
   a styled 2D player (body.studio-2d) instead of blackness. */
function enter2D(msg) {
  if (window.__studioOK || window.__studio2D) return;
  document.body.classList.add('studio-2d');
  document.body.classList.remove('studio-3d');
  const st = document.getElementById('studio3DStatus');
  if (st) st.textContent = msg || '3D unavailable.';
  if (window.__studioFallback2D) { window.__studioFallback2D(msg); return; }
  window.__studio2D = true;
  const f = document.getElementById('studioFallback');
  if (f) f.hidden = false;
}

let THREE = null;
const THREE_URLS = [
  'three',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.min.js',
  'https://unpkg.com/three@0.160.0/build/three.module.js',
];
for (const url of THREE_URLS) {
  try { THREE = await import(/* @vite-ignore */url); break; }
  catch (_) { /* try next CDN */ }
}
if (!THREE) { enter2D('3D library unreachable — full player below.'); throw new Error('studio: three.js unreachable'); }
function setStatusEarly(t) { const el = document.getElementById('studio3DStatus'); if (el) el.textContent = t; }
setStatusEarly('Building studio…');

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if ('ontouchstart' in window) document.body.classList.add('touch');

/* ---------- viewpoints ---------- */
const VIEWS = {
  home:    { pos: [0, 2.1, 7.4],  yaw: 0,            pitch: -0.06 },
  console: { pos: [0, 1.9, 3.4],  yaw: 0,            pitch: -0.28 },
  songs:   { pos: [0, 2.2, 1.6],  yaw: 0,            pitch: 0.10 },
  radio:   { pos: [4.6, 2.0, 2.6], yaw: -Math.PI / 2.6, pitch: -0.05 },
  shelves: { pos: [-4.4, 2.0, 2.8], yaw: Math.PI / 2.6, pitch: -0.02 },
  mic:     { pos: [-4.2, 1.9, -2.6], yaw: Math.PI / 1.35, pitch: 0 },
  gallery: { pos: [4.4, 2.0, -2.4], yaw: -Math.PI / 1.35, pitch: 0 },
  clock:   { pos: [2.2, 1.8, -4.6], yaw: Math.PI,     pitch: 0.05 },
  stats:   { pos: [-2.0, 2.2, -4.4], yaw: Math.PI * 0.92, pitch: 0.12 },
};

/* ---------- renderer / scene ---------- */
let renderer;
try {
  const test = document.createElement('canvas');
  if (!(window.WebGLRenderingContext && (test.getContext('webgl2') || test.getContext('webgl')))) {
    throw new Error('webgl-unavailable');
  }
  renderer = new THREE.WebGLRenderer({ canvas: $('studioCanvas'), antialias: true });
} catch (e) { enter2D('WebGL unavailable on this device — full player below.'); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

// The world renders inside the normal page window (#studioStage), never fullscreen.
function setStatus(t) { const el = $('studio3DStatus'); if (el) el.textContent = t; }
function fitStage() {
  try {
    const stage = $('studioStage');
    const w = Math.max(50, stage ? stage.clientWidth : innerWidth);
    const h = Math.max(50, stage ? stage.clientHeight : innerHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  } catch (_) { /* stage not laid out yet */ }
}
fitStage();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04060c);
scene.fog = new THREE.Fog(0x04060c, 14, 34);

const camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.1, 100);
const rig = { pos: new THREE.Vector3(...VIEWS.home.pos), yaw: VIEWS.home.yaw, pitch: VIEWS.home.pitch };
let flyTarget = null;

scene.add(new THREE.HemisphereLight(0x8fb8ff, 0x1a0f04, 0.55));
const key = new THREE.DirectionalLight(0xfff2d9, 1.15);
key.position.set(5, 8, 6);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -12; key.shadow.camera.right = 12;
key.shadow.camera.top = 10; key.shadow.camera.bottom = -10;
scene.add(key);
const cyanPt = new THREE.PointLight(0x5bd6ff, 22, 20); cyanPt.position.set(-5, 3.4, 2); scene.add(cyanPt);
const magentaPt = new THREE.PointLight(0xff4fd8, 18, 20); magentaPt.position.set(5, 3.2, -1); scene.add(magentaPt);
const amberPt = new THREE.PointLight(0xeca31c, 26, 14); amberPt.position.set(0, 2.6, 4.2); scene.add(amberPt);
const spot = new THREE.SpotLight(0xffffff, 60, 18, Math.PI / 5, 0.45);
spot.position.set(0, 5.6, 5.4); spot.target.position.set(0, 1, -3);
spot.castShadow = true; scene.add(spot, spot.target);

/* ---------- materials ---------- */
const M = {
  floor: new THREE.MeshStandardMaterial({ color: 0x0b0e15, roughness: 0.32, metalness: 0.72 }),
  wall: new THREE.MeshStandardMaterial({ color: 0x0d1320, roughness: 0.9, metalness: 0.15 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x11151f, roughness: 0.55, metalness: 0.5 }),
  desk: new THREE.MeshStandardMaterial({ color: 0x161b27, roughness: 0.4, metalness: 0.65 }),
  amber: new THREE.MeshStandardMaterial({ color: 0x201503, emissive: 0xeca31c, emissiveIntensity: 1.4 }),
  cyan: new THREE.MeshStandardMaterial({ color: 0x06222e, emissive: 0x5bd6ff, emissiveIntensity: 1.5 }),
  magenta: new THREE.MeshStandardMaterial({ color: 0x2b0a24, emissive: 0xff4fd8, emissiveIntensity: 1.2 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x8fb8ff, transparent: true, opacity: 0.14, roughness: 0.1, metalness: 0 }),
};
function box(w, h, d, mat, x, y, z, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true;
  scene.add(m); return m;
}
function labelSprite(text, sub, color = '#5BD6FF') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(4,8,14,0.72)';
  if (g.roundRect) { g.beginPath(); g.roundRect(6, 6, 500, 148, 26); g.fill(); }
  else g.fillRect(6, 6, 500, 148);
  g.strokeStyle = color; g.lineWidth = 4;
  if (g.roundRect) { g.beginPath(); g.roundRect(6, 6, 500, 148, 26); g.stroke(); }
  else g.strokeRect(6, 6, 500, 148);
  g.fillStyle = '#fff'; g.font = '700 52px Work Sans, sans-serif'; g.textAlign = 'center';
  g.fillText(text, 256, 78);
  g.fillStyle = '#9fb3c8'; g.font = '400 30px JetBrains Mono, monospace';
  g.fillText(sub || '', 256, 122);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(2.2, 0.69, 1); return s;
}

/* ---------- room shell ---------- */
const ROOM = { w: 13, d: 17, h: 6 };
const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), M.floor);
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const grid = new THREE.GridHelper(ROOM.w, 26, 0x5bd6ff, 0x1c2a44);
grid.position.y = 0.01; grid.material.transparent = true; grid.material.opacity = 0.35; scene.add(grid);

function wall(w, h, x, y, z, ry) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.wall);
  m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; scene.add(m); return m;
}
wall(ROOM.w, ROOM.h, 0, 3, -ROOM.d / 2, 0);
wall(ROOM.w, ROOM.h, 0, 3, ROOM.d / 2, Math.PI);
wall(ROOM.d, ROOM.h, -ROOM.w / 2, 3, 0, Math.PI / 2);
wall(ROOM.d, ROOM.h, ROOM.w / 2, 3, 0, -Math.PI / 2);
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d),
  new THREE.MeshStandardMaterial({ color: 0x070b13, roughness: 0.95 }));
ceil.rotation.x = Math.PI / 2; ceil.position.y = ROOM.h; scene.add(ceil);
// neon skirting
const skirtGeo = new THREE.BoxGeometry(ROOM.w, 0.05, 0.05);
[[0, -ROOM.d / 2 + 0.05, M.cyan], [0, ROOM.d / 2 - 0.05, M.magenta]].forEach(([x, z, m]) => {
  const s = new THREE.Mesh(skirtGeo, m); s.position.set(x, 0.06, z); scene.add(s);
});
// ceiling light panels
for (let i = -1; i <= 1; i++) {
  const p = box(2.4, 0.06, 1.1, M.cyan, i * 3.4, ROOM.h - 0.05, 0, false);
  p.material = M.cyan;
}
// window slits with night city glow
for (let i = -2; i <= 2; i++) {
  const wmesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.9),
    new THREE.MeshStandardMaterial({ color: 0x02040a, emissive: 0x274b7a, emissiveIntensity: 0.9 }));
  wmesh.position.set(i * 2.2, 3.6, -ROOM.d / 2 + 0.02); scene.add(wmesh);
}

/* ---------- interactables registry ---------- */
const interactables = [];
function markInteractive(root, action, title, sub) {
  root.userData.action = action;
  root.traverse((o) => { o.userData.actionRoot = root; });
  const tag = labelSprite(title, sub, action === 'radio' ? '#ECA31C' : '#5BD6FF');
  tag.position.copy(root.position).add(new THREE.Vector3(0, root.userData.tagY || 1.6, 0));
  scene.add(tag); root.userData.tag = tag;
  interactables.push(root);
}

/* ---------- 1 · main screen wall (songs) ---------- */
const screenGroup = new THREE.Group(); screenGroup.position.set(0, 2.9, -ROOM.d / 2 + 0.25); scene.add(screenGroup);
const screenCanvas = document.createElement('canvas'); screenCanvas.width = 1024; screenCanvas.height = 420;
const screenTex = new THREE.CanvasTexture(screenCanvas); screenTex.colorSpace = THREE.SRGBColorSpace;
const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 3.1),
  new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 1.1 }));
screenGroup.add(screenMesh);
const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(8.0, 3.5, 0.12), M.desk);
screenFrame.position.z = -0.08; screenGroup.add(screenFrame);
screenGroup.userData.tagY = 2.4;
markInteractive(screenGroup, 'songs', 'WALL OF SOUND', 'tap — browse 50 tracks');
function drawScreen() {
  const g = screenCanvas.getContext('2d');
  const np = (window.__nowPlaying && window.__nowPlaying()) || {};
  g.fillStyle = '#05080f'; g.fillRect(0, 0, 1024, 420);
  const grad = g.createLinearGradient(0, 0, 1024, 0);
  grad.addColorStop(0, '#0b2036'); grad.addColorStop(1, '#2b0f2e');
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 120);
  g.fillStyle = '#5BD6FF'; g.font = '600 26px JetBrains Mono, monospace';
  g.fillText('PUNJABI REWIND · 50 ALL-TIME HITS', 36, 52);
  g.fillStyle = '#fff'; g.font = '800 64px Anton, sans-serif';
  g.fillText(String(np.title || 'Pick a track').slice(0, 26).toUpperCase(), 36, 118);
  g.fillStyle = '#9fb3c8'; g.font = '400 30px Work Sans, sans-serif';
  const songs = window.SONGS || [];
  songs.slice(0, 8).forEach((s, i) => {
    const y = 176 + i * 30; const active = i === ((np.index || 0) % 8);
    g.fillStyle = active ? '#ECA31C' : 'rgba(255,255,255,0.75)';
    g.font = (active ? '700 ' : '400 ') + '26px JetBrains Mono, monospace';
    g.fillText(`${String(i + 1).padStart(2, '0')}  ${s.title} — ${s.artist}`.slice(0, 52), 36, y);
  });
  g.fillStyle = 'rgba(91,214,255,.9)'; g.font = '600 24px JetBrains Mono, monospace';
  g.fillText('◉ TAP WALL TO OPEN THE FULL TRACK LEDGER', 36, 392);
  screenTex.needsUpdate = true;
}

/* ---------- 2 · console desk (transport) ---------- */
const consoleGroup = new THREE.Group(); consoleGroup.position.set(0, 0, 4.4); scene.add(consoleGroup);
const deskTop = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.18, 1.7), M.desk);
deskTop.position.y = 1.02; deskTop.castShadow = deskTop.receiveShadow = true; consoleGroup.add(deskTop);
[[-2.4], [2.4]].forEach(([x]) => {
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.0, 1.4), M.dark);
  leg.position.set(x, 0.5, 0); leg.castShadow = true; consoleGroup.add(leg);
});
const deckGlow = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 1.3),
  new THREE.MeshStandardMaterial({ color: 0x000, emissive: 0xeca31c, emissiveIntensity: 0.55 }));
deckGlow.rotation.x = -Math.PI / 2; deckGlow.position.y = 1.12; consoleGroup.add(deckGlow);
// jog wheels
const wheels = [];
[[-1.5], [1.5]].forEach(([x]) => {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 40),
    new THREE.MeshStandardMaterial({ color: 0x141821, roughness: 0.25, metalness: 0.85 }));
  w.position.set(x, 1.18, 0); w.castShadow = true; consoleGroup.add(w); wheels.push(w);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), M.amber);
  dot.position.set(x, 1.26, 0.32); consoleGroup.add(dot);
});
// faders
for (let i = 0; i < 5; i++) {
  const f = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x111, emissive: i === 2 ? 0xff4fd8 : 0x5bd6ff, emissiveIntensity: 1.2 }));
  f.position.set(-0.6 + i * 0.3, 1.16, 0.1); consoleGroup.add(f);
}
consoleGroup.userData.tagY = 1.9;
markInteractive(consoleGroup, 'console', 'CONTROL DECK', 'tap — transport + now playing');

/* ---------- 3 · radio tower ---------- */
const radioGroup = new THREE.Group(); radioGroup.position.set(5.2, 0, 2.2); scene.add(radioGroup);
const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, 3.6, 12), M.dark);
mast.position.y = 1.8; mast.castShadow = true; radioGroup.add(mast);
const dish = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14, 0, Math.PI * 2, 0, 1.2),
  new THREE.MeshStandardMaterial({ color: 0x1a2233, roughness: 0.3, metalness: 0.8, side: THREE.DoubleSide }));
dish.position.y = 3.3; dish.rotation.x = Math.PI / 3; radioGroup.add(dish);
const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), M.amber.clone());
beacon.position.y = 3.75; radioGroup.add(beacon);
const rings = [];
for (let i = 0; i < 3; i++) {
  const r = new THREE.Mesh(new THREE.TorusGeometry(0.5 + i * 0.35, 0.02, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0xeca31c, transparent: true, opacity: 0.7 - i * 0.18 }));
  r.position.y = 3.3; r.rotation.x = Math.PI / 2; radioGroup.add(r); rings.push(r);
}
const radioBase = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.5, 24), M.desk);
radioBase.position.y = 0.25; radioBase.castShadow = radioBase.receiveShadow = true; radioGroup.add(radioBase);
radioGroup.userData.tagY = 4.4;
markInteractive(radioGroup, 'radio', 'RADIO MAST', 'tap — live stations');

/* ---------- 4 · playlist shelves ---------- */
const shelfGroup = new THREE.Group(); shelfGroup.position.set(-5.6, 0, 1.2); shelfGroup.rotation.y = Math.PI / 2; scene.add(shelfGroup);
const playlistColors = [0xeca31c, 0x5bd6ff, 0xff4fd8, 0x4fbe8c, 0xb79cff];
for (let s = 0; s < 3; s++) {
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.1, 0.8), M.desk);
  shelf.position.set(0, 1.1 + s * 0.95, 0); shelf.castShadow = shelf.receiveShadow = true; shelfGroup.add(shelf);
}
const playlistCubes = [];
const PL_NAMES = (window.PLAYLISTS || []).map((p) => p.name).concat(['Chill', 'Workout', 'Retro', 'Late Night', 'Party']).slice(0, 5);
for (let i = 0; i < 5; i++) {
  const cube = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x10141d, emissive: playlistColors[i], emissiveIntensity: 0.85, roughness: 0.35 }));
  cube.position.set(-1.6 + i * 0.8, 1.55 + (i % 3) * 0.95, 0); cube.castShadow = true;
  shelfGroup.add(cube); playlistCubes.push(cube);
}
shelfGroup.userData.tagY = 3.9;
markInteractive(shelfGroup, 'playlists', 'VINYL SHELVES', 'tap — curated playlists');

/* ---------- 5 · lyric mic booth ---------- */
const micGroup = new THREE.Group(); micGroup.position.set(-4.6, 0, -4.4); scene.add(micGroup);
const booth = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.6, 24, 1, true),
  new THREE.MeshStandardMaterial({ color: 0x101828, transparent: true, opacity: 0.35, side: THREE.DoubleSide, roughness: 0.2 }));
booth.position.y = 1.3; micGroup.add(booth);
const micStand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 10), M.dark);
micStand.position.y = 0.9; micGroup.add(micStand);
const micHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 18), M.magenta.clone());
micHead.position.y = 1.7; micGroup.add(micHead);
micGroup.userData.tagY = 3.1;
markInteractive(micGroup, 'lyrics', 'VOCAL BOOTH', 'tap — lyrics + stories');

/* ---------- 6 · artist gallery ---------- */
const galleryGroup = new THREE.Group(); galleryGroup.position.set(4.8, 2.5, -3.4); galleryGroup.rotation.y = -Math.PI / 2.4; scene.add(galleryGroup);
for (let i = 0; i < 4; i++) {
  const fr = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.3, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x0a0d14, emissive: [0xeca31c, 0x5bd6ff, 0xff4fd8, 0x4fbe8c][i], emissiveIntensity: 0.5 }));
  fr.position.set(-1.8 + i * 1.2, (i % 2) * 0.25, 0); galleryGroup.add(fr);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.3, 28),
    new THREE.MeshBasicMaterial({ color: 0xffffff }));
  disc.position.set(-1.8 + i * 1.2, (i % 2) * 0.25, 0.06); galleryGroup.add(disc);
}
galleryGroup.userData.tagY = 1.6;
markInteractive(galleryGroup, 'artists', 'GALLERY WALL', 'tap — artists A–Z');

/* ---------- 7 · history clock obelisk ---------- */
const clockGroup = new THREE.Group(); clockGroup.position.set(2.4, 0, -5.6); scene.add(clockGroup);
const obelisk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.0, 0.9), M.desk);
obelisk.position.y = 1.5; obelisk.castShadow = obelisk.receiveShadow = true; clockGroup.add(obelisk);
const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.32, 32),
  new THREE.MeshStandardMaterial({ color: 0x000, emissive: 0x5bd6ff, emissiveIntensity: 1.3 }));
clockFace.position.set(0, 2.3, 0.47); clockGroup.add(clockFace);
const clockHand = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.02),
  new THREE.MeshBasicMaterial({ color: 0xffffff }));
clockHand.geometry.translate(0, 0.11, 0); clockHand.position.set(0, 2.3, 0.49); clockGroup.add(clockHand);
const queuePods = [];
for (let i = 0; i < 3; i++) {
  const pod = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), M.cyan.clone());
  pod.position.set(-0.9 - i * 0.45, 0.6 + i * 0.35, 1.0); clockGroup.add(pod); queuePods.push(pod);
}
clockGroup.userData.tagY = 3.7;
markInteractive(clockGroup, 'history', 'MEMORY CLOCK', 'tap — history + queue');

/* ---------- 8 · stats hologram ---------- */
const statsGroup = new THREE.Group(); statsGroup.position.set(-2.4, 2.2, -5.4); scene.add(statsGroup);
const holo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0),
  new THREE.MeshStandardMaterial({ color: 0x0a2a3a, emissive: 0x5bd6ff, emissiveIntensity: 1.1, wireframe: true }));
statsGroup.add(holo);
const holoBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 0.25, 24), M.desk);
holoBase.position.y = -1.5; statsGroup.add(holoBase);
const holoBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.3, 1.4, 12, 1, true),
  new THREE.MeshBasicMaterial({ color: 0x5bd6ff, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
holoBeam.position.y = -0.75; statsGroup.add(holoBeam);
statsGroup.userData.tagY = 1.4;
markInteractive(statsGroup, 'stats', 'DATA ORB', 'tap — stats + EQ + sleep');

/* ---------- visualizer bars + dust ---------- */
const vizBars = [];
{
  const geo = new THREE.BoxGeometry(0.22, 1, 0.22);
  for (let i = 0; i < 28; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0a0d14, emissive: i % 3 === 0 ? 0xeca31c : i % 3 === 1 ? 0x5bd6ff : 0xff4fd8,
      emissiveIntensity: 1.0,
    });
    const b = new THREE.Mesh(geo, mat);
    const side = i < 14 ? -1 : 1;
    const k = i % 14;
    b.position.set(side * (ROOM.w / 2 - 0.35), 0.5, -6 + k * 0.9);
    b.castShadow = false; scene.add(b); vizBars.push(b);
  }
}
const dust = (() => {
  const n = 320; const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * ROOM.w;
    pos[i * 3 + 1] = Math.random() * ROOM.h;
    pos[i * 3 + 2] = (Math.random() - 0.5) * ROOM.d;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x5bd6ff, size: 0.035, transparent: true, opacity: 0.55 }));
  scene.add(p); return p;
})();

/* ---------- movement + look ---------- */
const keys = new Set();
// Capture phase: movement keys steer the avatar; stop them reaching the
// preserved player's own shortcuts (arrows/WASD would otherwise also
// skip tracks / focus search). Space (play), Esc, M/F/L, Ctrl+/ pass through.
const MOVE_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
addEventListener('keydown', (e) => {
  if (e.target.matches('input,textarea,select')) return;
  if (MOVE_CODES.has(e.code)) {
    keys.add(e.code);
    e.stopPropagation();
    if (e.code.startsWith('Arrow')) e.preventDefault();
  }
}, true);
addEventListener('keyup', (e) => keys.delete(e.code));

let dragging = false, dragMoved = 0, lastX = 0, lastY = 0, downX = 0, downY = 0, downT = 0;
const canvas = $('studioCanvas');
canvas.style.touchAction = 'none';
canvas.addEventListener('pointerdown', (e) => {
  dragging = true; dragMoved = 0; lastX = downX = e.clientX; lastY = downY = e.clientY; downT = performance.now();
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) { hover(e); return; }
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  dragMoved += Math.abs(dx) + Math.abs(dy);
  rig.yaw -= dx * 0.0032; rig.pitch = clamp(rig.pitch - dy * 0.0026, -0.7, 0.55);
  lastX = e.clientX; lastY = e.clientY;
});
canvas.addEventListener('pointerup', (e) => {
  dragging = false;
  if (dragMoved < 8 && performance.now() - downT < 600) tap(e);
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, rig.yaw, 0, 'YXZ'));
  rig.pos.addScaledVector(dir, -Math.sign(e.deltaY) * 0.55);
  clampPos();
}, { passive: false });

function clampPos() {
  rig.pos.x = clamp(rig.pos.x, -ROOM.w / 2 + 1, ROOM.w / 2 - 1);
  rig.pos.z = clamp(rig.pos.z, -ROOM.d / 2 + 1, ROOM.d / 2 - 1);
  rig.pos.y = clamp(rig.pos.y, 1.1, 4.4);
  // keep out of the desk core
  if (Math.abs(rig.pos.x) < 3.1 && rig.pos.z > 3.0 && rig.pos.z < 5.9) rig.pos.z = 3.0;
}

// joystick
const stick = { x: 0, y: 0, id: null };
const stickEl = $('studioStick'), knobEl = $('studioStickKnob');
function stickCenter() { const r = stickEl.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
stickEl.addEventListener('pointerdown', (e) => { stick.id = e.pointerId; stickEl.setPointerCapture(e.pointerId); stickMove(e); });
stickEl.addEventListener('pointermove', (e) => { if (e.pointerId === stick.id) stickMove(e); });
function stickEnd(e) { if (e.pointerId === stick.id) { stick.id = null; stick.x = stick.y = 0; knobEl.style.transform = ''; } }
stickEl.addEventListener('pointerup', stickEnd); stickEl.addEventListener('pointercancel', stickEnd);
function stickMove(e) {
  const c = stickCenter();
  let dx = (e.clientX - c.x) / 44, dy = (e.clientY - c.y) / 44;
  const len = Math.hypot(dx, dy) || 1; const cl = Math.min(1, len);
  dx = dx / len * cl; dy = dy / len * cl;
  stick.x = dx; stick.y = dy;
  knobEl.style.transform = `translate(${dx * 30}px,${dy * 30}px)`;
}

/* ---------- picking ---------- */
const ray = new THREE.Raycaster(); const ptr = new THREE.Vector2();
const tip = $('studioTip');
function pick(e) {
  const r = canvas.getBoundingClientRect();
  ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects(interactables, true);
  if (!hits.length) return null;
  let o = hits[0].object;
  while (o && !o.userData.action) o = o.userData.actionRoot || o.parent;
  return o;
}
let hoverRaf = 0;
function hover(e) {
  cancelAnimationFrame(hoverRaf);
  hoverRaf = requestAnimationFrame(() => {
    const o = pick(e);
    canvas.style.cursor = o ? 'pointer' : 'grab';
    if (o) {
      const names = {
        songs: ['WALL OF SOUND', 'open the 50-track ledger'], console: ['CONTROL DECK', 'transport · play · seek'],
        radio: ['RADIO MAST', 'live stations · tap rings to tune'], playlists: ['VINYL SHELVES', 'curated playlists'],
        lyrics: ['VOCAL BOOTH', 'lyrics + track stories'], artists: ['GALLERY WALL', 'artists A–Z'],
        history: ['MEMORY CLOCK', 'history + queue'], stats: ['DATA ORB', 'stats · EQ · sleep timer'],
      };
      const [t, s] = names[o.userData.action] || [o.userData.action, 'interact'];
      tip.innerHTML = `${t}<small>${s}</small>`; tip.classList.add('show');
    } else tip.classList.remove('show');
  });
}
function tap(e) {
  const o = pick(e);
  tip.classList.remove('show');
  if (!o) return;
  pulse(o);
  activate(o.userData.action);
}
function pulse(root) {
  const s0 = root.scale.x;
  const t0 = performance.now();
  (function pop() {
    const k = (performance.now() - t0) / 380;
    if (k >= 1) { root.scale.setScalar(s0); return; }
    root.scale.setScalar(s0 * (1 + Math.sin(k * Math.PI) * 0.06));
    requestAnimationFrame(pop);
  })();
}

/* ---------- bridge to the preserved music app ---------- */
function clickEl(id) { const el = $(id); if (el) { el.click(); return true; } return false; }
function closePanels() { document.body.classList.remove('show-songs', 'show-radio', 'show-library', 'show-console'); syncNav(); }
function flyTo(name) {
  const v = VIEWS[name]; if (!v) return;
  flyTarget = { pos: new THREE.Vector3(...v.pos), yaw: v.yaw, pitch: v.pitch, t: 0 };
}
function activate(action) {
  document.querySelectorAll('.app-window').forEach((w) => { if (action !== 'stay') w.remove(); });
  switch (action) {
    case 'songs': {
      const open = !document.body.classList.contains('show-songs');
      closePanels(); if (open) document.body.classList.add('show-songs');
      flyTo('songs'); break;
    }
    case 'radio':
      closePanels(); document.body.classList.add('show-radio'); flyTo('radio'); break;
    case 'console':
      closePanels(); document.body.classList.add('show-console'); flyTo('console');
      setTimeout(() => document.body.classList.remove('show-console'), 2600); break;
    case 'playlists': clickEl('navPlaylists'); flyTo('shelves'); break;
    case 'lyrics': clickEl('navLyrics'); flyTo('mic'); break;
    case 'artists': clickEl('startAppArtists') || clickEl('desktopIconArtists'); flyTo('gallery'); break;
    case 'history': clickEl('navHistory'); flyTo('clock'); break;
    case 'stats': clickEl('navStats'); flyTo('stats'); break;
    case 'queue': clickEl('queueBtn'); flyTo('clock'); break;
    case 'home': closePanels(); flyTo('home'); break;
  }
  syncNav();
}
function syncNav() {
  document.querySelectorAll('.studio-nav-btn').forEach((b) => {
    const a = b.dataset.action;
    b.classList.toggle('active',
      (a === 'songs' && document.body.classList.contains('show-songs')) ||
      (a === 'radio' && document.body.classList.contains('show-radio')));
  });
}
/* Nav buttons are wired by the inline 2D/3D bridge in index.html
   (single binding — it delegates here in 3D mode). */
$('studioMenuBtn').addEventListener('click', () => $('studioHud').classList.toggle('menu-open'));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanels(); });
window.__studioActivate = activate;

// inject panel header bars (close buttons) into preserved panels
function addBar(container, title) {
  if (!container || container.querySelector('.studio-panel-bar')) return;
  const bar = document.createElement('div');
  bar.className = 'studio-panel-bar';
  bar.innerHTML = `<span>◉ ${title}</span>`;
  const x = document.createElement('button'); x.textContent = 'Close ✕';
  x.addEventListener('click', closePanels);
  bar.appendChild(x); container.prepend(bar);
}
new MutationObserver(() => {
  addBar(document.querySelector('.w11-main'), 'TRACK LEDGER · 50 HITS');
  addBar(document.querySelector('.w11-sidebar'), 'STATION CONTROL');
}).observe(document.documentElement, { childList: true, subtree: true });

/* ---------- Now Playing pill (always accessible) ---------- */
const nowEl = $('studioNow');
setInterval(() => {
  try {
    const np = (window.__nowPlaying && window.__nowPlaying()) || {};
    $('npTitle').textContent = np.title || $('billTitle')?.textContent || 'Punjabi Rewind';
    const sub = [np.artist, np.year].filter(Boolean).join(' · ') || $('billArtist')?.textContent || 'Pick a track to begin';
    $('npSub').textContent = sub;
    nowEl.classList.toggle('paused', !np.playing);
    const rs = ($('radioStatus')?.textContent || '').toLowerCase();
    nowEl.classList.toggle('live', rs.includes('live'));
    drawScreen();
  } catch (_) { /* player not ready yet */ }
}, 600);
$('npPlay').addEventListener('click', (e) => { e.stopPropagation(); clickEl('playBtn'); });
$('npRadio').addEventListener('click', (e) => { e.stopPropagation(); activate('radio'); clickEl('radioToggle'); });
$('npPrev').addEventListener('click', (e) => { e.stopPropagation(); clickEl('prevBtn'); });
$('npNext').addEventListener('click', (e) => { e.stopPropagation(); clickEl('nextBtn'); });
nowEl.addEventListener('click', () => activate('console'));

/* ---------- no fullscreen gate: the room is open on load ---------- */
flyTo('home');
try { drawScreen(); } catch (_) {}

/* ---------- render watchdog: blank frame => 2D player, never black ---------- */
setTimeout(() => {
  if (window.__studioOK || window.__studio2D) return;
  try {
    renderer.render(scene, camera);
    const gl = renderer.getContext();
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const px = new Uint8Array(64 * 64 * 4);
    gl.readPixels(Math.max(0, w / 2 - 32), Math.max(0, h / 2 - 32), 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let mx = 0;
    for (let i = 0; i < px.length; i += 4) {
      const l = px[i] * 0.3 + px[i + 1] * 0.6 + px[i + 2] * 0.1;
      if (l > mx) mx = l;
    }
    if (mx < 14) throw new Error('blank-frame');
    window.__studioOK = true;
    setStatus('Explore — drag to look · WASD to walk · click glowing objects');
    try { clearTimeout(window.__studio3DTimer); } catch (_) {}
  } catch (_) {
    setStatus('3D preview could not start.');
    enter2D('3D preview could not start — full player below.');
  }
}, 3000);
renderer.domElement.addEventListener('webglcontextlost', (e) => {
  e.preventDefault(); enter2D('Graphics context lost — full player below.');
});

/* ---------- main loop (pausable: 3D runs only while entered) ---------- */
const clockT = new THREE.Clock();
let beatPhase = 0, running = false, rafId = 0;
function frame() {
  if (!running) return;
  rafId = requestAnimationFrame(frame);
  if (document.hidden) return;
  const dt = Math.min(clockT.getDelta(), 0.05);
  const t = clockT.elapsedTime;

  // camera fly-to tween
  if (flyTarget) {
    flyTarget.t += dt / 1.4;
    rig.pos.lerp(flyTarget.pos, Math.min(1, dt * 2.4));
    rig.yaw += (flyTarget.yaw - rig.yaw) * Math.min(1, dt * 2.4);
    rig.pitch += (flyTarget.pitch - rig.pitch) * Math.min(1, dt * 2.4);
    if (flyTarget.t >= 1) flyTarget = null;
  } else {
    // WASD / arrows / joystick locomotion
    const sp = 3.4 * dt;
    const f = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, rig.yaw, 0, 'YXZ'));
    const r = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, rig.yaw, 0, 'YXZ'));
    const mv = new THREE.Vector3();
    if (keys.has('KeyW') || keys.has('ArrowUp')) mv.add(f);
    if (keys.has('KeyS') || keys.has('ArrowDown')) mv.sub(f);
    if (keys.has('KeyA') || keys.has('ArrowLeft')) mv.sub(r);
    if (keys.has('KeyD') || keys.has('ArrowRight')) mv.add(r);
    mv.x += r.x * stick.x + f.x * -stick.y;
    mv.z += r.z * stick.x + f.z * -stick.y;
    if (mv.lengthSq() > 0) { mv.normalize().multiplyScalar(sp); rig.pos.add(mv); clampPos(); }
    if (keys.has('KeyQ')) rig.yaw += dt * 1.6;
    if (keys.has('KeyE')) rig.yaw -= dt * 1.6;
  }
  camera.position.copy(rig.pos);
  camera.rotation.set(0, 0, 0);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = rig.yaw; camera.rotation.x = rig.pitch;

  // sound-reactive pulse (simulated beat from current track)
  let beatMs = 700, playing = false;
  try { const np = window.__nowPlaying && window.__nowPlaying(); if (np) { beatMs = np.beatMs || 700; playing = !!np.playing; } } catch (_) {}
  const radioLive = ($('radioStatus')?.textContent || '').toLowerCase().includes('live');
  const energy = playing || radioLive ? 1 : 0.25;
  beatPhase += dt * 1000 / beatMs * Math.PI * 2;
  const pulse = reducedMotion ? 0.5 : (0.5 + 0.5 * Math.sin(beatPhase)) * energy + 0.15;

  beacon.material.emissiveIntensity = 1 + pulse * 2.4;
  beacon.scale.setScalar(1 + pulse * 0.35);
  rings.forEach((ring, i) => {
    const s = 1 + ((t * 0.7 + i * 0.4) % 1) * 1.6;
    ring.scale.setScalar(s);
    ring.material.opacity = Math.max(0, 0.7 - ((t * 0.7 + i * 0.4) % 1) * 0.7) * energy;
  });
  deckGlow.material.emissiveIntensity = 0.35 + pulse * 0.9;
  amberPt.intensity = 18 + pulse * 26;
  cyanPt.intensity = 16 + (1 - pulse) * 14;
  wheels.forEach((w, i) => { if (playing && !reducedMotion) w.rotation.y += dt * (1 + i); });
  holo.rotation.y += dt * (0.3 + pulse * 1.6);
  holo.rotation.x += dt * 0.22;
  holo.material.emissiveIntensity = 0.7 + pulse * 1.2;
  micHead.material.emissiveIntensity = 0.8 + pulse * 1.6;
  clockHand.rotation.z = -t * 0.4;
  playlistCubes.forEach((c, i) => {
    c.position.y += Math.sin(t * 1.4 + i * 1.7) * dt * 0.08;
    c.rotation.y += dt * (0.25 + pulse * 0.5);
  });
  queuePods.forEach((p, i) => { p.scale.setScalar(1 + Math.max(0, Math.sin(t * 2 + i * 2)) * 0.3 * energy); });
  vizBars.forEach((b, i) => {
    const h = (0.25 + Math.abs(Math.sin(t * 2.1 + i * 0.7)) * 1.9) * (0.3 + energy * 0.9);
    b.scale.y = h; b.position.y = h / 2;
  });
  if (!reducedMotion) {
    dust.rotation.y = t * 0.014;
    interactables.forEach((g, i) => { if (g.userData.tag) g.userData.tag.position.y += Math.sin(t * 0.9 + i * 2.1) * dt * 0.05; });
  }
  renderer.render(scene, camera);
}

addEventListener('resize', fitStage);
try { new ResizeObserver(fitStage).observe($('studioStage')); } catch (_) {}

drawScreen();
running = true;
frame();
window.__studioBootDone = true;
window.__studioResume = () => { if (!running) { running = true; frame(); } };
window.__studioPause = () => { running = false; cancelAnimationFrame(rafId); };
