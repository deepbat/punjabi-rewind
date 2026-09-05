const SONG_LIST=window.SONGS||[];
let currentIndex=0, player=null, playerReady=false, isMuted=false, timer=null, idAttempt=0;
let activeFilter='all', searchTerm='';
let currentSource='youtube'; // youtube | spotify | radio
let youtubeUnavailable=false;
const YOUTUBE_READY_TIMEOUT_MS=8000;
let readyTimer=null;
const audioFallback=$( 'audioFallback');
function setYoutubeUnavailable(){
  if(youtubeUnavailable) return;
  youtubeUnavailable=true;
  clearTimeout(readyTimer);
  showToast('YouTube didn\'t come through — tracks will open in a new tab, or tap Radio for live Punjabi streams');
  $('playBtn').textContent='▶';
  $('playBtn').setAttribute('aria-label','Open this track on YouTube');
  $('transportGlass').classList.add('youtube-down');
}
const FAVORITES_KEY='pr_favorites';
const $=id=>document.getElementById(id);

function getFavorites(){
  try{return JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]').map(Number).filter(Number.isFinite)}catch(e){return[]}
}
function setFavorites(list){try{localStorage.setItem(FAVORITES_KEY,JSON.stringify([...new Set(list)]))}catch(e){}}
function isFavorite(index){return getFavorites().includes(index)}
function toggleFavorite(index){
  const favorites=getFavorites();
  const next=favorites.includes(index)?favorites.filter(i=>i!==index):[...favorites,index];
  setFavorites(next);renderSongGrid();showToast(next.includes(index)?'Saved ★':'Removed from saved tracks');
}

function getFilteredSongs(){
  const q=searchTerm.trim().toLowerCase();
  return SONG_LIST.map((song,index)=>({song,index})).filter(({song,index})=>{
    const matchesFilter=activeFilter==='all'||(activeFilter==='favorites'?isFavorite(index):song.lang===activeFilter);
    const haystack=`${song.title} ${song.artist} ${song.year}`.toLowerCase();
    return matchesFilter&&(!q||haystack.includes(q));
  });
}

document.addEventListener('DOMContentLoaded',()=>{
  renderSongGrid();
  $('playBtn').onclick=togglePlay;
  $('prevBtn').onclick=previous;
  $('nextBtn').onclick=next;
  $('browseBtn').onclick=openPanel;
  $('closeVault').onclick=closePanel;
  $('vaultScrim')?.addEventListener('click',closePanel);
  $('youtubeBtn').onclick=openYoutube;
  $('spotifyBtn').onclick=()=>openSpotify(false);
  $('shareBtn')?.addEventListener('click',shareCurrent);
  $('spotifyClose')?.addEventListener('click',()=>switchToYouTube(false));
  $('invidiousClose')?.addEventListener('click',()=>{hideInvidious(); switchToYouTube(false); showToast('Proxy closed — back to YouTube');});
  $('muteBtn').onclick=toggleMute;
  $('homeLink').onclick=()=>{closePanel();if(window.__recenterView)window.__recenterView();};
  $('liveModeBtn').onclick=toggleAutopilot;
  $('songSearch')?.addEventListener('input',e=>{searchTerm=e.target.value;renderSongGrid()});
  $('clearSearch')?.addEventListener('click',()=>{$('songSearch').value='';searchTerm='';renderSongGrid();$('songSearch').focus()});
  $('shuffleBtn')?.addEventListener('click',shuffleFiltered);
  $('radioFromPlayerBtn')?.addEventListener('click',()=>{ if(window.__playRadioStation) window.__playRadioStation(0); else showToast('Radio isn\'t available right now'); });
  document.querySelectorAll('.filter-btn').forEach(button=>button.addEventListener('click',()=>{
    activeFilter=button.dataset.filter||'all';
    document.querySelectorAll('.filter-btn').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
    renderSongGrid();
  }));
  initProgressSeek();
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){closeTopOverlay();return}
    if(e.target.matches('input,button'))return;
    if(e.code==='Space'){e.preventDefault();togglePlay()}
    if(e.code==='ArrowRight')next();
    if(e.code==='ArrowLeft')previous();
  });
  // Hand the radio engine a shared <audio> element so radio (and any future
  // in-page audio) runs through one engine, and the hidden fallback element
  // is genuinely used.
  setTimeout(()=>{ if(window.__setRadioAudioTarget) window.__setRadioAudioTarget(audioFallback); },0);
});

