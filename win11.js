/* ============================================================
   WINDOWS 11 DESKTOP SHELL — behavior
   Everything the original build needs (scene.js, player.js,
   app.js, radio.js) keeps running inside #winContent untouched.
   This file only manages the desktop chrome around it: opening,
   minimizing, maximizing, closing and dragging the app window,
   the Start menu, and the taskbar clock.
   ============================================================ */
(function () {
  const appWindow = document.getElementById('appWindow');
  const titlebar = document.getElementById('winTitlebar');
  const minBtn = document.getElementById('winMinBtn');
  const maxBtn = document.getElementById('winMaxBtn');
  const closeBtn = document.getElementById('winCloseBtn');

  const taskbarAppBtn = document.getElementById('taskbarAppBtn');
  const taskbarStartBtn = document.getElementById('taskbarStartBtn');
  const desktopIconApp = document.getElementById('desktopIconApp');
  const showDesktopBtn = document.getElementById('showDesktopBtn');

  const startMenu = document.getElementById('startMenu');
  const startScrim = document.getElementById('startScrim');
  const startAppPunjabiRewind = document.getElementById('startAppPunjabiRewind');
  const startRecentPunjabiRewind = document.getElementById('startRecentPunjabiRewind');

  const trayTime = document.getElementById('trayTime');
  const trayDate = document.getElementById('trayDate');

  let lastLayout = 'maximized'; // 'maximized' | 'windowed' — remembered across minimize/restore
  let wasMinimized = false;

  /* ---------------- shared z-order across every window (main app + generic apps) ---------------- */
  let zTop = 20;
  function bringToFront(el) {
    zTop += 1;
    el.style.zIndex = zTop;
  }

  /* ---------------- window state ---------------- */
  function isHidden() {
    return appWindow.classList.contains('hidden-window');
  }

  function showWindow() {
    appWindow.classList.remove('hidden-window');
    appWindow.classList.remove('maximized', 'windowed');
    appWindow.classList.add(lastLayout);
    taskbarAppBtn.classList.add('active');
    wasMinimized = false;
    updateMaxIcon();
    bringToFront(appWindow);
  }
  appWindow.addEventListener('pointerdown', () => bringToFront(appWindow));

  function minimizeWindow() {
    appWindow.classList.add('hidden-window');
    taskbarAppBtn.classList.remove('active');
    wasMinimized = true;
  }

  function toggleMaximize() {
    if (appWindow.classList.contains('maximized')) {
      appWindow.classList.remove('maximized');
      appWindow.classList.add('windowed');
      lastLayout = 'windowed';
    } else {
      appWindow.classList.remove('windowed');
      appWindow.classList.add('maximized');
      lastLayout = 'maximized';
    }
    appWindow.style.left = '';
    appWindow.style.top = '';
    appWindow.style.marginLeft = '';
    updateMaxIcon();
  }

  function updateMaxIcon() {
    maxBtn.innerHTML = appWindow.classList.contains('maximized') ? '&#10064;' : '&#9723;';
    maxBtn.setAttribute('aria-label', appWindow.classList.contains('maximized') ? 'Restore' : 'Maximize');
  }

  function toggleTaskbarClick() {
    if (isHidden()) {
      showWindow();
    } else {
      minimizeWindow();
    }
  }

  minBtn.addEventListener('click', minimizeWindow);
  maxBtn.addEventListener('click', toggleMaximize);
  closeBtn.addEventListener('click', minimizeWindow); // "closing" hides the app; it keeps running so audio isn't interrupted, same as a real pinned taskbar app
  titlebar.addEventListener('dblclick', (e) => {
    if (e.target.closest('.win-controls')) return;
    toggleMaximize();
  });

  taskbarAppBtn.addEventListener('click', toggleTaskbarClick);
  desktopIconApp.addEventListener('click', showWindow);
  showDesktopBtn.addEventListener('click', () => {
    if (isHidden()) showWindow();
    else minimizeWindow();
  });

  /* ---------------- drag to move (windowed mode only) ---------------- */
  let dragging = false, dragStartX = 0, dragStartY = 0, winStartX = 0, winStartY = 0;

  titlebar.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.win-controls')) return;
    if (!appWindow.classList.contains('windowed')) return;
    dragging = true;
    titlebar.classList.add('dragging');
    titlebar.setPointerCapture(e.pointerId);
    const rect = appWindow.getBoundingClientRect();
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    winStartX = rect.left;
    winStartY = rect.top;
    appWindow.style.marginLeft = '0';
    appWindow.style.left = rect.left + 'px';
    appWindow.style.top = rect.top + 'px';
  });
  titlebar.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    const maxLeft = window.innerWidth - 80;
    const maxTop = window.innerHeight - 48 - 24;
    appWindow.style.left = Math.min(Math.max(winStartX + dx, -appWindow.offsetWidth + 120), maxLeft) + 'px';
    appWindow.style.top = Math.min(Math.max(winStartY + dy, 0), maxTop) + 'px';
  });
  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    titlebar.classList.remove('dragging');
    try { titlebar.releasePointerCapture(e.pointerId); } catch (_) {}
  }
  titlebar.addEventListener('pointerup', endDrag);
  titlebar.addEventListener('pointercancel', endDrag);

  /* ---------------- Start menu ---------------- */
  function openStart() {
    if (window.__closeVault) window.__closeVault();
    startMenu.setAttribute('aria-hidden', 'false');
    startScrim.classList.add('open');
  }
  function closeStart() {
    startMenu.setAttribute('aria-hidden', 'true');
    startScrim.classList.remove('open');
  }
  window.__closeStart = closeStart; // player.js closes Start when the starmap opens
  taskbarStartBtn.addEventListener('click', () => {
    if (startMenu.getAttribute('aria-hidden') === 'false') closeStart();
    else openStart();
  });
  startScrim.addEventListener('click', closeStart);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeStart();
  });
  [startAppPunjabiRewind, startRecentPunjabiRewind].forEach((btn) => {
    btn && btn.addEventListener('click', () => {
      closeStart();
      showWindow();
    });
  });

  /* ---------------- search (taskbar pill + Start menu box) ---------------- */
  const taskbarSearchBtn = document.getElementById('taskbarSearchBtn');
  const startSearchInput = document.getElementById('startSearchInput');

  if (taskbarSearchBtn) {
    taskbarSearchBtn.addEventListener('click', () => {
      openStart();
      setTimeout(() => startSearchInput && startSearchInput.focus(), 60);
    });
  }

  if (startSearchInput) {
    // Typing filters the pinned apps by name...
    startSearchInput.addEventListener('input', () => {
      const q = startSearchInput.value.trim().toLowerCase();
      document.querySelectorAll('.start-app').forEach((tile) => {
        tile.style.display = !q || tile.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
    // ...and Enter hands the same query to the full track index.
    startSearchInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const q = startSearchInput.value.trim();
      closeStart();
      showWindow();
      if (window.__openVault) window.__openVault();
      const songSearch = document.getElementById('songSearch');
      if (songSearch && q) {
        songSearch.value = q;
        songSearch.dispatchEvent(new Event('input'));
      }
    });
  }

  /* "All apps" opens the File Explorer, which lists every track on the desktop. */
  const allAppsBtn = document.getElementById('allAppsBtn');
  if (allAppsBtn) {
    allAppsBtn.addEventListener('click', () => {
      closeStart();
      openOrFocusApp('explorer');
    });
  }

  /* ---------------- taskbar clock ---------------- */
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

  /* start maximized on load */
  updateMaxIcon();

  /* ============================================================
     GENERIC APPS — File Explorer, Photos, Notepad, Edge, and the
     rest of the pinned/Start icons. Each opens a real lightweight
     window with its own content instead of doing nothing.
     ============================================================ */
  const desktop = document.getElementById('win11Desktop');
  const openGenericWindows = {}; // appId -> window element, created lazily on first open

  const COVER_GRADIENTS = [
    ['#ECA31C', '#b9760f'], ['#D14A3F', '#8e2e26'], ['#5B9BD9', '#2c5d8f'],
    ['#4FBE8C', '#276b4d'], ['#9b6bd6', '#4d3170'], ['#e0729a', '#7e2c4b'],
  ];

  function songList() {
    return window.SONGS || [];
  }

  function playSongFromApp(index) {
    if (window.selectSong) window.selectSong(index, true);
    if (window.__focusMarker) window.__focusMarker(index);
    showWindow();
    bringToFront(appWindow);
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
            <span class="explorer-row-name"><strong>${escapeHtml(s.title)}</strong><span>${escapeHtml(s.artist)}</span></span>
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
    const songs = songList();
    songs.forEach((s, i) => {
      const [c1, c2] = COVER_GRADIENTS[i % COVER_GRADIENTS.length];
      const tile = document.createElement('div');
      tile.className = 'photo-tile';
      tile.style.background = `linear-gradient(150deg, ${c1}, ${c2})`;
      tile.innerHTML = `<span>${escapeHtml(s.title)}</span>`;
      tile.addEventListener('click', () => playSongFromApp(i));
      wrap.appendChild(tile);
    });
    return wrap;
  }

  function buildNotepadContent() {
    const pre = document.createElement('pre');
    pre.className = 'notepad-text';
    pre.textContent = [
      'Punjabi Rewind — A Sonic Constellation',
      '',
      '27 Hindi & Punjabi tracks from 2026, arranged as a galaxy',
      'you fly through.',
      '',
      'Drag to orbit. Scroll to dive in or pull back. Click a',
      'light to play its track. Autopilot lets the camera fly on',
      'its own, in time with whatever is playing.',
      '',
      'Everything on this desktop is one app — File Explorer and',
      'Photos both open onto the same 27-track library.',
    ].join('\n');
    return pre;
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
        <p>27 Hindi &amp; Punjabi tracks of 2026, presented as a galaxy you fly through.</p>
        <div class="edge-shortcuts">
          <div class="edge-shortcut" data-shortcut="rewind">
            <span class="edge-shortcut-icon">ਪ</span><span>Punjabi Rewind</span>
          </div>
          <div class="edge-shortcut" data-shortcut="explorer">
            <span class="edge-shortcut-icon">&#128196;</span><span>Track list</span>
          </div>
        </div>
      </div>
    `;
    wrap.querySelectorAll('[data-shortcut]').forEach((el) => {
      el.addEventListener('click', () => openOrFocusApp(el.dataset.shortcut));
    });
    return wrap;
  }

  function buildPlaceholder(title, icon, note) {
    const wrap = document.createElement('div');
    wrap.className = 'app-placeholder';
    wrap.innerHTML = `
      <span class="app-placeholder-icon">${icon}</span>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(note)}</p>
    `;
    return wrap;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const GENERIC_APPS = {
    explorer: { title: 'File Explorer', icon: '&#128196;', w: 560, h: 520, build: buildExplorerContent },
    photos: { title: 'Photos', icon: '&#128247;', w: 640, h: 520, build: buildPhotosContent },
    notepad: { title: 'Notepad', icon: '&#128220;', w: 480, h: 520, build: buildNotepadContent },
    edge: { title: 'Microsoft Edge', icon: '&#127760;', w: 760, h: 560, build: buildEdgeContent },
    recyclebin: { title: 'Recycle Bin', icon: '&#128465;&#65039;', w: 420, h: 300, build: () => buildPlaceholder('Recycle Bin', '&#128465;&#65039;', 'Nothing here — everything on this desktop is still where it belongs.') },
    mail: { title: 'Mail', icon: '&#9993;&#65039;', w: 460, h: 320, build: () => buildPlaceholder('Mail', '&#9993;&#65039;', 'No new mail. This app is just for show in the simulation.') },
    calendar: { title: 'Calendar', icon: '&#128197;', w: 460, h: 320, build: () => buildPlaceholder('Calendar', '&#128197;', 'Nothing scheduled today.') },
    settings: { title: 'Settings', icon: '&#9881;&#65039;', w: 460, h: 320, build: () => buildPlaceholder('Settings', '&#9881;&#65039;', 'Settings are just for show in this simulation.') },
    store: { title: 'Microsoft Store', icon: '&#128193;', w: 460, h: 320, build: () => buildPlaceholder('Microsoft Store', '&#128193;', 'Nothing to install — the whole desktop is one app.') },
  };

  let cascadeCount = 0;

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
    win.style.left = 'calc(50% - ' + Math.round(cfg.w / 2) + 'px + ' + offset + 'px)';

    win.innerHTML = `
      <header class="win-titlebar">
        <div class="win-titlebar-id">
          <span class="win-titlebar-icon">${cfg.icon}</span>
          <span class="win-titlebar-text">${escapeHtml(cfg.title)}</span>
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
    desktop.insertBefore(win, startScrim);
    wireGenericWindow(win, appId);
    return win;
  }

  function wireGenericWindow(win, appId) {
    const tbar = win.querySelector('.win-titlebar');
    const gMin = win.querySelector('.win-min');
    const gMax = win.querySelector('.win-max');
    const gClose = win.querySelector('.win-close');
    const taskbarBtn = document.querySelector('.taskbar-btn[data-app="' + appId + '"]');

    function hide() {
      win.classList.add('hidden-window');
      if (taskbarBtn) taskbarBtn.classList.remove('active');
    }
    gMin.addEventListener('click', hide);
    gClose.addEventListener('click', hide); // same reasoning as the main window: hide, don't destroy
    gMax.addEventListener('click', () => {
      win.classList.toggle('maximized');
      win.classList.toggle('windowed');
      gMax.innerHTML = win.classList.contains('maximized') ? '&#10064;' : '&#9723;';
      if (win.classList.contains('windowed')) {
        win.style.width = win.dataset.prevW || (GENERIC_APPS[appId].w + 'px');
        win.style.height = win.dataset.prevH || (GENERIC_APPS[appId].h + 'px');
      }
    });
    tbar.addEventListener('dblclick', (e) => {
      if (e.target.closest('.win-controls')) return;
      gMax.click();
    });
    win.addEventListener('pointerdown', () => bringToFront(win));

    let dragging = false, sx = 0, sy = 0, wx = 0, wy = 0;
    tbar.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.win-controls')) return;
      if (!win.classList.contains('windowed')) return;
      dragging = true;
      tbar.setPointerCapture(e.pointerId);
      const rect = win.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; wx = rect.left; wy = rect.top;
      win.style.left = rect.left + 'px';
      win.style.top = rect.top + 'px';
    });
    tbar.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      win.style.left = Math.min(Math.max(wx + dx, -win.offsetWidth + 120), window.innerWidth - 80) + 'px';
      win.style.top = Math.min(Math.max(wy + dy, 0), window.innerHeight - 48 - 24) + 'px';
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      try { tbar.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    tbar.addEventListener('pointerup', endDrag);
    tbar.addEventListener('pointercancel', endDrag);
  }

  function openOrFocusApp(appId) {
    if (appId === 'rewind') {
      showWindow();
      return;
    }
    let win = openGenericWindows[appId];
    if (!win) {
      win = createGenericWindow(appId);
      openGenericWindows[appId] = win;
    }
    win.classList.remove('hidden-window');
    bringToFront(win);
    const taskbarBtn = document.querySelector('.taskbar-btn[data-app="' + appId + '"]');
    if (taskbarBtn) taskbarBtn.classList.add('active');
  }
  window.__openApp = openOrFocusApp; // exposed in case another part of the page wants to open an app

  /* Desktop icons, Start menu tiles, and Edge's shortcuts always open + focus the app. */
  document.querySelectorAll('[data-app]:not(.taskbar-btn)').forEach((el) => {
    el.addEventListener('click', () => {
      closeStart();
      openOrFocusApp(el.dataset.app);
    });
  });

  /* Pinned taskbar icons (explorer/edge/notepad) toggle like the main app's does:
     click to open when closed/hidden, click again to hide when it's the visible one. */
  document.querySelectorAll('.taskbar-btn[data-app]').forEach((btn) => {
    const appId = btn.dataset.app;
    btn.addEventListener('click', () => {
      const win = openGenericWindows[appId];
      if (win && !win.classList.contains('hidden-window')) {
        win.classList.add('hidden-window');
        btn.classList.remove('active');
      } else {
        openOrFocusApp(appId);
      }
    });
  });
})();
