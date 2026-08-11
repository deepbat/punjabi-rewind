/* Punjabi Rewind — Player Logic */
const SONG_LIST = Array.isArray(window.SONGS) ? window.SONGS : [];
let currentIndex = 0;
let player = null;
let playerReady = false;
let isPlaying = false;
let isMuted = false;
let isShuffled = false;
let showVideo = false;
let progressTimer = null;
let sleepTimer = null;
let sleepTimeout = null;
let lastPlayedIndices = [];
const MAX_HISTORY = 5;

const $ = (id) => document.getElementById(id);
const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

const els = {
  // Hero
  enterBtn: $('#enterBtn'),
  heroImg: $('#heroImg'),
  heroArtwork: $('#heroArtwork'),
  
  // Player
  playerSection: $('#playerSection'),
  playerImg: $('#playerImg'),
  playerArtwork: $('#playerArtwork'),
  playerPlayBtn: $('#playerPlayBtn'),
  playerArtist: $('#playerArtist'),
  playerTitle: $('#playerTitle'),
  playerMeta: $('#playerMeta'),
  progressBar: $('#progressBar'),
  progressFill: $('#progressFill'),
  progressHandle: $('#progressHandle'),
  currentTime: $('#currentTime'),
  duration: $('#duration'),
  
  // Controls
  playBtn: $('#playBtn'),
  prevBtn: $('#prevBtn'),
  nextBtn: $('#nextBtn'),
  rewindBtn: $('#rewindBtn'),
  forwardBtn: $('#forwardBtn'),
  muteBtn: $('#muteBtn'),
  sleepBtn: $('#sleepBtn'),
  shuffleBtn: $('#shuffleBtn'),
  videoBtn: $('#videoBtn'),
  youtubeBtn: $('#youtubeBtn'),
  spotifyBtn: $('#spotifyBtn'),
  shareBtn: $('#shareBtn'),
  
  // Playlist
  playlistBtn: $('#playlistBtn'),
  playlistPanel: $('#playlistPanel'),
  panelBackdrop: $('#panelBackdrop'),
  panelClose: $('#panelClose'),
  panelList: $('#panelList'),
  
  // Up Next
  upNext: $('#upNext'),
  upNextClose: $('#upNextClose'),
  upNextImg: $('#upNextImg'),
  upNextArtist: $('#upNextArtist'),
  upNextTitle: $('#upNextTitle'),
  
  // Toast
  toast: $('#toast'),
  
  // YT Player container
  ytPlayer: $('#ytPlayer'),
};

// Format time
const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

// Toast notification
const showToast = (message, duration = 3000) => {
  const { toast } = els;
  toast.textContent = message;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add('visible'));
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => { toast.hidden = true; }, 400);
  }, duration);
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  renderPlaylist();
  setupEventListeners();
  setupKeyboardShortcuts();
  preloadHeroArtwork();
});

// Preload first track artwork for hero
function preloadHeroArtwork() {
  if (SONG_LIST[0]?.youtubeIds?.[0]) {
    els.heroImg.src = `https://i.ytimg.com/vi/${SONG_LIST[0].youtubeIds[0]}/maxresdefault.jpg`;
    els.heroImg.onload = () => els.heroArtwork.style.opacity = '1';
  }
}

// Render playlist panel
function renderPlaylist() {
  const { panelList } = els;
  panelList.innerHTML = SONG_LIST.map((song, index) => `
    <button class="song-item" data-index="${index}" role="option" aria-selected="${index === currentIndex}">
      <span class="song-num">${String(index + 1).padStart(2, '0')}</span>
      <img class="song-artwork" src="https://i.ytimg.com/vi/${song.youtubeIds[0]}/hqdefault.jpg" alt="" loading="lazy">
      <div class="song-info">
        <div class="song-title">${escapeHtml(song.title)}</div>
        <div class="song-artist">${escapeHtml(song.artist)}</div>
      </div>
      <button class="song-play" aria-label="Play ${escapeHtml(song.title)}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/></svg>
      </button>
    </button>
  `).join('');
  
  // Add click listeners
  $$('.song-item', panelList).forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (e.target.closest('.song-play')) return;
      const idx = +btn.dataset.index;
      selectSong(idx, true);
      closePlaylist();
    });
    btn.querySelector('.song-play').addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = +btn.dataset.index;
      selectSong(idx, true);
      closePlaylist();
    });
  });
  
  updatePlaylistSelection();
}

