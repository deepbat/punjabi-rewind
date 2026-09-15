/* ===== rewind.js ===== */
/* Punjabi Rewind — the listening layer on top of the ink engine.
   Fifty all-time hits, a YouTube-backed player, favorites, history and the
   library panel. Everything is progressive: if the ink engine or the YouTube
   API is unavailable, the page still works and says so plainly. */
(function () {
  'use strict';

  var SONGS = window.SONGS || [];
  var RADIO_STATIONS = window.RADIO_STATIONS || [];
  var PLAYLISTS = window.PLAYLISTS || [];
  var FAVORITES_KEY = 'pr_favorites';
  var HISTORY_KEY = 'pr_history';
  var LAST_TRACK_KEY = 'pr_last_track';
  var LAST_PLAYLIST_KEY = 'pr_last_playlist';
  var RADIO_TIMEOUT_MS = 6000;
  var MAX_HISTORY = 50;

  var $ = function (id) { return document.getElementById(id); };

  var state = {
    index: -1,
    playing: false,
    filter: 'all',
    playlist: 'all',
    query: '',
    favorites: [],
    history: [],
    shuffle: false,
    video: false,
    palette: 'auto',
    panelOpen: true,
    libraryOpen: true,
    chromeHidden: false,
    duration: 0,
    position: 0,
    failures: 0,
    musicPulse: true,
    radioIndex: 0,
    radioLive: false,
    radioTuning: false,
  };

  /* ── Storage ────────────────────────────────────────────────────────── */
  function readFavorites() {
    try {
      var raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw.map(Number).filter(function (n) { return Number.isFinite(n) && n >= 0 && n < SONGS.length; });
    } catch (error) { return []; }
  }
  function writeFavorites() {
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites)); } catch (error) { /* private mode */ }
  }
  function readHistory() {
    try {
      var raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (error) { return []; }
  }
  function rememberPlay(index) {
    state.history = state.history.filter(function (entry) { return entry && entry.i !== index; });
    state.history.unshift({ i: index, t: Date.now() });
    state.history = state.history.slice(0, MAX_HISTORY);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
      localStorage.setItem(LAST_TRACK_KEY, String(index));
    } catch (error) { /* private mode */ }
  }
  function isFavorite(index) { return state.favorites.indexOf(index) > -1; }
  function toggleFavorite(index) {
    var at = state.favorites.indexOf(index);
    if (at > -1) state.favorites.splice(at, 1);
    else state.favorites.push(index);
    writeFavorites();
    renderList();
    renderNow();
    announce(isFavorite(index) ? 'Saved ' + SONGS[index].title : 'Removed ' + SONGS[index].title + ' from saved');
  }

  /* ── Small helpers ───────────────────────────────────────────────────── */
  function coverUrl(song, size) {
    var id = song && song.youtubeIds && song.youtubeIds[0];
    return id ? 'https://i.ytimg.com/vi/' + id + '/' + (size || 'mqdefault') + '.jpg' : '';
  }
  function youtubeUrl(song) {
    var id = song && song.youtubeIds && song.youtubeIds[0];
    return id ? 'https://www.youtube.com/watch?v=' + id : 'https://www.youtube.com/';
  }
  /* Each record gets a colour story that suits its language, so the canvas
     shifts mood as you move between Punjabi and Hindi. */
  function paletteFor(index) {
    var song = SONGS[index];
    if (!song) return 'aurora';
    if (song.lang === 'punjabi') return index % 2 ? 'ember' : 'prism';
    return index % 2 ? 'aurora' : 'lagoon';
  }
  function announce(message) {
    var region = $('announcement');
    if (region) region.textContent = message;
  }
  var toastTimer = 0;
  function toast(html, hold) {
    var el = $('toast');
    if (!el) return;
    el.innerHTML = html;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, hold || 5200);
  }
