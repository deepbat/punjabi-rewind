const SONG_LIST = window.SONGS || [];
let currentIndex = 0;
let shuffle = false;
let player = null;
let playerReady = false;

const $ = id => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  if (!SONG_LIST.length) {
    $("songGrid").innerHTML = `<div style="grid-column:1/-1;padding:50px 10px;color:#d85f32">Song database could not be loaded.</div>`;
    return;
  }

  $("songCount").textContent = SONG_LIST.length;
  $("trackTotal").textContent = String(SONG_LIST.length).padStart(2, "0");
  $("artistCount").textContent = new Set(SONG_LIST.map(s => s.artist)).size;
  $("year").textContent = new Date().getFullYear();

  renderSongs();
  renderArtists();
  renderDrawer();

  $("search").addEventListener("input", renderSongs);

  document.querySelectorAll(".filter").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderSongs();
    });
  });

  $("playBtn").onclick = togglePlay;
  $("prevBtn").onclick = previous;
  $("nextBtn").onclick = next;
  $("stopBtn").onclick = stop;
  $("randomBtn").onclick = randomSong;
  $("shuffleBtn").onclick = () => {
    shuffle = !shuffle;
    $("shuffleBtn").innerHTML = `SHUFFLE <span>${shuffle ? "ON" : "OFF"}</span>`;
  };

  $("libraryBtn").onclick = openDrawer;
  $("libraryBtn2").onclick = openDrawer;
  $("closeDrawer").onclick = closeDrawer;
  $("backdrop").onclick = closeDrawer;

  $("youtubeBtn").onclick = () => {
    const song = SONG_LIST[currentIndex];
    if (song?.youtubeId) window.open(`https://www.youtube.com/watch?v=${song.youtubeId}`, "_blank");
  };

  $("spotifyBtn").onclick = () => {
    const song = SONG_LIST[currentIndex];
    if (song?.spotifyUrl) window.open(song.spotifyUrl, "_blank");
  };

  document.addEventListener("keydown", e => {
    if (e.target.matches("input")) return;
    if (e.code === "Space") { e.preventDefault(); togglePlay(); }
    if (e.code === "ArrowRight") next();
    if (e.code === "ArrowLeft") previous();
  });
});

let currentFilter = "all";

function renderSongs() {
  const q = $("search").value.toLowerCase().trim();
  const filtered = SONG_LIST.map((s, i) => ({...s, index:i})).filter(s => {
    const eraOk = currentFilter === "all" || s.era === currentFilter;
    const textOk = !q || `${s.title} ${s.artist}`.toLowerCase().includes(q);
    return eraOk && textOk;
  });

  $("resultCount").textContent = `${filtered.length} classic${filtered.length === 1 ? "" : "s"}`;

  $("songGrid").innerHTML = filtered.length ? filtered.map((s, n) => `
    <article class="song-card" data-index="${s.index}">
      <span class="song-number">${String(n + 1).padStart(2,"0")}</span>
      <div class="song-info">
        <strong>${escapeHtml(s.title)}</strong>
        <span>${escapeHtml(s.artist)}</span>
      </div>
      <span class="song-year">${s.year}</span>
    </article>
  `).join("") : `<div style="grid-column:1/-1;padding:50px 10px;color:#625b51">No classics found.</div>`;

  document.querySelectorAll(".song-card").forEach(card => {
    card.onclick = () => selectSong(Number(card.dataset.index), true);
  });
}

function renderArtists() {
  const map = new Map();
  SONG_LIST.forEach(s => map.set(s.artist, (map.get(s.artist) || 0) + 1));
  const artists = [...map.entries()].sort((a,b) => b[1]-a[1]);

  $("artistGrid").innerHTML = artists.map(([name,count]) => `
    <div class="artist" data-artist="${escapeAttr(name)}">
      ${escapeHtml(name)}
      <small>${count} ${count === 1 ? "song" : "songs"}</small>
    </div>
  `).join("");

  document.querySelectorAll(".artist").forEach(el => {
    el.onclick = () => {
      $("search").value = el.dataset.artist;
      currentFilter = "all";
      document.querySelectorAll(".filter").forEach(x => x.classList.toggle("active", x.dataset.filter === "all"));
      renderSongs();
      $("archive").scrollIntoView({behavior:"smooth"});
    };
  });
}