function beatMsFor(i){const bpm=84+((i*7)%22);return Math.round(60000/bpm)}

function toggleAutopilot(){
  const btn=$('liveModeBtn');
  const on=btn.getAttribute('aria-pressed')==='true';
  if(on){window.__exitAutopilot&&window.__exitAutopilot();btn.setAttribute('aria-pressed','false')}
  else{window.__enterAutopilot&&window.__enterAutopilot();btn.setAttribute('aria-pressed','true');if(!(window.__nowPlaying&&window.__nowPlaying().playing))playCurrent(true)}
}

function selectSong(i,autoplay=false){
  if(!SONG_LIST[i])return;
  currentIndex=i;idAttempt=0;
  clearTimeout(noStreamSkipTimer); clearTimeout(ytErrorSkipTimer);
  const s=SONG_LIST[i];
  $('currentTime').textContent='0:00';$('duration').textContent='0:00';$('progressBar').style.width='0%';
  updateProgressAccessibility(0,0);updateBill(s,false);highlightActiveCard(i);
  hideSpotify(false); hideInvidious();
  currentSource='youtube';
  if(playerReady)loadExactSource(autoplay);
  else  if(youtubeUnavailable){$('transportGlass').classList.add('youtube-down');updateBill(s,true);$('playBtn').textContent='▶';$('playBtn').setAttribute('aria-label','Open '+s.title+' on YouTube');$('billArtist').textContent=(s.artist+' · '+s.year)+' — YouTube unavailable, tap the Radio button or YT to hear this track';}
  else $('transportGlass').classList.remove('youtube-down');
}
window.selectSong=selectSong;

function updateBill(s,playing){
  $('billTitle').textContent=s.title;
  $('billArtist').textContent=`${s.artist} · ${s.year}`;
}
function highlightActiveCard(i){document.querySelectorAll('.song-card').forEach(c=>c.classList.toggle('active',Number(c.dataset.index)===i))}

