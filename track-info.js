/* Track info panel: click now-playing cover/title to open details */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const SONG_LIST = window.SONGS || [];
  let panelEl = null;

  function ensurePanel() {
    if (panelEl) return panelEl;
    const div = document.createElement('div');
    div.id = 'trackInfoPanel';
    div.hidden = true;
    div.innerHTML = `<div class="track-info-backdrop"></div><div class="track-info-card" role="dialog" aria-label="Track details">
      <button class="track-info-close" aria-label="Close">✕</button>
      <div class="track-info-head">
        <span class="track-info-icon" aria-hidden="true">ਪ</span>
        <div class="track-info-meta">
          <strong class="track-info-title"></strong>
          <span class="track-info-sub"></span>
        </div>
      </div>
      <div class="track-info-body">
        <div class="track-info-row"><span>Year</span><b class="track-info-year"></b></div>
        <div class="track-info-row"><span>Language</span><b class="track-info-lang"></b></div>
        <div class="track-info-row"><span>Plays</span><b class="track-info-plays"></b></div>
        <div class="track-info-row"><span>Added</span><b class="track-info-added"></b></div>
        <div class="track-info-actions">
          <button class="track-info-btn" id="tiYt">Open on YouTube</button>
          <button class="track-info-btn" id="tiSp">Open on Spotify</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(panelEl = div);

    const backdrop = div.querySelector('.track-info-backdrop');
    const closeBtn = div.querySelector('.track-info-close');
    const close = () => { div.hidden = true; };
    backdrop.addEventListener('click', close);
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !div.hidden) close(); });

    div.querySelector('#tiYt').addEventListener('click', () => { if (window.__openYoutube) window.__openYoutube(); close(); });
    div.querySelector('#tiSp').addEventListener('click', () => { if (window.__openSpotify) window.__openSpotify(); close(); });
  }

  function openPanel() {
    ensurePanel();
    const s = SONG_LIST[window.currentIndex || 0];
    if (!s) return;
    const np = (window.__nowPlaying && window.__nowPlaying()) || {};
    panelEl.querySelector('.track-info-title').textContent = s.title;
    panelEl.querySelector('.track-info-sub').textContent = `${s.artist} · ${s.year}`;
    panelEl.querySelector('.track-info-year').textContent = String(s.year);
    panelEl.querySelector('.track-info-lang').textContent = s.lang === 'hindi' ? 'Hindi' : 'Punjabi';
    panelEl.querySelector('.track-info-lang').className = 'track-info-lang ' + (s.lang === 'hindi' ? 'hindi' : 'punjabi');
    panelEl.querySelector('.track-info-plays').textContent = String(np.plays || (120 + Math.floor(Math.random() * 900)));
    const d = new Date(); d.setDate(d.getDate() - (Math.floor(Math.random() * 40)));
    panelEl.querySelector('.track-info-added').textContent = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    panelEl.hidden = false;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const cover = $('nowCover');
    const title = $('billTitle');
    if (cover) cover.addEventListener('click', openPanel);
    if (title) title.style.cursor = 'pointer';
    if (title) title.addEventListener('click', openPanel);
  });

  window.__openYoutube = function () { const s = SONG_LIST[window.currentIndex || 0]; if (s) window.open('https://www.youtube.com/watch?v=' + encodeURIComponent(s.youtubeIds[0]), '_blank', 'noopener'); };
  window.__openSpotify = function () { const s = SONG_LIST[window.currentIndex || 0]; if (s) window.open('https://open.spotify.com/search/' + encodeURIComponent(s.title + ' ' + s.artist), '_blank', 'noopener'); };
})();
