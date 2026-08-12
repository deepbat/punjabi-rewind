const SONG_LIST = Array.isArray(window.SONGS) ? window.SONGS : [];
const RADIO_LIST = Array.isArray(window.RADIO_STATIONS) ? window.RADIO_STATIONS : [];
const CULTURE = window.CULTURE || { quotes: [], facts: [] };
const $ = id => document.getElementById(id);

let player = null, playerReady = false, timer = null;
let currentIndex = 0, isMuted = false, isShuffle = false, repeatMode = "off";
let volume = 80;
let radioMode = false, radioIndex = 0;
let activeYear = "ALL", activeArtist = "ALL", searchQuery = "";

document.addEventListener("DOMContentLoaded", () => {
  buildWheat();
  buildPetals();
  buildMarquee();
  renderRadio();
  wireRadioAudio();
  renderCulture();
  $("panelCount").textContent = SONG_LIST.length;
  fillArtists();
  renderSongGrid();
  wireEvents();
  parallax();
});

function wireEvents() {
  $("enterBtn").onclick = () => playFromGrid(currentIndex, true);
  $("playBtn").onclick = togglePlay;
  $("prevBtn").onclick = previous;
  $("nextBtn").onclick = next;
  $("shuffleBtn").onclick = toggleShuffle;
  $("repeatBtn").onclick = cycleRepeat;
  $("browseBtn").onclick = () => openPanel();
  $("closePanel").onclick = () => closePanel();
  $("resetFilters").onclick = resetFilters;
  $("youtubeBtn").onclick = openYoutube;
  $("spotifyBtn").onclick = openSpotify;
  $("videoBtn").onclick = () => openVideoModal(currentIndex);
  $("videoOpenYt").onclick = openModalToYoutube;
  $("closeVideo").onclick = closeVideoModal;
  $("videoModal").addEventListener("click", e => { if (e.target === $("videoModal")) closeVideoModal(); });
  $("muteBtn").onclick = toggleMute;
  $("muteBtn2").onclick = toggleMute;
  $("radioStopBtn").onclick = stopRadio;

  $("searchInput").addEventListener("input", e => { searchQuery = e.target.value.trim().toLowerCase(); renderSongGrid(); });
  $("artistSelect").addEventListener("change", e => { activeArtist = e.target.value; renderSongGrid(); });
  document.querySelectorAll("#yearChips .chip").forEach(chip => {
    chip.onclick = () => {
      activeYear = chip.dataset.year;
      document.querySelectorAll("#yearChips .chip").forEach(c => c.classList.toggle("active", c === chip));
      renderSongGrid();
    };
  });

  const slider = $("volumeSlider");
  slider.addEventListener("input", () => {
    volume = +slider.value;
    if (radioMode) { const a = $("radioAudio"); if (a) a.volume = volume / 100; return; }
    if (playerReady) { if (volume > 0 && isMuted) setMuted(false); player.setVolume(volume); }
  });

  $("progressBar").addEventListener("click", e => {
    if (radioMode || !playerReady) return;
    const d = player.getDuration();
    if (!d) return;
    const rect = e.currentTarget.getBoundingClientRect();
    player.seekTo((e.clientX - rect.left) / rect.width * d, true);
  });

  $("homeBtn").onclick = e => { e.preventDefault(); showTab("music"); };

  document.querySelectorAll(".tab").forEach(btn => {
    btn.onclick = () => showTab(btn.dataset.tab);
  });

  document.addEventListener("keydown", e => {
    const t = e.target;
    if (t && (t.matches("input,textarea,select") || t.matches("button"))) return;
    if (e.code === "Space") { e.preventDefault(); togglePlay(); }
    else if (e.key === "ArrowRight") next();
    else if (e.key === "ArrowLeft") previous();
    else if (e.key.toLowerCase() === "m") toggleMute();
    else if (e.key.toLowerCase() === "r") cycleRepeat();
    else if (e.key.toLowerCase() === "s") toggleShuffle();
    else if (e.key.toLowerCase() === "v") { $("videoModal").classList.contains("open") ? closeVideoModal() : openVideoModal(currentIndex); }
    else if (e.key === "Escape") closeVideoModal();
  });
}