// ── Hybrid sources: YouTube first, Invidious proxy if embed-blocked, Spotify only when a real track id exists ──
// Spotify has no public "search" embed endpoint — a URL like /embed/search/... renders
// blank inside an iframe. So we only ever embed Spotify when a verified spotifyId is
// present on the song; otherwise we tell the person plainly and move on.
function spotifyEmbedUrl(song){
  if(!song) return null;
  if(song.spotifyId && /^[A-Za-z0-9]{22}$/.test(song.spotifyId)){
    return `https://open.spotify.com/embed/track/${song.spotifyId}?utm_source=generator&theme=0`;
  }
  return null;
}
const INVIDIOUS_HOSTS=['https://yewtu.be','https://invidious.perennialte.ch','https://iv.melmac.space'];
let invidiousHostIdx=0;
function showInvidious(song, videoId){
  const wrap=$('invidiousWrap'), frame=$('invidiousPlayer');
  if(!wrap||!frame||!song||!videoId) return false;
  const host=INVIDIOUS_HOSTS[invidiousHostIdx % INVIDIOUS_HOSTS.length];
  frame.src=`${host}/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&modestbranding=1`;
  wrap.hidden=false;
  wrap.setAttribute('aria-hidden','false');
  const spWrap=$('spotifyPlayerWrap'); if(spWrap){spWrap.hidden=true; spWrap.setAttribute('aria-hidden','true');}
  currentSource='youtube';
  showToast('YouTube blocked — proxied via Invidious ✦ tap × to close');
  $('billTitle').textContent=song.title + ' — Proxy';
  $('playBtn').textContent='Ⅱ';
  $('currentTime').textContent='Proxy';
  $('duration').textContent='—';
  $('progressBar').style.width='100%';
  return true;
}
function hideInvidious(){
  const wrap=$('invidiousWrap'), frame=$('invidiousPlayer');
  if(wrap){wrap.hidden=true; wrap.setAttribute('aria-hidden','true');}
  if(frame) frame.src='about:blank';
}
function showSpotify(song){
  const wrap=$('spotifyPlayerWrap'), frame=$('spotifyPlayer');
  if(!wrap||!frame||!song) return;
  const url=spotifyEmbedUrl(song);
  if(!url){ showNoStreamFallback(song); return; }
  frame.src=url;
  frame.height='152';
  wrap.hidden=false;
  wrap.setAttribute('aria-hidden','false');
  hideInvidious();
  currentSource='spotify';
  showToast('YouTube blocked — switched to Spotify ✦');
  $('billTitle').textContent=song.title + ' — Spotify';
  $('playBtn').textContent='▶';
  $('currentTime').textContent='Spotify';
  $('duration').textContent='—';
  $('progressBar').style.width='100%';
}
let noStreamSkipTimer=null;
function showNoStreamFallback(song){
  currentSource='youtube';
  hideSpotify(false); hideInvidious();
  const ytId=song?.youtubeIds?.[0];
  showToast(ytId ? "No auto stream — tap YT to open on YouTube, skipping in 5s" : "No working stream for this track — skipping in 5s");
  $('billTitle').textContent=song.title + ' — no auto stream';
  $('playBtn').textContent='▶';
  $('currentTime').textContent='—';
  $('duration').textContent='—';
  $('progressBar').style.width='0%';
  clearTimeout(noStreamSkipTimer);
  noStreamSkipTimer=setTimeout(()=>{
    const nextIdx=(currentIndex+1)%SONG_LIST.length;
    if(nextIdx!==currentIndex) selectSong(nextIdx,true);
  },5000);
}
function hideSpotify(restoreYouTube){
  const wrap=$('spotifyPlayerWrap'), frame=$('spotifyPlayer');
  if(wrap){ wrap.hidden=true; wrap.setAttribute('aria-hidden','true'); }
  if(frame) frame.src='about:blank';
  if(restoreYouTube) currentSource='youtube';
  hideInvidious();
}
function switchToSpotify(autoplay){
  const s=SONG_LIST[currentIndex];
  if(!s) return;
  try{ if(playerReady&&player&&player.pauseVideo) player.pauseVideo(); }catch(e){}
  stopTimer();
  showSpotify(s);
}
function switchToYouTube(autoplay){
  clearTimeout(noStreamSkipTimer); clearTimeout(ytErrorSkipTimer);
  hideSpotify(true);
  const s=SONG_LIST[currentIndex];
  if(s) updateBill(s,false);
  $('currentTime').textContent='0:00';$('duration').textContent='0:00';$('progressBar').style.width='0%';
  updateProgressAccessibility(0,0);
  if(autoplay) playCurrent(true);
  else if(playerReady) loadExactSource(false);
}

function loadExactSource(autoplay){
  if(currentSource==='spotify') return;
  const ids=SONG_LIST[currentIndex]?.youtubeIds||[],id=ids[idAttempt];
  if(!id){switchToSpotify(autoplay); return}
  try{player.loadVideoById({videoId:id,startSeconds:0});if(!autoplay)player.pauseVideo()}catch(e){switchToSpotify(autoplay)}
}
function playCurrent(autoplay){
  if(currentSource==='spotify'){
    const s=SONG_LIST[currentIndex];
    if(!$('spotifyPlayerWrap')||$('spotifyPlayerWrap').hidden) showSpotify(s);
    showToast('Playing on Spotify — press play inside the Spotify card ✦');
    return;
  }
  if(!playerReady){showToast('Player is still tuning in — try again in a moment');return}
  if(window.__pauseRadio)window.__pauseRadio();
  hideSpotify(false);
  const id=SONG_LIST[currentIndex]?.youtubeIds?.[idAttempt];if(!id){switchToSpotify(true);return}
  try{player.loadVideoById({videoId:id,startSeconds:0});if(autoplay)player.playVideo()}catch(e){switchToSpotify(true)}
}
function togglePlay(){
  if(currentSource==='spotify'){
    showToast('Use the Spotify card to play/pause — Spotify needs a tap inside its player');
    return;
  }
  if(youtubeUnavailable){
    const s=SONG_LIST[currentIndex];
    if(s) window.open('https://www.youtube.com/watch?v='+encodeURIComponent(s.youtubeIds?.[idAttempt]||s.youtubeIds?.[0]||''),'_blank','noopener');
    else showToast('Select a track first');
    return;
  }
  if(!playerReady){showToast('Player is still tuning in — try again in a moment');return}
  const state=player.getPlayerState();
  if(state===YT.PlayerState.PLAYING)player.pauseVideo();else playCurrent(true);
}
function previous(){selectSongAndFocus((currentIndex-1+SONG_LIST.length)%SONG_LIST.length)}
function next(){selectSongAndFocus((currentIndex+1)%SONG_LIST.length)}
function selectSongAndFocus(i){selectSong(i,true);window.__focusMarker&&window.__focusMarker(i)}
function shuffleFiltered(){
  const pool=getFilteredSongs();if(!pool.length){showToast('No tracks to shuffle in this view');return}
  const pick=pool[Math.floor(Math.random()*pool.length)];selectSongAndFocus(pick.index);closePanel();
}