/* ── Playback: exactly ONE player, never two ────────────────────────────
   The YouTube IFrame API player is the only transport. While it loads,
   tracks queue up (a "Player is loading" note shows); only if the API is
   proven dead does a single fallback embed start. The old design started a
   fallback embed during API load and layered the API player on top — that
   overlap is gone by construction. */
  var yt = { ready: false, player: null, failed: false, queue: [] };
  var directMode = false;
  var directFrame = null;
  var playToken = 0;

  /* Trace every audio start/stop. If overlap ever happens again, F12 Console
     lines starting with [pr-audio] show exactly which two transports sounded.
     Also mirrored to window.__prAudioLog for easy copy-paste. */
  var audioLog = [];
  function alog(what, detail) {
    try {
      var line = new Date().toISOString().substr(11, 12) + ' ' + what + (detail ? ' ' + detail : '');
      audioLog.push(line);
      if (audioLog.length > 100) audioLog.shift();
      window.__prAudioLog = audioLog.slice();
      if (window.console && console.log) console.log('[pr-audio] ' + line);
    } catch (e) {}
  }

  window.onYouTubeIframeAPIReady = function () { markApiReady(); };

  function markApiReady() {
    if (yt.ready) return;
    if (!window.YT || !window.YT.Player) return;
    yt.ready = true;
    yt.failed = false;
    flushQueue();
  }
  function whenApiReady(callback) {
    if (yt.ready && !yt.failed) { try { callback(); } catch (e) {} return; }
    if (yt.failed) { try { callback(); } catch (e) {} return; } // API dead → fall back now
    yt.queue.push(callback);
  }
  function flushQueue() {
    var queued = yt.queue.splice(0);
    for (var i = 0; i < queued.length; i++) { try { queued[i](); } catch (e) {} }
  }
  /* A poll costs nothing and covers the case where the API finished loading
     before this script ran. */
  var apiPoll = setInterval(function () {
    if (window.YT && window.YT.Player) { clearInterval(apiPoll); markApiReady(); }
  }, 250);
  setTimeout(function () {
    clearInterval(apiPoll);
    if (!yt.ready) {
      yt.failed = true;
      alog('api-failed', 'timeout — queued tracks fall back');
      flushQueue(); // wake anything queued during load so it plays via fallback
    }
  }, 9000);

  function playerOrigin() {
    return window.location.protocol.indexOf('http') === 0 ? window.location.origin : '';
  }

  function ensurePlayer(videoId, shouldPlay) {
    if (yt.player || !yt.ready || yt.failed) return yt.player;
    if (!window.YT || !window.YT.Player || !$('ytStage')) return null;
    var vars = { autoplay: 0, controls: 1, rel: 0, playsinline: 1, modestbranding: 1, iv_load_policy: 3 };
    if (playerOrigin()) vars.origin = playerOrigin();
    try {
      yt.player = new window.YT.Player('ytStage', {
        videoId: videoId,
        playerVars: vars,
        events: {
          onReady: function (event) { if (shouldPlay && event.target.playVideo) event.target.playVideo(); },
          onStateChange: handlePlayerState,
          onError: handlePlayerError,
        },
      });
    } catch (error) {
      yt.failed = true;
      return null;
    }
    alog('api-created', videoId);
    return yt.player;
  }

  function handlePlayerState(event) {
    var namespace = window.YT;
    if (!namespace || !namespace.PlayerState) return;
    var status = namespace.PlayerState;
    if (event.data === status.PLAYING) {
      state.failures = 0;
      alog('api-playing', 'track ' + state.index);
      killDirect(); // the API sounds ⇒ no fallback embed may exist, ever
      setPlaying(true);
    }
    else if (event.data === status.PAUSED) setPlaying(false);
    else if (event.data === status.ENDED) nextStep(1);
  }

  function handlePlayerError(event) {
    state.failures += 1;
    setPlaying(false);
    var song = SONGS[state.index];
    var blocked = event && (event.data === 101 || event.data === 150);
    var note = blocked ? 'The owner does not allow playback inside other sites.'
      : 'This video is not available right now.';
    if (song) {
      toast('<strong>' + song.title + '</strong> — ' + note +
        ' <a href="' + youtubeUrl(song) + '" target="_blank" rel="noopener">Open on YouTube</a>', 7000);
    }
    if (state.failures <= 4) {
      var retryToken = playToken;
      setTimeout(function () { if (retryToken === playToken) nextStep(1); }, 2600);
    }
    else toast('Several tracks could not be embedded here. Pick another, or open one on YouTube.', 8000);
  }
