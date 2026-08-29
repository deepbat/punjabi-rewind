/* ═══════════════════════════════════════════════════
   THREE-BG — 3D Portfolio-inspired immersive background
   Inspired by shridharrai/3D-Portfolio: Stars + Ball + Canvas
   For Punjabi Wave: starfield + floating vinyl/torus + disco icosahedron
   Vanilla Three.js (no React), theme-aware, low-poly, performant
   ═══════════════════════════════════════════════════ */
import * as THREE from 'three';

const canvas = document.getElementById('bg3d');
if (!canvas) {
  console.warn('[three-bg] #bg3d not found');
} else {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x060810, 14, 38);

  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100);
  camera.position.set(0, 0.6, 9);

  // ── Lights — like 3D Portfolio's Canvas lights ──
  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  const dir = new THREE.DirectionalLight(0xffffff, 1.6);
  dir.position.set(4, 6, 5);
  const pointA = new THREE.PointLight(0x00F0FF, 3.2, 20);
  pointA.position.set(-5, 2, 3);
  const pointB = new THREE.PointLight(0xFF3B6B, 2.8, 18);
  pointB.position.set(5, -1, 2);
  const pointC = new THREE.PointLight(0x7B61FF, 2.4, 22);
  pointC.position.set(0, 4, -4);
  scene.add(ambient, dir, pointA, pointB, pointC);
  // remove any fallback badge once 3D starts
  document.getElementById('bg3d-fallback')?.remove();

  // ── Starfield — maath/random spherical distribution like portfolio — BIGGER & BRIGHTER ──
  let stars = null;
  (function createStars() {
    const count = 2000;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 12 + Math.pow(Math.random(), 1.1) * 18;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.92;
      pos[i * 3 + 2] = r * Math.cos(phi) - 7;
      const t = Math.random();
      if (t < 0.45) { col[i * 3] = 1; col[i * 3 + 1] = 1; col[i * 3 + 2] = 1; }
      else if (t < 0.72) { col[i * 3] = 0.15; col[i * 3 + 1] = 0.96; col[i * 3 + 2] = 1; }
      else { col[i * 3] = 1; col[i * 3 + 1] = 0.5; col[i * 3 + 2] = 0.72; }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    stars = new THREE.Points(geo, mat);
    scene.add(stars);
  })();

  // ── Floating vinyl + geometric orbs — like portfolio's Ball/Canvas ──
  const floatGroup = new THREE.Group();
  scene.add(floatGroup);

  // Main vinyl: flat cylinder + hole + grooves — BRIGHTER & CLOSER so it pops through glass pods
  const vinylGroup = new THREE.Group();
  const vinylGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.14, 64);
  const vinylMat = new THREE.MeshStandardMaterial({
    color: 0x12122a,
    roughness: 0.32,
    metalness: 0.55,
    emissive: 0x1a1a3a,
    emissiveIntensity: 0.35
  });
  const vinylMesh = new THREE.Mesh(vinylGeo, vinylMat);
  vinylMesh.rotation.x = Math.PI * 0.12;
  const labelGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.155, 32);
  const labelMat = new THREE.MeshStandardMaterial({ color: 0xFF3B6B, roughness: 0.45, metalness: 0.15, emissive: 0xFF3B6B, emissiveIntensity: 0.55 });
  const labelMesh = new THREE.Mesh(labelGeo, labelMat);
  labelMesh.position.y = 0.01;
  const holeGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.17, 16);
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const holeMesh = new THREE.Mesh(holeGeo, holeMat);
  holeMesh.position.y = 0.02;
  for (let i = 0; i < 5; i++) {
    const r = 0.88 + i * 0.24;
    const t = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.018, 8, 64),
      new THREE.MeshStandardMaterial({ color: 0x2a2a4a, roughness: 0.4, metalness: 0.7, emissive: 0x1e1e2e, emissiveIntensity: 0.2 })
    );
    t.rotation.x = Math.PI / 2;
    t.position.y = 0.072;
    vinylGroup.add(t);
  }
  vinylGroup.add(vinylMesh, labelMesh, holeMesh);
  // add outer neon rim so vinyl is obvious even on dark bg
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(2.22, 0.035, 12, 64),
    new THREE.MeshStandardMaterial({ color: 0x00F0FF, emissive: 0x00F0FF, emissiveIntensity: 1.2, transparent: true, opacity: 0.95 })
  );
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.0;
  vinylGroup.add(rim);
  vinylGroup.position.set(-2.4, 0.85, -1.2);
  floatGroup.add(vinylGroup);

  // Center hero vinyl — portfolio-style hero 3D front-and-center, visible in gap
  const heroVinyl = vinylGroup.clone(true);
  heroVinyl.scale.set(0.85, 0.85, 0.85);
  heroVinyl.position.set(0.2, -1.55, 0.2);
  floatGroup.add(heroVinyl);

  // Disco icosahedron — faceted, like portfolio's Ball canvas
  const discoGeo = new THREE.IcosahedronGeometry(1.05, 1);
  const discoMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.18,
    metalness: 0.82,
    flatShading: false,
    emissive: 0x7B61FF,
    emissiveIntensity: 0.08
  });
  const disco = new THREE.Mesh(discoGeo, discoMat);
  disco.position.set(3.2, -0.35, -0.6);
  floatGroup.add(disco);

  // Wireframe torus — neon halo — CLOSER & BRIGHTER
  const haloGeo = new THREE.TorusGeometry(1.35, 0.055, 16, 80);
  const haloMat = new THREE.MeshStandardMaterial({
    color: 0x00F0FF,
    emissive: 0x00F0FF,
    emissiveIntensity: 1.4,
    roughness: 0.35,
    metalness: 0.2,
    transparent: true,
    opacity: 0.95
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.position.set(0.8, 1.45, -1.8);
  halo.rotation.x = Math.PI * 0.35;
  floatGroup.add(halo);

  // Small floating octa — accent
  const octa = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.68, 0),
    new THREE.MeshStandardMaterial({ color: 0xFFD23F, emissive: 0xFFD23F, emissiveIntensity: 0.65, roughness: 0.32, metalness: 0.12, transparent: true, opacity: 0.98 })
  );
  octa.position.set(-0.9, -1.2, 0.0);
  floatGroup.add(octa);

  // ── Mouse parallax (inspired by portfolio's camera positioning) ──
  let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
  let isHovering = false;
  window.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });
  // also react to pod hover for subtle tilt
  document.addEventListener('mouseover', e => {
    if (e.target.closest('.pod')) isHovering = true;
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest('.pod')) isHovering = false;
  });

  // ── Theme-aware recolor — sync lights/materials to CSS variables ──
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function hexToNum(h) {
    if (!h || h[0] !== '#') return null;
    return parseInt(h.slice(1), 16);
  }
  function applyThemeColors() {
    const teal = hexToNum(cssVar('--teal')) || 0x00F0FF;
    const coral = hexToNum(cssVar('--coral')) || 0xFF3B6B;
    const purple = hexToNum(cssVar('--purple')) || 0x7B61FF;
    pointA.color.setHex(teal);
    pointB.color.setHex(coral);
    pointC.color.setHex(purple);
    haloMat.color.setHex(teal);
    haloMat.emissive.setHex(teal);
    discoMat.emissive.setHex(purple);
    labelMat.color.setHex(coral);
    labelMat.emissive.setHex(coral);
    octa.material.color.setHex(hexToNum(cssVar('--gold')) || 0xFFD23F);
    octa.material.emissive.setHex(hexToNum(cssVar('--gold')) || 0xFFD23F);
  }
  const mo = new MutationObserver(applyThemeColors);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  applyThemeColors();

  // ── Resize ──
  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  }
  window.addEventListener('resize', onResize);
  onResize();

  // ── Render loop — Suspense-like: pause when hidden ──
  let raf = null;
  let paused = document.hidden;
  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
    if (!paused && !raf) raf = requestAnimationFrame(loop);
  });

  let t0 = performance.now();
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (paused) return;
    const t = now * 0.00055;
    const dt = (now - t0) * 0.001; t0 = now;

    // smooth camera follow
    targetX += (mouseX - targetX) * 0.04;
    targetY += (mouseY - targetY) * 0.04;
    camera.position.x = targetX * 0.9;
    camera.position.y = 0.6 - targetY * 0.55;
    camera.lookAt(0, 0, -3);

    // starfield slow drift
    if (stars) {
      stars.rotation.y = t * 0.035;
      stars.rotation.x = Math.sin(t * 0.07) * 0.06;
    }

    // vinyl: slow spin + float (like record spinning)
    vinylGroup.rotation.y += 0.009 + Math.sin(t * 0.8) * 0.002;
    vinylGroup.position.y = 0.9 + Math.sin(t * 1.1) * 0.22;
    vinylGroup.rotation.z = Math.sin(t * 0.6) * 0.08;
    vinylGroup.rotation.x = Math.PI * 0.12 + Math.sin(t * 0.5) * 0.05;

    // disco: tumble
    disco.rotation.y += 0.011;
    disco.rotation.x += 0.007;
    disco.position.y = -0.6 + Math.sin(t * 0.9 + 1.5) * 0.28;
    disco.rotation.z = Math.sin(t * 0.7) * 0.15;

    // halo: orbit + tilt
    halo.rotation.y += 0.006;
    halo.rotation.z = Math.sin(t * 0.5) * 0.25;
    halo.position.y = 1.7 + Math.sin(t * 0.85 + 2) * 0.18;

    // octa: spin + bob
    octa.rotation.y += 0.015;
    octa.rotation.x += 0.012;
    octa.position.y = -1.4 + Math.sin(t * 1.25 + 0.8) * 0.2;

    // gentle floatGroup sway with mouse
    floatGroup.rotation.y = targetX * 0.12;
    floatGroup.rotation.x = -targetY * 0.08;

    // subtle light pulse with beat (reads current BPM if available)
    const beat = (window.__nowPlaying && window.__nowPlaying().beatMs) || 700;
    const pulse = 0.92 + Math.sin(now * (1000 / beat) * 0.002) * 0.08;
    pointA.intensity = 2.2 * pulse;
    pointB.intensity = 1.8 * pulse;

    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(loop);

  // expose for debugging
  window.__threeBg = { scene, camera, renderer, floatGroup };
}