let ytErrorSkipTimer=null;
function onYouTubeIframeAPIReady(){
  const origin = (location.origin && location.origin !== 'null') ? location.origin : undefined;
  const host = 'https://www.youtube.com';
  player=new YT.Player('player',{height:'1',width:'1',videoId:'',host,playerVars:{autoplay:0,controls:0,rel:0,playsinline:1,modestbranding:1,enablejsapi:1,origin,widget_referrer:origin},events:{
    onReady:()=>{clearTimeout(readyTimer);playerReady=true;if(SONG_LIST.length)selectSong(0,false);},
    onError:e=>{
      const ids=SONG_LIST[currentIndex]?.youtubeIds||[];
      if(idAttempt<ids.length-1){idAttempt++;showToast('YouTube alt source…');loadExactSource(true);return}
      const blocked=e&&(e.data===101||e.data===150);
      const s=SONG_LIST[currentIndex];
      const vid=SONG_LIST[currentIndex]?.youtubeIds?.[idAttempt]||SONG_LIST[currentIndex]?.youtubeIds?.[0];
      if(blocked && vid){
        const wasHidden=$('invidiousWrap')?.hidden;
        if(wasHidden && showInvidious(s, vid)) return;
        if(!wasHidden && invidiousHostIdx < INVIDIOUS_HOSTS.length-1){
          invidiousHostIdx++; showToast('Proxy failed — trying alternate…');
          if(showInvidious(s, vid)) return;
        }
      }
      if(s){
        // Only switch to Spotify if a real embed exists, otherwise show fallback with YT link
        if(spotifyEmbedUrl(s)){
          showToast(blocked?'YouTube blocked — switching to Spotify…':'Source blocked — switching to Spotify…');
          switchToSpotify(true);
        } else {
          showNoStreamFallback(s);
        }
        return;
      }
      const msg=blocked?"Can't embed here — opening YouTube…":'YouTube blocked this embed — skipping…';
      showToast(msg);
      clearTimeout(ytErrorSkipTimer);
      ytErrorSkipTimer=setTimeout(()=>{
        const nextIdx=(currentIndex+1)%SONG_LIST.length;
        if(nextIdx!==currentIndex){ showToast('Next track → '+(SONG_LIST[nextIdx]?.title||'')); selectSongAndFocus(nextIdx); }
      },1600);
    },
    onStateChange:e=>{
      const s=SONG_LIST[currentIndex];
      if(e.data===YT.PlayerState.PLAYING){$('playBtn').textContent='Ⅱ';$('playBtn').setAttribute('aria-label','Pause selected song');if(s)updateBill(s,true);startTimer()}
      else if(e.data===YT.PlayerState.PAUSED){$('playBtn').textContent='▶';$('playBtn').setAttribute('aria-label','Play selected song');if(s)updateBill(s,false);stopTimer()}
      else if(e.data===YT.PlayerState.ENDED){$('playBtn').textContent='▶';stopTimer();next()}
    }
  }});
}

window.onSpotifyIframeApiReady = ()=>{};