/* Last-resort embed, used ONLY when the IFrame API is proven dead. It is the
   lone transport in that situation — never alongside the API player — and it
   answers the same postMessage pause/play commands. */
  function apiIframe() {
    try { return (yt.player && yt.player.getIframe) ? yt.player.getIframe() : null; }
    catch (error) { return null; }
  }
  function commandFrame(frame, func) {
    if (!frame || !frame.contentWindow) return;
    try {
      frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: [] }), '*');
    } catch (error) { /* best effort only */ }
  }
  function stopApiPlayer() {
    var player = yt.player;
    if (player && player.pauseVideo) { try { player.pauseVideo(); } catch (e) {} }
  }
  /* Tear down a broken API player completely. A half-constructed YT player
     can keep sounding even when its methods throw — pausing is not enough,
     it must be destroyed and its iframe removed. A clean #ytStage mount is
     restored so a future API player can start fresh. */
  function destroyApiPlayer() {
    var player = yt.player;
    yt.player = null;
    if (player) alog('api-destroyed');
    if (player) {
      try { if (player.stopVideo) player.stopVideo(); } catch (e) {}
      try { if (player.pauseVideo) player.pauseVideo(); } catch (e) {}
      try { if (player.destroy) player.destroy(); } catch (e) {}
    }
    var stage = document.getElementById('ytStage');
    if (stage && stage.tagName === 'IFRAME') {
      try {
        var fresh = document.createElement('div');
        fresh.id = 'ytStage';
        stage.parentNode.replaceChild(fresh, stage);
      } catch (e) {}
    }
  }
  /* A postMessage pause is silently lost when the embed's inner player is not
     listening yet (slow network, first seconds of playback) — the music then
     "keeps playing" after pause. Hammer it: duplicates are harmless. */
  function pauseDirectEmbed() {
    var frame = directFrame;
    if (!frame) return;
    commandFrame(frame, 'pauseVideo');
    var attempt = 0;
    var hammer = setInterval(function () {
      if (directFrame !== frame) { clearInterval(hammer); return; }
      commandFrame(frame, 'pauseVideo');
      if (++attempt >= 4) clearInterval(hammer);
    }, 450);
  }
  /* Stop and remove every direct-embed frame except the API player's own.
     Called before any API playback so a leftover embed can never overlap it. */
  function killDirect() {
    directMode = false;
    var keep = apiIframe();
    var frames = [];
    if (directFrame) frames.push(directFrame);
    var slot = $('videoSlot');
    if (slot) {
      var list = slot.querySelectorAll('iframe');
      for (var i = 0; i < list.length; i++) frames.push(list[i]);
    }
    var killed = 0;
    for (var n = 0; n < frames.length; n++) {
      var frame = frames[n];
      if (!frame || frame === keep) continue;
      killed++;
      commandFrame(frame, 'stopVideo');
      commandFrame(frame, 'pauseVideo');
      try { frame.src = 'about:blank'; } catch (e) {}
      try { if (frame.parentNode) frame.parentNode.removeChild(frame); } catch (e) {}
    }
    if (killed) alog('kill-direct', killed + ' frame(s)');
    directFrame = null;
  }
  function directPlay(videoId) {
    if (yt.failed) destroyApiPlayer(); else stopApiPlayer();
    killDirect(); // drop any previous embed before starting a fresh one
    var stage = $('ytStage');
    if (!stage) return;
    // After the API player is created, #ytStage IS its iframe — never nest
    // a raw embed inside it; fall back to the video slot container instead.
    if (stage.tagName === 'IFRAME') {
      var slot = $('videoSlot');
      if (!slot) return;
      stage = slot;
    }
    directMode = true;
    var frame = document.createElement('iframe');
    frame.setAttribute('title', 'YouTube player');
    frame.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
    frame.setAttribute('allowfullscreen', '');
    stage.appendChild(frame);
    directFrame = frame;
    var params = ['autoplay=1', 'playsinline=1', 'rel=0', 'modestbranding=1', 'enablejsapi=1'];
    if (playerOrigin()) params.push('origin=' + encodeURIComponent(playerOrigin()));
    frame.src = 'https://www.youtube-nocookie.com/embed/' + videoId + '?' + params.join('&');
    alog('direct-start', videoId);
    setPlaying(true);
  }

  function postCommand(func) {
    if (directFrame) { commandFrame(directFrame, func); return; }
    var stage = $('ytStage');
    var frame = stage && stage.tagName !== 'IFRAME' ? stage.querySelector('iframe') : null;
    commandFrame(frame, func);
  }

  function pauseSongPlayback() {
    // Pause BOTH transports: whichever one is sounding must stop, and a
    // stale embed must never survive a pause (radio, track switch, etc.).
    alog('pause-all');
    stopApiPlayer();
    if (directFrame) pauseDirectEmbed();
    else {
      var stage = $('ytStage');
      var stray = stage && stage.tagName !== 'IFRAME' ? stage.querySelector('iframe') : null;
      if (stray) commandFrame(stray, 'pauseVideo');
    }
    setPlaying(false);
  }

  /* ── Live radio: independent HTML5 audio streams with automatic fail-over ─ */
  var radioAudio = null;
  var radioTimer = 0;
  function ensureRadioAudio() {
    if (radioAudio) return radioAudio;
    radioAudio = new Audio();
    radioAudio.preload = 'none';
    radioAudio.addEventListener('playing', onRadioConnected);
    radioAudio.addEventListener('error', function () { tryNextStation('stream error'); });
    radioAudio.addEventListener('stalled', function () { tryNextStation('stalled'); });
    return radioAudio;
  }
  function setRadioStatus(text, live) {
    var el = $('radioStatus');
    if (el) { el.textContent = text; el.classList.toggle('live', !!live); }
  }
  function renderStations() {
    var wrap = $('radioStationList');
    if (!wrap) return;
    wrap.innerHTML = '';
    for (var i = 0; i < RADIO_STATIONS.length; i++) {
      (function (idx) {
        var s = RADIO_STATIONS[idx];
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = s.name.split(' ')[0];
        b.title = s.name + (s.desc ? ' — ' + s.desc : '');
        b.setAttribute('aria-label', 'Tune to ' + s.name);
        if (idx === state.radioIndex) b.classList.add('active');
        b.addEventListener('click', function () { startRadio(idx); });
        wrap.appendChild(b);
      })(i);
    }
    var name = $('radioStationName');
    var desc = $('radioStationDesc');
    if (RADIO_STATIONS[state.radioIndex]) {
      if (name) name.textContent = RADIO_STATIONS[state.radioIndex].name;
      if (desc && !state.radioLive && !state.radioTuning) desc.textContent = RADIO_STATIONS[state.radioIndex].desc || 'Tap to tune in';
    }
  }
  function markStationActive() {
    var wrap = $('radioStationList');
    if (!wrap) return;
    var btns = wrap.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('active', i === state.radioIndex);
  }
  function startRadio(i) {
    if (!RADIO_STATIONS.length) { toast('No radio stations configured.'); return; }
    if (typeof i !== 'number') i = state.radioIndex;
    if (i >= RADIO_STATIONS.length) {
      state.radioTuning = false; state.radioLive = false;
      setRadioStatus('All stations unreachable', false);
      renderRadioToggle(); renderNow();
      return;
    }
    state.radioIndex = i;
    var station = RADIO_STATIONS[i];
    var audio = ensureRadioAudio();
    markStationActive();
    var name = $('radioStationName');
    var desc = $('radioStationDesc');
    if (name) name.textContent = station.name;
    if (desc) desc.textContent = 'Tuning in…';
    setRadioStatus('Tuning in…', false);
    state.radioTuning = true; state.radioLive = false;
    renderRadioToggle(); renderNow();
    alog('radio-start', station.name);
    pauseSongPlayback();
    clearTimeout(radioTimer);
    try {
      audio.pause();
      audio.src = station.url;
      audio.load();
      var p = audio.play();
      if (p && p.catch) p.catch(function () { setRadioStatus('Tap radio again to play', false); state.radioTuning = false; renderRadioToggle(); });
    } catch (e) { tryNextStation('exception'); return; }
    radioTimer = setTimeout(function () { if (!state.radioLive) tryNextStation('timeout'); }, RADIO_TIMEOUT_MS);
  }
  function tryNextStation() {
    if (!state.radioTuning && !state.radioLive) return;
    if (state.radioLive) return; // a live stream that later stalls restarts same station
    clearTimeout(radioTimer);
    startRadio(state.radioIndex + 1);
  }
  function onRadioConnected() {
    state.radioLive = true; state.radioTuning = false;
    clearTimeout(radioTimer);
    alog('radio-live', RADIO_STATIONS[state.radioIndex] && RADIO_STATIONS[state.radioIndex].name);
    var station = RADIO_STATIONS[state.radioIndex];
    setRadioStatus('Live now', true);
    var desc = $('radioStationDesc');
    if (desc) desc.textContent = (station && station.desc) || 'Live';
    pauseSongPlayback();
    renderRadioToggle(); renderNow();
    announce('Live radio: ' + (station ? station.name : 'on air'));
    if (state.musicPulse && window.PR && window.PR.Fluid && window.PR.Fluid.pulse) window.PR.Fluid.pulse(1);
    if (window.PR && window.PR.Fluid && window.PR.Fluid.setEnergy) window.PR.Fluid.setEnergy(1.9);
  }
  function stopRadio(silent) {
    clearTimeout(radioTimer);
    var wasLive = state.radioLive || state.radioTuning;
    state.radioLive = false; state.radioTuning = false;
    if (radioAudio) { try { radioAudio.pause(); } catch (e) {} }
    setRadioStatus('Radio off', false);
    var desc = $('radioStationDesc');
    var station = RADIO_STATIONS[state.radioIndex];
    if (desc) desc.textContent = (station && station.desc) || 'Tap to tune in';
    if (window.PR && window.PR.Fluid && window.PR.Fluid.setEnergy) {
      window.PR.Fluid.setEnergy(state.playing ? 1.9 : 0.85);
    }
    renderRadioToggle(); renderNow();
    if (wasLive) alog('radio-stop');
    if (!silent) announce('Radio off');
  }
  function toggleRadio() {
    if (state.radioLive || state.radioTuning) stopRadio();
    else startRadio(state.radioIndex);
  }
  function renderRadioToggle() {
    var btn = $('radioToggle');
    if (!btn) return;
    var on = state.radioLive || state.radioTuning;
    btn.setAttribute('aria-pressed', String(state.radioLive));
    btn.setAttribute('aria-label', state.radioLive ? 'Stop live radio' : 'Play live radio');
    var glyph = $('dialGlyph');
    if (glyph) glyph.textContent = state.radioLive ? 'Ⅱ' : '▶';
  }

  function setPlaying(value) {
    state.playing = !!value;
    if (window.PR && window.PR.Fluid && window.PR.Fluid.setEnergy) {
      window.PR.Fluid.setEnergy(state.playing ? 1.9 : 0.85);
    }
    renderTransport();
    renderNow();
  }

  function applyPalette(index) {
    if (state.palette !== 'auto') return;
    if (window.PR && window.PR.Fluid && window.PR.Fluid.setPalette) {
      window.PR.Fluid.setPalette(paletteFor(index));
    }
  }

  function playTrack(index, options) {
    options = options || {};
    if (!SONGS.length) return;
    if (state.radioLive || state.radioTuning) stopRadio(true);
    index = ((index % SONGS.length) + SONGS.length) % SONGS.length;
    var song = SONGS[index];
    var videoId = song.youtubeIds && song.youtubeIds[0];
    state.index = index;
    state.failures = 0;
    var token = ++playToken; // stale async callbacks must never start audio
    rememberPlay(index);
    applyPalette(index);
    renderList();
    renderNow();
    if (state.musicPulse && options.quiet !== true && window.PR && window.PR.Fluid && window.PR.Fluid.isReady && window.PR.Fluid.isReady()) {
      window.PR.Fluid.pulse(1); // the canvas answers every new track
    }
    if (!videoId) {
      toast('There is no playable source for <strong>' + song.title + '</strong>.');
      return;
    }
    function startNow() {
      if (token !== playToken || state.index !== index) return; // superseded
      killDirect(); // the single transport starts from silence
      var now = null;
      try { now = ensurePlayer(videoId, true); } catch (e) { now = null; }
      if (now && now.loadVideoById) {
        try { now.loadVideoById(videoId); }
        catch (e) {
          // The fresh player is unusable but may still autoplay its
          // constructor video — destroy it before falling back, or both
          // transports will sound at once.
          destroyApiPlayer();
          if (token === playToken) directPlay(videoId);
          return;
        }
        if (now.playVideo) { try { now.playVideo(); } catch (e) {} }
        setPlaying(true);
      } else if (token === playToken) directPlay(videoId);
    }
    if (yt.ready && !yt.failed && window.YT && window.YT.Player) {
      alog('play', 'track ' + index + ' ' + videoId + ' via api');
      startNow();
    } else if (!yt.failed) {
      // API still loading: queue the start. Never spin up a parallel embed —
      // the track begins the moment the one true player is ready.
      alog('play', 'track ' + index + ' ' + videoId + ' queued — api loading');
      announce('Player is loading. Your track starts in a moment.');
      toast('Player is loading — your track starts in a moment.', 2500);
      whenApiReady(startNow);
    } else {
      stopApiPlayer();
      alog('play', 'track ' + index + ' ' + videoId + ' via direct');
      if (token === playToken) directPlay(videoId);
    }
  }

  function nextStep(step) {
    if (!SONGS.length) return;
    var pool = visibleIndexes();
    if (state.shuffle && step > 0 && pool.length > 1) {
      var pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick === state.index) pick = pool[(pool.indexOf(pick) + 1) % pool.length];
      playTrack(pick); return;
    }
    if (state.index < 0) {
      if (pool.length) playTrack(step < 0 ? pool[pool.length - 1] : pool[0]);
      else playTrack(step < 0 ? SONGS.length - 1 : 0);
      return;
    }
    if (pool.length > 1) {
      var at = pool.indexOf(state.index);
      if (at > -1) { playTrack(pool[(at + step + pool.length) % pool.length]); return; }
    }
    playTrack(state.index + step);
  }

  function randomIndex() {
    var pool = visibleIndexes();
    if (pool.length > 1) {
      var pick = state.index;
      var guard = 0;
      while (pick === state.index && guard++ < 20) pick = pool[Math.floor(Math.random() * pool.length)];
      return pick;
    }
    if (SONGS.length < 2) return 0;
    var fallback = state.index;
    while (fallback === state.index) fallback = Math.floor(Math.random() * SONGS.length);
    return fallback;
  }

  function togglePlay() {
    if (state.radioLive || state.radioTuning) { stopRadio(); return; }
    if (state.index < 0) { playTrack(state.shuffle ? randomIndex() : (visibleIndexes()[0] || 0)); return; }
    if (directFrame || directMode) {
      if (state.playing) { if (directFrame) pauseDirectEmbed(); else postCommand('pauseVideo'); setPlaying(false); }
      else {
        var song = SONGS[state.index];
        var videoId = song && song.youtubeIds && song.youtubeIds[0];
        // Resume the embed if it still holds our video; otherwise restart it —
        // never layer a second stream on top.
        if (directFrame && directFrame.src && videoId && directFrame.src.indexOf(videoId) > -1) {
          postCommand('playVideo'); setPlaying(true);
        } else if (videoId) playTrack(state.index);
        else { postCommand('playVideo'); setPlaying(true); }
      }
      return;
    }
    var player = yt.player;
    if (!player || !player.pauseVideo) { playTrack(state.index); return; }
    if (state.playing) { try { player.pauseVideo(); } catch (e) {} setPlaying(false); }
    else { try { player.playVideo(); } catch (e) {} setPlaying(true); }
  }

  setInterval(function () {
    if (directMode || !yt.player || !yt.player.getCurrentTime) return;
    state.position = yt.player.getCurrentTime() || 0;
    state.duration = yt.player.getDuration() || 0;
    renderProgress();
  }, 500);

  /* Watchdog: no matter which path leaked, at most ONE YouTube frame may
     exist and it may never coexist with a fallback embed while the API
     sounds. Runs silently unless it has to clean up. */
  setInterval(function () {
    try {
      var keep = apiIframe();
      var slot = $('videoSlot');
      if (!slot) return;
      var list = slot.querySelectorAll('iframe');
      var sounding = [];
      for (var i = 0; i < list.length; i++) {
        var frame = list[i];
        var src = '';
        try { src = frame.src || ''; } catch (e) {}
        if (src.indexOf('youtube') > -1 && frame !== keep) sounding.push(frame);
      }
      var apiPlaying = false;
      try {
        apiPlaying = !!(yt.player && yt.player.getPlayerState && window.YT &&
          yt.player.getPlayerState() === window.YT.PlayerState.PLAYING);
      } catch (e) {}
      if ((apiPlaying && (directFrame || sounding.length)) || sounding.length > 1 || (keep && sounding.length > 0 && directFrame)) {
        alog('watchdog-kill', 'apiPlaying=' + apiPlaying + ' strays=' + sounding.length);
        killDirect();
      }
    } catch (e) {}
  }, 2000);