/* ---------- tabs ---------- */
function showTab(name) {
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const page = $("page-" + name);
  page.classList.add("active");
  if (name === "music") revealCurrent();
  const x = page.offsetTop;
  window.scrollTo({ top: Math.max(0, x - 70), behavior: "smooth" });
}

/* ---------- state helpers ---------- */
function setMuted(mute) {
  isMuted = mute;
  if (playerReady) isMuted ? player.mute() : player.unMute();
  $("muteBtn").textContent = isMuted ? "SOUND OFF" : "SOUND ON";
  $("muteBtn2").textContent = isMuted ? "MUTED" : "VOL";
  $("volumeSlider").value = volume;
}
function toggleMute() {
  if (radioMode) {
    isMuted = !isMuted;
    const a = $("radioAudio"); if (a) a.muted = isMuted;
    $("muteBtn").textContent = isMuted ? "SOUND OFF" : "SOUND ON";
    $("muteBtn2").textContent = isMuted ? "MUTED" : "VOL";
    return;
  }
  if (playerReady) setMuted(!isMuted);
}

function toggleShuffle() {
  isShuffle = !isShuffle;
  const b = $("shuffleBtn");
  b.classList.toggle("active", isShuffle);
  b.title = isShuffle ? "Shuffle: ON" : "Shuffle: OFF";
}
function cycleRepeat() {
  repeatMode = repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off";
  const b = $("repeatBtn");
  b.classList.toggle("active", repeatMode !== "off");
  b.textContent = repeatMode === "one" ? "↻1" : "↻";
  b.title = repeatMode === "off" ? "Repeat: OFF" : repeatMode === "all" ? "Repeat: ALL" : "Repeat: ONE";
}

function nextIndex() {
  if (isShuffle && SONG_LIST.length > 1) {
    let i;
    do { i = Math.floor(Math.random() * SONG_LIST.length); } while (i === currentIndex);
    return i;
  }
  return (currentIndex + 1) % SONG_LIST.length;
}

/* ---------- playback ---------- */
function selectSong(i, autoplay) {
  exitRadioMode();
  if (!SONG_LIST[i]) return;
  currentIndex = i;
  const s = SONG_LIST[i];
  $("playerTitle").textContent = s.title;
  $("playerMeta").textContent = `${s.artist} · ${s.year}`;
  $("playerBar").classList.remove("playing");
  if (playerReady) cueTrack(autoplay);
  renderSongGrid();
  revealCurrent();
}

function cueTrack(autoplay) {
  const id = SONG_LIST[currentIndex]?.youtubeIds?.[0];
  if (!id) { $("playerTitle").textContent = "YouTube source unavailable"; return; }
  try {
    player.loadVideoById({ videoId: id, startSeconds: 0 });
    if (autoplay) player.playVideo();
    else player.pauseVideo();
  } catch (e) { $("playerTitle").textContent = "Unable to load source"; }
}

