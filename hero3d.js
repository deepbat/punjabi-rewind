/* HERO 3D — portfolio-style hero canvas inside .gauge, impossible to miss
   UMD global THREE — works on file:// */
(function(){
if (typeof THREE === 'undefined') { console.warn('[hero3d] THREE not loaded'); return; }
const gauge = document.querySelector('.gauge');
const canvas = document.getElementById('hero3d');
if (!gauge || !canvas) {
  console.warn('[hero3d] gauge/hero3d missing');
} else {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);
  camera.position.set(0, 0.35, 7.2);

  const ambient = new THREE.AmbientLight(0xffffff, 1.25);
  const dir = new THREE.DirectionalLight(0xffffff, 1.6); dir.position.set(3, 5, 4);
  const pA = new THREE.PointLight(0x00F0FF, 4, 18); pA.position.set(-2.5, 1, 2);
  const pB = new THREE.PointLight(0xFF3B6B, 3.2, 16); pB.position.set(2.5, -0.8, 2);
  const pC = new THREE.PointLight(0x7B61FF, 2.8, 20); pC.position.set(0, 3, -3);
  scene.add(ambient, dir, pA, pB, pC);

  // Vinyl — big, centered, like portfolio's Ball hero
  const vinylG = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(2.05, 2.05, 0.16, 64),
    new THREE.MeshStandardMaterial({ color: 0x0f0f1e, roughness: 0.3, metalness: 0.6, emissive: 0x151530, emissiveIntensity: 0.4 })
  );
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.62, 0.18, 32),
    new THREE.MeshStandardMaterial({ color: 0xFF3B6B, roughness: 0.4, emissive: 0xFF3B6B, emissiveIntensity: 0.7 })
  ); label.position.y = 0.01;
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 16), new THREE.MeshBasicMaterial({ color: 0x000000 })); hole.position.y = 0.02;
  vinylG.add(body, label, hole);
  // grooves
  for (let i = 0; i < 5; i++) {
    const r = 0.82 + i * 0.22;
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.02, 8, 64), new THREE.MeshStandardMaterial({ color: 0x1e1e2e, roughness: 0.4, metalness: 0.75 }));
    t.rotation.x = Math.PI / 2; t.position.y = 0.082; vinylG.add(t);
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.07, 0.06, 12, 64), new THREE.MeshStandardMaterial({ color: 0x00F0FF, emissive: 0x00F0FF, emissiveIntensity: 1.6, transparent: true, opacity: 0.98 }));
  rim.rotation.x = Math.PI / 2; vinylG.add(rim);
  vinylG.rotation.x = 0.92; // tilt so top visible like record on table
  vinylG.position.set(0, -0.15, 0);
  scene.add(vinylG);

  // Halo behind
  const halo = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.05, 16, 80), new THREE.MeshStandardMaterial({ color: 0x7B61FF, emissive: 0x7B61FF, emissiveIntensity: 1.2, transparent: true, opacity: 0.75 }));
  halo.position.set(0, -0.15, -1.1); halo.rotation.x = Math.PI * 0.18; scene.add(halo);

  // Small disco icosa floating above right
  const disco = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.85, roughness: 0.18, emissive: 0xFFD23F, emissiveIntensity: 0.18 }));
  disco.position.set(1.65, 0.95, 0.3); scene.add(disco);

  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function hex(n) { return parseInt(n.slice(1), 16); }
  function applyTheme() {
    try {
      pA.color.setHex(hex(cssVar('--teal')) || 0x00F0FF);
      pB.color.setHex(hex(cssVar('--coral')) || 0xFF3B6B);
      pC.color.setHex(hex(cssVar('--purple')) || 0x7B61FF);
      rim.material.color.setHex(hex(cssVar('--teal')) || 0x00F0FF); rim.material.emissive.setHex(hex(cssVar('--teal')) || 0x00F0FF);
      halo.material.color.setHex(hex(cssVar('--purple')) || 0x7B61FF); halo.material.emissive.setHex(hex(cssVar('--purple')) || 0x7B61FF);
      label.material.color.setHex(hex(cssVar('--coral')) || 0xFF3B6B); label.material.emissive.setHex(hex(cssVar('--coral')) || 0xFF3B6B);
    } catch {}
  }
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  applyTheme();

  function resize() {
    const r = gauge.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    if (w < 10 || h < 10) { setTimeout(resize, 100); return; }
    const isMobile = w < 520;
    // responsive scale: shrink vinyl on narrow gauge so cyan rim not clipped
    const s = isMobile ? 0.52 : 0.88;
    vinylG.scale.set(s, s, s);
    halo.scale.set(s, s, s);
    // re-center slightly higher on mobile so text doesn't overlap center hole
    vinylG.position.set(0, isMobile ? -0.05 : -0.15, 0);
    halo.position.set(0, isMobile ? -0.05 : -0.15, -1.1);
    disco.position.set(isMobile ? 1.05 : 1.65, isMobile ? 0.85 : 0.95, 0.3);
    disco.scale.set(isMobile ? 0.75 : 1, isMobile ? 0.75 : 1, isMobile ? 0.75 : 1);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
  }
  // gauge may be 0x0 on first tick (flex layout) — retry until has size
  const ro = new ResizeObserver(resize);
  ro.observe(gauge);
  window.addEventListener('resize', resize);
  // initial + delayed retries to beat flex/grid layout race that caused blink-then-hide
  resize(); setTimeout(resize, 80); setTimeout(resize, 300); setTimeout(resize, 800);

  // drag to spin (portfolio OrbitControls feel)
  let dragging = false, startX = 0, spin = 0, spinVel = 0.018;
  canvas.addEventListener('pointerdown', e => { dragging = true; startX = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (!dragging) return; spinVel = (e.clientX - startX) * 0.0009; startX = e.clientX; vinylG.rotation.y += spinVel * 6; });
  canvas.addEventListener('pointerup', e => { dragging = false; });
  canvas.addEventListener('pointercancel', () => dragging = false);

  // tilt with mouse
  let mx = 0, my = 0;
  gauge.addEventListener('mousemove', e => {
    const r = gauge.getBoundingClientRect();
    mx = (e.clientX - r.left) / r.width - 0.5;
    my = (e.clientY - r.top) / r.height - 0.5;
  });

  let raf = null, paused = document.hidden;
  document.addEventListener('visibilitychange', () => { paused = document.hidden; if (!paused && !raf) raf = requestAnimationFrame(loop); });

  function loop(now) {
    raf = requestAnimationFrame(loop); if (paused) return;
    const t = now * 0.0006;
    if (!dragging) vinylG.rotation.y += spinVel;
    spinVel = Math.max(0.006, spinVel * 0.995); // keep spinning slowly
    vinylG.position.y = -0.15 + Math.sin(t * 0.9) * 0.08;
    vinylG.rotation.z = Math.sin(t * 0.5) * 0.06;
    vinylG.rotation.x = 0.92 + Math.sin(t * 0.35) * 0.04 + my * 0.18;
    vinylG.rotation.y += mx * 0.004;

    halo.rotation.y += 0.004; halo.rotation.z = Math.sin(t * 0.4) * 0.18;
    halo.position.y = -0.15 + Math.sin(t * 0.7 + 1) * 0.06;

    disco.rotation.y += 0.018; disco.rotation.x += 0.012;
    disco.position.y = 0.95 + Math.sin(t * 1.1) * 0.14;

    const beat = (window.__nowPlaying && window.__nowPlaying().beatMs) || 700;
    const pulse = 0.92 + Math.sin(now * (1000 / beat) * 0.0025) * 0.1;
    pA.intensity = 4 * pulse; pB.intensity = 3.2 * pulse;

    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(loop);
  window.__hero3d = { scene, camera, renderer, vinylG };
  console.log('[hero3d] started, gauge', gauge.getBoundingClientRect().width, 'x', gauge.getBoundingClientRect().height);
}
})();
