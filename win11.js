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
  }

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
    startMenu.setAttribute('aria-hidden', 'false');
    startScrim.classList.add('open');
  }
  function closeStart() {
    startMenu.setAttribute('aria-hidden', 'true');
    startScrim.classList.remove('open');
  }
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
})();