// Update playlist visual selection
function updatePlaylistSelection() {
  $$('.song-item', els.panelList).forEach((btn, i) => {
    const isCurrent = i === currentIndex;
    btn.classList.toggle('playing', isCurrent);
    btn.setAttribute('aria-selected', isCurrent);
  });
}

// Event Listeners
function setupEventListeners() {
  // Hero enter
  els.enterBtn.addEventListener('click', enterListeningRoom);
  
  // Player controls
  els.playBtn.addEventListener('click', togglePlay);
  els.playerPlayBtn.addEventListener('click', togglePlay);
  els.prevBtn.addEventListener('click', playPrevious);
  els.nextBtn.addEventListener('click', playNext);
  els.rewindBtn.addEventListener('click', () => seekRelative(-10));
  els.forwardBtn.addEventListener('click', () => seekRelative(10));
  els.muteBtn.addEventListener('click', toggleMute);
  els.sleepBtn.addEventListener('click', showSleepOptions);
  els.shuffleBtn.addEventListener('click', toggleShuffle);
  els.videoBtn.addEventListener('click', toggleVideo);
  els.youtubeBtn.addEventListener('click', openYouTube);
  els.spotifyBtn.addEventListener('click', openSpotify);
  els.shareBtn.addEventListener('click', shareTrack);
  
  // Progress bar
  els.progressBar.addEventListener('click', (e) => seekFromClick(e));
  els.progressBar.addEventListener('keydown', (e) => seekFromKeyboard(e));
  
  // Playlist panel
  els.playlistBtn.addEventListener('click', openPlaylist);
  els.panelClose.addEventListener('click', closePlaylist);
  els.panelBackdrop.addEventListener('click', closePlaylist);
  
  // Up next
  els.upNextClose.addEventListener('click', () => els.upNext.classList.remove('visible'));
  els.upNextTrack?.addEventListener('click', () => {
    playNext();
    els.upNext.classList.remove('visible');
  });
  
  // Home button
  $('#homeBtn').addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  
  // Handle visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isPlaying && playerReady) {
      // Optionally pause when tab hidden
    }
  });
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ignore if typing in input
    if (e.target.matches('input, textarea, [contenteditable]')) return;
    
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        if (e.shiftKey) seekRelative(-10);
        else playPrevious();
        break;
      case 'ArrowRight':
        if (e.shiftKey) seekRelative(10);
        else playNext();
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (playerReady) setVolume(Math.min(1, (player.getVolume() || 50) / 100 + 0.1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (playerReady) setVolume(Math.max(0, (player.getVolume() || 50) / 100 - 0.1));
        break;
      case 'KeyM':
        toggleMute();
        break;
      case 'KeyS':
        toggleShuffle();
        break;
      case 'KeyV':
        toggleVideo();
        break;
      case 'KeyL':
        openPlaylist();
        break;
      case 'Escape':
        closePlaylist();
        els.upNext.classList.remove('visible');
        break;
      case 'Digit0':
      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
      case 'Digit5':
      case 'Digit6':
      case 'Digit7':
      case 'Digit8':
      case 'Digit9':
        if (playerReady) {
          const percent = e.code === 'Digit0' ? 0 : parseInt(e.code.replace('Digit', '')) * 10;
          seekPercent(percent);
        }
        break;
    }
  });
}

// Enter listening room
function enterListeningRoom() {
  els.enterBtn.style.pointerEvents = 'none';
  els.enterBtn.style.opacity = '0.5';
  
  // Animate hero out
  document.querySelector('.hero').style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  document.querySelector('.hero').style.opacity = '0';
  document.querySelector('.hero').style.transform = 'translateY(-30px)';
  
  setTimeout(() => {
    document.querySelector('.hero').style.display = 'none';
    els.playerSection.hidden = false;
    requestAnimationFrame(() => {
      els.playerSection.classList.add('visible');
    });
    selectSong(0, false);
  }, 400);
}