/* ── Rendering ─────────────────────────────────────────────────────── */
  var ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';

  var ICONS = {
    bloom: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v5m0 8v5M3 12h5m8 0h5M5.6 5.6l3.5 3.5m5.8 5.8 3.5 3.5M5.6 18.4l3.5-3.5m5.8-5.8 3.5-3.5"/></svg>',
    freeze: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>',
    thaw: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>',
    clear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 4 11 11-5 5H9L3 14zM6 17l8-8M15 20h6"/></svg>',
    save: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5v14L8 12zM6 5v14"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14l10-7zM18 5v14"/></svg>',
    screen: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="13" rx="2.5"/><path d="M8 21h8"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 4h4v4M20 4l-6 6M16 20h4v-4M20 20l-6-6M4 20h3l9-9 3-3"/></svg>',
  };

  function playlistIndices() {
    if (state.playlist === 'all') return null;
    var found = null;
    for (var p = 0; p < PLAYLISTS.length; p++) {
      if (PLAYLISTS[p].name === state.playlist) { found = PLAYLISTS[p].indices; break; }
    }
    return found || null;
  }

  function visibleIndexes() {
    var query = state.query.trim().toLowerCase();
    var allowed = playlistIndices();
    var list = [];
    for (var i = 0; i < SONGS.length; i++) {
      var song = SONGS[i];
      if (allowed && allowed.indexOf(i) < 0) continue;
      var sentence = (song.title + ' ' + song.artist + ' ' + song.year + ' ' + song.lang).toLowerCase();
      if (state.filter === 'saved' && !isFavorite(i)) continue;
      if ((state.filter === 'punjabi' || state.filter === 'hindi') && song.lang !== state.filter) continue;
      if (query && sentence.indexOf(query) < 0) continue;
      list.push(i);
    }
    return list;
  }

  function twoDigits(value) {
    return value < 10 ? '0' + value : String(value);
  }

  function renderList() {
    var list = $('trackList');
    if (!list) return;
    var indexes = visibleIndexes();
    list.innerHTML = '';
    if (!indexes.length) {
      var empty = document.createElement('li');
      empty.className = 'empty-note';
      empty.textContent = state.filter === 'saved'
        ? 'Nothing saved yet — tap the ☆ beside a song to keep it here.'
        : 'No track matches that. Try another word.';
      list.appendChild(empty);
    } else {
      var fragment = document.createDocumentFragment();
      for (var n = 0; n < indexes.length; n++) {
        var index = indexes[n];
        var song = SONGS[index];
        var row = document.createElement('li');
        row.className = 'track-row';

        var play = document.createElement('button');
        play.type = 'button';
        play.className = 'track' + (index === state.index ? ' is-playing' : '');
        play.dataset.i = String(index);
        play.setAttribute('aria-label', 'Play ' + song.title + ' by ' + song.artist);

        var num = document.createElement('span');
        num.className = 'num';
        num.textContent = (index === state.index && state.playing) ? '▶' : twoDigits(index + 1);

        var meta = document.createElement('span');
        meta.className = 'meta';
        var strong = document.createElement('strong');
        strong.textContent = song.title;
        var sub = document.createElement('span');
        sub.textContent = song.artist + ' · ' + song.year;
        meta.appendChild(strong);
        meta.appendChild(sub);

        play.appendChild(num);
        play.appendChild(meta);

        var fav = document.createElement('button');
        fav.type = 'button';
        fav.className = 'fav';
        fav.dataset.fav = String(index);
        fav.setAttribute('aria-pressed', String(isFavorite(index)));
        fav.setAttribute('aria-label', isFavorite(index)
          ? 'Remove ' + song.title + ' from saved' : 'Save ' + song.title);
        fav.textContent = isFavorite(index) ? '★' : '☆';

        row.appendChild(play);
        row.appendChild(fav);
        fragment.appendChild(row);
      }
      list.appendChild(fragment);
    }
    var count = $('libraryCount');
    if (count) count.textContent = indexes.length + ' of ' + SONGS.length + ' hits';
  }
