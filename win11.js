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
      const searchFiltersOn = loadSettings().searchFilters !== false;
      const q = searchFiltersOn ? startSearchInput.value.trim().toLowerCase() : '';
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
    const use12h = trayTime.dataset.format !== '24h';
    let h = now.getHours();
    const m = now.getMinutes();
    let ampm = '';
    if (use12h) {
      ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12; if (h === 0) h = 12;
    }
    trayTime.textContent = h + ':' + String(m).padStart(2, '0') + (ampm ? ' ' + ampm : '');
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

  // ── Shared desktop state ──────────────────────────────────────────────
  const RECYCLE_BIN_KEY = 'pr_recycle_bin';
  const SESSION_PHOTOS_KEY = 'pr_session_photos';
  const SETTINGS_KEY = 'pr_settings';

  function loadRecycleBin() {
    try { return JSON.parse(localStorage.getItem(RECYCLE_BIN_KEY) || '[]'); }
    catch { return []; }
  }
  function saveRecycleBin(items) {
    try { localStorage.setItem(RECYCLE_BIN_KEY, JSON.stringify(items)); } catch {}
  }
  function loadSessionPhotos() {
    try { return JSON.parse(localStorage.getItem(SESSION_PHOTOS_KEY) || '[]'); }
    catch { return []; }
  }
  function saveSessionPhotos(items) {
    try { localStorage.setItem(SESSION_PHOTOS_KEY, JSON.stringify(items)); } catch {}
  }
  function loadSettings() {
    try { return Object.assign({
      clock12h: true,
      autopilotOnStart: false,
      hudIdleFade: true,
      reducedMotion: false,
      wallpaperIndex: 0,
    }, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch {
      return { clock12h: true, autopilotOnStart: false, hudIdleFade: true, reducedMotion: false, wallpaperIndex: 0 };
    }
  }
  function saveSettings(s) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
  }

  // A tiny virtual filesystem for File Explorer: the desktop folders the
  // person can actually browse. Songs live under "Music", committed photos
  // under "Pictures", and anything dropped into the running Photos app gets
  // a session entry under "Pictures\Session".
  const VFS_ROOT = {
    name: 'This PC',
    type: 'folder',
    children: [
      { name: 'Desktop', type: 'folder', children: [] },
      { name: 'Music', type: 'folder', children: [] },
      { name: 'Pictures', type: 'folder', children: [] },
    ],
  };
  function populateVfs() {
    const songs = songList();
    const music = VFS_ROOT.children.find(c => c.name === 'Music');
    music.children = songs.map((s, i) => ({
      name: `${s.title}.mp3`,
      type: 'file',
      meta: { index: i, title: s.title, artist: s.artist, year: s.year, lang: s.lang },
    }));
    // Committed photos come from photos/index.json; session photos from
    // localStorage. Both land under Pictures.
    const pictures = VFS_ROOT.children.find(c => c.name === 'Pictures');
    pictures.children = [];
    fetch('photos/index.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : [])
      .then(list => {
        const committed = (list || []).map((entry, i) => ({
          name: entry.name || entry.path.split('/').pop(),
          type: 'file',
          meta: { src: entry.path, kind: 'committed', idx: i },
        }));
        const session = loadSessionPhotos().map((entry, i) => ({
          name: entry.name || `Photo ${i + 1}`,
          type: 'file',
          meta: { src: entry.src, kind: 'session', idx: i },
        }));
        pictures.children = committed.concat(session);
      })
      .catch(() => {});
  }
  populateVfs();

  let currentFolder = VFS_ROOT;
  function breadcrumbPath(folder) {
    const parts = [];
    let cursor = folder;
    while (cursor && cursor !== VFS_ROOT) {
      parts.unshift({ name: cursor.name, folder: cursor });
      cursor = cursor.parent;
    }
    parts.unshift({ name: VFS_ROOT.name, folder: VFS_ROOT });
    return parts;
  }
  function navigateTo(folder) {
    folder.parent = currentFolder;
    currentFolder = folder;
    renderExplorer();
  }
  function navigateUp() {
    if (currentFolder && currentFolder.parent) {
      currentFolder = currentFolder.parent;
      renderExplorer();
    }
  }
  function deleteVfsEntry(entry) {
    if (!currentFolder || !currentFolder.children) return;
    const idx = currentFolder.children.indexOf(entry);
    if (idx === -1) return;
    currentFolder.children.splice(idx, 1);
    if (entry.type === 'file' && entry.meta && entry.meta.kind === 'session') {
      const session = loadSessionPhotos().filter(e => e !== entry.meta);
      saveSessionPhotos(session);
    }
    // Files (songs/committed photos) can't really be removed from the repo
    // in the browser, so "delete" moves a reference to the Recycle Bin so
    // the item disappears from Explorer but can be restored.
    if (entry.type === 'file') {
      const existing = loadRecycleBin();
      if (!existing.some(e => e.folder === currentFolder.name && e.name === entry.name)) {
        saveRecycleBin([...existing, { name: entry.name, folder: currentFolder.name, meta: entry.meta, deletedAt: new Date().toISOString() }]);
      }
    }
    renderExplorer();
    renderRecycleBin();
  }
  function restoreFromBin(entry) {
    saveRecycleBin(loadRecycleBin().filter(e => e !== entry));
    // Re-add into Pictures (the only folder that accepts restored photos).
    const pictures = VFS_ROOT.children.find(c => c.name === 'Pictures');
    if (pictures) {
      const exists = pictures.children.some(c => c.name === entry.name);
      if (!exists) {
        pictures.children.push({ name: entry.name, type: 'file', meta: entry.meta });
      }
    }
    renderExplorer();
    renderRecycleBin();
  }
  function permanentDeleteFromBin(entry) {
    saveRecycleBin(loadRecycleBin().filter(e => e !== entry));
    renderRecycleBin();
  }

  // ── File Explorer ──────────────────────────────────────────────────────────
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
  function renderExplorer() {
    // If this is the first build, replace the existing toolbar/content.
    const win = openGenericWindows.explorer;
    if (!win) return;
    const content = win.querySelector('.generic-content');
    if (!content) return;
    content.innerHTML = explorerHtml();
    wireExplorer(content);
  }
  function explorerHtml() {
    const crumbs = breadcrumbPath(currentFolder);
    const folders = currentFolder.children ? currentFolder.children.filter(c => c.type === 'folder') : [];
    const files = currentFolder.children ? currentFolder.children.filter(c => c.type === 'file') : [];
    const total = folders.length + files.length;
    return `
      <div class="explorer-toolbar">
        <button class="explorer-back" type="button" title="Back">&#8592; Back</button>
        <span class="explorer-crumbs">
          ${crumbs.map((c, i) => `
            <span class="crumb">
              <span class="crumb-name">${escapeHtml(c.name)}</span>
              ${i < crumbs.length - 1 ? '<span class="crumb-sep">›</span>' : ''}
            </span>
          `).join('')}
        </span>
        <span class="explorer-count">${total} item${total === 1 ? '' : 's'}${currentFolder.name !== 'This PC' ? ' in '+currentFolder.name : ''}</span>
      </div>
      <div class="explorer-list">
        ${folders.length ? folders.map((f, i) => `
          <div class="explorer-row folder-row" data-i="${i}" data-kind="folder">
            <span class="explorer-row-icon">&#128193;</span>
            <span class="explorer-row-name"><strong>${escapeHtml(f.name)}</strong><span class="muted">Folder</span></span>
            <span class="explorer-row-year"></span>
          </div>
        `).join('') : '<div class="explorer-empty"><p>This folder is empty.</p></div>'}
        ${files.length ? files.map((f, i) => {
          const globalI = folders.length + i;
          return `
            <div class="explorer-row file-row" data-i="${globalI}" data-kind="file">
              <span class="explorer-row-icon">${fileIconFor(f)}</span>
              <span class="explorer-row-name"><strong>${escapeHtml(f.name)}</strong><span class="muted">${fileHint(f)}</span></span>
              <span class="explorer-row-year"></span>
            </div>
          `;
        }).join('') : ''}
      </div>
      <div class="explorer-status">Right-click an item for options · double-click a folder to open · Delete moves to Recycle Bin</div>
    `;
  }
  function fileIconFor(f) {
    if (f.meta && f.meta.kind === 'session') return '&#128247;';
    if (f.meta && f.meta.kind === 'committed') return '&#128247;';
    if (f.meta && f.meta.index !== undefined) return '&#127925;';
    return '&#128196;';
  }
  function fileHint(f) {
    if (f.meta && f.meta.kind === 'session') return 'Session photo';
    if (f.meta && f.meta.kind === 'committed') return 'Photo';
    if (f.meta && f.meta.index !== undefined) return `${f.meta.artist} · ${f.meta.year}`;
    return 'File';
  }
  function wireExplorer(content) {
    const back = content.querySelector('.explorer-back');
    if (back) back.addEventListener('click', navigateUp);
    content.querySelectorAll('.folder-row').forEach(row => {
      row.addEventListener('dblclick', () => {
        const i = Number(row.dataset.i);
        const folder = currentFolder.children && currentFolder.children[i];
        if (folder && folder.type === 'folder' && folder.name !== 'This PC') navigateTo(folder);
      });
      row.addEventListener('contextmenu', (e) => { e.preventDefault(); showExplorerContextMenu(e, row.dataset.i, 'folder'); });
    });
    content.querySelectorAll('.file-row').forEach(row => {
      row.addEventListener('dblclick', () => {
        const i = Number(row.dataset.i);
        const file = currentFolder.children && currentFolder.children[i];
        if (!file) return;
        if (file.meta && file.meta.index !== undefined) playSongFromApp(file.meta.index);
      });
      row.addEventListener('contextmenu', (e) => { e.preventDefault(); showExplorerContextMenu(e, row.dataset.i, 'file'); });
    });
    content.querySelectorAll('.crumb-name').forEach((span, i) => {
      span.style.cursor = 'pointer';
      span.addEventListener('click', () => {
        const target = breadcrumbPath(currentFolder)[i].folder;
        if (target) { currentFolder = target; renderExplorer(); }
      });
    });
  }
  let explorerContextMenu = null;
  function showExplorerContextMenu(e, i, kind) {
    closeExplorerContextMenu();
    const item = currentFolder.children && currentFolder.children[Number(i)];
    if (!item) return;
    const menu = document.createElement('div');
    menu.className = 'explorer-context-menu';
    menu.style.left = Math.min(e.clientX, window.innerWidth - 180) + 'px';
    menu.style.top = Math.min(e.clientY, window.innerHeight - 120) + 'px';
    if (kind === 'folder') {
      menu.innerHTML = `<button class="ctx-item" data-action="open">Open</button>`;
    } else {
      const canDelete = item.type === 'file' && (item.meta && (item.meta.index !== undefined || item.meta.kind === 'session'));
      menu.innerHTML = `
        <button class="ctx-item" data-action="open">Open</button>
        ${canDelete ? '<button class="ctx-item ctx-danger" data-action="delete">Delete</button>' : ''}
      `;
    }
    document.body.appendChild(menu);
    explorerContextMenu = menu;
    menu.querySelectorAll('.ctx-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'open' && item.type === 'folder' && item.name !== 'This PC') navigateTo(item);
        if (action === 'delete') deleteVfsEntry(item);
        closeExplorerContextMenu();
      });
    });
    setTimeout(() => document.addEventListener('click', closeExplorerContextMenu, { once: true }), 0);
  }
  function closeExplorerContextMenu() {
    if (explorerContextMenu) { explorerContextMenu.remove(); explorerContextMenu = null; }
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
  let photosPromise = null;
  function buildPhotosContent() {
    const wrap = document.createElement('div');
    wrap.className = 'photo-grid photos-root';
    wrap.innerHTML = `
      <div class="photos-toolbar">
        <span class="photos-title">Photos</span>
        <span class="photos-sub">Committed + session</span>
        <button class="photos-clear" type="button">Clear session</button>
      </div>
      <div class="photos-drop" id="photosDrop">
        <p>Drag photos here to add them for this session</p>
      </div>
      <div class="photos-grid" id="photosGrid"></div>
      <div class="photos-empty" id="photosEmpty" hidden>
        <p>No photos yet. Drop images onto this window, or add files to the <code>photos/</code> folder and refresh.</p>
      </div>
    `;
    const grid = wrap.querySelector('#photosGrid');
    const empty = wrap.querySelector('#photosEmpty');
    const drop = wrap.querySelector('#photosDrop');
    const clear = wrap.querySelector('.photos-clear');

    // Committed photos from the manifest (re-read live so a refresh picks up
    // new files added to the folder).
    photosPromise = fetch('photos/index.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : [])
      .catch(() => []);

    function render() {
      Promise.all([photosPromise, Promise.resolve(loadSessionPhotos())])
        .then(([committed, session]) => {
          const items = committed
            .map((entry, i) => ({ src: entry.path, name: entry.name || entry.path.split('/').pop(), kind: 'committed', idx: i }))
            .concat(session.map((entry, i) => ({ src: entry.src, name: entry.name || `Photo ${i + 1}`, kind: 'session', idx: i })));
          grid.innerHTML = items.length
            ? items.map((item, i) => `
                <div class="photo-tile${item.kind === 'session' ? ' session' : ''}" data-i="${i}" title="${escapeHtml(item.name)}${item.kind === 'session' ? ' (session)' : ''}">
                  <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.name)}" loading="lazy" />
                  <span class="photo-name">${escapeHtml(item.name)}</span>
                  ${item.kind === 'session' ? '<span class="photo-badge">session</span>' : ''}
                </div>
              `).join('')
            : '';
          empty.hidden = items.length > 0;
          grid.querySelectorAll('.photo-tile').forEach(tile => {
            tile.addEventListener('click', () => openLightbox(tile.dataset.i));
          });
        });
    }
    render();

    clear.addEventListener('click', () => {
      saveSessionPhotos([]);
      render();
    });

    // Drag-and-drop adds the image as a data URL in localStorage so it
    // survives a reload within the session (it won't be committed to the
    // repo from the browser, so it's labelled "session").
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('dragover'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('dragover');
      const files = e.dataTransfer && e.dataTransfer.files;
      if (!files || !files.length) return;
      let added = 0;
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 5 * 1024 * 1024) continue; // keep session store small
        const reader = new FileReader();
        reader.onload = (ev) => {
          const session = loadSessionPhotos();
          session.push({ src: ev.target.result, name: file.name });
          saveSessionPhotos(session);
          added++;
          if (added === 1) render(); // single re-render after all reads finish is cheaper; allow a small delay
        };
        reader.readAsDataURL(file);
      }
      // Re-render once after all reads (FileReader is async).
      if (added) setTimeout(render, 150);
    });
    return wrap;
  }
  let lightboxEl = null;
  function openLightbox(i) {
    closeLightbox();
    photosPromise.then(committed => {
      const session = loadSessionPhotos();
      const items = committed
        .map((entry, i) => ({ src: entry.path, name: entry.name || entry.path.split('/').pop(), kind: 'committed' }))
        .concat(session.map((entry, i) => ({ src: entry.src, name: entry.name || `Photo ${i + 1}`, kind: 'session' })));
      const item = items[Number(i)];
      if (!item) return;
      const lb = document.createElement('div');
      lb.className = 'photo-lightbox';
      lb.innerHTML = `
        <button class="lightbox-close" type="button">×</button>
        <button class="lightbox-prev" type="button">‹</button>
        <button class="lightbox-next" type="button">›</button>
        <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.name)}" />
        <div class="lightbox-meta">
          <span class="lightbox-name">${escapeHtml(item.name)}</span>
          <span class="lightbox-kind">${item.kind === 'session' ? 'Session photo' : 'Photo'}</span>
        </div>
      `;
      document.body.appendChild(lb);
      lightboxEl = lb;
      const img = lb.querySelector('img');
      const startLoad = performance.now();
      img.onload = () => lb.classList.add('loaded');
      img.onerror = () => { lb.classList.add('loaded'); lb.querySelector('img').style.display = 'none'; };
      lb.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
      lb.querySelector('.lightbox-prev').addEventListener('click', () => { navigateLightbox(-1); });
      lb.querySelector('.lightbox-next').addEventListener('click', () => { navigateLightbox(1); });
      lb.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') navigateLightbox(-1);
        if (e.key === 'ArrowRight') navigateLightbox(1);
      });
      lb.focus();
      setTimeout(() => {
        const items = lb.parentNode ? [...lb.parentNode.querySelectorAll('.photo-lightbox')] : [];
      }, 0);
    });
  }
  function navigateLightbox(delta) {
    if (!lightboxEl) return;
    const all = [...document.querySelectorAll('.photo-lightbox')];
    const idx = all.indexOf(lightboxEl);
    // Recompute total from committed + session to find the real neighbour.
    photosPromise.then(committed => {
      const session = loadSessionPhotos();
      const items = committed
        .map((entry, i) => ({ src: entry.path, kind: 'committed' }))
        .concat(session.map((entry, i) => ({ src: entry.src, kind: 'session' })));
      const target = (idx + delta + items.length) % items.length;
      openLightbox(target);
    });
  }
  function closeLightbox() {
    if (lightboxEl) { lightboxEl.remove(); lightboxEl = null; }
  }

  function buildNotepadContent() {
    const pre = document.createElement('pre');
    pre.className = 'notepad-text';
    pre.textContent = [
      'Punjabi Rewind — A Sonic Constellation',
      '',
      '40 Hindi & Punjabi tracks from 2026, arranged as a galaxy',
      'you fly through.',
      '',
      'Drag to orbit. Scroll to dive in or pull back. Click a',
      'light to play its track. Autopilot lets the camera fly on',
      'its own, in time with whatever is playing.',
      '',
      'Everything on this desktop is one app — File Explorer and',
      'Photos both open onto the same 40-track library.',
    ].join('\n');
    return pre;
  }
  function buildNotepadContent() {
    const wrap = document.createElement('div');
    wrap.className = 'notepad-root';
    wrap.innerHTML = `
      <div class="notepad-toolbar">
        <span class="notepad-title">Notepad</span>
        <span class="notepad-status" id="notepadStatus">Ready</span>
      </div>
      <textarea class="notepad-text" id="notepadBody" spellcheck="true" placeholder="Type something…"></textarea>
      <div class="notepad-foot">
        <span class="notepad-metrics" id="notepadMetrics">0 words · 0 lines</span>
        <button class="notepad-clear" type="button" id="notepadClear">Clear</button>
      </div>
    `;
    const body = wrap.querySelector('#notepadBody');
    const status = wrap.querySelector('#notepadStatus');
    const metrics = wrap.querySelector('#notepadMetrics');
    const clear = wrap.querySelector('#notepadClear');
    const STORAGE_KEY = 'pr_notepad_content';

    function stats(txt) {
      const trimmed = txt.trim();
      const words = trimmed.length ? trimmed.split(/\s+/).length : 0;
      const lines = txt.split('\n').length;
      return { words, lines };
    }
    function updateMetrics() {
      const s = stats(body.value);
      metrics.textContent = `${s.words} word${s.words === 1 ? '' : 's'} · ${s.lines} line${s.lines === 1 ? '' : 's'}`;
    }
    function load() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (typeof saved === 'string') body.value = saved;
      } catch {}
      updateMetrics();
      status.textContent = 'Ready';
    }
    function save() {
      try { localStorage.setItem(STORAGE_KEY, body.value); } catch {}
      status.textContent = 'Saved';
      setTimeout(() => { if (status.textContent === 'Saved') status.textContent = 'Ready'; }, 1200);
      updateMetrics();
    }
    body.addEventListener('input', updateMetrics);
    body.addEventListener('change', save);
    body.addEventListener('blur', save);
    clear.addEventListener('click', () => {
      if (body.value.trim() && !confirm('Clear everything in Notepad?')) return;
      body.value = '';
      updateMetrics();
      save();
      body.focus();
    });
    load();
    return wrap;
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
    explorer: { title: "File Explorer", icon: "&#128196;", w: 560, h: 540, build: buildExplorerContent, stateful: true },
    photos: { title: "Photos", icon: "&#128247;", w: 640, h: 540, build: buildPhotosContent, stateful: true },
    notepad: { title: "Notepad", icon: "&#128220;", w: 480, h: 480, build: buildNotepadContent, stateful: true },
    edge: { title: "Microsoft Edge", icon: "&#127760;", w: 760, h: 560, build: buildEdgeContent },
    recyclebin: { title: "Recycle Bin", icon: "&#128465;&#65039;", w: 460, h: 420, build: buildRecycleBinContent, stateful: true },
    settings: { title: "Settings", icon: "&#9881;&#65039;", w: 480, h: 520, build: buildSettingsContent, stateful: true },
    mail: { title: "Mail", icon: "&#9993;&#65039;", w: 460, h: 360, build: () => buildPlaceholder("Mail", "&#9993;&#65039;", "No new mail. Mail is part of the desktop simulation.") },
    calendar: { title: "Calendar", icon: "&#128197;", w: 460, h: 360, build: () => buildPlaceholder("Calendar", "&#128197;", "Nothing scheduled today. Calendar is part of the simulation.") },
    store: { title: "Microsoft Store", icon: "&#128193;", w: 460, h: 360, build: () => buildPlaceholder("Microsoft Store", "&#128193;", "Nothing to install — the whole desktop is one app.") },
  };
  function buildRecycleBinContent() {
    const wrap = document.createElement("div");
    wrap.className = "recycle-root";
    wrap.innerHTML = `
      <div class="recycle-toolbar">
        <span class="recycle-title">Recycle Bin</span>
        <span class="recycle-count" id="recycleCount">0 items</span>
      </div>
      <div class="recycle-empty" id="recycleEmpty">
        <p>Recycle Bin is empty — everything on this desktop is still where it belongs.</p>
      </div>
      <div class="recycle-list" id="recycleList"></div>
    `;
    renderRecycleBin();
    return wrap;
  }
  function renderRecycleBin() {
    const win = openGenericWindows.recyclebin;
    if (!win) { populateVfs(); return; }
    const list = win.querySelector("#recycleList");
    const empty = win.querySelector("#recycleEmpty");
    const count = win.querySelector("#recycleCount");
    if (!list || !empty || !count) return;
    const items = loadRecycleBin();
    count.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;
    empty.hidden = items.length > 0;
    list.innerHTML = items.length
      ? items.map((item, i) => `
          <div class="recycle-row" data-i="${i}">
            <span class="recycle-icon">${item.meta && item.meta.kind === "session" ? "&#128247;" : item.meta && item.meta.index !== undefined ? "&#127925;" : "&#128196;"}</span>
            <span class="recycle-name"><strong>${escapeHtml(item.name)}</strong>
              <span class="muted">${item.folder}${item.meta && item.meta.kind ? " · " + item.meta.kind : ""}</span>
            </span>
            <span class="recycle-date">${item.deletedAt ? new Date(item.deletedAt).toLocaleString() : ""}</span>
          </div>
        `).join("")
      : "";
    list.querySelectorAll(".recycle-row").forEach(row => {
      row.addEventListener("click", (e) => {
        const item = items[Number(row.dataset.i)];
        if (!item) return;
        if (e.shiftKey) { permanentDeleteFromBin(item); showToast("Permanently deleted " + item.name); }
        else { restoreFromBin(item); showToast("Restored " + item.name); }
      });
      row.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const item = items[Number(row.dataset.i)];
        if (!item) return;
        const menu = document.createElement("div");
        menu.className = "explorer-context-menu";
        menu.style.left = Math.min(e.clientX, window.innerWidth - 180) + "px";
        menu.style.top = Math.min(e.clientY, window.innerHeight - 120) + "px";
        menu.innerHTML = `<button class="ctx-item" data-action="restore">Restore</button><button class="ctx-item ctx-danger" data-action="permanent">Delete permanently</button>`;
        document.body.appendChild(menu);
        const cleanup = () => { menu.remove(); };
        menu.addEventListener("click", cleanup);
        menu.querySelectorAll(".ctx-item").forEach(btn => {
          btn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            const act = btn.dataset.action;
            if (act === "restore") restoreFromBin(item);
            else permanentDeleteFromBin(item);
            cleanup();
          });
        });
        setTimeout(() => document.addEventListener("click", cleanup, { once: true }), 0);
      });
    });
    populateVfs();
  }
  function buildSettingsContent() {
    const wrap = document.createElement("div");
    wrap.className = "settings-root";
    const s = loadSettings();
    wrap.innerHTML = `
      <div class="settings-head">
        <span class="settings-title">Settings</span>
        <span class="settings-sub">Desktop simulation</span>
      </div>
      <div class="settings-sections">
        <div class="settings-section">
          <div class="settings-section-head">Personalisation</div>
          <label class="settings-row">
            <span class="settings-label">Wallpaper</span>
            <select class="settings-select" id="wallpaperSelect">
              <option value="0">Deep blue default</option>
              <option value="1">Amber dusk</option>
              <option value="2">Indigo night</option>
              <option value="3">Emerald fade</option>
              <option value="4">Plum twilight</option>
              <option value="5">Blaze horizon</option>
            </select>
          </label>
        </div>
        <div class="settings-section">
          <div class="settings-section-head">System</div>
          <label class="settings-row">
            <span class="settings-label">Start menu search filters pinned apps</span>
            <input type="checkbox" class="settings-checkbox" id="searchFilters" ${s.searchFilters !== false ? "checked" : ""} />
          </label>
          <label class="settings-row">
            <span class="settings-label">Respect reduced-motion preference</span>
            <input type="checkbox" class="settings-checkbox" id="reducedMotion" ${s.reducedMotion ? "checked" : ""} />
          </label>
        </div>
        <div class="settings-section">
          <div class="settings-section-head">Time & language</div>
          <label class="settings-row">
            <span class="settings-label">Clock uses 12-hour format</span>
            <input type="checkbox" class="settings-checkbox" id="clock12h" ${s.clock12h ? "checked" : ""} />
          </label>
        </div>
        <div class="settings-section">
          <div class="settings-section-head">Playback</div>
          <label class="settings-row">
            <span class="settings-label">Autopilot starts on load</span>
            <input type="checkbox" class="settings-checkbox" id="autopilotOnStart" ${s.autopilotOnStart ? "checked" : ""} />
          </label>
          <label class="settings-row">
            <span class="settings-label">Hide HUD when idle</span>
            <input type="checkbox" class="settings-checkbox" id="hudIdleFade" ${s.hudIdleFade !== false ? "checked" : ""} />
          </label>
        </div>
      </div>
      <div class="settings-foot">
        <span class="settings-note">Changes apply immediately and are saved on this device.</span>
      </div>
    `;
    const wallpaperSelect = wrap.querySelector("#wallpaperSelect");
    wallpaperSelect.addEventListener("change", () => {
      const next = Number(wallpaperSelect.value);
      s.wallpaperIndex = next;
      saveSettings(s);
      applyWallpaper(next);
    });
    wrap.querySelectorAll(".settings-checkbox").forEach(cb => {
      cb.addEventListener("change", () => {
        s[cb.id] = cb.checked;
        saveSettings(s);
        applySettings(s);
      });
    });
    applyWallpaper(s.wallpaperIndex);
    applySettings(s);
    return wrap;
  }
  function renderSettings() {
    const win = openGenericWindows.settings;
    if (!win) return;
    const content = win.querySelector(".generic-content");
    if (!content) return;
    content.innerHTML = "";
    content.appendChild(buildSettingsContent());
  }

  const WALLPAPERS = [
    [
      "radial-gradient(1200px 800px at 78% 8%, rgba(120,190,255,.35), transparent 60%)",
      "radial-gradient(1000px 900px at 12% 92%, rgba(180,120,255,.28), transparent 55%)",
      "radial-gradient(1400px 1000px at 50% 55%, #1a2f66 0%, #0d1a3d 45%, #060a1c 100%)",
    ],
    [
      "radial-gradient(1200px 800px at 80% 10%, rgba(236,163,28,.35), transparent 60%)",
      "radial-gradient(1000px 900px at 10% 90%, rgba(212,80,30,.30), transparent 55%)",
      "radial-gradient(1400px 1000px at 50% 55%, #2a1a08 0%, #140d05 45%, #070402 100%)",
    ],
    [
      "radial-gradient(1200px 800px at 78% 8%, rgba(91,155,217,.35), transparent 60%)",
      "radial-gradient(1000px 900px at 12% 92%, rgba(100,60,160,.30), transparent 55%)",
      "radial-gradient(1400px 1000px at 50% 55%, #0e1a3a 0%, #070c1c 45%, #03050a 100%)",
    ],
    [
      "radial-gradient(1200px 800px at 78% 8%, rgba(79,190,140,.32), transparent 60%)",
      "radial-gradient(1000px 900px at 12% 92%, rgba(40,120,90,.28), transparent 55%)",
      "radial-gradient(1400px 1000px at 50% 55%, #0c2a1d 0%, #071a12 45%, #030a08 100%)",
    ],
    [
      "radial-gradient(1200px 800px at 78% 8%, rgba(155,107,214,.35), transparent 60%)",
      "radial-gradient(1000px 900px at 12% 92%, rgba(180,80,140,.28), transparent 55%)",
      "radial-gradient(1400px 1000px at 50% 55%, #241238 0%, #130a24 45%, #0a0512 100%)",
    ],
    [
      "radial-gradient(1200px 800px at 80% 8%, rgba(224,114,154,.35), transparent 60%)",
      "radial-gradient(1000px 900px at 10% 90%, rgba(200,60,80,.28), transparent 55%)",
      "radial-gradient(1400px 1000px at 50% 55%, #2a0c18 0%, #160812 45%, #0a040a 100%)",
    ],
  ];
  function applyWallpaper(index) {
    const desktop = document.getElementById("win11Desktop");
    if (!desktop) return;
    const layers = WALLPAPERS[index] || WALLPAPERS[0];
    desktop.style.background = layers.join(",");
  }
  function applySettings(s) {
    if (s.clock12h) {
      const trayTime = document.getElementById("trayTime");
      if (trayTime) delete trayTime.dataset.format;
    } else {
      const trayTime = document.getElementById("trayTime");
      if (trayTime) trayTime.dataset.format = "24h";
    }
    window.__autopilotOnStart = s.autopilotOnStart || false;
    if (s.hudIdleFade !== false) {
      document.querySelectorAll(".hud, #transportGlass").forEach(function(el) { el.classList.add("idle-fade"); });
    } else {
      document.querySelectorAll(".hud, #transportGlass").forEach(function(el) { el.classList.remove("idle-fade"); });
    }
    if (s.reducedMotion) {
      document.documentElement.classList.add("reduce-motion");
    } else {
      document.documentElement.classList.remove("reduce-motion");
    }
  }
  function applyReducedMotionFromSystem() {
    const prefers = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const s = loadSettings();
    if (prefers) {
      s.reducedMotion = true;
      saveSettings(s);
    }
    applySettings(s);
  }
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
  // ── Autopilot on start ─────────────────────────────────────────────────
  if (window.__autopilotOnStart) {
    setTimeout(function() {
      if (window.__enterAutopilot) window.__enterAutopilot();
    }, 600);
  }

  // ── System reduced-motion preference ───────────────────────────────────
  applyReducedMotionFromSystem();

})();
