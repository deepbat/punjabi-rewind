import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const mount = document.getElementById('scene-mount');
const SONGS = window.SONGS || [];

let renderer, labelRenderer, scene, camera, controls;
let markerGroup, core, coreGlowMaterial, nebula;
let raycaster, pointerNDC = new THREE.Vector2(-10, -10);
let hoveredIndex = -1, selectedIndex = -1;
let focusTarget = null; // {position: Vector3, distance: number} | null
let autopilot = false, autopilotT = 0;
let lastFrame = performance.now();
let markers = [];
let radioMoodColor = null;

const COLOR_PUNJABI = 0xECA31C;
const COLOR_HINDI = 0xD14A3F;
const COLOR_BEACON = 0x5B9BD9;
const COLOR_CORE = 0xECA31C;

init();

function init() {
  if (typeof THREE === 'undefined' || !window.WebGLRenderingContext) {
    showFallback();
    return;
  }

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070c, 0.014);

  camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 9, 27);

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    showFallback();
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x05070c, 1);
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
  controls.dampingFactor = 0.06;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;
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

  scene.add(new THREE.AmbientLight(0x3a3a4a, 1.2));

  window.addEventListener('resize', onResize);
  renderer.domElement.addEventListener('pointermove', onPointerMove, { passive: true });
  renderer.domElement.addEventListener('pointerdown', onPointerDownTrack, { passive: true });
  renderer.domElement.addEventListener('pointerup', onPointerUpTrack, { passive: true });
  renderer.domElement.addEventListener('wheel', onUserInteract, { passive: true });

  window.__focusMarker = focusMarkerByIndex;
  window.__setRadioMood = setRadioMood;
  window.__enterAutopilot = enterAutopilot;
  window.__exitAutopilot = exitAutopilot;

  animate();
}

function showFallback() {
  const fb = document.getElementById('sceneFallback');
  if (fb) fb.hidden = false;
}

/* ---------------- glow sprite texture (cached — one canvas per color) ---------------- */
const _glowCache=new Map();
function glowTexture(hex) {
  if(_glowCache.has(hex)) return _glowCache.get(hex);
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const color = new THREE.Color(hex);
  const r = Math.round(color.r * 255), g = Math.round(color.g * 255), b = Math.round(color.b * 255);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(255,255,255,1)`);
  grad.addColorStop(0.18, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.55, `rgba(${r},${g},${b},.35)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  _glowCache.set(hex, tex);
  return tex;
}

function buildStarfield() {
  const count = window.innerWidth < 640 ? 3000 : 6000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [new THREE.Color(0xF1E9D6), new THREE.Color(0x9AA0AE), new THREE.Color(0x5B9BD9)];
  for (let i = 0; i < count; i++) {
    const r = 40 + Math.random() * 160;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi) * 0.6;
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    const c = palette[Math.floor(Math.random() * palette.length)];
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.6, map: glowTexture(0xffffff), vertexColors: true,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  const stars = new THREE.Points(geo, mat);
  scene.add(stars);
  stars.userData.isStarfield = true;
  scene.userData.starfield = stars;
}