// If the YouTube iframe API never fires, don't leave the person stuck on
// "Player is still tuning in" forever — declare it unavailable so the UX
// degrades to "tap YT to open in a new tab" instead.
readyTimer=setTimeout(setYoutubeUnavailable,YOUTUBE_READY_TIMEOUT_MS);

window.__pauseSongPlayback=function(){if(currentSource==='spotify')return; if(playerReady&&player&&player.getPlayerState&&player.getPlayerState()===YT.PlayerState.PLAYING)player.pauseVideo()};
window.__nowPlaying=function(){
  if(currentSource==='spotify'){
    const s=SONG_LIST[currentIndex]||{};
    return{title:s.title||"Punjabi Rewind",artist:s.artist||'',year:s.year||'',index:currentIndex,playing:false,time:0,duration:0,beatMs:beatMsFor(currentIndex),source:'spotify'};
  }
  const s=SONG_LIST[currentIndex]||{};const playing=playerReady&&player&&player.getPlayerState&&player.getPlayerState()===YT.PlayerState.PLAYING;
  const t=playerReady&&player&&player.getCurrentTime?player.getCurrentTime():0,d=playerReady&&player&&player.getDuration?player.getDuration():0;
  return{title:s.title||"Punjabi Rewind",artist:s.artist||'',year:s.year||'',index:currentIndex,playing:!!playing,time:t,duration:d,beatMs:beatMsFor(currentIndex),source:'youtube'};
};
window.__togglePlayback=togglePlay;window.__nextSong=next;window.__prevSong=previous;window.__playCurrentSong=()=>playCurrent(true);

function startTimer(){stopTimer();timer=setInterval(()=>{if(currentSource==='spotify')return;if(!player||!player.getCurrentTime)return;const t=player.getCurrentTime(),d=player.getDuration();$('currentTime').textContent=formatTime(t);$('duration').textContent=formatTime(d);const pct=d?`${Math.min(100,(t/d)*100)}%`:'0%';$('progressBar').style.width=pct;updateProgressAccessibility(t,d)},500)}
function stopTimer(){if(timer){clearInterval(timer);timer=null}}
function formatTime(s){if(!Number.isFinite(s))return'0:00';return`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`}
function updateProgressAccessibility(time,duration){const track=$('progressTrack');if(!track)return;track.setAttribute('aria-valuemax',String(Math.max(0,Math.round(duration||0))));track.setAttribute('aria-valuenow',String(Math.max(0,Math.round(time||0))));}
function initProgressSeek(){
  const track=$('progressTrack');if(!track)return;
  const seek=e=>{if(currentSource==='spotify'){showToast('Seeking only on YouTube — use the Spotify slider');return}if(!playerReady||!player?.getDuration)return;const r=track.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),duration=player.getDuration();player.seekTo(ratio*duration,true)};
  track.addEventListener('click',seek);
  track.addEventListener('keydown',e=>{if(!playerReady||!player?.getCurrentTime)return;const d=player.getDuration()||0,t=player.getCurrentTime()||0;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();player.seekTo(Math.max(0,Math.min(d,t+(e.key==='ArrowRight'?10:-10))),true)}if(e.key==='Home'){e.preventDefault();player.seekTo(0,true)}if(e.key==='End'){e.preventDefault();player.seekTo(d,true)}});
}

