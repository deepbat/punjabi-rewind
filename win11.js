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
    wallpaper: 'bloom', accent: '#60CDFF', brightness: 100, nightLight: false,
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
    let shakeDir = 0, shakeCount = 0, lastShakeX = 0, lastShakeT = 0;

    tbar.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.win-controls') || e.target.closest('.rs')) return;
      if (!el.classList.contains('windowed')) return;
      dragging = true;
      shakeDir = 0; shakeCount = 0; lastShakeX = e.clientX; lastShakeT = performance.now();
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
      // Aero Shake: rapid horizontal reversals minimize every other window
      const nowT = performance.now();
      const dir = e.clientX > lastShakeX ? 1 : (e.clientX < lastShakeX ? -1 : 0);
      if (dir && dir !== shakeDir && nowT - lastShakeT < 350) {
        shakeCount++;
        if (shakeCount >= 4) {
          shakeCount = 0;
          windows.forEach((o, k) => { if (k !== key && !o.minimized && !isHidden(o.el)) minimizeWindow(k); });
          desktopToast('Aero Shake — everything else minimized');
        }
      } else if (!dir || nowT - lastShakeT >= 350) {
        if (nowT - lastShakeT >= 350) shakeCount = 0;
      }
      if (dir) { shakeDir = dir; lastShakeX = e.clientX; lastShakeT = nowT; }
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
     third1: () => ({ left: 0, top: 0, width: window.innerWidth / 3, height: window.innerHeight - 48 }),
     third2: () => ({ left: window.innerWidth / 3, top: 0, width: window.innerWidth / 3, height: window.innerHeight - 48 }),
     third3: () => ({ left: (window.innerWidth * 2) / 3, top: 0, width: window.innerWidth / 3, height: window.innerHeight - 48 }),
     wideL:  () => ({ left: 0, top: 0, width: (window.innerWidth * 2) / 3, height: window.innerHeight - 48 }),
     wideR:  () => ({ left: (window.innerWidth * 2) / 3, top: 0, width: window.innerWidth / 3, height: window.innerHeight - 48 }),
     max:    () => ({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight - 48 }),
   };
  let pendingSnap = null;

  /* -------- snap layouts flyout (hover the maximize button, like real Win11) -------- */
  let snapKey = null, snapTimer = null;
  function wireSnapButton(btn, key) {
    if (!btn) return;
    btn.addEventListener('pointerenter', () => {
      clearTimeout(snapTimer);
      snapTimer = setTimeout(() => showSnapFlyout(btn, key), 380);
    });
    btn.addEventListener('pointerleave', () => {
      clearTimeout(snapTimer);
      snapTimer = setTimeout(() => { if (!$('snapFlyout').matches(':hover')) $('snapFlyout').hidden = true; }, 180);
    });
  }
  function showSnapFlyout(btn, key) {
    snapKey = key;
    const fly = $('snapFlyout');
    const r = btn.getBoundingClientRect();
    fly.hidden = false;
    const fw = 300;
    fly.style.left = clamp(r.right - fw, 4, window.innerWidth - fw - 4) + 'px';
    fly.style.top = (r.bottom + 6) + 'px';
  }
  $('snapFlyout').addEventListener('pointerleave', () => { $('snapFlyout').hidden = true; });
  $('snapFlyout').querySelectorAll('[data-zone]').forEach((z) => {
    z.addEventListener('click', () => {
      $('snapFlyout').hidden = true;
      if (!snapKey) return;
      const w = windows.get(snapKey);
      if (!w) return;
      focusWindow(snapKey);
      if (w.el.classList.contains('maximized')) { w.el.classList.remove('maximized'); w.el.classList.add('windowed'); }
      const geo = SNAP_ZONES[z.dataset.zone]();
      if (!geo) return;
      Object.assign(w.el.style, { left: geo.left + 'px', top: geo.top + 'px', width: geo.width + 'px', height: geo.height + 'px', marginLeft: '0' });
      w.el.classList.add('windowed');
      updateMaxIcon(snapKey);
      if (snapKey === 'main') lastLayout = 'windowed';
    });
  });

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
  wireSnapButton(maxBtn, 'main');
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

  const SVG_FOLDER = '<svg viewBox="0 0 24 24" class="tic"><rect x="2" y="5" width="20" height="13" rx="2" fill="#1976D2"/><path d="M2 9a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" fill="#FFC83D"/></svg>';
  const SVG_EDGE_SM = '<svg viewBox="0 0 24 24" class="tic"><circle cx="12" cy="12" r="9" fill="#0C88C7"/><path d="M12 3.2A8.8 8.8 0 0 1 19.7 16c-1.4-4.3-4.9-7-9.2-7-2.3 0-4.4 1-5.8 2.5C6.2 8.7 8.9 3.6 12 3.2z" fill="#3BC2D8"/></svg>';
  const SVG_NOTEPAD_SM = '<svg viewBox="0 0 24 24" class="tic"><rect x="5" y="3" width="14" height="18" rx="1.5" fill="#F3F3F3"/><rect x="5" y="3" width="14" height="5" fill="#4CC2FF"/><line x1="8" y1="12" x2="16" y2="12" stroke="#8a8a8a" stroke-width="1.6"/><line x1="8" y1="15.5" x2="16" y2="15.5" stroke="#8a8a8a" stroke-width="1.6"/><line x1="8" y1="19" x2="14" y2="19" stroke="#8a8a8a" stroke-width="1.6"/></svg>';
  const SVG_GEAR_SM = '<svg viewBox="0 0 24 24" class="tic"><circle cx="12" cy="12" r="6" fill="none" stroke="#B5B5B5" stroke-width="4.4" stroke-dasharray="2.9 1.81"/><circle cx="12" cy="12" r="2.6" fill="#B5B5B5"/></svg>';
  const SVG_PHOTOS_SM = '<svg viewBox="0 0 24 24" class="tic"><rect x="3" y="4" width="18" height="16" rx="2" fill="#2B88D8"/><circle cx="9" cy="10" r="2.2" fill="#fff"/><path d="M4 19l5-6 3.5 4 2.5-3 5 5z" fill="#fff" opacity=".92"/></svg>';
  const SVG_BIN_SM = '<svg viewBox="0 0 24 24" class="tic"><path d="M5 7h14l-1.3 12a2 2 0 0 1-2 1.8H8.3a2 2 0 0 1-2-1.8z" fill="#CFCFCF"/><rect x="4" y="4.5" width="16" height="2.4" rx="1" fill="#EFEFEF"/><rect x="10" y="2.4" width="4" height="2.4" rx="1" fill="#EFEFEF"/></svg>';
  const SVG_SONG = '<svg viewBox="0 0 24 24" class="tic"><path d="M9 18.5a3 3 0 1 1-2-2.83V5.2L17 2.7v12.5a3 3 0 1 1-2-2.83V6.4l-6 1.5z" fill="#4CC2FF"/></svg>';
  const SVG_DRIVE = '<svg viewBox="0 0 24 24" class="tic"><rect x="3" y="4" width="18" height="12" rx="1.5" fill="#8a8a8a"/><rect x="5" y="6" width="14" height="8" fill="#1b3a5c"/><rect x="10.5" y="16" width="3" height="3" fill="#8a8a8a"/><rect x="7" y="19" width="10" height="1.8" rx=".9" fill="#8a8a8a"/></svg>';

  function buildExplorerContent() {
    const wrap = document.createElement('div');
    wrap.className = 'rx';
    const songs = songList();
    let view = 'list', asc = true, query = '', section = 'home';
    let extra = 0;
    wrap.innerHTML = `
      <div class="rx-tabbar">
        <div class="rx-tab">${SVG_FOLDER}<span>Punjabi Rewind</span><button type="button" aria-label="Close tab">×</button></div>
        <button class="rx-newtab" type="button" aria-label="New tab" title="New tab">+</button>
      </div>
      <div class="rx-toolbar">
        <button class="rx-cmd primary" data-cmd="new" type="button">＋ New</button>
        <button class="rx-cmd" data-cmd="sort" type="button">⇅ Sort</button>
        <button class="rx-cmd" data-cmd="view" type="button">▦ View</button>
      </div>
      <div class="rx-addr">
        <span class="rx-navbtns"><button data-nav="back" type="button" disabled aria-label="Back">←</button><button data-nav="up" type="button" aria-label="Up">↑</button></span>
        <div class="rx-crumbs"><button data-crumb="home" type="button">🏠 Home</button><span class="sep">›</span><button data-crumb="music" type="button">Music</button><span class="sep">›</span><button data-crumb="rewind" type="button"><b>Punjabi Rewind</b></button></div>
        <label class="rx-search"><span aria-hidden="true">🔍</span><input type="search" placeholder="Search Punjabi Rewind" aria-label="Search files"></label>
      </div>
      <div class="rx-body">
        <nav class="rx-nav" aria-label="Navigation">
          <button data-sec="home" type="button" class="active">🏠<span>Home</span></button>
          <button data-sec="gallery" type="button">🖼️<span>Gallery</span></button>
          <button data-sec="thispc" type="button">${SVG_FOLDER}<span>This PC</span></button>
          <div class="rx-drivebar" title="Local Disk (C:) — 62% used"><i style="width:62%"></i></div>
        </nav>
        <div class="rx-listwrap">
          <div class="rx-cols"><span></span><span><button data-sort="name" type="button">Name</button></span><span>Artist</span><span>Year</span><span>Type</span></div>
          <div class="rx-rows"></div>
        </div>
      </div>
      <div class="rx-status"><span class="rx-count"></span><span class="rx-view-label" style="margin-left:auto"></span></div>`;
    const rowsEl = wrap.querySelector('.rx-rows');
    function currentRows() {
      if (section === 'thispc') {
        return [
          { kind: 'drive', name: 'Local Disk (C:)', sub: '98 GB free of 256 GB' },
          { kind: 'drive', name: 'Data (D:)', sub: '412 GB free of 512 GB' },
          { kind: 'folder', name: 'Music' },
        ];
      }
      let pool = songs.map((s, i) => ({ kind: 'song', song: s, index: i }));
      for (let k = 0; k < extra; k++) pool.push({ kind: 'folder', name: 'New folder' + (k ? ' (' + (k + 1) + ')' : '') });
      const q = query.trim().toLowerCase();
      if (q) pool = pool.filter((r) => ((r.song ? r.song.title + ' ' + r.song.artist + ' ' + r.song.year : r.name)).toLowerCase().includes(q));
      pool.sort((a, b) => {
        const an = a.song ? a.song.title : a.name, bn = b.song ? b.song.title : b.name;
        return asc ? an.localeCompare(bn) : bn.localeCompare(an);
      });
      return pool;
    }
    function render() {
      const rows = currentRows();
      rowsEl.innerHTML = '';
      rowsEl.classList.toggle('rx-tiles', view === 'tiles' || section === 'gallery');
      rows.forEach((r) => {
        const div = document.createElement('div');
        div.className = 'rx-row';
        if (r.kind === 'song') {
          div.innerHTML = `${SVG_SONG}<span class="nm">${esc(r.song.title)}</span><span class="dim">${esc(r.song.artist)}</span><span class="dim">${r.song.year}</span><span class="dim">${r.song.lang === 'hindi' ? 'Hindi' : 'Punjabi'} audio</span>`;
          div.addEventListener('dblclick', () => playSongFromApp(r.index));
        } else if (r.kind === 'drive') {
          div.innerHTML = `${SVG_DRIVE}<span class="nm">${esc(r.name)}</span><span class="dim">${esc(r.sub)}</span><span class="dim"></span><span class="dim">Local Disk</span>`;
          div.addEventListener('dblclick', () => desktopToast(r.name + ' — open the Music folder for tracks'));
        } else {
          div.innerHTML = `${SVG_FOLDER}<span class="nm">${esc(r.name)}</span><span class="dim"></span><span class="dim"></span><span class="dim">File folder</span>`;
          div.addEventListener('dblclick', () => { if (section === 'thispc') { section = 'home'; syncNav(); render(); } else desktopToast('"' + r.name + '" is empty'); });
        }
        div.addEventListener('click', () => { rowsEl.querySelectorAll('.rx-row').forEach((x) => x.classList.remove('sel')); div.classList.add('sel'); });
        rowsEl.appendChild(div);
      });
      wrap.querySelector('.rx-count').textContent = rows.length + ' item' + (rows.length === 1 ? '' : 's');
      wrap.querySelector('.rx-view-label').textContent = (view === 'tiles' || section === 'gallery') ? 'Tiles' : 'Details';
    }
    function syncNav() {
      wrap.querySelectorAll('.rx-nav button').forEach((b) => b.classList.toggle('active', b.dataset.sec === section));
    }
    wrap.querySelectorAll('.rx-nav button').forEach((b) => b.addEventListener('click', () => { section = b.dataset.sec; syncNav(); render(); }));
    wrap.querySelector('.rx-search input').addEventListener('input', (e) => { query = e.target.value; render(); });
    wrap.querySelectorAll('[data-crumb]').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.crumb === 'home') { section = 'thispc'; } else { section = 'home'; }
      syncNav(); render();
    }));
    wrap.querySelector('[data-nav="up"]').addEventListener('click', () => { section = 'home'; syncNav(); render(); });
    wrap.querySelector('[data-sort]').addEventListener('click', () => { asc = !asc; render(); desktopToast('Sorted ' + (asc ? 'A–Z' : 'Z–A')); });
    wrap.querySelectorAll('.rx-toolbar [data-cmd]').forEach((b) => b.addEventListener('click', () => {
      const c = b.dataset.cmd;
      if (c === 'new') { extra++; section = 'home'; syncNav(); render(); desktopToast('New folder created'); }
      if (c === 'sort') { asc = !asc; render(); }
      if (c === 'view') { view = view === 'list' ? 'tiles' : 'list'; render(); }
    }));
    wrap.querySelector('.rx-newtab').addEventListener('click', () => desktopToast('One tab is plenty in this demo'));
    wrap.querySelector('.rx-tab button').addEventListener('click', () => desktopToast('Can\'t close the last tab'));
    render();
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

  const SVG_EDGE = '<svg viewBox="0 0 24 24" class="tic"><circle cx="12" cy="12" r="9" fill="#0C88C7"/><path d="M12 3.2A8.8 8.8 0 0 1 19.7 16c-1.4-4.3-4.9-7-9.2-7-2.3 0-4.4 1-5.8 2.5C6.2 8.7 8.9 3.6 12 3.2z" fill="#3BC2D8"/></svg>';
  function buildEdgeContent() {
    const wrap = document.createElement('div');
    wrap.className = 'edge2';
    wrap.innerHTML = `
      <div class="edge2-tabs">
        <div class="edge2-tab">${SVG_EDGE}<span>New tab</span><button type="button" aria-label="Close tab">×</button></div>
        <button class="edge2-newtab" type="button" aria-label="New tab">+</button>
      </div>
      <div class="edge2-bar">
        <button class="edge2-nav" type="button" disabled aria-label="Back">←</button>
        <button class="edge2-nav" type="button" disabled aria-label="Forward">→</button>
        <button class="edge2-nav" type="button" aria-label="Reload">⟳</button>
        <div class="edge2-addr"><svg viewBox="0 0 24 24" class="tic"><rect x="6" y="10" width="12" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><input type="text" value="edge://newtab" aria-label="Address bar" spellcheck="false"></div>
      </div>
      <div class="edge2-page">
        ${SVG_EDGE.replace('class="tic"', 'class="tic edge2-logo"')}
        <h2>New tab</h2>
        <label class="edge2-search"><span aria-hidden="true">🔍</span><input type="search" placeholder="Search songs, artists, stations…" aria-label="Search"></label>
        <div class="edge2-results"></div>
        <div class="edge2-links">
          <div class="edge2-link" data-shortcut="rewind"><span class="edge2-ic" style="font-size:22px">ਪ</span><span>Punjabi Rewind</span></div>
          <div class="edge2-link" data-shortcut="explorer"><span style="font-size:22px">📁</span><span>Track list</span></div>
          <div class="edge2-link" data-shortcut="settings"><span style="font-size:22px">⚙️</span><span>Settings</span></div>
        </div>
      </div>`;
    const addr = wrap.querySelector('.edge2-addr input');
    const search = wrap.querySelector('.edge2-search input');
    const results = wrap.querySelector('.edge2-results');
    function doSearch(q) {
      q = q.trim().toLowerCase();
      results.innerHTML = '';
      if (!q) return;
      const hits = songList().map((s, i) => ({ s, i })).filter(({ s }) => (s.title + ' ' + s.artist).toLowerCase().includes(q)).slice(0, 5);
      const stHits = (window.RADIO_STATIONS || []).filter((s) => s.name.toLowerCase().includes(q));
      if (!hits.length && !stHits.length) { results.innerHTML = `<div class="edge2-hit"><span>🔍</span><div><b>No results for “${esc(q)}”</b><span>Try a song, artist, or station name</span></div></div>`; return; }
      hits.forEach(({ s, i }) => {
        const d = document.createElement('div');
        d.className = 'edge2-hit';
        d.innerHTML = `<span style="font-size:20px">🎵</span><div><b>${esc(s.title)}</b><span>${esc(s.artist)} · ${s.year}</span></div>`;
        d.addEventListener('click', () => playSongFromApp(i));
        results.appendChild(d);
      });
      stHits.forEach((s) => {
        const d = document.createElement('div');
        d.className = 'edge2-hit';
        d.innerHTML = `<span style="font-size:20px">📡</span><div><b>${esc(s.name)}</b><span>Live radio station</span></div>`;
        results.appendChild(d);
      });
    }
    search.addEventListener('input', (e) => doSearch(e.target.value));
    addr.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const v = addr.value.trim().toLowerCase();
      if (v.includes('rewind')) { showMainWindow(); }
      else if (!v || v.startsWith('edge://')) { addr.value = 'edge://newtab'; }
      else { desktopToast('No internet in this demo — try the search box instead'); addr.value = 'edge://newtab'; }
    });
    wrap.querySelector('.edge2-page .edge2-nav, .edge2-bar [aria-label="Reload"]')?.addEventListener('click', () => { results.innerHTML = ''; search.value = ''; });
    wrap.querySelectorAll('[data-shortcut]').forEach((el) => {
      el.addEventListener('click', () => openOrFocusApp(el.dataset.shortcut));
    });
    wrap.querySelector('.edge2-newtab').addEventListener('click', () => desktopToast('One tab is plenty in this demo'));
    wrap.querySelector('.edge2-tab button').addEventListener('click', () => desktopToast('Can\'t close the last tab'));
    return wrap;
  }

  /* -------- Settings app -------- */
  const WALLPAPERS = ['bloom', 'aurora', 'mesh', 'dark'];
  const ACCENTS = ['#60CDFF', '#0078D4', '#ECA31C', '#D14A3F', '#4FBE8C', '#9b6bd6', '#e0729a'];
  function buildSettingsContent() {
    const wrap = document.createElement('div');
    wrap.className = 'st2';
    const PAGES = [
      ['system', '🖥️', 'System'], ['bluetooth', '📶', 'Bluetooth & devices'],
      ['network', '🌐', 'Network & internet'], ['personalization', '🖼️', 'Personalization'],
      ['apps', '▦', 'Apps'], ['accounts', '👤', 'Accounts'], ['update', '⟳', 'Windows Update'],
    ];
    wrap.innerHTML = `
      <nav class="st2-nav" aria-label="Settings sections">
        <div class="st2-user"><span class="start-account-avatar">DB</span><div><b>Deepak</b><span>deepak@rewind-pc</span></div></div>
        ${PAGES.map(([id, ic, label], i) => `<button data-page="${id}" type="button" class="${i === 0 ? 'active' : ''}"><span style="font-size:15px">${ic}</span>${label}</button>`).join('')}
      </nav>
      <div class="st2-page"></div>`;
    const page = wrap.querySelector('.st2-page');
    const tg = (label, sub, key) => `<div class="st2-card"><div class="grow"><b>${label}</b><em>${sub}</em></div><button class="st2-toggle" data-tg="${key}" aria-pressed="${settings[key] ? 'true' : 'false'}" type="button" aria-label="${label}"><i></i></button></div>`;
    const rg = (label, sub, id, min, max, val) => `<div class="st2-card"><div class="grow"><b>${label}</b><em>${sub}</em></div><input type="range" id="${id}" min="${min}" max="${max}" value="${val}" aria-label="${label}"></div>`;
    function render(id) {
      wrap.querySelectorAll('.st2-nav button').forEach((b) => b.classList.toggle('active', b.dataset.page === id));
      if (id === 'system') {
        page.innerHTML = `<h2>System</h2><p class="sub">Display, sound, and about</p>
          ${rg('Brightness', 'Screen brightness', 'sBri', 30, 100, settings.brightness)}
          ${tg('Night light', 'Warmer colors, easier on the eyes', 'nightLight')}
          ${rg('Volume', 'System output level', 'sVol', 0, 100, settings.volume)}
          ${tg('Mute', 'Silence the whole system', 'muted')}
          <div class="st2-card"><div class="grow"><b>About this PC</b><em>REWIND-PC · Punjabi Rewind Desktop · simulated Windows 11</em></div><span class="mono small" style="color:var(--win-text-dim)">v2.0</span></div>`;
        page.querySelector('#sBri').addEventListener('input', (e) => { settings.brightness = Number(e.target.value); saveSettings(); applySettings(); });
        page.querySelector('#sVol').addEventListener('input', (e) => { settings.volume = Number(e.target.value); settings.muted = settings.volume === 0; saveSettings(); applySettings(); });
      } else if (id === 'bluetooth') {
        page.innerHTML = `<h2>Bluetooth & devices</h2><p class="sub">Manage wireless devices</p>
          ${tg('Bluetooth', settings.bluetooth ? 'On — visible as REWIND-PC' : 'Off', 'bluetooth')}
          <div class="st2-card"><div class="grow"><b>No devices found</b><em>Make sure your device is discoverable</em></div><button class="st2-btn" id="sAddBt" type="button">Add device</button></div>`;
        page.querySelector('#sAddBt').addEventListener('click', () => { if (!settings.bluetooth) { desktopToast('Turn Bluetooth on first'); return; } desktopToast('Scanning… no devices found'); });
      } else if (id === 'network') {
        page.innerHTML = `<h2>Network & internet</h2><p class="sub">Wi-Fi, airplane mode, and data</p>
          ${tg('Wi-Fi', settings.wifi ? 'Connected — Home-Network' : 'Off', 'wifi')}
          ${tg('Airplane mode', 'Stop all wireless communication', 'airplane')}`;
      } else if (id === 'personalization') {
        page.innerHTML = `<h2>Personalization</h2><p class="sub">Background, colors, and lock screen</p>
          <div class="st2-card"><div class="grow"><b>Background</b><em>Pick the desktop wallpaper</em></div>
            <select id="sWall">${WALLPAPERS.map((w) => `<option value="${w}" ${settings.wallpaper === w ? 'selected' : ''}>${w[0].toUpperCase() + w.slice(1)}</option>`).join('')}</select></div>
          <div class="st2-card"><div class="grow"><b>Accent color</b><em>Tints highlights and controls</em></div>
            <div class="swatches">${ACCENTS.map((c) => `<button class="swatch ${settings.accent === c ? 'active' : ''}" data-accent="${c}" style="background:${c}" type="button" aria-label="Accent ${c}"></button>`).join('')}</div></div>
          ${tg('Night light', 'Warmer colors, easier on the eyes', 'nightLight')}
          <div class="st2-card"><div class="grow"><b>Lock screen</b><em>Bloom backdrop with clock — press any key to sign in</em></div><button class="st2-btn" id="sLockNow" type="button">Lock now</button></div>`;
        page.querySelector('#sWall').addEventListener('change', (e) => { settings.wallpaper = e.target.value; saveSettings(); applySettings(); });
        page.querySelectorAll('.swatch').forEach((s) => s.addEventListener('click', () => {
          settings.accent = s.dataset.accent; saveSettings(); applySettings();
          page.querySelectorAll('.swatch').forEach((x) => x.classList.toggle('active', x === s));
        }));
        page.querySelector('#sLockNow').addEventListener('click', () => lockPC());
      } else if (id === 'apps') {
        const list = [['പ', 'Punjabi Rewind — Media Player', '84 MB']].concat(
          Object.entries(GENERIC_APPS).map(([aid, cfg]) => [cfg.icon, cfg.title, (8 + (aid.length * 7) % 40) + ' MB'])
        );
        page.innerHTML = `<h2>Apps</h2><p class="sub">Installed apps — everything runs from this desktop</p>` +
          list.map(([ic, t, sz]) => `<div class="st2-card"><span class="st2-app-ico">${ic}</span><div class="grow"><b>${esc(t)}</b><em>${sz}</em></div></div>`).join('');
      } else if (id === 'accounts') {
        page.innerHTML = `<h2>Accounts</h2><p class="sub">Your info and sign-in options</p>
          <div class="st2-card"><span class="start-account-avatar" style="width:44px;height:44px;font-size:15px">DB</span><div class="grow"><b>Deepak</b><em>deepak@rewind-pc · Administrator</em></div></div>
          <div class="st2-card"><div class="grow"><b>Sign in with PIN</b><em>Any PIN works in this demo</em></div><button class="st2-btn" id="sLockNow2" type="button">Lock now</button></div>`;
        page.querySelector('#sLockNow2').addEventListener('click', () => lockPC());
      } else if (id === 'update') {
        page.innerHTML = `<h2>Windows Update</h2><p class="sub">You're up to date</p>
          <div class="st2-card"><div class="grow"><b>✓ Last checked: today</b><em>Rewind Desktop 11, version 2026 · no updates needed</em><div class="st2-update-bar" id="sUpdBar" hidden><i></i></div></div><button class="st2-btn accent" id="sCheckUpd" type="button">Check for updates</button></div>`;
        page.querySelector('#sCheckUpd').addEventListener('click', () => {
          const bar = page.querySelector('#sUpdBar');
          bar.hidden = false;
          const fill = bar.querySelector('i');
          let p = 0;
          const iv = setInterval(() => {
            p += 12 + Math.random() * 18;
            if (p >= 100) { clearInterval(iv); fill.style.width = '100%'; notify('Windows Update', 'You\'re up to date.', '🛡️'); }
            else fill.style.width = p + '%';
          }, 280);
        });
      }
      page.querySelectorAll('[data-tg]').forEach((t) => t.addEventListener('click', () => {
        const k = t.dataset.tg;
        settings[k] = !settings[k];
        if (k === 'volume') settings.muted = false;
        saveSettings(); applySettings();
        render(id); // refresh labels
      }));
    }
    wrap.querySelectorAll('.st2-nav button').forEach((b) => b.addEventListener('click', () => render(b.dataset.page)));
    render('system');
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
    explorer: { title: 'File Explorer', icon: SVG_FOLDER, w: 680, h: 540, build: buildExplorerContent },
    photos: { title: 'Photos', icon: SVG_PHOTOS_SM, w: 640, h: 520, build: buildPhotosContent },
    notepad: { title: 'Notepad', icon: SVG_NOTEPAD_SM, w: 480, h: 420, build: buildNotepadContent },
    edge: { title: 'Microsoft Edge', icon: SVG_EDGE_SM, w: 780, h: 580, build: buildEdgeContent },
    settings: { title: 'Settings', icon: SVG_GEAR_SM, w: 660, h: 560, build: buildSettingsContent },
    recyclebin: { title: 'Recycle Bin', icon: SVG_BIN_SM, w: 460, h: 340, build: buildRecycleBinContent },
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
    wireSnapButton(w.maxBtn, key);
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
    if (except !== 'snap') { const sf = $('snapFlyout'); if (sf) sf.hidden = true; }
    if (except !== 'overflow') { const to = $('trayOverflow'); if (to) to.hidden = true; }
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
        !e.target.closest('#trayChevronBtn') && !e.target.closest('#trayOverflow') &&
        !e.target.closest('#trayBellBtn') && !e.target.closest('#snapFlyout') &&
        !e.target.closest('.start-menu') && !e.target.closest('#taskbarStartBtn')) {
      closeAllFlyouts();
    }
  });
  $('trayChevronBtn').addEventListener('click', () => {
    const ov = $('trayOverflow');
    const open = ov.hidden;
    closeAllFlyouts('overflow');
    ov.hidden = !open;
  });
  $('trayOverflow').querySelectorAll('[data-ov]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.ov;
    $('trayOverflow').hidden = true;
    if (k === 'security') notify('Windows Security', 'No threats found. Definitions are up to date.', '🛡️');
    if (k === 'onedrive') desktopToast('OneDrive — everything is synced');
    if (k === 'audio') desktopToast('Audio output: System Default');
  }));
  $('trayBellBtn').addEventListener('click', () => {
    const open = notifCenter.getAttribute('aria-hidden') === 'false';
    closeAllFlyouts('cal');
    if (!open) { notifCenter.setAttribute('aria-hidden', 'false'); renderCalendar(); }
    const dot = $('trayBellDot');
    if (dot) dot.style.display = 'none';
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
      powerOverlay.setAttribute('aria-hidden', 'true');
      if (action === 'sleep' || action === 'lock') { lockPC(); return; }
      if (action === 'restart') {
        if (window.__pauseSongPlayback) window.__pauseSongPlayback();
        if (window.__pauseRadio) window.__pauseRadio();
        runBoot();
        return;
      }
      shutdownScreen.querySelector('.shutdown-message').firstChild.textContent = 'Shutting down';
      shutdownScreen.setAttribute('aria-hidden', 'false');
      if (window.__pauseSongPlayback) window.__pauseSongPlayback();
      if (window.__pauseRadio) window.__pauseRadio();
      shutdownScreen.querySelector('.power-btn-back').textContent = 'Power on';
    });
  });
  $('powerBack').addEventListener('click', () => {
    shutdownScreen.setAttribute('aria-hidden', 'true');
    runBoot();
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

  /* Desktop context menu — Win11 style: icon row + commands */
  let clipOp = null, clipName = null, clipType = null, sortAsc = true;
  function selectedUserItem() {
    const el = document.querySelector('.desktop-icon.user-item.selected');
    if (!el) return null;
    return desktopItems.find((it) => it.id === el.dataset.itemId) || null;
  }
  function showDesktopMenu(x, y, classic) {
    closeCtxMenu();
    const menu = document.createElement('div');
    menu.className = 'ctx-menu';
    const sel = selectedUserItem();
    if (!classic) {
      const row = document.createElement('div');
      row.className = 'ctx-iconrow';
      const iconBtns = [
        { t: 'Cut', g: '✂️', dis: !sel, fn: () => { clipOp = 'cut'; clipName = sel.name; clipType = sel.type; sel.el.style.opacity = '.45'; desktopToast('Cut "' + sel.name + '"'); } },
        { t: 'Copy', g: '❐', dis: !sel, fn: () => { clipOp = 'copy'; clipName = sel.name; clipType = sel.type; desktopToast('Copied "' + sel.name + '"'); } },
        { t: 'Paste', g: '📋', dis: !clipOp, fn: () => {
          if (clipOp === 'copy') createDesktopItem({ type: clipType, name: clipName + ' - Copy', quiet: true });
          else if (clipOp === 'cut') { const it = desktopItems.find((i) => i.name === clipName); if (it && it.el) it.el.style.opacity = ''; }
          clipOp = null; desktopToast('Pasted');
        } },
        { t: 'Rename', g: '✎', dis: !sel, fn: () => startRename(sel, false) },
        { t: 'Delete', g: '🗑', dis: !sel, fn: () => deleteDesktopItem(sel) },
      ];
      iconBtns.forEach((b) => {
        const btn = document.createElement('button');
        btn.className = 'ctx-iconbtn'; btn.type = 'button'; btn.title = b.t;
        btn.innerHTML = `<span style="font-size:15px">${b.g}</span><span>${b.t}</span>`;
        if (b.dis) btn.disabled = true;
        else btn.addEventListener('click', () => { closeCtxMenu(); b.fn(); });
        row.appendChild(btn);
      });
      menu.appendChild(row);
      var items = [
        { label: 'Sort by name ' + (sortAsc ? '(A–Z)' : '(Z–A)'), action: () => {
          sortAsc = !sortAsc;
          desktopItems.sort((a, b) => sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
          desktopItems.forEach((it) => it.el && desktopIconsEl.appendChild(it.el));
          desktopToast('Sorted ' + (sortAsc ? 'A–Z' : 'Z–A'));
        } },
        { label: 'Refresh', action: () => desktopToast('Desktop refreshed') },
        '-',
        { label: 'Next desktop background', action: () => cycleWallpaper() },
        '-',
        { label: 'Display settings', action: () => openOrFocusApp('settings') },
        { label: 'Personalize', action: () => openOrFocusApp('settings') },
        '-',
        { label: 'Show more options', cls: 'ctx-more', action: () => showDesktopMenu(x, y, true) },
      ];
    } else {
      var items = [
        { label: 'New folder', action: () => createDesktopItem({ type: 'folder' }) },
        { label: 'New text document', action: () => createDesktopItem({ type: 'text' }) },
        '-',
        { label: 'Change wallpaper', action: () => cycleWallpaper() },
        { label: 'Display settings', action: () => openOrFocusApp('settings') },
        '-',
        { label: 'About this PC', action: () => notify('About this PC', 'Punjabi Rewind Desktop · simulated Windows 11 · v2.0', '💻') },
      ];
    }
    items.forEach((item) => {
      if (item === '-') { const sep = document.createElement('div'); sep.className = 'ctx-sep'; menu.appendChild(sep); return; }
      const b = document.createElement('button');
      b.className = 'ctx-item' + (item.cls ? ' ' + item.cls : '');
      b.type = 'button';
      b.innerHTML = `<span class="ctx-icon"></span><span class="ctx-label">${esc(item.label)}</span>`;
      b.addEventListener('click', () => { closeCtxMenu(); item.action && item.action(); });
      menu.appendChild(b);
    });
    document.body.appendChild(menu);
    const r = menu.getBoundingClientRect();
    menu.style.left = clamp(x, 4, window.innerWidth - r.width - 4) + 'px';
    menu.style.top = clamp(y, 4, window.innerHeight - r.height - 52) + 'px';
    ctxMenuEl = menu;
  }
  const WALLPAPER_ORDER = ['bloom', 'aurora', 'mesh', 'dark'];
  function cycleWallpaper() {
    const i = WALLPAPER_ORDER.indexOf(settings.wallpaper);
    settings.wallpaper = WALLPAPER_ORDER[(i + 1) % WALLPAPER_ORDER.length];
    saveSettings(); applySettings();
    desktopToast('Wallpaper: ' + settings.wallpaper[0].toUpperCase() + settings.wallpaper.slice(1));
  }
  $('win11Desktop').addEventListener('contextmenu', (e) => {
    if (e.target.closest('.win-window') || e.target.closest('.taskbar') || e.target.closest('.start-menu')) return;
    e.preventDefault();
    const userIcon = e.target.closest('.desktop-icon.user-item');
    if (userIcon) {
      clearIconSelection();
      userIcon.classList.add('selected');
    }
    showDesktopMenu(e.clientX, e.clientY, false);
  });

  /* ============================== DESKTOP ICONS ============================== */
  const desktopIconsEl = document.querySelector('.desktop-icons');
  const desktopItems = [];
  function createDesktopItem(opts) {
    const item = { id: 'item-' + Date.now() + Math.random().toString(36).slice(2, 6), type: opts.type, name: opts.name || (opts.type === 'folder' ? 'New folder' : 'New Text Document.txt'), x: 90 + Math.floor(Math.random() * 60), y: 18 + desktopIconsEl.children.length * 92 };
    desktopItems.push(item);
    renderDesktopItem(item);
    if (!opts.quiet) startRename(item, true);
    else desktopToast('Created "' + item.name + '"');
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

  /* ============================== RUBBER-BAND SELECTION ============================== */
  const rubber = $('rubber');
  let rubberStart = null;
  function clearIconSelection() {
    document.querySelectorAll('.desktop-icon.selected').forEach((el) => el.classList.remove('selected'));
  }
  desktop.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.win-window, .taskbar, .start-menu, .flyout, .desktop-icon, .ctx-menu, .os-toast, .os-lock, .os-login, .os-boot')) return;
    rubberStart = { x: e.clientX, y: e.clientY };
    Object.assign(rubber.style, { left: e.clientX + 'px', top: e.clientY + 'px', width: '0px', height: '0px' });
    rubber.hidden = false;
    clearIconSelection();
  });
  document.addEventListener('pointermove', (e) => {
    if (!rubberStart) return;
    const x = Math.min(e.clientX, rubberStart.x), y = Math.min(e.clientY, rubberStart.y);
    Object.assign(rubber.style, { left: x + 'px', top: y + 'px', width: Math.abs(e.clientX - rubberStart.x) + 'px', height: Math.abs(e.clientY - rubberStart.y) + 'px' });
  });
  document.addEventListener('pointerup', () => {
    if (!rubberStart) return;
    rubberStart = null;
    const r = rubber.getBoundingClientRect();
    rubber.hidden = true;
    if (r.width < 4 && r.height < 4) return;
    document.querySelectorAll('.desktop-icon').forEach((icon) => {
      const b = icon.getBoundingClientRect();
      icon.classList.toggle('selected', b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top);
    });
  });

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

  /* ============================== BOOT → LOCK → LOGIN ============================== */
  const osBoot = $('osBoot'), osLock = $('osLock'), osLogin = $('osLogin');
  const lockTime = $('lockTime'), lockDate = $('lockDate');
  const pinInput = $('osPinInput'), pinDots = $('osPinDots'), loginMsg = $('osLoginMsg');
  const pinWrap = $('osPinWrap'), welcomeBox = $('osWelcome');

  function tickLockClock() {
    const now = new Date();
    let h = now.getHours(); const m = String(now.getMinutes()).padStart(2, '0');
    const h12 = h % 12 || 12;
    if (lockTime) lockTime.textContent = h12 + ':' + m;
    if (lockDate) lockDate.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }
  tickLockClock();
  setInterval(tickLockClock, 5000);

  function tryFullscreen() {
    try {
      if (!document.fullscreenElement) {
        const p = document.documentElement.requestFullscreen();
        if (p && p.catch) p.catch(() => {});
      }
    } catch (e) {}
  }

  function runBoot() {
    closeAllFlyouts();
    osLogin.hidden = true;
    osLock.hidden = true;
    osBoot.hidden = false;
    osBoot.setAttribute('aria-hidden', 'false');
    setTimeout(() => {
      osBoot.hidden = true;
      osLock.hidden = false;
      osLock.setAttribute('aria-hidden', 'false');
      tickLockClock();
    }, 2100);
  }
  window.__osBoot = runBoot;

  function dismissLock() {
    if (osLock.hidden) return;
    osLock.hidden = true;
    osLock.setAttribute('aria-hidden', 'true');
    osLogin.hidden = false;
    osLogin.setAttribute('aria-hidden', 'false');
    pinWrap.hidden = false;
    welcomeBox.hidden = true;
    pinInput.value = '';
    syncPinDots();
    if (loginMsg) { loginMsg.textContent = 'Hint: any PIN works here — just press Enter'; loginMsg.style.color = ''; }
    setTimeout(() => pinInput.focus(), 120);
  }
  osLock.addEventListener('click', dismissLock);

  function syncPinDots() {
    const n = Math.min(pinInput.value.length, 6);
    pinDots.querySelectorAll('i').forEach((d, i) => d.classList.toggle('on', i < n));
  }
  pinInput.addEventListener('input', syncPinDots);
  pinInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') submitPin();
  });
  $('osSignIn').addEventListener('click', submitPin);
  function submitPin() {
    if (!pinInput.value) {
      pinInput.classList.remove('shake');
      void pinInput.offsetWidth;
      pinInput.classList.add('shake');
      if (loginMsg) { loginMsg.textContent = 'Enter any PIN to sign in'; loginMsg.style.color = '#ff9d9d'; }
      pinInput.focus();
      return;
    }
    pinWrap.hidden = true;
    welcomeBox.hidden = false;
    tryFullscreen(); // user gesture: browser chrome vanishes, illusion complete
    setTimeout(() => {
      osLogin.hidden = true;
      osLogin.setAttribute('aria-hidden', 'true');
      pinInput.value = '';
      bootToasts();
    }, 1100);
  }
  function lockPC() {
    closeAllFlyouts();
    if (window.__pauseSongPlayback) window.__pauseSongPlayback();
    osLock.hidden = true;
    osLogin.hidden = false;
    osLogin.setAttribute('aria-hidden', 'false');
    pinWrap.hidden = false;
    welcomeBox.hidden = true;
    pinInput.value = '';
    syncPinDots();
    setTimeout(() => pinInput.focus(), 120);
  }
  window.__lockPC = lockPC;

  document.addEventListener('keydown', (e) => {
    if (!osLock.hidden && !e.metaKey && !e.ctrlKey && !e.altKey) { dismissLock(); }
    else if (!osLogin.hidden && document.activeElement !== pinInput && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) { pinInput.focus(); }
  });

  /* Desktop toast notifications (Win11 notification-center style) */
  function notify(title, msg, icon) {
    const box = $('osToasts');
    if (!box) return;
    const t = document.createElement('div');
    t.className = 'os-toast';
    t.innerHTML = `<span class="os-toast-ico">${icon || '🔔'}</span><div class="os-toast-body"><b>${esc(title)}</b><p>${esc(msg)}</p></div><button class="os-toast-x" type="button" aria-label="Dismiss">✕</button>`;
    const kill = () => { t.classList.add('out'); setTimeout(() => t.remove(), 260); };
    t.querySelector('.os-toast-x').addEventListener('click', kill);
    box.appendChild(t);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(kill, 6000);
    const dot = $('trayBellDot');
    if (dot) dot.style.display = 'block';
  }
  window.__notify = notify;
  let bootedOnce = false;
  function bootToasts() {
    if (bootedOnce) return;
    bootedOnce = true;
    minimizeWindow('main'); // boot to a clean desktop, like a real PC
    setTimeout(() => notify('Punjabi Rewind', 'Pinned to your taskbar — click the app to open 40 tracks from 2026.', '🎵'), 900);
    setTimeout(() => notify('Windows Update', 'You\'re up to date. Last checked: today.', '🛡️'), 2600);
    setTimeout(() => notify('Live radio', '4 Punjabi stations on the dial in the sidebar.', '📡'), 4300);
  }

  /* ============================== APPLY + BOOT ============================== */
  applySettings();
  updateMaxIcon('main');
  runBoot();
})();