function renderNow() {
    var radioOn = state.radioLive || state.radioTuning;
    var song = SONGS[state.index];
    var cover = $('cover');
    if (radioOn && RADIO_STATIONS[state.radioIndex]) {
      var station = RADIO_STATIONS[state.radioIndex];
      if (cover) {
        cover.innerHTML = '<span aria-hidden="true">📡</span>';
        cover.setAttribute('aria-label', 'Live radio ' + station.name);
      }
      var rTitle = $('nowTitle');
      var rArtist = $('nowArtist');
      if (rTitle) rTitle.textContent = station.name + (state.radioLive ? '' : ' · tuning…');
      if (rArtist) rArtist.textContent = (station.desc || 'Live radio') + ' · tap radio to stop';
      var rPill = $('nowPill');
      if (rPill) rPill.hidden = false;
      var rPillTitle = $('nowPillTitle');
      var rPillArtist = $('nowPillArtist');
      if (rPillTitle) rPillTitle.textContent = station.name;
      if (rPillArtist) rPillArtist.textContent = state.radioLive ? 'Live radio' : 'Tuning…';
      var rDot = $('liveDot');
      if (rDot) rDot.classList.toggle('live', state.radioLive);
      return;
    }
    if (cover) {
      var url = song ? coverUrl(song) : '';
      cover.innerHTML = url
        ? '<img alt="" src="' + url + '" loading="lazy" decoding="async">'
        : '<span aria-hidden="true">♪</span>';
      cover.setAttribute('aria-label', song ? 'Now playing ' + song.title : 'Nothing playing yet');
    }
    var title = $('nowTitle');
    var artist = $('nowArtist');
    if (title) title.textContent = song ? song.title : 'Nothing playing yet';
    if (artist) artist.textContent = song ? song.artist + ' · ' + song.year : 'Pick a track from the library';
    var pill = $('nowPill');
    if (pill) pill.hidden = !song;
    var pillTitle = $('nowPillTitle');
    var pillArtist = $('nowPillArtist');
    if (pillTitle) pillTitle.textContent = song ? song.title : '';
    if (pillArtist) pillArtist.textContent = song ? song.artist : '';
    var dot = $('liveDot');
    if (dot) dot.classList.toggle('live', state.playing);
  }

  function renderTransport() {
    var play = $('playToggle');
    if (play) {
      play.setAttribute('aria-pressed', String(state.playing));
      play.setAttribute('aria-label', state.playing ? 'Pause' : 'Play');
      play.setAttribute('title', state.playing ? 'Pause (Space)' : 'Play (Space)');
      play.innerHTML = state.playing ? ICON_PAUSE : ICON_PLAY;
    }
    var shuffle = $('shuffleToggle');
    if (shuffle) shuffle.setAttribute('aria-pressed', String(state.shuffle));
  }

  function renderProgress() {
    var bar = $('progressBar');
    if (!bar) return;
    var pct = state.duration > 0 ? Math.min(100, state.position / state.duration * 100) : 0;
    bar.style.width = pct.toFixed(1) + '%';
  }

  function renderFilters() {
    var chips = document.querySelectorAll('.chip[data-filter]');
    for (var i = 0; i < chips.length; i++) {
      chips[i].setAttribute('aria-pressed', String(chips[i].dataset.filter === state.filter));
    }
    var sel = $('playlistSelect');
    if (sel && sel.value !== state.playlist) sel.value = state.playlist;
  }

  function renderPlaylists() {
    var sel = $('playlistSelect');
    if (!sel) return;
    sel.innerHTML = '';
    var all = document.createElement('option');
    all.value = 'all';
    all.textContent = 'All 50 hits';
    sel.appendChild(all);
    for (var i = 0; i < PLAYLISTS.length; i++) {
      var opt = document.createElement('option');
      opt.value = PLAYLISTS[i].name;
      opt.textContent = PLAYLISTS[i].name + ' · ' + PLAYLISTS[i].indices.length;
      sel.appendChild(opt);
    }
    try {
      var saved = localStorage.getItem(LAST_PLAYLIST_KEY);
      if (saved && (saved === 'all' || PLAYLISTS.some(function (p) { return p.name === saved; }))) state.playlist = saved;
    } catch (e) {}
    sel.value = state.playlist;
  }

  /* The engine calls this on init and on every freeze toggle, so the dock
     button always mirrors the real simulation state. */
  function syncFreeze(paused) {
    var button = $('freezeToggle');
    if (!button) return;
    button.setAttribute('aria-pressed', String(paused));
    button.innerHTML = (paused ? ICONS.thaw : ICONS.freeze) +
      '<span>' + (paused ? 'Thaw' : 'Freeze') + '</span>';
    button.setAttribute('aria-label', paused ? 'Resume the ink' : 'Freeze the ink');
    button.setAttribute('title', paused ? 'Resume the ink (F)' : 'Freeze the ink (F)');
  }

  function syncFlowCheckbox(autoflow) {
    var box = $('autoflow');
    if (box) box.checked = !!autoflow;
  }