// Select song
function selectSong(index, autoplay = false) {
  if (index < 0 || index >= SONG_LIST.length) return;
  
  // Add to history
  lastPlayedIndices.push(currentIndex);
  if (lastPlayedIndices.length > MAX_HISTORY) lastPlayedIndices.shift();
  
  currentIndex = index;
  const song = SONG_LIST[index];
  
  // Update player UI
  els.playerArtist.textContent = song.artist;
  els.playerTitle.textContent = song.title;
  els.playerMeta.textContent = `${song.year}+ · ${song.sourceType}`;
  
  // Update artwork
  const imgUrl = `https://i.ytimg.com/vi/${song.youtubeIds[0]}/maxresdefault.jpg`;
  els.playerImg.src = imgUrl;
  els.heroImg.src = imgUrl;
  
  // Update up next
  updateUpNext();
  
  // Update playlist selection
  updatePlaylistSelection();
  
  // Load in player
  if (playerReady) {
    loadVideo(song.youtubeIds[0], autoplay);
  }
  
  showToast(`Now playing: ${song.title}`);
}

// Load video in YT player
function loadVideo(videoId, autoplay) {
  try {
    if (autoplay) {
      player.loadVideoById({ videoId, startSeconds: 0 });
    } else {
      player.cueVideoById({ videoId, startSeconds: 0 });
      updateTimeDisplay(0, 0);
    }
  } catch (e) {
    console.error('Error loading video:', e);
    els.playerTitle.textContent = 'Unable to load';
  }
}

// Play current
function playCurrent() {
  if (!playerReady) return;
  const song = SONG_LIST[currentIndex];
  if (!song?.youtubeIds?.[0]) return;
  
  try {
    player.playVideo();
  } catch (e) {
    console.error('Play error:', e);
  }
}

// Toggle play/pause
function togglePlay() {
  if (!playerReady) return;
  
  const state = player.getPlayerState();
  if (state === YT.PlayerState.PLAYING) {
    player.pauseVideo();
  } else {
    playCurrent();
  }
}

// Play previous
function playPrevious() {
  let newIndex;
  if (isShuffled) {
    newIndex = getRandomIndex();
  } else {
    newIndex = (currentIndex - 1 + SONG_LIST.length) % SONG_LIST.length;
  }
  selectSong(newIndex, true);
}

// Play next
function playNext() {
  let newIndex;
  if (isShuffled) {
    newIndex = getRandomIndex();
  } else {
    newIndex = (currentIndex + 1) % SONG_LIST.length;
  }
  selectSong(newIndex, true);
}

// Get random index (not current)
function getRandomIndex() {
  let newIndex;
  do {
    newIndex = Math.floor(Math.random() * SONG_LIST.length);
  } while (newIndex === currentIndex && SONG_LIST.length > 1);
  return newIndex;
}

// Seek relative
function seekRelative(seconds) {
  if (!playerReady) return;
  const current = player.getCurrentTime() || 0;
  const duration = player.getDuration() || 0;
  const newTime = Math.max(0, Math.min(duration, current + seconds));
  player.seekTo(newTime, true);
  updateTimeDisplay(newTime, duration);
}

// Seek from progress bar click
function seekFromClick(e) {
  if (!playerReady) return;
  const rect = els.progressBar.getBoundingClientRect();
  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  seekPercent(percent * 100);
}

// Seek from keyboard
function seekFromKeyboard(e) {
  if (!playerReady) return;
  const duration = player.getDuration() || 0;
  const current = player.getCurrentTime() || 0;
  let newTime = current;
  
  switch (e.key) {
    case 'ArrowLeft':
      newTime = Math.max(0, current - 5);
      break;
    case 'ArrowRight':
      newTime = Math.min(duration, current + 5);
      break;
    case 'Home':
      newTime = 0;
      break;
    case 'End':
      newTime = duration;
      break;
    default:
      return;
  }
  e.preventDefault();
  player.seekTo(newTime, true);
  updateTimeDisplay(newTime, duration);
}

// Seek by percentage
function seekPercent(percent) {
  if (!playerReady) return;
  const duration = player.getDuration() || 0;
  const newTime = (percent / 100) * duration;
  player.seekTo(newTime, true);
  updateTimeDisplay(newTime, duration);
}

