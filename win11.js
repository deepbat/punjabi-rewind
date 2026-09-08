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
      'Punjabi Rewind — A Sonic Constellation',
      '',
      '40 Hindi & Punjabi tracks from 2026, arranged as a galaxy',
      'you fly through.',
      '',
      'Drag to orbit. Scroll to dive in or click a light to play.',
      'Autopilot lets the camera fly on its own, in time with the',
      'music.',
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
        <p>40 Hindi &amp; Punjabi tracks of 2026, presented as a galaxy you fly through.</p>
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
      else el.textContent = 'Nothing yet — click a light in the sky to begin.';
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
      const cfg = w.appId ? GENERIC_APPS[w.appId] : { title: 'Punjabi Rewind — A Sonic Constellation', icon: 'ਪ' };
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
