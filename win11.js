/* ============================================================
   WINDOWS 11 DESKTOP SHELL — behavior
   Window manager (drag, resize, snap, minimize/maximize/close),
   taskbar with dynamic app buttons, Start menu, Task View,
   Quick Settings + Calendar flyouts, context menus, desktop icon
   management, power overlay, and functional Settings/Notepad.
   The original app (scene.js/player.js) runs untouched inside
   #winContent.
   ============================================================ */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const appWindow = $('appWindow');
  const titlebar = $('winTitlebar');
  const minBtn = $('winMinBtn');
  const maxBtn = $('winMaxBtn');
  const closeBtn = $('winCloseBtn');
  const taskbarAppBtn = $('taskbarAppBtn');
  const desktop = $('win11Desktop');
  const snapPreview = $('snapPreview');

  /* ============================== STATE ============================== */
  let zTop = 20;
  const windows = new Map(); // key -> { el, taskbarBtn, title, icon, appId?, minimized, prevRect }
  let lastLayout = 'maximized';
  let activeWinKey = 'main';

  /* ============================== UTILITIES ============================== */
  function bringToFront(el) { zTop += 1; el.style.zIndex = zTop; }
  function esc(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

  function desktopToast(msg) {
    const t = $('desktopToast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2600);
  }
  window.__desktopToast = desktopToast;

  /* ============================== SETTINGS STORE ============================== */
  const SETTINGS_KEY = 'pr_win11_settings';
  const settings = Object.assign({
    wallpaper: 'aurora', accent: '#60CDFF', brightness: 100, nightLight: false,
    wifi: true, bluetooth: false, airplane: false, focus: false, volume: 100, muted: false,
  }, (() => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch (e) { return {}; } })());

  function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {} }
  function applySettings() {
    document.documentElement.style.setProperty('--win-accent', settings.accent);
    document.documentElement.style.setProperty('--win-accent-2', shade(settings.accent, -0.25));
    const desktopEl = $('win11Desktop');
    if (desktopEl) desktopEl.dataset.wallpaper = settings.wallpaper;
    document.getElementById('nightFilter')?.classList.toggle('on', !!settings.nightLight);
    const dim = document.createElement('style');
    dim.id = 'brightnessStyle';
    if (!document.getElementById('brightnessStyle')) document.head.appendChild(dim);
    document.getElementById('brightnessStyle').textContent = `.win11-desktop{filter:brightness(${settings.brightness / 100})}`;
    if (typeof window.__setPlayerVolume === 'function') window.__setPlayerVolume(settings.muted ? 0 : settings.volume);
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => clamp(Math.round(c + 255 * amt), 0, 255);
    return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((c) => c.toString(16).padStart(2, '0')).join('');
  }

  /* ============================== WINDOW MANAGER ============================== */
  function registerWindow(key, opts) {
    windows.set(key, Object.assign({ el: opts.el, minimized: false, prevRect: null }, opts));
  }

  function isHidden(el) { return el.classList.contains('hidden-window'); }

  function setActive(key) {
    activeWinKey = key;
    windows.forEach((w, k) => {
      const active = k === key && !isHidden(w.el);
      if (w.taskbarBtn) w.taskbarBtn.classList.toggle('active', active);
    });
  }

  function focusWindow(key) {
    const w = windows.get(key);
    if (!w) return;
    w.el.classList.remove('hidden-window');
    bringToFront(w.el);
    w.minimized = false;
    setActive(key);
    if (key === 'main') { /* restore layout memory */ }
  }

  function minimizeWindow(key) {
    const w = windows.get(key);
    if (!w) return;
    w.el.classList.add('hidden-window');
    w.minimized = true;
    const next = [...windows.entries()].find(([k, x]) => !x.minimized && !isHidden(x.el));
    setActive(next ? next[0] : null);
  }

  function closeWindow(key) {
    const w = windows.get(key);
    if (!w) return;
    if (key === 'main') { minimizeWindow('main'); return; } // main app keeps running
    w.el.remove();
    if (w.taskbarBtn) w.taskbarBtn.remove();
    windows.delete(key);
    const next = [...windows.entries()].find(([k, x]) => !x.minimized && !isHidden(x.el));
    setActive(next ? next[0] : null);
  }

  function toggleMaximize(key) {
    const w = windows.get(key);
    if (!w) return;
    const el = w.el;
    if (el.classList.contains('maximized')) {
      el.classList.remove('maximized');
      el.classList.add('windowed');
      if (w.prevRect) Object.assign(el.style, { left: w.prevRect.left, top: w.prevRect.top, width: w.prevRect.width, height: w.prevRect.height, marginLeft: '0' });
    } else {
      if (el.classList.contains('windowed')) w.prevRect = { left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height };
      else w.prevRect = null;
      el.classList.remove('windowed');
      el.classList.add('maximized');
      Object.assign(el.style, { left: '', top: '', width: '', height: '', marginLeft: '' });
    }
    updateMaxIcon(key);
  }

  function updateMaxIcon(key) {
    const w = windows.get(key || activeWinKey);
    if (!w || !w.maxBtn) return;
    const maximized = w.el.classList.contains('maximized');
    w.maxBtn.innerHTML = maximized ? '&#10064;' : '&#9723;';
    w.maxBtn.setAttribute('aria-label', maximized ? 'Restore' : 'Maximize');
  }

  function makeDraggable(key) {
    const w = windows.get(key);
    if (!w) return;
    const { el, titlebar: tbar } = w;
    let dragging = false, sx = 0, sy = 0, wx = 0, wy = 0;

    tbar.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.win-controls') || e.target.closest('.rs')) return;
      if (!el.classList.contains('windowed')) return;
      dragging = true;
      tbar.setPointerCapture(e.pointerId);
      const rect = el.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; wx = rect.left; wy = rect.top;
      el.style.marginLeft = '0';
      el.style.left = rect.left + 'px';
      el.style.top = rect.top + 'px';
    });
    tbar.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      el.style.left = clamp(wx + dx, -el.offsetWidth + 120, window.innerWidth - 80) + 'px';
      el.style.top = clamp(wy + dy, 0, window.innerHeight - 48 - 24) + 'px';
      checkSnap(e.clientX, e.clientY);
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      try { tbar.releasePointerCapture(e.pointerId); } catch (_) {}
      applySnap(e.clientX, e.clientY, key);
    }
    tbar.addEventListener('pointerup', endDrag);
    tbar.addEventListener('pointercancel', (e) => { dragging = false; hideSnapPreview(); });
  }

  function makeResizable(key) {
    const w = windows.get(key);
    if (!w) return;
    const el = w.el;
    ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].forEach((dir) => {
      const h = document.createElement('div');
      h.className = 'rs rs-' + dir;
      el.appendChild(h);
      h.addEventListener('pointerdown', (e) => {
        if (!el.classList.contains('windowed')) return;
        e.preventDefault();
        h.setPointerCapture(e.pointerId);
        const rect = el.getBoundingClientRect();
        const sx = e.clientX, sy = e.clientY, r = { left: rect.left, top: rect.top, w: rect.width, h: rect.height };
        const move = (ev) => {
          const dx = ev.clientX - sx, dy = ev.clientY - sy;
          let { left, top, w: width, h: height } = r;
          if (dir.includes('e')) width = clamp(r.w + dx, 320, window.innerWidth);
          if (dir.includes('s')) height = clamp(r.h + dy, 180, window.innerHeight);
          if (dir.includes('w')) { width = clamp(r.w - dx, 320, window.innerWidth); left = r.left + (r.w - width); }
          if (dir.includes('n')) { height = clamp(r.h - dy, 180, window.innerHeight); top = r.top + (r.h - height); }
          Object.assign(el.style, { left: left + 'px', top: top + 'px', width: width + 'px', height: height + 'px', marginLeft: '0' });
        };
        const up = () => { h.releasePointerCapture(e.pointerId); h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); };
        h.addEventListener('pointermove', move);
        h.addEventListener('pointerup', up);
      });
    });
  }

  /* -------- edge snapping + snap layouts flyout -------- */
  const SNAP_ZONES = {
    left:   () => ({ left: 0, top: 0, width: window.innerWidth / 2, height: window.innerHeight - 48 }),
    right:  () => ({ left: window.innerWidth / 2, top: 0, width: window.innerWidth / 2, height: window.innerHeight - 48 }),
    tl:     () => ({ left: 0, top: 0, width: window.innerWidth / 2, height: (window.innerHeight - 48) / 2 }),
    tr:     () => ({ left: window.innerWidth / 2, top: 0, width: window.innerWidth / 2, height: (window.innerHeight - 48) / 2 }),
    br:     () => ({ left: window.innerWidth / 2, top: (window.innerHeight - 48) / 2, width: window.innerWidth / 2, height: (window.innerHeight - 48) / 2 }),
    bl:     () => ({ left: 0, top: (window.innerHeight - 48) / 2, width: window.innerWidth / 2, height: (window.innerHeight - 48) / 2 }),
    max:    () => ({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight - 48 }),
  };
  let pendingSnap = null;

  function checkSnap(x, y) {
    const H = window.innerHeight - 48;
    pendingSnap = null;
    if (y <= 2) pendingSnap = 'max';
    else if (x <= 2) pendingSnap = 'left';
    else if (x >= window.innerWidth - 3) pendingSnap = 'right';
    else if (y >= H - 2) pendingSnap = 'bl';
    hideSnapPreview();
    if (pendingSnap) showSnapPreview(pendingSnap);
  }

  function showSnapPreview(zone) {
    const z = SNAP_ZONES[zone]();
    snapPreview.style.left = z.left + 'px';
    snapPreview.style.top = z.top + 'px';
    snapPreview.style.width = z.width + 'px';
    snapPreview.style.height = z.height + 'px';
    snapPreview.classList.add('show');
  }

  function applySnap(zone, key) {
    hideSnapPreview();
    if (!zone) return;
    const w = windows.get(key);
    if (!w) return;
    const el = w.el;
    if (el.classList.contains('maximized')) { el.classList.remove('maximized'); el.classList.add('windowed'); }
    const z = SNAP_ZONES[zone]();
    Object.assign(el.style, { left: z.left + 'px', top: z.top + 'px', width: z.width + 'px', height: z.height + 'px', marginLeft: '0' });
    el.classList.add('windowed');
    if (zone === 'max') toggleMaximize(key);
  }

  function hideSnapPreview() { snapPreview.classList.remove('show'); }

  /* ============================== MAIN WINDOW WIRING ============================== */
  registerWindow('main', { el: appWindow, titlebar, maxBtn, taskbarBtn: taskbarAppBtn });
  makeDraggable('main');
  makeResizable('main');

  minBtn.addEventListener('click', () => minimizeWindow('main'));
  maxBtn.addEventListener('click', () => toggleMaximize('main'));
  closeBtn.addEventListener('click', () => minimizeWindow('main'));
  titlebar.addEventListener('dblclick', (e) => {
    if (e.target.closest('.win-controls') || e.target.closest('.rs')) return;
    toggleMaximize('main');
  });
  appWindow.addEventListener('pointerdown', () => { focusWindow('main'); });

  function showMainWindow() {
    appWindow.classList.remove('hidden-window');
    appWindow.classList.remove('maximized', 'windowed');
    appWindow.classList.add(lastLayout);
    focusWindow('main');
    updateMaxIcon('main');
  }
  taskbarAppBtn.addEventListener('click', () => {
    if (isHidden(appWindow) || activeWinKey !== 'main') showMainWindow();
    else minimizeWindow('main');
  });
  $('showDesktopBtn').addEventListener('click', () => {
    if (isHidden(appWindow)) showMainWindow(); else minimizeWindow('main');
  });

  /* ============================== GENERIC APPS ============================== */
  const COVER_GRADIENTS = [
    ['#ECA31C', '#b9760f'], ['#D14A3F', '#8e2e26'], ['#5B9BD9', '#2c5d8f'],
    ['#4FBE8C', '#276b4d'], ['#9b6bd6', '#4d3170'], ['#e0729a', '#7e2c4b'],
  ];
  function songList() { return window.SONGS || []; }
  function playSongFromApp(index) {
    if (window.selectSong) window.selectSong(index, true);
    if (window.__focusMarker) window.__focusMarker(index);
    showMainWindow();
  }

  function buildExplorerContent() {
    const wrap = document.createElement('div');
    const songs = songList();
    wrap.innerHTML = `
      <div class="explorer-toolbar">
        <span>This PC &gt; Music &gt; Punjabi Rewind</span>
        <span class="explorer-count">${songs.length} items</span>
      </div>
      <div class="explorer-list">
        ${songs.map((s, i) => `
          <div class="explorer-row" data-index="${i}">
            <span class="explorer-row-icon">&#127925;</span>
            <span class="explorer-row-name"><strong>${esc(s.title)}</strong><span>${esc(s.artist)}</span></span>
            <span class="explorer-row-tag ${s.lang === 'hindi' ? 'hindi' : 'punjabi'}">${s.lang === 'hindi' ? 'Hindi' : 'Punjabi'}</span>
            <span class="explorer-row-year">${s.year}</span>
          </div>
        `).join('')}
      </div>
    `;
    wrap.querySelectorAll('.explorer-row').forEach((row) => {
      row.addEventListener('click', () => playSongFromApp(Number(row.dataset.index)));
    });
    return wrap;
  }

  function buildPhotosContent() {
    const wrap = document.createElement('div');
    wrap.className = 'photo-grid';
    songList().forEach((s, i) => {
      const [c1, c2] = COVER_GRADIENTS[i % COVER_GRADIENTS.length];
      const tile = document.createElement('div');
      tile.className = 'photo-tile';
      tile.style.background = `linear-gradient(150deg, ${c1}, ${c2})`;
      tile.innerHTML = `<span>${esc(s.title)}</span>`;
      tile.addEventListener('click', () => playSongFromApp(i));
      wrap.appendChild(tile);
    });
    return wrap;
  }

  /* -------- Notepad: editable + persisted -------- */
  const NOTEPAD_KEY = 'pr_notepad_text';
  function buildNotepadContent() {
    const wrap = document.createElement('div');
    wrap.className = 'notepad-app';
    wrap.innerHTML = `
      <div class="notepad-toolbar">
        <span>File</span><span>Edit</span><span>View</span><span style="margin-left:auto" class="mono small" id="notepadStatus">saved</span>
      </div>
      <textarea class="notepad-area" spellcheck="false"></textarea>
    `;
    const ta = wrap.querySelector('.notepad-area');
    try { ta.value = localStorage.getItem(NOTEPAD_KEY) || defaultNotepadText(); } catch (e) { ta.value = defaultNotepadText(); }
    const status = wrap.querySelector('#notepadStatus');
    let t = null;
    ta.addEventListener('input', () => {
      if (status) status.textContent = 'editing…';
      clearTimeout(t);
      t = setTimeout(() => {
        try { localStorage.setItem(NOTEPAD_KEY, ta.value); } catch (e) {}
        if (status) status.textContent = 'saved';
      }, 600);
    });
    return wrap;
  }
  function defaultNotepadText() {
    return [
      'Punjabi Rewind — Media Player',
      '',
      '40 Hindi & Punjabi tracks from 2026, in a native-style',
      'Windows 11 player.',
      '',
      'Pick a track to play. Use search or the Punjabi / Hindi',
      'filters to narrow the list, and star tracks to save them.',
      '',
      'Everything on this desktop is one app — File Explorer and',
      'Photos both open onto the same 40-track library.',
    ].join('\n');
  }

  function buildEdgeContent() {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="edge-toolbar">
        <span class="edge-nav">&#8592; &#8594; &#8635;</span>
        <span class="edge-address">&#128274; punjabi-rewind</span>
      </div>
      <div class="edge-newtab">
        <h2>Punjabi Rewind</h2>
        <p>40 Hindi &amp; Punjabi tracks of 2026, in a native-style Windows 11 media player.</p>
        <div class="edge-shortcuts">
          <div class="edge-shortcut" data-shortcut="rewind"><span class="edge-shortcut-icon">ਪ</span><span>Punjabi Rewind</span></div>
          <div class="edge-shortcut" data-shortcut="explorer"><span class="edge-shortcut-icon">&#128196;</span><span>Track list</span></div>
          <div class="edge-shortcut" data-shortcut="settings"><span class="edge-shortcut-icon">&#9881;&#65039;</span><span>Settings</span></div>
        </div>
      </div>
    `;
    wrap.querySelectorAll('[data-shortcut]').forEach((el) => {
      el.addEventListener('click', () => openOrFocusApp(el.dataset.shortcut));
    });
    return wrap;
  }

  /* -------- Settings app -------- */
  const WALLPAPERS = ['aurora', 'bloom', 'mesh', 'dark'];
  const ACCENTS = ['#60CDFF', '#0078D4', '#ECA31C', '#D14A3F', '#4FBE8C', '#9b6bd6', '#e0729a'];
  function buildSettingsContent() {
    const wrap = document.createElement('div');
    wrap.className = 'settings-app';
    wrap.innerHTML = `
      <div class="settings-nav"><b>&#9881;&#65039; Settings</b><span class="mono small" style="margin-left:auto;color:var(--win-text-dim)">Personalization &amp; system</span></div>
      <div class="settings-page">
        <div class="settings-row"><div class="grow"><b>Wallpaper</b><em>Pick the desktop background</em></div>
          <select id="setWallpaper">${WALLPAPERS.map((w) => `<option value="${w}" ${settings.wallpaper === w ? 'selected' : ''}>${w[0].toUpperCase() + w.slice(1)}</option>`).join('')}</select></div>
        <div class="settings-row"><div class="grow"><b>Accent color</b><em>Tints the taskbar highlights and controls</em></div>
          <div class="swatches">${ACCENTS.map((c) => `<button class="swatch ${settings.accent === c ? 'active' : ''}" data-accent="${c}" style="background:${c}" type="button" aria-label="Accent ${c}"></button>`).join('')}</div></div>
        <div class="settings-row"><div class="grow"><b>Brightness</b><em>Screen brightness</em></div>
          <input type="range" id="setBrightness" min="30" max="100" value="${settings.brightness}"></div>
        <div class="settings-row"><div class="grow"><b>Night light</b><em>Warmer colors, easier on the eyes</em></div>
          <input type="checkbox" id="setNight" ${settings.nightLight ? 'checked' : ''}></div>
        <div class="settings-row"><div class="grow"><b>Volume</b><em>System output level</em></div>
          <input type="range" id="setVolume" min="0" max="100" value="${settings.volume}"></div>
        <div class="settings-row"><div class="grow"><b>Mute</b><em>Silence the whole system</em></div>
          <input type="checkbox" id="setMute" ${settings.muted ? 'checked' : ''}></div>
        <div class="settings-row"><div class="grow"><b>About this PC</b><em>Punjabi Rewind Desktop · simulated Windows 11 · rendered in your browser</em></div><span class="mono small" style="color:var(--win-text-dim)">v2.0</span></div>
      </div>
    `;
    wrap.querySelector('#setWallpaper').addEventListener('change', (e) => { settings.wallpaper = e.target.value; saveSettings(); applySettings(); });
    wrap.querySelectorAll('.swatch').forEach((s) => s.addEventListener('click', () => {
      settings.accent = s.dataset.accent; saveSettings(); applySettings();
      wrap.querySelectorAll('.swatch').forEach((x) => x.classList.toggle('active', x === s));
    }));
    wrap.querySelector('#setBrightness').addEventListener('input', (e) => {
      settings.brightness = Number(e.target.value); saveSettings(); applySettings();
    });
    wrap.querySelector('#setNight').addEventListener('change', (e) => { settings.nightLight = e.target.checked; saveSettings(); applySettings(); });
    wrap.querySelector('#setVolume').addEventListener('input', (e) => {
      settings.volume = Number(e.target.value); settings.muted = settings.volume === 0; saveSettings(); applySettings();
    });
    wrap.querySelector('#setMute').addEventListener('change', (e) => { settings.muted = e.target.checked; saveSettings(); applySettings(); });
    return wrap;
  }

  /* -------- Calculator: fully working, mouse + keyboard -------- */
  function buildCalculatorContent() {
    const wrap = document.createElement('div');
    wrap.className = 'calc-app';
    wrap.tabIndex = 0;
    wrap.innerHTML = `
      <div class="calc-display" aria-live="polite">0</div>
      <div class="calc-grid">
        ${['C', '⌫', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '±', '0', '.', '='].map((k) => `<button class="calc-btn${k === '=' ? ' calc-eq' : ''}${'C⌫%'.includes(k) ? ' calc-fn' : ''}" data-k="${k}" type="button">${k}</button>`).join('')}
      </div>`;
    const disp = wrap.querySelector('.calc-display');
    let cur = '0', prev = null, op = null, fresh = true;
    const show = (v) => { disp.textContent = v; };
    function inputDigit(d) {
      if (fresh || cur === '0' || cur === '-0') { cur = (d === '.' ? '0.' : (/[0-9]/.test(d) ? (cur.startsWith('-') ? '-' + d : d) : cur)); fresh = false; }
      else if (d === '.' && cur.includes('.')) return;
      else if (/[0-9.]/.test(d)) cur += d;
      show(cur);
    }
    function compute(a, b, o) {
      a = parseFloat(a); b = parseFloat(b);
      if (o === '+') return a + b;
      if (o === '−') return a - b;
      if (o === '×') return a * b;
      if (o === '÷') return b === 0 ? NaN : a / b;
      return b;
    }
    function fmt(n) {
      if (!Number.isFinite(n)) return 'Error';
      const r = Math.round(n * 1e10) / 1e10;
      return String(r).length > 14 ? r.toExponential(6) : String(r);
    }
    function press(k) {
      if (/[0-9.]/.test(k)) return inputDigit(k);
      if (k === 'C') { cur = '0'; prev = null; op = null; fresh = true; return show(cur); }
      if (k === '⌫') { cur = fresh ? '0' : cur.slice(0, -1) || '0'; if (cur === '-' || cur === '') cur = '0'; return show(cur); }
      if (k === '±') { cur = cur.startsWith('-') ? cur.slice(1) : (cur !== '0' ? '-' + cur : cur); return show(cur); }
      if (k === '%') { cur = fmt(parseFloat(cur) / 100); fresh = true; return show(cur); }
      if (k === '=') {
        if (op !== null && prev !== null) { cur = fmt(compute(prev, cur, op)); prev = null; op = null; fresh = true; show(cur); }
        return;
      }
      if ('+-×÷−'.includes(k)) {
        const mapped = k === '-' ? '−' : (k === '*' ? '×' : (k === '/' ? '÷' : k));
        if (op !== null && prev !== null && !fresh) { cur = fmt(compute(prev, cur, op)); show(cur); }
        prev = cur; op = mapped; fresh = true;
      }
    }
    wrap.querySelectorAll('.calc-btn').forEach((b) => b.addEventListener('click', () => { press(b.dataset.k); wrap.focus({ preventScroll: true }); }));
    wrap.addEventListener('keydown', (e) => {
      const map = { Enter: '=', '=': '=', Escape: 'C', Backspace: '⌫', '*': '×', '/': '÷', '-': '−', '+': '+', '%': '%', '.': '.' };
      if (/^[0-9]$/.test(e.key)) { press(e.key); e.preventDefault(); }
      else if (map[e.key] !== undefined) { press(map[e.key]); e.preventDefault(); }
    });
    setTimeout(() => wrap.focus({ preventScroll: true }), 120);
    return wrap;
  }

  /* -------- Terminal: fake command prompt -------- */
  function buildTerminalContent() {
    const wrap = document.createElement('div');
    wrap.className = 'term-app';
    wrap.innerHTML = `<div class="term-out" aria-live="polite"></div>
      <div class="term-line"><span class="term-prompt">C:\\Users\\Deepak&gt;</span><input class="term-in" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Terminal input"></div>`;
    const out = wrap.querySelector('.term-out');
    const input = wrap.querySelector('.term-in');
    const hist = [];
    let hi = -1;
    function print(t, cls) {
      const d = document.createElement('div');
      if (cls) d.className = cls;
      d.textContent = t;
      out.appendChild(d);
      out.scrollTop = out.scrollHeight;
    }
    print('Punjabi Rewind OS [Version 11.0.2026.40]');
    print('(c) Deepak. Type "help" for a list of commands.');
    const APP_NAMES = { calculator: 'calculator', calc: 'calculator', terminal: 'terminal', cmd: 'terminal', paint: 'paint', taskmgr: 'taskmanager', taskmanager: 'taskmanager', minesweeper: 'minesweeper', mines: 'minesweeper', notes: 'stickynotes', sticky: 'stickynotes', stickynotes: 'stickynotes', explorer: 'explorer', files: 'explorer', edge: 'edge', browser: 'edge', notepad: 'notepad', settings: 'settings', photos: 'photos', music: 'rewind', rewind: 'rewind', player: 'rewind' };
    function closeSelf() {
      const wEl = wrap.closest('.win-window');
      if (wEl && wEl.dataset.app) closeWindow('app:' + wEl.dataset.app);
    }
    function run(raw) {
      const line = raw.trim();
      print('C:\\Users\\Deepak>' + raw, 'term-echo');
      if (!line) return;
      const parts = line.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const arg = line.slice(parts[0].length).trim();
      if (cmd === 'help') print('Commands: help · ver · whoami · date · time · echo <text> · dir · apps · open <app> · cls · exit');
      else if (cmd === 'ver') print('Punjabi Rewind OS [Version 11.0.2026.40]');
      else if (cmd === 'whoami') print('rewind-pc\\deepak');
      else if (cmd === 'hostname') print('REWIND-PC');
      else if (cmd === 'date') print(new Date().toDateString());
      else if (cmd === 'time') print(new Date().toLocaleTimeString());
      else if (cmd === 'echo') print(arg);
      else if (cmd === 'dir') {
        print(' Directory of C:\\Users\\Deepak\\Music\\Punjabi Rewind');
        print('');
        print(String(songList().length).padStart(4) + ' track(s) in the library');
        print(' 4 radio station(s) on the dial');
      }
      else if (cmd === 'apps') print(Object.keys(APP_NAMES).filter((k) => APP_NAMES[k] === k).join('  '));
      else if (cmd === 'open') {
        const id = APP_NAMES[arg.toLowerCase()];
        if (id) { print('Starting ' + arg + '…'); openOrFocusApp(id); }
        else print(`'${arg}' is not recognized. Try "apps".`);
      }
      else if (cmd === 'cls' || cmd === 'clear') out.innerHTML = '';
      else if (cmd === 'exit') closeSelf();
      else print(`'${parts[0]}' is not recognized as a command. Type "help".`);
    }
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { const v = input.value; input.value = ''; hi = -1; if (v.trim()) hist.unshift(v); run(v); }
      else if (e.key === 'ArrowUp') { if (hist.length) { hi = Math.min(hi + 1, hist.length - 1); input.value = hist[hi]; } e.preventDefault(); }
      else if (e.key === 'ArrowDown') { hi = Math.max(hi - 1, -1); input.value = hi >= 0 ? hist[hi] : ''; e.preventDefault(); }
    });
    wrap.addEventListener('click', () => input.focus());
    setTimeout(() => input.focus(), 120);
    return wrap;
  }

  /* -------- Paint: canvas drawing -------- */
  function buildPaintContent() {
    const wrap = document.createElement('div');
    wrap.className = 'paint-app';
    const COLORS = ['#000000', '#ffffff', '#e81123', '#ECA31C', '#4FBE8C', '#5B9BD9', '#9b6bd6', '#e0729a'];
    wrap.innerHTML = `
      <div class="paint-toolbar">
        <div class="paint-colors">${COLORS.map((c, i) => `<button class="paint-color${i === 0 ? ' active' : ''}" data-c="${c}" style="background:${c}" type="button" aria-label="Color ${c}"></button>`).join('')}</div>
        <input class="paint-size" type="range" min="1" max="30" value="5" aria-label="Brush size" title="Brush size">
        <button class="paint-tool active" data-t="brush" type="button" title="Brush">🖌️</button>
        <button class="paint-tool" data-t="eraser" type="button" title="Eraser">🧽</button>
        <button class="paint-tool" data-t="clear" type="button" title="Clear canvas">🗑️</button>
        <button class="paint-tool" data-t="save" type="button" title="Save as PNG">💾</button>
      </div>
      <canvas class="paint-canvas"></canvas>`;
    const canvas = wrap.querySelector('.paint-canvas');
    const ctx = canvas.getContext('2d');
    let color = COLORS[0], tool = 'brush', drawing = false, last = null;
    function blank() { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    requestAnimationFrame(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(300, Math.round(r.width * dpr));
      canvas.height = Math.max(200, Math.round((wrap.clientHeight - 46) * dpr));
      blank();
    });
    function pos(e) {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
    }
    canvas.addEventListener('pointerdown', (e) => {
      drawing = true; last = pos(e);
      canvas.setPointerCapture(e.pointerId);
      ctx.fillStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.beginPath(); ctx.arc(last.x, last.y, Number(wrap.querySelector('.paint-size').value) / 2, 0, Math.PI * 2); ctx.fill();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      const p = pos(e);
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = Number(wrap.querySelector('.paint-size').value) * (canvas.width / canvas.getBoundingClientRect().width);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      last = p;
    });
    const stop = () => { drawing = false; };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    wrap.querySelectorAll('.paint-color').forEach((b) => b.addEventListener('click', () => {
      color = b.dataset.c; tool = 'brush';
      wrap.querySelectorAll('.paint-color').forEach((x) => x.classList.toggle('active', x === b));
      wrap.querySelectorAll('.paint-tool').forEach((x) => x.classList.toggle('active', x.dataset.t === 'brush'));
    }));
    wrap.querySelectorAll('.paint-tool').forEach((b) => b.addEventListener('click', () => {
      const t = b.dataset.t;
      if (t === 'clear') { blank(); desktopToast('Canvas cleared'); return; }
      if (t === 'save') {
        const a = document.createElement('a');
        a.download = 'punjabi-rewind-painting.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
        desktopToast('Painting saved');
        return;
      }
      tool = t;
      wrap.querySelectorAll('.paint-tool').forEach((x) => x.classList.toggle('active', x === b));
    }));
    return wrap;
  }

  /* -------- Task Manager: live processes -------- */
  function buildTaskManagerContent() {
    const wrap = document.createElement('div');
    wrap.className = 'taskmgr-app';
    wrap.innerHTML = `
      <div class="taskmgr-stats">
        <div class="taskmgr-stat"><span>CPU</span><div class="taskmgr-bar"><i></i></div><b class="mono">0%</b></div>
        <div class="taskmgr-stat"><span>Memory</span><div class="taskmgr-bar mem"><i></i></div><b class="mono">0%</b></div>
      </div>
      <div class="taskmgr-list"></div>`;
    const FAKE = [
      { name: 'System', icon: '⚙️', base: 3 }, { name: 'Desktop Window Manager', icon: '🖥️', base: 5 },
      { name: 'Audio Service', icon: '🔊', base: 2 }, { name: 'Radio Tuner', icon: '📡', base: 4 },
    ];
    const list = wrap.querySelector('.taskmgr-list');
    const bars = wrap.querySelectorAll('.taskmgr-bar i');
    const nums = wrap.querySelectorAll('.taskmgr-stat b');
    function tick() {
      let rows = FAKE.map((f) => ({ icon: f.icon, name: f.name, kind: 'fake', ref: f, cpu: Math.max(0, f.base + (Math.random() * 8 - 4)), mem: Math.round(40 + Math.random() * 220) }));
      windows.forEach((w, key) => {
        const title = w.appId ? (GENERIC_APPS[w.appId] ? GENERIC_APPS[w.appId].title : w.appId) : 'Punjabi Rewind — Media Player';
        const icon = w.appId ? (GENERIC_APPS[w.appId] ? GENERIC_APPS[w.appId].icon : '❔') : 'ਪ';
        rows.push({ icon, name: title, kind: 'win', ref: key, cpu: Math.max(1, 6 + (Math.random() * 14 - 7)), mem: Math.round(120 + Math.random() * 400) });
      });
      rows.sort((a, b) => b.cpu - a.cpu);
      const cpuTotal = Math.min(96, Math.round(rows.reduce((s, r) => s + r.cpu, 0) / 2));
      const memTotal = Math.min(94, 28 + Math.round(rows.length * 4 + Math.random() * 6));
      bars[0].style.width = cpuTotal + '%'; nums[0].textContent = cpuTotal + '%';
      bars[1].style.width = memTotal + '%'; nums[1].textContent = memTotal + '%';
      list.innerHTML = '';
      rows.forEach((r) => {
        const row = document.createElement('div');
        row.className = 'taskmgr-row';
        row.innerHTML = `<span class="taskmgr-ico">${r.icon}</span><span class="taskmgr-name">${esc(r.name)}</span>
          <span class="mono small">${r.cpu.toFixed(1)}%</span><span class="mono small">${r.mem} MB</span>
          <button class="text-btn" type="button">End task</button>`;
        row.querySelector('button').addEventListener('click', () => {
          if (r.kind === 'fake') { const i = FAKE.indexOf(r.ref); if (i >= 0) FAKE.splice(i, 1); desktopToast(r.name + ' ended'); }
          else if (r.ref === 'main') { minimizeWindow('main'); desktopToast('Punjabi Rewind minimized'); }
          else closeWindow(r.ref);
          tick();
        });
        list.appendChild(row);
      });
    }
    tick();
    const iv = setInterval(() => { if (!wrap.isConnected) { clearInterval(iv); return; } tick(); }, 1500);
    return wrap;
  }

  /* -------- Minesweeper: playable 9x9 -------- */
  function buildMinesweeperContent() {
    const ROWS = 9, COLS = 9, MINES = 10;
    const wrap = document.createElement('div');
    wrap.className = 'mines-app';
    wrap.innerHTML = `
      <div class="mines-head">
        <span class="mono mines-count">10</span>
        <button class="mines-face" type="button" aria-label="New game">🙂</button>
        <span class="mono mines-time">0</span>
      </div>
      <div class="mines-grid" role="grid" aria-label="Minesweeper board"></div>
      <p class="mines-hint">Left-click to reveal · right-click to flag</p>`;
    const grid = wrap.querySelector('.mines-grid');
    const countEl = wrap.querySelector('.mines-count');
    const faceEl = wrap.querySelector('.mines-face');
    const timeEl = wrap.querySelector('.mines-time');
    let board, revealed, flags, over, won, timer, secs;
    function newGame() {
      board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
      revealed = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
      flags = 0; over = false; won = false; secs = 0;
      timeEl.textContent = '0'; countEl.textContent = String(MINES); faceEl.textContent = '🙂';
      clearInterval(timer); timer = null;
      let placed = 0;
      while (placed < MINES) {
        const r = Math.floor(Math.random() * ROWS), c = Math.floor(Math.random() * COLS);
        if (board[r][c] !== -1) {
          board[r][c] = -1; placed++;
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] !== -1) board[nr][nc]++;
          }
        }
      }
      grid.innerHTML = '';
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const b = document.createElement('button');
        b.className = 'mines-cell'; b.type = 'button';
        b.dataset.r = r; b.dataset.c = c;
        b.setAttribute('role', 'gridcell');
        b.setAttribute('aria-label', 'Cell ' + (r + 1) + ',' + (c + 1));
        b.addEventListener('click', () => reveal(r, c));
        b.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); flag(r, c); });
        grid.appendChild(b);
      }
    }
    function startTimer() {
      if (timer || over) return;
      timer = setInterval(() => {
        if (!wrap.isConnected) { clearInterval(timer); return; }
        secs++; timeEl.textContent = String(Math.min(secs, 999));
      }, 1000);
    }
    function cell(r, c) { return grid.children[r * COLS + c]; }
    function reveal(r, c) {
      if (over || won || revealed[r][c]) return;
      const el = cell(r, c);
      if (el.classList.contains('flagged')) return;
      startTimer();
      if (board[r][c] === -1) {
        over = true; faceEl.textContent = '💀'; clearInterval(timer);
        for (let i = 0; i < ROWS; i++) for (let j = 0; j < COLS; j++) {
          if (board[i][j] === -1) { cell(i, j).classList.add('mine'); cell(i, j).textContent = '💣'; }
        }
        desktopToast('Boom! Hit New game to retry');
        return;
      }
      flood(r, c);
      checkWin();
    }
    function flood(r, c) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || revealed[r][c]) return;
      const el = cell(r, c);
      if (el.classList.contains('flagged')) return;
      revealed[r][c] = true;
      el.classList.add('open');
      if (board[r][c] > 0) { el.textContent = board[r][c]; el.dataset.n = board[r][c]; }
      else { for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) flood(r + dr, c + dc); }
    }
    function flag(r, c) {
      if (over || won || revealed[r][c]) return;
      startTimer();
      const el = cell(r, c);
      const on = el.classList.toggle('flagged');
      el.textContent = on ? '🚩' : '';
      flags += on ? 1 : -1;
      countEl.textContent = String(MINES - flags);
    }
    function checkWin() {
      for (let i = 0; i < ROWS; i++) for (let j = 0; j < COLS; j++) {
        if (board[i][j] !== -1 && !revealed[i][j]) return;
      }
      won = true; faceEl.textContent = '😎'; clearInterval(timer);
      desktopToast('You cleared the minefield in ' + secs + 's!');
    }
    faceEl.addEventListener('click', newGame);
    newGame();
    return wrap;
  }

  /* -------- Sticky Notes: persisted desktop notes -------- */
  const STICKY_KEY = 'pr_sticky_notes';
  const STICKY_COLORS = ['#FFF3B0', '#FFC9DE', '#C5F0C8', '#CDE7FF', '#E8D9FF'];
  function buildStickyNotesContent() {
    const wrap = document.createElement('div');
    wrap.className = 'sticky-app';
    wrap.innerHTML = `<div class="sticky-bar"><button class="w11-ghost" type="button" id="stickyAdd">+ New note</button></div><div class="sticky-grid"></div>`;
    const gridEl = wrap.querySelector('.sticky-grid');
    let notes = [];
    try { notes = JSON.parse(localStorage.getItem(STICKY_KEY) || '[]'); } catch (e) { notes = []; }
    if (!notes.length) notes = [{ id: Date.now(), color: STICKY_COLORS[0], text: 'Welcome to Sticky Notes!\n\nDouble-click ideas here — they save automatically.' }];
    function save() { try { localStorage.setItem(STICKY_KEY, JSON.stringify(notes)); } catch (e) {} }
    let t = null;
    function render() {
      gridEl.innerHTML = '';
      notes.forEach((n) => {
        const card = document.createElement('div');
        card.className = 'sticky-note';
        card.style.background = n.color;
        card.innerHTML = `
          <div class="sticky-dots">${STICKY_COLORS.map((c) => `<button class="sticky-dot${c === n.color ? ' active' : ''}" data-c="${c}" style="background:${c}" type="button" aria-label="Note color"></button>`).join('')}
          <button class="sticky-del" type="button" aria-label="Delete note">×</button></div>
          <textarea class="sticky-text" spellcheck="false" aria-label="Note text"></textarea>`;
        const ta = card.querySelector('.sticky-text');
        ta.value = n.text;
        ta.addEventListener('input', () => {
          n.text = ta.value;
          clearTimeout(t);
          t = setTimeout(save, 500);
        });
        card.querySelectorAll('.sticky-dot').forEach((d) => d.addEventListener('click', () => {
          n.color = d.dataset.c; card.style.background = n.color; save();
          card.querySelectorAll('.sticky-dot').forEach((x) => x.classList.toggle('active', x === d));
        }));
        card.querySelector('.sticky-del').addEventListener('click', () => {
          notes = notes.filter((x) => x.id !== n.id);
          if (!notes.length) notes = [{ id: Date.now(), color: STICKY_COLORS[0], text: '' }];
          save(); render();
        });
        gridEl.appendChild(card);
      });
    }
    wrap.querySelector('#stickyAdd').addEventListener('click', () => {
      notes.push({ id: Date.now(), color: STICKY_COLORS[notes.length % STICKY_COLORS.length], text: '' });
      save(); render();
      const last = gridEl.querySelector('.sticky-note:last-child textarea');
      if (last) last.focus();
    });
    render();
    return wrap;
  }

  function buildPlaceholder(title, icon, note) {
    const wrap = document.createElement('div');
    wrap.className = 'app-placeholder';
    wrap.innerHTML = `<span class="app-placeholder-icon">${icon}</span><h3>${esc(title)}</h3><p>${esc(note)}</p>`;
    return wrap;
  }

  const GENERIC_APPS = {
    explorer: { title: 'File Explorer', icon: '&#128196;', w: 620, h: 520, build: buildExplorerContent },
    photos: { title: 'Photos', icon: '&#128247;', w: 640, h: 520, build: buildPhotosContent },
    notepad: { title: 'Notepad', icon: '&#128220;', w: 480, h: 420, build: buildNotepadContent },
    edge: { title: 'Microsoft Edge', icon: '&#127760;', w: 760, h: 560, build: buildEdgeContent },
    settings: { title: 'Settings', icon: '&#9881;&#65039;', w: 560, h: 540, build: buildSettingsContent },
    recyclebin: { title: 'Recycle Bin', icon: '&#128465;&#65039;', w: 460, h: 340, build: buildRecycleBinContent },
    mail: { title: 'Mail', icon: '&#9993;&#65039;', w: 460, h: 320, build: () => buildPlaceholder('Mail', '&#9993;&#65039;', 'No new mail. This app is just for show in the simulation.') },
    calendar: { title: 'Calendar', icon: '&#128197;', w: 460, h: 320, build: () => buildPlaceholder('Calendar', '&#128197;', 'Nothing scheduled today.') },
    store: { title: 'Microsoft Store', icon: '&#128193;', w: 460, h: 320, build: () => buildPlaceholder('Microsoft Store', '&#128193;', 'Nothing to install — the whole desktop is one app.') },
    calculator: { title: 'Calculator', icon: '&#129518;', w: 320, h: 500, build: buildCalculatorContent },
    terminal: { title: 'Terminal', icon: '&#9000;', w: 640, h: 440, build: buildTerminalContent },
    paint: { title: 'Paint', icon: '&#127912;', w: 720, h: 580, build: buildPaintContent },
    taskmanager: { title: 'Task Manager', icon: '&#128202;', w: 640, h: 500, build: buildTaskManagerContent },
    minesweeper: { title: 'Minesweeper', icon: '&#128163;', w: 340, h: 540, build: buildMinesweeperContent },
    stickynotes: { title: 'Sticky Notes', icon: '&#128221;', w: 640, h: 500, build: buildStickyNotesContent },
  };

  let cascadeCount = 0;
  const openGenericWindows = {};

  function createGenericWindow(appId) {
    const cfg = GENERIC_APPS[appId];
    if (!cfg) return null;
    const win = document.createElement('section');
    win.className = 'win-window windowed';
    win.dataset.app = appId;
    const offset = (cascadeCount % 6) * 26;
    cascadeCount += 1;
    win.style.width = cfg.w + 'px';
    win.style.height = cfg.h + 'px';
    win.style.top = (60 + offset) + 'px';
    win.style.marginLeft = '0'; // neutralize the .windowed centering margin — we position explicitly
    win.style.left = `calc(50% - ${Math.round(cfg.w / 2)}px + ${offset}px)`;
    win.innerHTML = `
      <header class="win-titlebar">
        <div class="win-titlebar-id">
          <span class="win-titlebar-icon">${cfg.icon}</span>
          <span class="win-titlebar-text">${esc(cfg.title)}</span>
        </div>
        <div class="win-controls">
          <button class="win-btn win-min" type="button" aria-label="Minimize">&#65372;</button>
          <button class="win-btn win-max" type="button" aria-label="Maximize">&#9723;</button>
          <button class="win-btn win-close" type="button" aria-label="Close">&#10005;</button>
        </div>
      </header>
      <div class="win-content generic-content"></div>
    `;
    win.querySelector('.generic-content').appendChild(cfg.build());
    desktop.insertBefore(win, $('startScrim'));
    const key = 'app:' + appId;
    const taskbarBtn = ensureTaskbarButton(appId, cfg.title, cfg.icon);
    registerWindow(key, { el: win, titlebar: win.querySelector('.win-titlebar'), maxBtn: win.querySelector('.win-max'), taskbarBtn, appId });
    makeDraggable(key);
    makeResizable(key);
    const w = windows.get(key);
    w.el.querySelector('.win-min').addEventListener('click', () => minimizeWindow(key));
    w.el.querySelector('.win-max').addEventListener('click', () => toggleMaximize(key));
    w.el.querySelector('.win-close').addEventListener('click', () => closeWindow(key));
    w.titlebar.addEventListener('dblclick', (e) => {
      if (e.target.closest('.win-controls') || e.target.closest('.rs')) return;
      toggleMaximize(key);
    });
    win.addEventListener('pointerdown', () => focusWindow(key));
    return win;
  }

  function ensureTaskbarButton(appId, title, icon) {
    let btn = document.querySelector(`.taskbar-btn[data-app="${appId}"]`);
    if (btn) return btn;
    btn = document.createElement('button');
    btn.className = 'taskbar-btn taskbar-icon';
    btn.dataset.app = appId;
    btn.setAttribute('aria-label', title);
    btn.innerHTML = icon + '<i class="taskbar-indicator"></i>';
    btn.addEventListener('click', () => {
      const key = 'app:' + appId;
      const w = windows.get(key);
      if (w && !isHidden(w.el) && activeWinKey === key) minimizeWindow(key);
      else openOrFocusApp(appId);
    });
    const tray = document.querySelector('.taskbar-tray');
    tray.parentNode.insertBefore(btn, tray);
    return btn;
  }

  function openOrFocusApp(appId) {
    if (appId === 'rewind') { showMainWindow(); return; }
    if (!GENERIC_APPS[appId]) return;
    const key = 'app:' + appId;
    if (!windows.has(key)) createGenericWindow(appId);
    focusWindow(key);
    closeStart();
    closeTaskView();
  }
  window.__openApp = openOrFocusApp;

  /* ============================== TASKBAR CLOCK ============================== */
  const trayTime = $('trayTime'), trayDate = $('trayDate');
  function updateClock() {
    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    trayTime.textContent = h + ':' + String(m).padStart(2, '0') + ' ' + ampm;
    trayDate.textContent = (now.getMonth() + 1) + '/' + now.getDate() + '/' + now.getFullYear();
  }
  updateClock();
  setInterval(updateClock, 15000);

  /* ============================== FLYOUTS (Quick Settings + Calendar) ============================== */
  const quickSettings = $('quickSettings');
  const notifCenter = $('notifCenter');
  const startMenu = $('startMenu');
  const startScrim = $('startScrim');

  function closeAllFlyouts(except) {
    if (except !== 'qs') { quickSettings.setAttribute('aria-hidden', 'true'); }
    if (except !== 'cal') { notifCenter.setAttribute('aria-hidden', 'true'); }
    if (except !== 'start') { startMenu.setAttribute('aria-hidden', 'true'); startScrim.classList.remove('open'); }
    if (except !== 'widgets') { $('widgetsFlyout').setAttribute('aria-hidden', 'true'); }
    closeCtxMenu();
  }

  $('trayQuickBtn').addEventListener('click', () => {
    const open = quickSettings.getAttribute('aria-hidden') === 'false';
    closeAllFlyouts('qs');
    if (!open) quickSettings.setAttribute('aria-hidden', 'false');
  });
  $('trayClockBtn').addEventListener('click', () => {
    const open = notifCenter.getAttribute('aria-hidden') === 'false';
    closeAllFlyouts('cal');
    if (!open) { notifCenter.setAttribute('aria-hidden', 'false'); renderCalendar(); }
  });
  document.addEventListener('pointerdown', (e) => {
    if (!quickSettings.contains(e.target) && !notifCenter.contains(e.target) &&
        !e.target.closest('#trayQuickBtn') && !e.target.closest('#trayClockBtn') &&
        !e.target.closest('.start-menu') && !e.target.closest('#taskbarStartBtn')) {
      closeAllFlyouts();
    }
  });

  /* Quick settings tiles */
  quickSettings.querySelectorAll('.qs-tile').forEach((tile) => {
    tile.addEventListener('click', () => {
      const kind = tile.dataset.qs;
      const on = tile.getAttribute('aria-pressed') !== 'true';
      tile.setAttribute('aria-pressed', String(on));
      tile.classList.toggle('on', on);
      if (kind === 'nightlight') { settings.nightLight = on; applySettings(); }
      if (kind === 'wifi') settings.wifi = on;
      if (kind === 'bluetooth') settings.bluetooth = on;
      if (kind === 'airplane') settings.airplane = on;
      if (kind === 'focus') settings.focus = on;
      saveSettings();
      desktopToast((tile.querySelector('b').textContent) + (on ? ' on' : ' off'));
    });
  });
  /* Sync QS tile states from settings on load */
  function syncQuickSettings() {
    quickSettings.querySelectorAll('.qs-tile').forEach((tile) => {
      const kind = tile.dataset.qs;
      const map = { wifi: settings.wifi, bluetooth: settings.bluetooth, airplane: settings.airplane, nightlight: settings.nightLight, focus: settings.focus, accessibility: false };
      const on = !!map[kind];
      tile.setAttribute('aria-pressed', String(on));
      tile.classList.toggle('on', on);
    });
  }
  syncQuickSettings();

  /* Volume + brightness */
  $('qsVolume').value = settings.volume;
  $('qsVolumeVal').textContent = settings.volume + '%';
  $('qsVolume').addEventListener('input', (e) => {
    settings.volume = Number(e.target.value);
    settings.muted = settings.volume === 0;
    $('qsVolumeVal').textContent = settings.volume + '%';
    saveSettings(); applySettings();
  });
  $('qsBrightness').value = settings.brightness;
  $('qsBrightnessVal').textContent = settings.brightness + '%';
  $('qsBrightness').addEventListener('input', (e) => {
    settings.brightness = Number(e.target.value);
    $('qsBrightnessVal').textContent = settings.brightness + '%';
    saveSettings(); applySettings();
  });
  $('qsSettingsBtn').addEventListener('click', () => { closeAllFlyouts(); openOrFocusApp('settings'); });

  /* Widgets flyout + live now-playing line */
  $('widgetBtn').addEventListener('click', () => {
    const open = $('widgetsFlyout').getAttribute('aria-hidden') === 'false';
    closeAllFlyouts('widgets');
    if (!open) $('widgetsFlyout').setAttribute('aria-hidden', 'false');
  });
  setInterval(() => {
    const el = $('widgetNowPlaying');
    if (!el) return;
    try {
      const np = window.__nowPlaying && window.__nowPlaying();
      if (np && np.playing) el.textContent = '▶ ' + np.title + ' — ' + (np.artist || 'Punjabi Rewind');
      else if (np && np.title && np.title !== 'Punjabi Rewind') el.textContent = '⏸ ' + np.title + ' — paused';
      else el.textContent = 'Nothing yet — pick a track to begin.';
    } catch (e) {}
  }, 2000);
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('#widgetsFlyout') && !e.target.closest('#widgetBtn')) {
      if ($('widgetsFlyout').getAttribute('aria-hidden') === 'false' && !quickSettings.contains(e.target) && !notifCenter.contains(e.target)) closeAllFlyouts();
    }
  });

  /* Calendar */
  let calMonth = new Date();
  function renderCalendar() {
    const grid = $('calGrid');
    const label = $('calMonthLabel');
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    label.textContent = calMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const first = new Date(y, m, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const today = new Date();
    let html = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => `<span class="dow">${d}</span>`).join('');
    for (let i = 0; i < startDow; i++) html += '<span class="day pad"></span>';
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
      html += `<span class="day ${isToday ? 'today' : ''}">${d}</span>`;
    }
    grid.innerHTML = html;
  }
  $('calPrev').addEventListener('click', () => { calMonth.setMonth(calMonth.getMonth() - 1); renderCalendar(); });
  $('calNext').addEventListener('click', () => { calMonth.setMonth(calMonth.getMonth() + 1); renderCalendar(); });
  $('calToday').addEventListener('click', () => { calMonth = new Date(); renderCalendar(); });

  /* ============================== START MENU ============================== */
  function openStart() {
    if (window.__closeVault) window.__closeVault();
    closeAllFlyouts('start');
    startMenu.setAttribute('aria-hidden', 'false');
    startScrim.classList.add('open');
  }
  function closeStart() {
    startMenu.setAttribute('aria-hidden', 'true');
    startScrim.classList.remove('open');
  }
  window.__closeStart = closeStart;
  $('taskbarStartBtn').addEventListener('click', () => {
    if (startMenu.getAttribute('aria-hidden') === 'false') closeStart();
    else openStart();
  });
  startScrim.addEventListener('click', closeStart);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeStart(); closeAllFlyouts(); closeCtxMenu(); closeTaskView(); } });

  [$('startAppPunjabiRewind'), $('startRecentPunjabiRewind')].forEach((btn) => {
    btn && btn.addEventListener('click', () => { closeStart(); showMainWindow(); });
  });

  /* Start search */
  const startSearchInput = $('startSearchInput');
  $('taskbarSearchBtn').addEventListener('click', () => {
    openStart();
    setTimeout(() => startSearchInput && startSearchInput.focus(), 60);
  });
  startSearchInput.addEventListener('input', () => {
    const q = startSearchInput.value.trim().toLowerCase();
    document.querySelectorAll('.start-app').forEach((tile) => {
      tile.style.display = !q || tile.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
  startSearchInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const q = startSearchInput.value.trim();
    closeStart();
    showMainWindow();
    if (window.__openVault) window.__openVault();
    const songSearch = $('songSearch');
    if (songSearch && q) { songSearch.value = q; songSearch.dispatchEvent(new Event('input')); }
  });
  $('allAppsBtn').addEventListener('click', () => { closeStart(); openOrFocusApp('explorer'); });

  /* Start power button -> power overlay */
  document.querySelector('.start-power').addEventListener('click', (e) => {
    e.stopPropagation();
    showPowerOverlay();
  });

  /* ============================== POWER ============================== */
  const powerOverlay = $('powerOverlay');
  const shutdownScreen = $('shutdownScreen');
  function showPowerOverlay() {
    closeAllFlyouts();
    const now = new Date();
    let h = now.getHours(); const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
    $('powerClock').firstChild.textContent = h + ':' + String(now.getMinutes()).padStart(2, '0') + ' ' + ampm;
    $('powerDate').textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    powerOverlay.setAttribute('aria-hidden', 'false');
  }
  $('powerCancel').addEventListener('click', () => powerOverlay.setAttribute('aria-hidden', 'true'));
  powerOverlay.addEventListener('click', (e) => { if (e.target === powerOverlay) powerOverlay.setAttribute('aria-hidden', 'true'); });
  powerOverlay.querySelectorAll('[data-power]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.power;
      if (action === 'sleep') {
        powerOverlay.setAttribute('aria-hidden', 'true');
        const wake = () => { shutdownScreen.setAttribute('aria-hidden', 'true'); document.removeEventListener('pointerdown', wake); document.removeEventListener('keydown', wake); };
        shutdownScreen.querySelector('.shutdown-message').textContent = 'Sleeping…';
        shutdownScreen.setAttribute('aria-hidden', 'false');
        setTimeout(() => { document.addEventListener('pointerdown', wake); document.addEventListener('keydown', wake); }, 400);
      } else if (action === 'lock') {
        powerOverlay.setAttribute('aria-hidden', 'true');
        const wake = () => { shutdownScreen.setAttribute('aria-hidden', 'true'); document.removeEventListener('pointerdown', wake); document.removeEventListener('keydown', wake); };
        shutdownScreen.querySelector('.shutdown-message').textContent = 'Locked — click anywhere to unlock';
        shutdownScreen.setAttribute('aria-hidden', 'false');
        setTimeout(() => { document.addEventListener('pointerdown', wake); document.addEventListener('keydown', wake); }, 400);
      } else {
        const msg = action === 'restart' ? 'Restarting' : 'Shutting down';
        powerOverlay.setAttribute('aria-hidden', 'true');
        shutdownScreen.querySelector('.shutdown-message').firstChild.textContent = msg;
        shutdownScreen.setAttribute('aria-hidden', 'false');
        if (window.__pauseSongPlayback) window.__pauseSongPlayback();
        if (window.__pauseRadio) window.__pauseRadio();
        shutdownScreen.querySelector('.power-btn-back').textContent = 'Power on';
      }
    });
  });
  $('powerBack').addEventListener('click', () => {
    shutdownScreen.setAttribute('aria-hidden', 'true');
    desktopToast('Welcome back');
  });

  /* ============================== CONTEXT MENUS ============================== */
  const ctxRoot = $('ctxMenuRoot');
  let ctxMenuEl = null;
  function closeCtxMenu() { if (ctxMenuEl) { ctxMenuEl.remove(); ctxMenuEl = null; } }
  function showCtxMenu(x, y, items) {
    closeCtxMenu();
    const menu = document.createElement('div');
    menu.className = 'ctx-menu';
    items.forEach((item) => {
      if (item === '-') { const sep = document.createElement('div'); sep.className = 'ctx-sep'; menu.appendChild(sep); return; }
      const b = document.createElement('button');
      b.className = 'ctx-item';
      b.type = 'button';
      b.innerHTML = `<span class="ctx-icon">${item.icon || ''}</span><span class="ctx-label">${esc(item.label)}</span>` + (item.accel ? `<span class="ctx-accel">${esc(item.accel)}</span>` : '');
      if (item.disabled) b.disabled = true;
      else b.addEventListener('click', () => { closeCtxMenu(); item.action && item.action(); });
      menu.appendChild(b);
    });
    document.body.appendChild(menu);
    const r = menu.getBoundingClientRect();
    menu.style.left = clamp(x, 4, window.innerWidth - r.width - 4) + 'px';
    menu.style.top = clamp(y, 4, window.innerHeight - r.height - 52) + 'px';
    ctxMenuEl = menu;
  }
  document.addEventListener('pointerdown', (e) => { if (ctxMenuEl && !ctxMenuEl.contains(e.target)) closeCtxMenu(); });
  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.win-content')) return; // keep native menu inside app content
    if (e.target.closest('.taskbar')) return;
    e.preventDefault();
  });

  /* Desktop context menu */
  $('win11Desktop').addEventListener('contextmenu', (e) => {
    if (e.target.closest('.win-window') || e.target.closest('.taskbar') || e.target.closest('.start-menu')) return;
    e.preventDefault();
    showCtxMenu(e.clientX, e.clientY, [
      { icon: '&#128193;', label: 'View', action: () => {} },
      { icon: '&#128465;', label: 'Refresh', action: () => desktopToast('Desktop refreshed') },
      '-',
      { icon: '&#10133;', label: 'New folder', action: () => createDesktopItem({ type: 'folder' }) },
      { icon: '&#128196;', label: 'New text document', action: () => createDesktopItem({ type: 'text' }) },
      '-',
      { icon: '&#128247;', label: 'Change wallpaper', action: () => openOrFocusApp('settings') },
      { icon: '&#9881;&#65039;', label: 'Display settings', action: () => openOrFocusApp('settings') },
    ]);
  });

  /* ============================== DESKTOP ICONS ============================== */
  const desktopIconsEl = document.querySelector('.desktop-icons');
  const desktopItems = [];
  function createDesktopItem(opts) {
    const item = { id: 'item-' + Date.now() + Math.random().toString(36).slice(2, 6), type: opts.type, name: opts.type === 'folder' ? 'New folder' : 'New Text Document.txt', x: 90 + Math.floor(Math.random() * 60), y: 18 + desktopIconsEl.children.length * 92 };
    desktopItems.push(item);
    renderDesktopItem(item);
    startRename(item, true);
    return item;
  }
  function renderDesktopItem(item) {
    const btn = document.createElement('button');
    btn.className = 'desktop-icon user-item';
    btn.dataset.itemId = item.id;
    btn.style.position = 'absolute';
    btn.style.left = item.x + 'px';
    btn.style.top = item.y + 'px';
    btn.innerHTML = `<span class="desktop-icon-img">${item.type === 'folder' ? '&#128193;' : '&#128196;'}</span><span class="desktop-icon-label">${esc(item.name)}</span>`;
    btn.addEventListener('click', () => {
      if (item.type === 'folder') openOrFocusApp('explorer');
      else openOrFocusApp('notepad');
    });
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault(); e.stopPropagation();
      showCtxMenu(e.clientX, e.clientY, [
        { icon: '&#9998;', label: 'Rename', accel: 'F2', action: () => startRename(item, false) },
        { icon: '&#10005;', label: 'Delete', accel: 'Del', action: () => deleteDesktopItem(item) },
      ]);
    });
    desktopIconsEl.appendChild(btn);
    item.el = btn;
  }
  function startRename(item, selectAll) {
    const label = item.el.querySelector('.desktop-icon-label');
    const input = document.createElement('input');
    input.className = 'icon-rename';
    input.value = item.name;
    label.replaceWith(input);
    input.focus();
    if (selectAll) input.select();
    const commit = () => {
      const v = input.value.trim() || item.name;
      item.name = v;
      const span = document.createElement('span');
      span.className = 'desktop-icon-label';
      span.textContent = item.name;
      input.replaceWith(span);
      desktopToast('Renamed to ' + item.name);
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') commit();
      if (e.key === 'Escape') { const span = document.createElement('span'); span.className = 'desktop-icon-label'; span.textContent = item.name; input.replaceWith(span); }
    });
    input.addEventListener('blur', commit);
  }
  function deleteDesktopItem(item) {
    item.el.remove();
    const idx = desktopItems.indexOf(item);
    if (idx >= 0) desktopItems.splice(idx, 1);
    recycleBinItems.push({ name: item.name, icon: item.type === 'folder' ? '&#128193;' : '&#128196;' });
    desktopToast('"' + item.name + '" moved to Recycle Bin');
  }

  /* Recycle bin contents */
  const recycleBinItems = [];
  function buildRecycleBinContent() {
    const wrap = document.createElement('div');
    wrap.className = 'explorer-app';
    function render() {
      wrap.innerHTML = `
        <div class="explorer-toolbar"><span>Recycle Bin</span><span class="explorer-count">${recycleBinItems.length} items</span></div>
        <div class="explorer-list">
          ${recycleBinItems.length ? recycleBinItems.map((it, i) => `
            <div class="explorer-row"><span class="explorer-row-icon">${it.icon}</span>
            <span class="explorer-row-name"><strong>${esc(it.name)}</strong></span>
            <button class="text-btn restore-btn" data-i="${i}" type="button">Restore</button></div>`).join('')
          : '<p class="notif-empty" style="padding:20px">Recycle Bin is empty.</p>'}
        </div>`;
      wrap.querySelectorAll('.restore-btn').forEach((b) => b.addEventListener('click', () => {
        const it = recycleBinItems.splice(Number(b.dataset.i), 1)[0];
        if (it) { createDesktopItem({ type: it.icon.includes('128193') ? 'folder' : 'text' }); desktopToast('Restored ' + it.name); }
        render();
      }));
    }
    render();
    return wrap;
  }

  /* Wire existing desktop icons */
  document.querySelectorAll('[data-app]:not(.taskbar-btn)').forEach((el) => {
    el.addEventListener('click', () => { closeStart(); openOrFocusApp(el.dataset.app); });
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showCtxMenu(e.clientX, e.clientY, [
        { icon: '&#9654;', label: 'Open', action: () => openOrFocusApp(el.dataset.app) },
        '-',
        { icon: '&#128465;', label: 'Delete', disabled: true },
        { icon: '&#9998;', label: 'Rename', disabled: true },
      ]);
    });
  });

  /* ============================== TASK VIEW ============================== */
  const taskView = $('taskView');
  const taskviewScrim = $('taskviewScrim');
  const taskviewGrid = $('taskviewGrid');
  function openTaskView() {
    taskviewGrid.innerHTML = '';
    const items = [...windows.entries()].filter(([, w]) => w.el.dataset.app !== undefined || true);
    items.forEach(([key, w]) => {
      const cfg = w.appId ? GENERIC_APPS[w.appId] : { title: 'Punjabi Rewind — Media Player', icon: 'ਪ' };
      const card = document.createElement('div');
      card.className = 'tv-card';
      card.innerHTML = `
        <div class="tv-thumb">${cfg.icon}</div>
        <div class="tv-label"><span class="tv-icon">${cfg.icon}</span><span>${esc(cfg.title)}</span></div>
        <button class="tv-close" type="button" aria-label="Close">&#10005;</button>
      `;
      card.addEventListener('click', (e) => {
        if (e.target.closest('.tv-close')) { closeTaskView(); if (key === 'main') minimizeWindow('main'); else closeWindow(key); return; }
        closeTaskView();
        if (key === 'main') showMainWindow(); else openOrFocusApp(w.appId);
      });
      taskviewGrid.appendChild(card);
    });
    taskView.setAttribute('aria-hidden', 'false');
    taskviewScrim.classList.add('open');
  }
  function closeTaskView() {
    taskView.setAttribute('aria-hidden', 'true');
    taskviewScrim.classList.remove('open');
  }
  taskviewScrim.addEventListener('click', closeTaskView);
  $('taskviewBtn').addEventListener('click', () => {
    if (taskView.getAttribute('aria-hidden') === 'false') closeTaskView(); else openTaskView();
  });
  window.__openTaskView = openTaskView;

  /* ============================== KEYBOARD SHORTCUTS ============================== */
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input,textarea,select')) return;
    if (e.key === 'Tab' && e.altKey) { e.preventDefault(); openTaskView(); }
    if (e.metaKey && e.key.toLowerCase() === 'd') { e.preventDefault(); $('showDesktopBtn').click(); }
    if (e.metaKey && e.key.toLowerCase() === 'e') { e.preventDefault(); openOrFocusApp('explorer'); }
    if (e.metaKey && e.key.toLowerCase() === 'l') { e.preventDefault(); document.querySelector('[data-power="lock"]').click(); }
    if (e.metaKey && e.key.toLowerCase() === 'i') { e.preventDefault(); openOrFocusApp('settings'); }
  });

  /* ============================== BOOT + APPLY ============================== */
  const boot = document.createElement('div');
  boot.className = 'boot-screen';
  boot.innerHTML = '<div class="boot-logo">&#8862;</div>';
  document.body.appendChild(boot);
  setTimeout(() => boot.classList.add('done'), 900);
  setTimeout(() => boot.remove(), 1600);

  applySettings();
  updateMaxIcon('main');
})();