// Update time display and progress
function updateTimeDisplay(current, duration) {
  els.currentTime.textContent = formatTime(current);
  els.duration.textContent = formatTime(duration);
  const percent = duration > 0 ? (current / duration) * 100 : 0;
  els.progressFill.style.width = `${percent}%`;
  els.progressBar.setAttribute('aria-valuenow', Math.round(percent));
}

// Start progress timer
function startProgressTimer() {
  stopProgressTimer();
  progressTimer = setInterval(() => {
    if (!playerReady) return;
    const current = player.getCurrentTime();
    const duration = player.getDuration();
    if (Number.isFinite(current)) {
      updateTimeDisplay(current, duration);
    }
  }, 250);
}

function stopProgressTimer() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

// Update up next
function updateUpNext() {
  const nextIndex = isShuffled ? getRandomIndex() : (currentIndex + 1) % SONG_LIST.length;
  const nextSong = SONG_LIST[nextIndex];
  
  if (nextSong) {
    els.upNextImg.src = `https://i.ytimg.com/vi/${nextSong.youtubeIds[0]}/hqdefault.jpg`;
    els.upNextArtist.textContent = nextSong.artist;
    els.upNextTitle.textContent = nextSong.title;
    els.upNext.classList.add('visible');
  }
}

// Toggle mute
function toggleMute() {
  if (!playerReady) return;
  isMuted = !isMuted;
  if (isMuted) player.mute(); else player.unMute();
  updateMuteUI();
  showToast(isMuted ? 'Muted' : 'Unmuted', 1500);
}

function updateMuteUI() {
  const volumeIcon = els.muteBtn.querySelector('.icon-volume');
  const mutedIcon = els.muteBtn.querySelector('.icon-muted');
  if (isMuted) {
    volumeIcon.style.display = 'none';
    mutedIcon.style.display = 'block';
  } else {
    volumeIcon.style.display = 'block';
    mutedIcon.style.display = 'none';
  }
}

// Set volume
function setVolume(volume) {
  if (!playerReady) return;
  const vol = Math.round(volume * 100);
  player.setVolume(vol);
  if (vol > 0 && isMuted) {
    isMuted = false;
    updateMuteUI();
  } else if (vol === 0 && !isMuted) {
    isMuted = true;
    updateMuteUI();
  }
}

// Toggle shuffle
function toggleShuffle() {
  isShuffled = !isShuffled;
  els.shuffleBtn.classList.toggle('active', isShuffled);
  updateUpNext();
  showToast(isShuffled ? 'Shuffle on' : 'Shuffle off', 1500);
}

// Toggle video
function toggleVideo() {
  showVideo = !showVideo;
  els.videoBtn.classList.toggle('active', showVideo);
  // Note: YouTube IFrame API doesn't easily support toggling video/audio only
  // This would require reloading the player or using a different approach
  showToast(showVideo ? 'Video mode' : 'Audio only', 1500);
}

// Open YouTube
function openYouTube() {
  const song = SONG_LIST[currentIndex];
  if (song?.youtubeIds?.[0]) {
    window.open(`https://www.youtube.com/watch?v=${song.youtubeIds[0]}`, '_blank', 'noopener,noreferrer');
  }
}

// Open Spotify
function openSpotify() {
  const song = SONG_LIST[currentIndex];
  if (song) {
    const query = encodeURIComponent(`${song.title} ${song.artist}`);
    window.open(`https://open.spotify.com/search/${query}`, '_blank', 'noopener,noreferrer');
  }
}

// Share track
async function shareTrack() {
  const song = SONG_LIST[currentIndex];
  if (!song) return;
  
  const url = `https://www.youtube.com/watch?v=${song.youtubeIds[0]}`;
  const title = `${song.title} — ${song.artist}`;
  
  if (navigator.share) {
    try {
      await navigator.share({ title, text: title, url });
    } catch (e) {
      if (e.name !== 'AbortError') copyToClipboard(url);
    }
  } else {
    copyToClipboard(url);
  }
  showToast('Link copied!', 1500);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {
    // Fallback
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  });
}