function renderDrawer() {
  $("drawerList").innerHTML = SONG_LIST.map((s,i) => `
    <div class="drawer-song" data-index="${i}">
      <strong>${escapeHtml(s.title)}</strong>
      <span>${escapeHtml(s.artist)} · ${s.year}</span>
    </div>
  `).join("");

  document.querySelectorAll(".drawer-song").forEach(el => {
    el.onclick = () => {
      selectSong(Number(el.dataset.index), true);
      closeDrawer();
    };
  });
}

function selectSong(index, autoplay=false) {
  currentIndex = index;
  const s = SONG_LIST[index];

  $("cassetteArtist").textContent = s.artist.toUpperCase();
  $("cassetteTitle").textContent = s.title.toUpperCase();
  $("displayTitle").textContent = s.title;
  $("displayArtist").textContent = `${s.artist} · ${s.year}`;
  $("nowTitle").textContent = s.title;
  $("nowArtist").textContent = `${s.artist} · ${s.year}`;
  $("trackNo").textContent = String(index+1).padStart(2,"0");

  $("youtubeBtn").disabled = !s.youtubeId;
  $("spotifyBtn").disabled = !s.spotifyUrl;

  document.querySelector(".deck").classList.toggle("playing", autoplay);

  if (!s.youtubeId) {
    $("playerPlaceholder").style.display = "flex";
    $("playerPlaceholder").innerHTML = `<span>YT</span><small>NO SOURCE</small>`;
    return;
  }

  $("playerPlaceholder").style.display = "none";

  if (playerReady && player) {
    player.loadVideoById(s.youtubeId);
    if (!autoplay) player.pauseVideo();
  }
}

function onYouTubeIframeAPIReady() {
  player = new YT.Player("player", {
    videoId: "",
    playerVars: {
      autoplay: 0,
      controls: 0,
      rel: 0,
      modestbranding: 1,
      playsinline: 1
    },
    events: {
      onReady: () => {
        playerReady = true;
        if (SONG_LIST[currentIndex]?.youtubeId) {
          player.cueVideoById(SONG_LIST[currentIndex].youtubeId);
        }
      },
      onStateChange: onPlayerStateChange
    }
  });
}

function onPlayerStateChange(e) {
  const playing = e.data === YT.PlayerState.PLAYING;
  $("playBtn").textContent = playing ? "Ⅱ" : "▶";
  document.querySelector(".deck").classList.toggle("playing", playing);
  if (e.data === YT.PlayerState.ENDED) next();
}

function togglePlay() {
  const s = SONG_LIST[currentIndex];
  if (!s?.youtubeId || !playerReady) return;

  const state = player.getPlayerState();
  if (state === YT.PlayerState.PLAYING) player.pauseVideo();
  else player.playVideo();
}

function stop() {
  if (playerReady && player) player.stopVideo();
  document.querySelector(".deck").classList.remove("playing");
  $("playBtn").textContent = "▶";
}

function next() {
  let nextIndex;
  if (shuffle) {
    nextIndex = Math.floor(Math.random() * SONG_LIST.length);
    if (SONG_LIST.length > 1 && nextIndex === currentIndex) nextIndex = (nextIndex + 1) % SONG_LIST.length;
  } else {
    nextIndex = (currentIndex + 1) % SONG_LIST.length;
  }
  selectSong(nextIndex, true);
}

function previous() {
  selectSong((currentIndex - 1 + SONG_LIST.length) % SONG_LIST.length, true);
}

function randomSong() {
  const i = Math.floor(Math.random() * SONG_LIST.length);
  selectSong(i, true);
  document.querySelector(".now").scrollIntoView({behavior:"smooth"});
}

function openDrawer() { $("drawer").classList.add("open"); $("backdrop").classList.add("open"); }
function closeDrawer() { $("drawer").classList.remove("open"); $("backdrop").classList.remove("open"); }

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function escapeAttr(str) { return escapeHtml(str); }