function buildNebula() {
  const mat = new THREE.SpriteMaterial({
    map: glowTexture(0x5B9BD9), transparent: true, opacity: 0.16,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  nebula = new THREE.Sprite(mat);
  nebula.scale.set(90, 90, 1);
  nebula.position.set(-10, 4, -30);
  scene.add(nebula);

  const mat2 = new THREE.SpriteMaterial({
    map: glowTexture(0xD14A3F), transparent: true, opacity: 0.1,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const nebula2 = new THREE.Sprite(mat2);
  nebula2.scale.set(70, 70, 1);
  nebula2.position.set(22, -6, -25);
  scene.add(nebula2);
}

function buildCore() {
  const geo = new THREE.IcosahedronGeometry(2.6, 1);
  const mat = new THREE.MeshBasicMaterial({ color: COLOR_CORE, wireframe: true, transparent: true, opacity: 0.55 });
  core = new THREE.Mesh(geo, mat);
  scene.add(core);

  coreGlowMaterial = new THREE.SpriteMaterial({
    map: glowTexture(COLOR_CORE), transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const glow = new THREE.Sprite(coreGlowMaterial);
  glow.scale.set(11, 11, 1);
  core.add(glow);
}

function buildSongMarkers() {
  markerGroup = new THREE.Group();
  scene.add(markerGroup);
  const total = Math.max(SONGS.length, 1);

  SONGS.forEach((song, i) => {
    const t = i / total;
    const angle = t * Math.PI * 6.2;
    const radius = 7 + t * 12.5;
    const y = Math.sin(t * Math.PI * 3) * 2.4;
    const isHindi = song.lang === 'hindi';
    const color = isHindi ? COLOR_HINDI : COLOR_PUNJABI;

    const mat = new THREE.SpriteMaterial({
      map: glowTexture(color), transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, color: 0xffffff,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.4, 1.4, 1);
    sprite.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    sprite.userData.index = i;
    sprite.userData.baseScale = 1.4;
    sprite.userData.bobPhase = Math.random() * Math.PI * 2;
    markerGroup.add(sprite);

    const labelDiv = document.createElement('div');
    labelDiv.className = 'star-label';
    labelDiv.textContent = song.title;
    const label = new CSS2DObject(labelDiv);
    label.position.set(0, 0.95, 0);
    sprite.add(label);
    sprite.userData.labelEl = labelDiv;

    markers.push(sprite);
  });
}

function buildBeacons() {
  const stations = window.RADIO_STATIONS || [];
  const group = new THREE.Group();
  scene.add(group);
  stations.forEach((st, i) => {
    const angle = (i / Math.max(stations.length, 1)) * Math.PI * 2;
    const radius = 22;
    const mat = new THREE.SpriteMaterial({
      map: glowTexture(COLOR_BEACON), transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.9, 1.9, 1);
    sprite.position.set(Math.cos(angle) * radius, 5, Math.sin(angle) * radius);
    group.add(sprite);

    const labelDiv = document.createElement('div');
    labelDiv.className = 'star-label visible';
    labelDiv.style.color = 'var(--cobalt)';
    labelDiv.style.borderColor = 'rgba(91,155,217,.5)';
    labelDiv.textContent = st.name;
    const label = new CSS2DObject(labelDiv);
    label.position.set(0, 1.1, 0);
    sprite.add(label);
  });
}

/* ---------------- interaction ---------------- */
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerMove(e) {
  pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
}

let downX = 0, downY = 0;
function onPointerDownTrack(e) {
  downX = e.clientX;
  downY = e.clientY;
}
function onPointerUpTrack(e) {
  onUserInteract();
  document.getElementById('onboardHint')?.classList.add('faded');
  // Only treat this as a "click a light" selection if the pointer barely
  // moved ΓÇö otherwise it was a drag-to-orbit gesture, not a pick.
  const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
  if (moved > 6) return;
  pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointerNDC, camera);
  const hits = raycaster.intersectObjects(markerGroup.children);
  if (hits.length) {
    const idx = hits[0].object.userData.index;
    if (window.selectSong) window.selectSong(idx, true);
    focusMarkerByIndex(idx);
  }
}

let idleTimer = null;
function onUserInteract() {
  if (autopilot) exitAutopilot();
  document.getElementById('onboardHint')?.classList.add('faded');
  document.querySelectorAll('.hud, #transportGlass').forEach(el => el.classList.remove('idle-fade'));
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    document.querySelectorAll('.hud, #transportGlass').forEach(el => el.classList.add('idle-fade'));
  }, 4200);
}

function focusMarkerByIndex(i) {
  const marker = markers[i];
  if (!marker) return;
  selectedIndex = i;
  const worldPos = new THREE.Vector3();
  marker.getWorldPosition(worldPos);
  focusTarget = { position: worldPos, distance: 6.5 };
  markers.forEach((m, idx) => {
    m.userData.labelEl?.classList.toggle('visible', idx === i || idx === hoveredIndex);
    m.userData.labelEl?.classList.toggle('playing', idx === i);
  });
}

function setRadioMood(stationIndex) {
  if (stationIndex === null || stationIndex === undefined) {
    radioMoodColor = null;
    scene.fog.color.set(0x05070c);
    coreGlowMaterial.color.set(0xffffff);
    return;
  }
  const moods = [0xECA31C, 0xD14A3F, 0x5B9BD9, 0x4FBE8C];
  const c = new THREE.Color(moods[stationIndex % moods.length]);
  radioMoodColor = c;
  scene.fog.color.copy(c).multiplyScalar(0.25).offsetHSL(0, 0, -0.15);
  coreGlowMaterial.color.copy(c);
}

function enterAutopilot() {
  autopilot = true;
  autopilotT = 0;
  controls.enabled = false;
  focusTarget = null;
  document.getElementById('liveModeBtn')?.setAttribute('aria-pressed', 'true');
}
function exitAutopilot() {
  if (!autopilot) return;
  autopilot = false;
  controls.enabled = true;
  document.getElementById('liveModeBtn')?.setAttribute('aria-pressed', 'false');
}

/* ---------------- animation loop (pauses when tab hidden to save battery) ---------------- */
function animate() {
  requestAnimationFrame(animate);
  if(document.hidden){ lastFrame=performance.now(); return; }
  const now = performance.now();
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  core.rotation.y += dt * 0.15;
  core.rotation.x += dt * 0.05;
  if (scene.userData.starfield) scene.userData.starfield.rotation.y += dt * 0.005;

  const np = (window.__nowPlaying && window.__nowPlaying()) || null;
  markers.forEach((m, idx) => {
    const isPlaying = np && np.playing && idx === selectedIndex;
    const pulse = isPlaying ? 1 + Math.sin(now * 0.006) * 0.22 : 1;
    const s = m.userData.baseScale * (idx === hoveredIndex || idx === selectedIndex ? 1.5 : 1) * pulse;
    m.scale.set(s, s, 1);
  });

  if (!autopilot) {
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects(markerGroup.children);
    const newHover = hits.length ? hits[0].object.userData.index : -1;
    if (newHover !== hoveredIndex) {
      hoveredIndex = newHover;
      markers.forEach((m, idx) => {
        m.userData.labelEl?.classList.toggle('visible', idx === hoveredIndex || idx === selectedIndex);
      });
    }
  }

  if (autopilot) {
    autopilotT += dt;
    const beatMs = (np && np.beatMs) || 900;
    const speed = 0.16 + (18000 / beatMs) * 0.002;
    const radius = 14 + Math.sin(autopilotT * 0.15) * 4;
    const angle = autopilotT * speed;
    camera.position.set(Math.cos(angle) * radius, 4 + Math.sin(autopilotT * 0.3) * 2.5, Math.sin(angle) * radius);
    controls.target.set(0, 0, 0);
    camera.lookAt(0, 0, 0);
  } else if (focusTarget) {
    controls.target.lerp(focusTarget.position, 0.06);
    const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
    const currentDist = dir.length();
    dir.normalize();
    const nextDist = THREE.MathUtils.lerp(currentDist, focusTarget.distance, 0.06);
    const desired = new THREE.Vector3().copy(controls.target).add(dir.multiplyScalar(nextDist));
    camera.position.lerp(desired, 0.06);
    if (Math.abs(nextDist - focusTarget.distance) < 0.05) focusTarget = null;
  }

  if (!autopilot) controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