/* ── Wiring ────────────────────────────────────────────────────────── */
  function ink() { return (window.PR && window.PR.Fluid) ? window.PR.Fluid : null; }
  function setInk(key, value) { var engine = ink(); if (engine && engine.set) engine.set(key, value); }

  function wireSliders() {
    var specs = [
      { id: 'swirl', out: 'swirlValue', format: function (v) { return String(v); } },
      { id: 'lifetime', out: 'lifetimeValue', format: function (v) { return v + ' s'; } },
      { id: 'brush', out: 'brushValue', format: function (v) { return v < 18 ? 'Fine' : v > 34 ? 'Wide' : 'Medium'; } },
    ];
    for (var i = 0; i < specs.length; i++) {
      (function (spec) {
        var input = $(spec.id), output = $(spec.out);
        if (!input) return;
        var sync = function () {
          var value = Number(input.value);
          if (output) output.textContent = spec.format(value);
          setInk(spec.id, value);
        };
        input.addEventListener('input', sync);
        sync();
      })(specs[i]);
    }

    var palette = $('palette');
    if (palette) palette.addEventListener('change', function () {
      state.palette = palette.value;
      var engine = ink();
      if (state.palette === 'auto') {
        applyPalette(state.index < 0 ? 0 : state.index);
        if (engine) engine.bloom(1);
        announce('Colour story now follows each track');
      } else {
        setInk('palette', state.palette);
        if (engine) engine.bloom(1);
        announce(palette.options[palette.selectedIndex].text + ' colour story');
      }
    });

    ['autoflow', 'glow'].forEach(function (key) {
      var box = $(key);
      if (box) box.addEventListener('change', function () { setInk(key, box.checked); });
    });
    var musicPulse = $('musicPulse');
    if (musicPulse) {
      musicPulse.checked = state.musicPulse;
      musicPulse.addEventListener('change', function () {
        state.musicPulse = musicPulse.checked;
        if (!state.musicPulse && window.PR && window.PR.Fluid && window.PR.Fluid.setEnergy) {
          window.PR.Fluid.setEnergy(state.playing || state.radioLive ? 1.9 : 0.85);
        }
        announce(state.musicPulse ? 'Ink pulses with the music' : 'Music pulse off — ink flows on its own');
      });
    }

    var quality = $('quality');
    if (quality) quality.addEventListener('change', function () {
      setInk('quality', quality.value);
      announce('Quality: ' + quality.options[quality.selectedIndex].text);
    });
  }

  function wireDock() {
    var burst = $('burst');
    if (burst) burst.addEventListener('click', function () {
      var engine = ink();
      if (engine) engine.bloom(1);
    });
    var freeze = $('freezeToggle');
    if (freeze) freeze.addEventListener('click', function () {
      var engine = ink();
      if (engine) engine.togglePause();
    });
    var clear = $('clear');
    if (clear) clear.addEventListener('click', function () {
      var engine = ink();
      if (!engine) return;
      syncFlowCheckbox(engine.clear().autoflow);
    });
    var save = $('save');
    if (save) save.addEventListener('click', function () {
      var engine = ink();
      if (engine) engine.save();
    });
  }

  function wireTransport() {
    var play = $('playToggle');
    if (play) play.addEventListener('click', togglePlay);
    var prev = $('prevBtn');
    if (prev) prev.addEventListener('click', function () { nextStep(-1); });
    var next = $('nextBtn');
    if (next) next.addEventListener('click', function () { nextStep(1); });
    var video = $('videoToggle');
    if (video) video.addEventListener('click', function () { toggleVideo(); });
    var cover = $('cover');
    if (cover) cover.addEventListener('click', function () { toggleVideo(); });
  }

  function toggleVideo(force) {
    var slot = $('videoSlot');
    if (!slot) return;
    var open = typeof force === 'boolean' ? force : !slot.classList.contains('open');
    slot.classList.toggle('open', open);
    state.video = open;
    var button = $('videoToggle');
    if (button) {
      button.setAttribute('aria-pressed', String(open));
      button.setAttribute('aria-label', open ? 'Hide the video' : 'Show the video');
      button.setAttribute('title', open ? 'Hide the video (V)' : 'Show the video (V)');
    }
    var panel = $('panel');
    if (panel) {
      if (open) { state.panelWasOpen = !panel.hidden; togglePanel(false); }
      else if (state.panelWasOpen) togglePanel(true);
    }
    if (open && state.index < 0) toast('The video stays off until you pick a track from the library.');
  }

  function isNarrow() { return window.innerWidth <= 860; }

  function togglePanel(force) {
    var panel = $('panel');
    if (!panel) return;
    var open = typeof force === 'boolean' ? force : panel.hidden;
    panel.hidden = !open;
    state.panelOpen = open;
    var button = $('settings');
    if (button) button.setAttribute('aria-expanded', String(open));
    if (open && isNarrow()) toggleLibrary(false); // one frosted panel at a time on small screens
  }

  function toggleLibrary(force) {
    var library = $('library');
    if (!library) return;
    var open = typeof force === 'boolean' ? force : library.hidden;
    library.hidden = !open;
    state.libraryOpen = open;
    var button = $('libraryToggle');
    if (button) button.setAttribute('aria-expanded', String(open));
    if (open && isNarrow()) togglePanel(false);
  }

  function toggleChrome() {
    state.chromeHidden = !state.chromeHidden;
    document.body.classList.toggle('hide-chrome', state.chromeHidden);
    announce(state.chromeHidden ? 'Controls hidden. Press H to bring them back.' : 'Controls shown');
  }

  function showError(title, text) {
    var box = $('error');
    if (!box) return;
    var heading = $('errorTitle');
    var body = $('errorText');
    if (heading) heading.textContent = title;
    if (body) body.textContent = text;
    box.hidden = false;
  }
