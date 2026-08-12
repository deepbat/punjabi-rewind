const SONG_LIST = Array.isArray(window.SONGS) ? window.SONGS : [];
const $ = id => document.getElementById(id);

let player = null, playerReady = false, timer = null;
let currentIndex = 0, isMuted = false, isShuffle = false, repeatMode = "off";
let volume = 80;
let activeYear = "ALL", activeArtist = "ALL", searchQuery = "";

document.addEventListener("DOMContentLoaded", () => {
  buildEmbers();
  buildMarquee();
  $("panelCount").textContent = SONG_LIST.length;
  fillArtists();
  renderSongGrid();
  wireEvents();
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
  $("videoBtn").onclick = openVideoModal;
  $("closeVideo").onclick = closeVideoModal;
  $("videoModal").addEventListener("click", e => { if (e.target === $("videoModal")) closeVideoModal(); });
  $("muteBtn").onclick = toggleMute;
  $("muteBtn2").onclick = toggleMute;

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
    if (playerReady) { if (volume > 0 && isMuted) setMuted(false); player.setVolume(volume); }
  });

  $("progressBar").addEventListener("click", e => {
    if (!playerReady) return;
    const d = player.getDuration();
    if (!d) return;
    const rect = e.currentTarget.getBoundingClientRect();
    player.seekTo((e.clientX - rect.left) / rect.width * d, true);
  });

  $("homeBtn").onclick = e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); };

  document.addEventListener("keydown", e => {
    const t = e.target;
    if (t && (t.matches("input,textarea,select") || t.matches("button"))) return;
    if (e.code === "Space") { e.preventDefault(); togglePlay(); }
    else if (e.key === "ArrowRight") next();
    else if (e.key === "ArrowLeft") previous();
    else if (e.key.toLowerCase() === "m") toggleMute();
    else if (e.key.toLowerCase() === "r") cycleRepeat();
    else if (e.key.toLowerCase() === "s") toggleShuffle();
    else if (e.key.toLowerCase() === "v") { $("videoModal").hidden ? openVideoModal() : closeVideoModal(); }
    else if (e.key === "Escape") closeVideoModal();
  });
}

/* ---------- state helpers ---------- */
function setMuted(mute) {
  isMuted = mute;
  if (playerReady) isMuted ? player.mute() : player.unMute();
  $("muteBtn").textContent = isMuted ? "SOUND OFF" : "SOUND ON";
  $("muteBtn2").textContent = isMuted ? "MUTED" : "VOL";
  $("volumeSlider").value = volume;
}
function toggleMute() { if (playerReady) setMuted(!isMuted); }

function toggleShuffle() {
  isShuffle = !isShuffle;
  $("shuffleBtn").classList.toggle("active", isShuffle);
  $("shuffleBtn").title = isShuffle ? "Shuffle: ON" : "Shuffle: OFF";
}
function cycleRepeat() {
  repeatMode = repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off";
  const btn = $("repeatBtn");
  btn.classList.toggle("active", repeatMode !== "off");
  btn.textContent = repeatMode === "one" ? "↻1" : "↻";
  btn.title = repeatMode === "off" ? "Repeat: OFF" : repeatMode === "all" ? "Repeat: ALL" : "Repeat: ONE";
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
  if (!playerReady) return;
  const state = player.getPlayerState();
  if (state === YT.PlayerState.PLAYING) player.pauseVideo();
  else playCurrent();
}
function playCurrent() {
  if (!playerReady) { selectSong(0, true); return; }
  cueTrack(true);
}
function previous() { selectSong((currentIndex - 1 + SONG_LIST.length) % SONG_LIST.length, true); }
function next() { selectSong(nextIndex(), true); }

function onYouTubeIframeAPIReady() {
  player = new YT.Player("player", {
    height: "1", width: "1", videoId: "",
    playerVars: { autoplay: 0, controls: 0, rel: 0, playsinline: 1, modestbranding: 1, enablejsapi: 1 },
    events: {
      onReady: () => {
        playerReady = true;
        player.setVolume(volume);
        if (SONG_LIST.length) selectSong(0, false);
      },
      onError: () => { $("playerTitle").textContent = "This YouTube source cannot be played here"; },
      onStateChange: e => {
        if (e.data === YT.PlayerState.PLAYING) {
          $("playBtn").textContent = "Ⅱ";
          updateNpPlaying(true);
          startTimer();
        } else if (e.data === YT.PlayerState.PAUSED) {
          $("playBtn").textContent = "▶";
          updateNpPlaying(false);
          stopTimer();
        } else if (e.data === YT.PlayerState.ENDED) {
          $("playBtn").textContent = "▶";
          updateNpPlaying(false);
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

function updateNpPlaying(playing) {
  $("playerBar").classList.toggle("playing", playing);
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
  const cur = document.querySelector(`.song-card.playing`);
  if (cur) cur.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function openPanel() {
  $("songsPanel").classList.add("open");
  $("songsPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  revealCurrent();
}
function closePanel() { $("songsPanel").classList.remove("open"); }
function resetFilters() {
  searchQuery = "";
  activeYear = "ALL";
  activeArtist = "ALL";
  $("searchInput").value = "";
  $("artistSelect").value = "ALL";
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
function openVideoModal(idx = currentIndex) {
  const s = SONG_LIST[idx];
  const id = s?.youtubeIds?.[0];
  if (!id) return;
  currentIndex = idx;
  $("videoTitle").textContent = s.title;
  $("videoFrame").src = `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
  $("videoModal").hidden = false;
  document.body.style.overflow = "hidden";
}
function closeVideoModal() {
  $("videoModal").hidden = true;
  $("videoFrame").src = "";
  document.body.style.overflow = "";
}

/* ---------- ambience ---------- */
function buildEmbers() {
  const wrap = $("embers");
  for (let i = 0; i < 12; i++) {
    const e = document.createElement("span");
    e.className = "ember";
    e.style.left = `${2 + Math.random() * 96}%`;
    e.style.setProperty("--t", `${8 + Math.random() * 8}s`);
    e.style.setProperty("--d", `${(Math.random() * 10).toFixed(1)}s`);
    e.style.setProperty("--x", `${(Math.random() * 60 - 30).toFixed(0)}px`);
    wrap.appendChild(e);
  }
}
function buildMarquee() {
  const txt = SONG_LIST.map(s => s.title.toUpperCase()).join(" ✦ ") + " ✦ ";
  $("marqueeTrack").innerHTML = `<span>${txt}</span><span>${txt}</span>`;
}

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}