// Sleep timer
function showSleepOptions() {
  const options = [
    { label: '15 min', ms: 15 * 60 * 1000 },
    { label: '30 min', ms: 30 * 60 * 1000 },
    { label: '60 min', ms: 60 * 60 * 1000 },
    { label: 'Off', ms: 0 },
  ];
  
  // Simple implementation - cycle through
  const currentSleep = sleepTimer ? sleepTimer.label : null;
  const currentIndex = options.findIndex(o => o.label === currentSleep);
  const nextIndex = (currentIndex + 1) % options.length;
  const next = options[nextIndex];
  
  if (sleepTimeout) clearTimeout(sleepTimeout);
  sleepTimer = next.ms > 0 ? next : null;
  
  if (sleepTimer) {
    sleepTimeout = setTimeout(() => {
      if (isPlaying) togglePlay();
      showToast('Sleep timer: paused playback');
      sleepTimer = null;
    }, sleepTimer.ms);
    showToast(`Sleep timer: ${sleepTimer.label}`);
  } else {
    showToast('Sleep timer: off');
  }
}

// Playlist panel
function openPlaylist() {
  els.playlistPanel.hidden = false;
  requestAnimationFrame(() => els.playlistPanel.classList.add('open'));
  els.panelList.scrollTop = currentIndex * 72; // Approximate scroll to current
}

function closePlaylist() {
  els.playlistPanel.classList.remove('open');
  setTimeout(() => { els.playlistPanel.hidden = true; }, 400);
}

// YouTube API Ready
function onYouTubeIframeAPIReady() {
  player = new YT.Player('ytPlayer', {
    height: '1',
    width: '1',
    videoId: '',
    playerVars: {
      autoplay: 0,
      controls: 0,
      rel: 0,
      playsinline: 1,
      modestbranding: 1,
      iv_load_policy: 3,
      disablekb: 1,
      fs: 0,
      cc_load_policy: 0,
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onPlayerError,
      onPlaybackQualityChange: onQualityChange,
    }
  });
}

function onPlayerReady() {
  playerReady = true;
  player.setVolume(70);
  // Load first song
  if (SONG_LIST[0]?.youtubeIds?.[0]) {
    player.cueVideoById({ videoId: SONG_LIST[0].youtubeIds[0], startSeconds: 0 });
  }
}

function onPlayerStateChange(event) {
  const state = event.data;
  
  switch (state) {
    case YT.PlayerState.PLAYING:
      isPlaying = true;
      updatePlayUI(true);
      startProgressTimer();
      els.playerArtwork.classList.add('playing');
      break;
      
    case YT.PlayerState.PAUSED:
      isPlaying = false;
      updatePlayUI(false);
      stopProgressTimer();
      els.playerArtwork.classList.remove('playing');
      break;
      
    case YT.PlayerState.ENDED:
      isPlaying = false;
      updatePlayUI(false);
      stopProgressTimer();
      els.playerArtwork.classList.remove('playing');
      playNext();
      break;
      
    case YT.PlayerState.BUFFERING:
      // Could show loading state
      break;
      
    case YT.PlayerState.CUED:
      updateTimeDisplay(0, player.getDuration() || 0);
      break;
  }
}

function onPlayerError(event) {
  console.error('YT Player Error:', event.data);
  const messages = {
    2: 'Invalid video ID',
    5: 'HTML5 player error',
    100: 'Video not found',
    101: 'Embedding not allowed',
    150: 'Embedding not allowed',
  };
  showToast(messages[event.data] || 'Playback error', 4000);
  // Try next song on error
  setTimeout(() => playNext(), 1500);
}

function onQualityChange(event) {
  // Quality changed
}

function updatePlayUI(playing) {
  const playIcons = document.querySelectorAll('.icon-play');
  const pauseIcons = document.querySelectorAll('.icon-pause');
  
  playIcons.forEach(icon => icon.style.display = playing ? 'none' : 'block');
  pauseIcons.forEach(icon => icon.style.display = playing ? 'block' : 'none');
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Handle page unload
window.addEventListener('beforeunload', () => {
  if (playerReady && player) {
    try { player.destroy(); } catch (e) {}
  }
  if (progressTimer) clearInterval(progressTimer);
  if (sleepTimeout) clearTimeout(sleepTimeout);
});