function playFromGrid(i, autoplay) {
  if (!playerReady) return;
  selectSong(i, autoplay);
  closePanel();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function togglePlay() {
  if (radioMode) {
    const a = $("radioAudio");
    if (a.paused) a.play().catch(markRadioError);
    else a.pause();
    return;
  }
  if (!playerReady) return;
  const state = player.getPlayerState();
  if (state === YT.PlayerState.PLAYING) player.pauseVideo();
  else playCurrent();
}
function playCurrent() {
  if (!playerReady) { selectSong(0, true); return; }
  cueTrack(true);
}
function previous() {
  if (radioMode) { tuneRadio((radioIndex - 1 + RADIO_LIST.length) % RADIO_LIST.length); return; }
  selectSong((currentIndex - 1 + SONG_LIST.length) % SONG_LIST.length, true);
}
function next() {
  if (radioMode) { tuneRadio((radioIndex + 1) % RADIO_LIST.length); return; }
  selectSong(nextIndex(), true);
}

function onYouTubeIframeAPIReady() {
  player = new YT.Player("player", {
    height: "1", width: "1", videoId: "",
    playerVars: { autoplay: 0, controls: 0, rel: 0, playsinline: 1, modestbranding: 1, enablejsapi: 1 },
    events: {
      onReady: () => {
        playerReady = true;
        player.setVolume(volume);
        if (SONG_LIST.length && !radioMode) selectSong(0, false);
      },
      onError: () => { $("playerTitle").textContent = "This YouTube source cannot be played here"; },
      onStateChange: e => {
        if (e.data === YT.PlayerState.PLAYING) {
          $("playBtn").textContent = "Ⅱ";
          $("playerBar").classList.add("playing");
          startTimer();
        } else if (e.data === YT.PlayerState.PAUSED) {
          $("playBtn").textContent = "▶";
          $("playerBar").classList.remove("playing");
          stopTimer();
        } else if (e.data === YT.PlayerState.ENDED) {
          $("playBtn").textContent = "▶";
          $("playerBar").classList.remove("playing");
          stopTimer();
          if (repeatMode === "one") {
            cueTrack(true);
          } else if (repeatMode === "all" || isShuffle) {
            next();
          } else {
            $("progressFill").style.width = "0%";
            $("progressThumb").style.left = "0%";
            $("currentTime").textContent = "0:00";
          }
        }
      }
    }
  });
}

/* ---------- timer ---------- */
function startTimer() {
  stopTimer();
  timer = setInterval(() => {
    if (!player || !player.getCurrentTime) return;
    const t = player.getCurrentTime(), d = player.getDuration();
    $("currentTime").textContent = formatTime(t);
    $("duration").textContent = formatTime(d);
    const pct = d ? `${(t / d) * 100}%` : "0%";
    $("progressFill").style.width = pct;
    $("progressThumb").style.left = pct;
  }, 500);
}
function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
function formatTime(s) { if (!Number.isFinite(s)) return "0:00"; return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`; }

/* ---------- panel & grid ---------- */
function fillArtists() {
  const artists = [...new Set(SONG_LIST.map(s => s.artist))].sort();
  $("artistSelect").innerHTML = `<option value="ALL">ALL ARTISTS</option>` +
    artists.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join("");
}

function filteredSongs() {
  return SONG_LIST.filter(s =>
    (activeYear === "ALL" || s.year === +activeYear) &&
    (activeArtist === "ALL" || s.artist === activeArtist) &&
    (!searchQuery || `${s.title} ${s.artist} ${s.year}`.toLowerCase().includes(searchQuery))
  );
}

function renderSongGrid() {
  const list = filteredSongs();
  $("noResults").hidden = list.length > 0;
  $("resultCount").textContent = list.length
    ? `Showing ${list.length} of ${SONG_LIST.length} songs`
    : "No songs match";
  $("songGrid").innerHTML = list.map(s => {
    const idx = SONG_LIST.indexOf(s);
    const cls = idx === currentIndex ? "song-card playing" : "song-card";
    return `
    <div class="${cls}" data-idx="${idx}">
      <span class="num">${String(idx + 1).padStart(2, "0")}</span>
      <div>
        <strong>${esc(s.title)}</strong>
        <small>${esc(s.artist)} <span class="year">${s.year}</span></small>
      </div>
      <div class="actions">
        <button class="watch-btn" data-watch="${idx}" type="button" aria-label="Watch ${esc(s.title)} video">WATCH</button>
        <button data-play="${idx}" type="button" aria-label="Play ${esc(s.title)}">▶</button>
      </div>
    </div>`;
  }).join("");

  document.querySelectorAll("[data-play]").forEach(b => {
    b.onclick = () => playFromGrid(+b.dataset.play, true);
  });
  document.querySelectorAll("[data-watch]").forEach(b => {
    b.onclick = () => openVideoModal(+b.dataset.watch);
  });
}

function revealCurrent() {
  if (!$("songsPanel").classList.contains("open")) return;
  const cur = document.querySelector(".song-card.playing");
  if (cur) cur.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function openPanel() {
  $("songsPanel").classList.add("open");
  $("songsPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  revealCurrent();
}
function closePanel() { $("songsPanel").classList.remove("open"); }
function resetFilters() {
  searchQuery = ""; activeYear = "ALL"; activeArtist = "ALL";
  $("searchInput").value = ""; $("artistSelect").value = "ALL";
  document.querySelectorAll("#yearChips .chip").forEach(c => c.classList.toggle("active", c.dataset.year === "ALL"));
  renderSongGrid();
}

/* ---------- external / video ---------- */
function openYoutube() {
  const id = SONG_LIST[currentIndex]?.youtubeIds?.[0];
  if (id) window.open(`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`, "_blank", "noopener");
}
function openSpotify() {
  const s = SONG_LIST[currentIndex];
  if (s) window.open(`https://open.spotify.com/search/${encodeURIComponent(`${s.title} ${s.artist}`)}`, "_blank", "noopener");
}
function openVideoModal(idx) {
  exitRadioMode();
  const s = SONG_LIST[idx];
  const id = s?.youtubeIds?.[0];
  if (!id) return;
  currentIndex = idx;
  $("videoTitle").textContent = s.title;
  $("videoFrame").src = `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
  $("videoModal").classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeVideoModal() {
  $("videoModal").classList.remove("open");
  $("videoFrame").src = "";
  document.body.style.overflow = "";
}
function openModalToYoutube() {
  const id = SONG_LIST[currentIndex]?.youtubeIds?.[0];
  if (id) window.open(`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`, "_blank", "noopener");
}

/* ---------- radio (in-page streaming, no new tabs) ---------- */
function renderRadio() {
  const grid = $("radioGrid");
  grid.innerHTML = RADIO_LIST.map((r, i) => `
    <div class="radio-card" data-i="${i}">
      <span class="live-dot">LIVE</span>
      <h3>${esc(r.name)}</h3>
      <p class="tagline">${esc(r.tagline)}</p>
      <div class="area">${esc(r.area)}</div>
      <div class="r-tags">${(r.tags || []).map(t => `<span>${esc(t)}</span>`).join("")}</div>
      <button class="tune" data-i="${i}" type="button" aria-label="Play ${esc(r.name)}">
        <span class="tune-ico">▶</span> TUNE IN
      </button>
    </div>`).join("");
  grid.querySelectorAll(".tune").forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    if (radioMode && radioIndex === i && !$("radioAudio").paused) stopRadio();
    else tuneRadio(i);
  });
}

function wireRadioAudio() {
  const a = $("radioAudio");
  a.addEventListener("playing", () => setRadioUi(true));
  a.addEventListener("pause", () => setRadioUi(false));
  a.addEventListener("error", markRadioError);
  a.volume = volume / 100;
}

function tuneRadio(i) {
  const s = RADIO_LIST[i];
  if (!s) return;
  radioMode = true;
  radioIndex = i;
  if (playerReady && player.pauseVideo) { try { player.pauseVideo(); } catch (e) {} }
  const a = $("radioAudio");
  a.src = s.stream;
  a.muted = isMuted;
  a.volume = volume / 100;
  a.play().catch(markRadioError);
  setRadioMeta();
  $("playerBar").classList.add("radio-mode");
  $("radioStopBtn").hidden = false;
  document.querySelectorAll(".radio-card").forEach(c => c.classList.toggle("now", +c.dataset.i === i));
  setRadioUi(true);
}

function setRadioMeta() {
  const s = RADIO_LIST[radioIndex];
  if (!s) return;
  $("playerTitle").textContent = s.name;
  $("playerMeta").textContent = `${s.area} · LIVE`;
  $("currentTime").textContent = "LIVE";
  $("duration").textContent = "·";
  $("progressFill").style.width = "100%";
  $("progressThumb").style.left = "100%";
}

function setRadioUi(playing) {
  $("playBtn").textContent = playing ? "Ⅱ" : "▶";
  $("playerBar").classList.toggle("playing", playing);
  document.querySelectorAll(".radio-card").forEach(c => {
    if (+c.dataset.i === radioIndex) {
      c.classList.toggle("now", playing);
      const b = c.querySelector(".tune-ico");
      if (b) b.textContent = playing ? "Ⅱ" : "▶";
    }
  });
}

function markRadioError() {
  if (!radioMode) return;
  $("playerTitle").textContent = "Station unreachable right now";
  $("playerMeta").textContent = "Tap another station to retry";
  setRadioUi(false);
}

function exitRadioMode() {
  if (!radioMode) return;
  radioMode = false;
  const a = $("radioAudio");
  a.pause();
  a.removeAttribute("src");
  try { a.load(); } catch (e) {}
  $("playerBar").classList.remove("radio-mode", "playing");
  $("radioStopBtn").hidden = true;
  $("playBtn").textContent = "▶";
  $("progressFill").style.width = "0%";
  $("progressThumb").style.left = "0%";
  $("currentTime").textContent = "0:00";
  $("duration").textContent = "0:00";
  document.querySelectorAll(".radio-card").forEach(c => c.classList.remove("now"));
}

function stopRadio() {
  exitRadioMode();
  if (SONG_LIST.length) selectSong(currentIndex, false);
}

/* ---------- culture ---------- */
function renderCulture() {
  const q = CULTURE.quotes[Math.floor(Date.now() / 86400000) % CULTURE.quotes.length];
  if (q) {
    $("qGurmukhi").textContent = q.gurmukhi;
    $("qRoman").textContent = q.roman;
    $("qEn").textContent = q.en;
  }
  $("factsGrid").innerHTML = CULTURE.facts.map(f => `
    <div class="fact-card">
      <div class="f-tag">${esc(f.how)}</div>
      <h3>${esc(f.title)}</h3>
      <p>${esc(f.text)}</p>
    </div>`).join("");
}

/* ---------- background ---------- */
function buildWheat() {
  const rows = [
    { id: "wheatBack", n: 40, min: 70, max: 115, base: 60 },
    { id: "wheatMid", n: 34, min: 95, max: 145, base: 80 },
    { id: "wheatFront", n: 26, min: 120, max: 175, base: 100 }
  ];
  rows.forEach(r => {
    const row = $(r.id);
    if (!row) return;
    let h = "";
    for (let i = 0; i < r.n; i++) {
      const left = (i / r.n) * 100 + (Math.random() * 2.2 - 1.1);
      const ht = r.min + Math.random() * (r.max - r.min);
      const sw = 3.5 + Math.random() * 2;
      const sway = (4 + Math.random() * 4).toFixed(2);
      const delay = (Math.random() * 6).toFixed(2);
      h += `<span class="stalk" style="left:${left.toFixed(2)}%;height:${ht.toFixed(0)}px;width:${sw.toFixed(1)}px;--sw:${sway}s;--sd:${delay}s"></span>`;
    }
    row.innerHTML = h;
  });
}

function buildPetals() {
  const wrap = $("petals");
  const colors = ["#ef6d2e", "#d8a449", "#e9b76b", "#c0392b", "#f5e7c9"];
  const centers = ["#7a1f0d", "#5a2a10", "#6b3a1a", "#3f280e", "#8a5a20"];
  let h = "";
  for (let i = 0; i < 14; i++) {
    const size = 16 + Math.random() * 22;
    const color = colors[i % colors.length];
    const center = centers[i % centers.length];
    const petals = [0, 72, 144, 216, 288]
      .map(a => `<circle cx="${(20 + Math.cos(a * Math.PI / 180) * 11).toFixed(1)}" cy="${(20 + Math.sin(a * Math.PI / 180) * 11).toFixed(1)}" r="7"/>`)
      .join("");
    h += `<svg width="${size.toFixed(0)}" height="${size.toFixed(0)}" viewBox="0 0 40 40"
      style="left:${(Math.random() * 94 + 2).toFixed(1)}%;--ft:${(13 + Math.random() * 9).toFixed(1)}s;--fd:${(Math.random() * 14).toFixed(1)}s;opacity:${(0.5 + Math.random() * 0.45).toFixed(2)}">
      <g fill="${color}">${petals}</g>
      <circle cx="20" cy="20" r="5" fill="${center}"/>
      <circle cx="20" cy="20" r="8" fill="none" stroke="${color}" stroke-width="2" opacity=".55"/>
    </svg>`;
  }
  wrap.innerHTML = h;
}

function buildMarquee() {
  const txt = SONG_LIST.map(s => s.title.toUpperCase()).join(" ✦ ") + " ✦ ";
  $("marqueeTrack").innerHTML = `<span>${txt}</span><span>${txt}</span>`;
}

function parallax() {
  const scene = $("scene");
  let t = null;
  window.addEventListener("mousemove", e => {
    const x = e.clientX / innerWidth - 0.5;
    const y = e.clientY / innerHeight - 0.5;
    if (t) return;
    t = requestAnimationFrame(() => {
      t = null;
      document.documentElement.style.setProperty("--px", (x * 16).toFixed(1) + "px");
      document.documentElement.style.setProperty("--py", (y * 10).toFixed(1) + "px");
    });
  });
}

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}