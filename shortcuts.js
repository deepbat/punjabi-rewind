/* Keyboard shortcut overlay: Ctrl+/ toggles Win11-styled panel */
(function () {
  'use strict';
  if (document.getElementById('shortcutsOverlay')) return;

  const style = document.createElement('style');
  style.textContent = `
    #shortcutsOverlay{position:fixed;inset:0;z-index:1400;background:rgba(10,10,12,.72);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .18s ease}
    #shortcutsOverlay.open{opacity:1;pointer-events:auto}
    .shortcuts-panel{background:rgba(30,30,32,.92);border:1px solid rgba(255,255,255,.09);border-radius:12px;box-shadow:0 30px 80px rgba(0,0,0,.6);padding:22px 26px;width:min(520px,92vw);color:#F3F3F3;font-family:'Segoe UI Variable Text','Segoe UI',sans-serif}
    .shortcuts-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
    .shortcuts-head b{font-size:15px;font-weight:600}
    .shortcuts-close{width:34px;height:34px;border-radius:6px;background:transparent;color:#F3F3F3;font-size:14px}
    .shortcuts-close:hover{background:rgba(255,255,255,.1)}
    .shortcuts-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
    .shortcut-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;border-radius:8px;background:rgba(255,255,255,.04)}
    .shortcut-row span:first-child{font-size:13px;color:#e8e8e8}
    .shortcut-row kbd{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.14);border-radius:5px;padding:3px 8px;font-family:inherit;font-size:11.5px;color:#fff;min-width:28px;text-align:center}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'shortcutsOverlay';
  overlay.innerHTML = `<div class="shortcuts-panel">
    <div class="shortcuts-head"><b>Keyboard shortcuts</b><button class="shortcuts-close" aria-label="Close">✕</button></div>
    <div class="shortcuts-grid">
      <div class="shortcut-row"><span>Play / Pause</span><kbd>Space</kbd></div>
      <div class="shortcut-row"><span>Previous track</span><kbd>←</kbd></div>
      <div class="shortcut-row"><span>Next track</span><kbd>→</kbd></div>
      <div class="shortcut-row"><span>Mute</span><kbd>M</kbd></div>
      <div class="shortcut-row"><span>Queue</span><kbd>Q</kbd></div>
      <div class="shortcut-row"><span>Search</span><kbd>S</kbd></div>
      <div class="shortcut-row"><span>Favorites</span><kbd>F</kbd></div>
      <div class="shortcut-row"><span>Lyrics</span><kbd>L</kbd></div>
      <div class="shortcut-row"><span>Shortcuts</span><kbd>Ctrl + /</kbd></div>
      <div class="shortcut-row"><span>Close</span><kbd>Esc</kbd></div>
    </div>
  </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.classList.remove('open');
  overlay.querySelector('.shortcuts-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  function isEditable(el) { return el && (el.matches('input,textarea,select,button') || el.isContentEditable); }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === '/') { e.preventDefault(); overlay.classList.toggle('open'); return; }
    if (isEditable(document.activeElement)) return;
    if (overlay.classList.contains('open')) return;
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'space') { e.preventDefault(); if (window.__togglePlayback) window.__togglePlayback(); }
    else if (k === 'arrowright') { e.preventDefault(); if (window.__nextSong) window.__nextSong(); }
    else if (k === 'arrowleft') { e.preventDefault(); if (window.__prevSong) window.__prevSong(); }
    else if (k === 'm') { if (window.__toggleMute) window.__toggleMute(); }
    else if (k === 'q') { if (window.__openVault) window.__openVault(); }
    else if (k === 's') { const s = document.getElementById('songSearch'); if (s) { s.focus({ preventScroll: true }); s.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
    else if (k === 'f') { const fbtn = document.querySelector('[data-filter="favorites"]'); if (fbtn) fbtn.click(); }
    else if (k === 'l') { desktopToast && desktopToast('Lyrics panel — coming soon'); }
  });
})();