function renderSongGrid(){
  const grid=$('songGrid'),empty=$('emptyState'),matches=getFilteredSongs();if(!grid)return;
  grid.innerHTML=matches.map(({song,index})=>{
    const saved=isFavorite(index),hasSpotify=!!song.spotifyId;
    return `<article class="song-card${index===currentIndex?' active':''}" data-index="${index}"><span class="num">${String(index+1).padStart(2,'0')}</span><div class="song-main"><strong>${esc(song.title)}${hasSpotify?' <span style="color:var(--emerald);font-size:9px">● SPOTIFY</span>':''}</strong><small>${song.lang==='hindi'?'<span class="lang-dot hindi" title="Hindi"></span>':'<span class="lang-dot" title="Punjabi"></span>'} ${esc(song.artist)} · ${song.year}</small></div><div class="song-actions"><button class="save-btn${saved?' saved':''}" data-save="${index}" type="button" aria-label="${saved?'Remove':'Save'} ${esc(song.title)}" aria-pressed="${saved}">${saved?'★':'☆'}</button><button class="play-song" data-i="${index}" type="button" aria-label="Play ${esc(song.title)}">▶</button></div></article>`
  }).join('');
  if(empty)empty.hidden=matches.length>0;
  if($('vaultCount'))$('vaultCount').textContent=`${matches.length} ${matches.length===1?'track':'tracks'}`;
  grid.querySelectorAll('.play-song').forEach(button=>button.addEventListener('click',()=>{selectSongAndFocus(Number(button.dataset.i));closePanel()}));
  grid.querySelectorAll('.save-btn').forEach(button=>button.addEventListener('click',()=>toggleFavorite(Number(button.dataset.save))));
}
function openPanel(){
  if(window.__closeStart)window.__closeStart();
  $('vaultPanel').classList.add('open');$('vaultPanel').setAttribute('aria-hidden','false');$('vaultScrim')?.classList.add('open');
  setTimeout(()=>$('songSearch')?.focus(),180);
}
window.__openVault=openPanel;
window.__closeVault=closePanel;
function closePanel(){
  $('vaultPanel')?.classList.remove('open');$('vaultPanel')?.setAttribute('aria-hidden','true');$('vaultScrim')?.classList.remove('open');
}
function closeTopOverlay(){
  // Start menu sits above the vault panel (z-index 900 vs 60), so close the
  // top-most open overlay first. We manipulate the DOM directly here so this
  // works regardless of which script opened the overlay.
  const startMenu=$('startMenu'), startScrim=$('startScrim');
  if(startMenu&&startScrim&&startMenu.getAttribute('aria-hidden')==='false'){
    startMenu.setAttribute('aria-hidden','true'); startScrim.classList.remove('open');
    return;
  }
  if($('vaultPanel')?.classList.contains('open')) closePanel();
}
function openYoutube(){const id=SONG_LIST[currentIndex]?.youtubeIds?.[idAttempt];if(id)window.open(`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,'_blank','noopener')}
function openSpotify(externalOnly){
  const s=SONG_LIST[currentIndex];
  if(!s) return;
  if(s.spotifyId && /^[A-Za-z0-9]{22}$/.test(s.spotifyId)){
    window.open(`https://open.spotify.com/track/${s.spotifyId}`,'_blank','noopener');
  } else {
    window.open(`https://open.spotify.com/search/${encodeURIComponent(`${s.title} ${s.artist}`)}`,'_blank','noopener');
  }
  if(!externalOnly && currentSource==='youtube'){
    const wrap=$('spotifyPlayerWrap');
    if(wrap && wrap.hidden) showSpotify(s);
  }
}
function shareCurrent(){
  const s=SONG_LIST[currentIndex];
  if(!s){showToast('No track selected');return}
  const ytId=s.youtubeIds?.[idAttempt]||s.youtubeIds?.[0];
  const url=ytId ? `https://www.youtube.com/watch?v=${ytId}` : location.href;
  const text=`${s.title} — ${s.artist} (${s.year}) ${url}`;
  if(navigator.share){navigator.share({title:s.title,text:`${s.artist} — ${s.title}`,url}).catch(()=>{}); return}
  if(navigator.clipboard?.writeText){navigator.clipboard.writeText(text).then(()=>showToast('Link copied ✦')).catch(()=>showToast(url)); return}
  window.prompt('Copy link:', text);
}
function toggleMute(){
  if(currentSource==='spotify'){showToast('Spotify volume — use the Spotify card slider');return}
  if(!playerReady){showToast('Select a song first to control sound');return}
  isMuted=!isMuted;if(isMuted)player.mute();else player.unMute();$('muteBtn').textContent=isMuted?'🔇':'🔊';$('muteBtn').setAttribute('aria-pressed',String(isMuted))}
function showToast(message){const toast=$('toast');if(!toast)return;toast.textContent=message;toast.classList.add('show');clearTimeout(toast._timer);toast._timer=setTimeout(()=>toast.classList.remove('show'),2600)}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