function wireLibrary() {
    var list = $('trackList');
    if (list) {
      list.addEventListener('click', function (event) {
        var fav = event.target.closest('[data-fav]');
        if (fav) { toggleFavorite(Number(fav.dataset.fav)); return; }
        var row = event.target.closest('[data-i]');
        if (row) playTrack(Number(row.dataset.i));
      });
    }
    var search = $('librarySearch');
    var clearSearch = $('clearSearch');
    if (search) {
      search.addEventListener('input', function () {
        state.query = search.value;
        if (clearSearch) clearSearch.hidden = !search.value;
        renderList();
      });
      search.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter') return;
        var indexes = visibleIndexes();
        if (indexes.length) playTrack(indexes[0]);
      });
    }
    if (clearSearch) clearSearch.addEventListener('click', function () {
      if (search) { search.value = ''; search.focus(); }
      state.query = '';
      clearSearch.hidden = true;
      renderList();
    });
    var chips = document.querySelectorAll('.chip[data-filter]');
    for (var i = 0; i < chips.length; i++) {
      chips[i].addEventListener('click', function () {
        state.filter = this.dataset.filter;
        renderFilters();
        renderList();
        announce('Showing ' + this.textContent.trim());
      });
    }
    var shuffle = $('shuffleToggle');
    if (shuffle) shuffle.addEventListener('click', function () {
      state.shuffle = !state.shuffle;
      renderTransport();
      announce(state.shuffle ? 'Shuffle on' : 'Shuffle off');
    });
    var playlistSelect = $('playlistSelect');
    if (playlistSelect) playlistSelect.addEventListener('change', function () {
      state.playlist = playlistSelect.value;
      try { localStorage.setItem(LAST_PLAYLIST_KEY, state.playlist); } catch (e) {}
      renderFilters();
      renderList();
      var allowed = playlistIndices();
      announce(state.playlist === 'all' ? 'Showing all fifty hits' : state.playlist + ' playlist · ' + (allowed ? allowed.length : 0) + ' tracks');
    });
    var playlistPlay = $('playlistPlay');
    if (playlistPlay) playlistPlay.addEventListener('click', function () {
      var pool = visibleIndexes();
      if (!pool.length) { toast('This playlist is empty for the current filter.'); return; }
      playTrack(state.shuffle ? pool[Math.floor(Math.random() * pool.length)] : pool[0]);
    });
    var radioToggle = $('radioToggle');
    if (radioToggle) radioToggle.addEventListener('click', toggleRadio);
  }

  function isInteractive(target) {
    if (!target) return false;
    var tag = target.tagName;
    return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' ||
      tag === 'BUTTON' || tag === 'A' || target.isContentEditable === true;
  }

  function wireKeys() {
    window.addEventListener('keydown', function (event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      var key = event.key.toLowerCase();
      if (isInteractive(event.target)) {
        if (event.key === 'Escape') event.target.blur();
        return;
      }
      if (event.code === 'Space' || key === 'k') { event.preventDefault(); togglePlay(); return; }
      if (key === 'arrowright' || key === 'n') { nextStep(1); return; }
      if (key === 'arrowleft' || key === 'p') { nextStep(-1); return; }
      if (key === 'f') { var a = ink(); if (a) a.togglePause(); return; }
      if (key === 'b') { var b = ink(); if (b) b.bloom(1); return; }
      if (key === 'c') { var c = ink(); if (c) syncFlowCheckbox(c.clear().autoflow); return; }
      if (key === 's') { var d = ink(); if (d) d.save(); return; }
      if (key === 'l') { toggleLibrary(); return; }
      if (key === 'h') { toggleChrome(); return; }
      if (key === 'v') { toggleVideo(); return; }
      if (key === 'r') { toggleRadio(); return; }
      if (key === '/') {
        event.preventDefault();
        var box = $('librarySearch');
        toggleLibrary(true);
        if (box) box.focus();
        return;
      }
      if (event.key === 'Escape') {
        var slot = $('videoSlot');
        if (slot && slot.classList.contains('open')) toggleVideo(false);
        else if (state.chromeHidden) toggleChrome();
        else togglePanel(false);
      }
    });
  }

  /* The canvas breathes with the music: a soft heartbeat while a song or the
     radio sounds, stronger accents every fourth beat, energy swelling with
     it. Note: YouTube/radio audio is cross-origin so true FFT beat-tracking
     is impossible — this is a musical pulse, not a measured beat. */
  var beatStep = 0;
  setInterval(function () {
    if (document.hidden) return;
    if ((!state.playing && !state.radioLive) || !state.musicPulse) return;
    var engine = ink();
    if (!engine || !engine.isReady || !engine.isReady()) return;
    beatStep++;
    var strong = beatStep % 4 === 0;
    if (engine.pulse) engine.pulse(strong ? 0.9 + Math.random() * 0.3 : 0.35 + Math.random() * 0.25);
    if (engine.setEnergy) engine.setEnergy(1.55 + 0.45 * Math.abs(Math.sin(Date.now() / 480)));
  }, 520);

  function init() {
    state.favorites = readFavorites();
    state.history = readHistory();
    renderPlaylists();
    renderFilters();
    renderList();
    renderStations();
    renderRadioToggle();
    renderNow();
    renderTransport();

    var reload = $('reload');
    if (reload) reload.addEventListener('click', function () { window.location.reload(); });

    wireSliders();
    wireDock();
    wireTransport();
    wireLibrary();
    wireKeys();

    var engine = ink();
    if (engine && engine.init) {
      engine.init({
        canvas: $('fluid'),
        onStatus: function (text) { var el = $('performance'); if (el) el.textContent = text; },
        onAnnounce: announce,
        onStir: function () {
          var hint = $('hint');
          if (hint) hint.textContent = 'Follow the flow. Make your own.';
        },
        onPause: syncFreeze,
        onError: function (message) {
          showError('WebGL 2 is unavailable', message +
            ' In Chrome, turn on “Use graphics acceleration when available” in Settings → System, then relaunch the browser. Playback and the library still work here.');
        },
        settings: { palette: 'aurora' },
      });
    } else {
      showError('The ink engine did not load',
        'The audio player and the library still work — the canvas is simply unavailable here.');
    }

    /* Small screens start with the library only; the controls open over it. */
    if (isNarrow()) togglePanel(false);
    var wasNarrow = isNarrow();
    window.addEventListener('resize', function () {
      var narrow = isNarrow();
      if (narrow === wasNarrow) return;
      wasNarrow = narrow;
      if (narrow) togglePanel(false);
      else { toggleLibrary(true); togglePanel(true); }
    });

    announce('Punjabi Rewind ready. ' + SONGS.length + ' all-time hits in the library.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();