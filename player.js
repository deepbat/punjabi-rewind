const SONG_LIST=window.SONGS||[];
let currentIndex=0, player=null, playerReady=false, isMuted=false, timer=null, idAttempt=0;
let activeFilter='all', searchTerm='';
let currentSource='youtube'; // youtube | spotify
let autoAdvance=false, autoTimer=null;
const AUTO_INTERVAL_MS=9000;
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
  setFavorites(next);renderSongGrid();updateSaveButton();showToast(next.includes(index)?'Saved ★':'Removed from saved tracks');
}

function getFilteredSongs(){
  const q=searchTerm.trim().toLowerCase();
  return SONG_LIST.map((song,index)=>({song,index})).filter(({song,index})=>{
    const matchesFilter=activeFilter==='all'||(activeFilter==='favorites'?isFavorite(index):song.lang===activeFilter);
    const haystack=`${song.title} ${song.artist} ${song.year}`.toLowerCase();
    return matchesFilter&&(!q||haystack.includes(q));
  });
}

/* ---------------- accent hue: every track gets its own color along the wheel ---------------- */
function accentForIndex(i){
  const hue=Math.round((i/Math.max(SONG_LIST.length,1))*360);
  return `hsl(${hue} 78% 44%)`;
}
window.__setAccentFromStation=function(stationIndex){
  if(stationIndex===null||stationIndex===undefined){document.documentElement.style.setProperty('--accent',accentForIndex(currentIndex));return}
  const hue=Math.round((stationIndex/4)*360)+180;
  document.documentElement.style.setProperty('--accent',`hsl(${hue%360} 70% 48%)`);
};

document.addEventListener('DOMContentLoaded',()=>{
  renderSongGrid();
  $('pageTotal').textContent=String(SONG_LIST.length).padStart(2,'0');
  $('billTitle').onclick=togglePlay;
  $('playToggle').onclick=togglePlay;
  $('prevBtn').onclick=()=>{stopAuto();previous()};
  $('nextBtn').onclick=()=>{stopAuto();next()};
  $('browseBtn').onclick=openPanel;
  $('closeVault').onclick=closePanel;
  $('youtubeBtn').onclick=openYoutube;
  $('spotifyBtn').onclick=()=>openSpotify(false);
  $('spotifyClose')?.addEventListener('click',()=>switchToYouTube(false));
  $('invidiousClose')?.addEventListener('click',()=>{hideInvidious(); switchToYouTube(false); showToast('Proxy closed — back to YouTube');});
  $('saveBtn').onclick=()=>toggleFavorite(currentIndex);
  $('shareBtn').onclick=shareCurrent;
  $('muteBtn').onclick=toggleMute;
  $('homeLink').onclick=()=>{closePanel();stopAuto()};
  $('autoBtn').onclick=toggleAuto;
  $('songSearch')?.addEventListener('input',e=>{searchTerm=e.target.value;renderSongGrid()});
  $('clearSearch')?.addEventListener('click',()=>{$('songSearch').value='';searchTerm='';renderSongGrid();$('songSearch').focus()});
  $('shuffleBtn')?.addEventListener('click',shuffleFiltered);
  document.querySelectorAll('.filter-btn').forEach(button=>button.addEventListener('click',()=>{
    activeFilter=button.dataset.filter||'all';
    document.querySelectorAll('.filter-btn').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
    renderSongGrid();
  }));
  initProgressSeek();
  initWheelNav();
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){if($('vaultPanel')?.classList.contains('open'))closePanel();return}
    if(e.target.matches('input,button'))return;
    if(e.code==='Space'){e.preventDefault();togglePlay()}
    if(e.code==='ArrowRight'){stopAuto();next()}
    if(e.code==='ArrowLeft'){stopAuto();previous()}
  });
});

function beatMsFor(i){const bpm=84+((i*7)%22);return Math.round(60000/bpm)}

/* ---------------- wheel navigation (page itself never scrolls; wheel = next/prev track) ---------------- */
function initWheelNav(){
  let locked=false;
  document.querySelector('.stage')?.addEventListener('wheel',e=>{
    if(locked)return;
    if($('vaultPanel')?.classList.contains('open'))return;
    locked=true;
    stopAuto();
    if(e.deltaY>0)next();else if(e.deltaY<0)previous();
    setTimeout(()=>{locked=false},420);
  },{passive:true});
}

function toggleAuto(){
  autoAdvance=!autoAdvance;
  $('autoBtn').setAttribute('aria-pressed',String(autoAdvance));
  if(autoAdvance){
    if(!(window.__nowPlaying&&window.__nowPlaying().playing))playCurrent(true);
    scheduleAuto();
    showToast('Auto-advance on — sit back');
  }else{
    stopAuto();
  }
}
function scheduleAuto(){
  clearTimeout(autoTimer);
  if(!autoAdvance)return;
  autoTimer=setTimeout(()=>{ if(autoAdvance){ next(); scheduleAuto(); } },AUTO_INTERVAL_MS);
}
function stopAuto(){
  autoAdvance=false;
  clearTimeout(autoTimer);
  $('autoBtn')?.setAttribute('aria-pressed','false');
}

function selectSong(i,autoplay=false,direction=0){
  if(!SONG_LIST[i])return;
  currentIndex=i;idAttempt=0;
  const s=SONG_LIST[i];
  $('currentTime').textContent='0:00';$('duration').textContent='0:00';$('progressBar').style.width='0%';
  updateProgressAccessibility(0,0);
  document.documentElement.style.setProperty('--accent',accentForIndex(i));
  swapTitle(s,direction);
  $('pageNum').textContent=String(i+1).padStart(2,'0');
  updateSaveButton();
  highlightActiveCard(i);
  hideSpotify(false); hideInvidious();
  currentSource='youtube';
  if(playerReady)loadExactSource(autoplay);
}

function swapTitle(s,direction){
  const el=$('billTitle');
  el.classList.add('swap');
  setTimeout(()=>{
    el.textContent=s.title;
    $('billArtist').innerHTML=`${esc(s.artist)} · ${s.year}<span class="lang-tag">${s.lang==='hindi'?'Hindi':'Punjabi'}</span>`;
    el.classList.remove('swap');
  },160);
}
function updateSaveButton(){
  const saved=isFavorite(currentIndex);
  const btn=$('saveBtn');
  btn.textContent=saved?'Saved ★':'Save ☆';
  btn.setAttribute('aria-pressed',String(saved));
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
function showInvidious(song, videoId){
  const wrap=$('invidiousWrap'), frame=$('invidiousPlayer');
  if(!wrap||!frame||!song||!videoId) return false;
  const host='https://yewtu.be';
  frame.src=`${host}/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&modestbranding=1`;
  wrap.hidden=false;
  positionEmbedPanel(wrap);
  const spWrap=$('spotifyPlayerWrap'); if(spWrap){spWrap.hidden=true;}
  currentSource='youtube';
  setPlayingState(true);
  showToast('YouTube blocked — proxied via Invidious ✦ tap × to close');
  $('currentTime').textContent='Proxy';
  $('duration').textContent='—';
  $('progressBar').style.width='100%';
  return true;
}
function hideInvidious(){
  const wrap=$('invidiousWrap'), frame=$('invidiousPlayer');
  if(wrap){wrap.hidden=true;}
  if(frame) frame.src='about:blank';
}
// Keeps the floating embed panel clear of the transport bar regardless of how
// tall it actually renders (it can wrap onto two lines on narrow screens).
function positionEmbedPanel(el){
  const bar=$('playerBar')||document.querySelector('.hud-bottom');
  const h=bar?bar.getBoundingClientRect().height:78;
  el.style.bottom=(h+16)+'px';
}
function showSpotify(song){
  const wrap=$('spotifyPlayerWrap'), frame=$('spotifyPlayer');
  if(!wrap||!frame||!song) return;
  const url=spotifyEmbedUrl(song);
  if(!url){ showNoStreamFallback(song); return; }
  frame.src=url;
  frame.height='152';
  wrap.hidden=false;
  positionEmbedPanel(wrap);
  currentSource='spotify';
  setPlayingState(false);
  showToast('YouTube blocked — switched to Spotify ✦');
  $('currentTime').textContent='Spotify';
  $('duration').textContent='—';
  $('progressBar').style.width='100%';
}
let noStreamSkipTimer=null;
function showNoStreamFallback(song){
  currentSource='youtube';
  hideSpotify(false);
  setPlayingState(false);
  showToast("No working stream for this track — open it manually below, or it'll skip in a few seconds");
  $('currentTime').textContent='—';
  $('duration').textContent='—';
  $('progressBar').style.width='0%';
  clearTimeout(noStreamSkipTimer);
  noStreamSkipTimer=setTimeout(()=>{
    const nextIdx=(currentIndex+1)%SONG_LIST.length;
    if(nextIdx!==currentIndex) selectSong(nextIdx,true,1);
  },5000);
}
function hideSpotify(restoreYouTube){
  const wrap=$('spotifyPlayerWrap'), frame=$('spotifyPlayer');
  if(wrap){ wrap.hidden=true; }
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
  clearTimeout(noStreamSkipTimer);
  hideSpotify(true);
  setPlayingState(false);
  $('currentTime').textContent='0:00';$('duration').textContent='0:00';$('progressBar').style.width='0%';
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
  if(!playerReady){showToast('Player is still tuning in — try again in a moment');return}
  const state=player.getPlayerState();
  if(state===YT.PlayerState.PLAYING)player.pauseVideo();else playCurrent(true);
}
function previous(){selectSong((currentIndex-1+SONG_LIST.length)%SONG_LIST.length,true,-1)}
function next(){selectSong((currentIndex+1)%SONG_LIST.length,true,1)}
function shuffleFiltered(){
  const pool=getFilteredSongs();if(!pool.length){showToast('No tracks to shuffle in this view');return}
  const pick=pool[Math.floor(Math.random()*pool.length)];selectSong(pick.index,true);closePanel();
}
function shareCurrent(){
  const s=SONG_LIST[currentIndex];
  const text=`${s.title} — ${s.artist} (${s.year}) · Punjabi Wave`;
  if(navigator.share){navigator.share({title:s.title,text}).catch(()=>{});return}
  if(navigator.clipboard){navigator.clipboard.writeText(text).then(()=>showToast('Copied to clipboard ✦')).catch(()=>showToast(text));return}
  showToast(text);
}

let ytErrorSkipTimer=null;
function onYouTubeIframeAPIReady(){
  const origin = (location.origin && location.origin !== 'null') ? location.origin : undefined;
  const host = 'https://www.youtube.com';
  player=new YT.Player('player',{height:'1',width:'1',videoId:'',host,playerVars:{autoplay:0,controls:0,rel:0,playsinline:1,modestbranding:1,enablejsapi:1,origin,widget_referrer:origin},events:{
    onReady:()=>{playerReady=true;if(SONG_LIST.length)selectSong(0,false)},
    onError:e=>{
      const ids=SONG_LIST[currentIndex]?.youtubeIds||[];
      if(idAttempt<ids.length-1){idAttempt++;showToast('YouTube alt source…');loadExactSource(true);return}
      const blocked=e&&(e.data===101||e.data===150);
      const s=SONG_LIST[currentIndex];
      const vid=SONG_LIST[currentIndex]?.youtubeIds?.[idAttempt]||SONG_LIST[currentIndex]?.youtubeIds?.[0];
      if(blocked && vid && showInvidious(s, vid)){ return; }
      if(s){
        showToast(blocked?'YouTube blocked — switching to Spotify…':'Source blocked — switching to Spotify…');
        switchToSpotify(true);
        return;
      }
      const msg=blocked?"Can't embed here — opening YouTube…":'YouTube blocked this embed — skipping…';
      showToast(msg);
      clearTimeout(ytErrorSkipTimer);
      ytErrorSkipTimer=setTimeout(()=>{
        const nextIdx=(currentIndex+1)%SONG_LIST.length;
        if(nextIdx!==currentIndex){ showToast('Next track → '+(SONG_LIST[nextIdx]?.title||'')); selectSong(nextIdx,true,1); }
      },1600);
    },
    onStateChange:e=>{
      if(e.data===YT.PlayerState.PLAYING){setPlayingState(true);startTimer()}
      else if(e.data===YT.PlayerState.PAUSED){setPlayingState(false);stopTimer()}
      else if(e.data===YT.PlayerState.ENDED){setPlayingState(false);stopTimer();if(autoAdvance){next();scheduleAuto()}else next()}
    }
  }});
}
function setPlayingState(playing){
  $('playToggle').textContent=playing?'Ⅱ Pause':'▶ Play';
  $('playToggle').setAttribute('aria-label',playing?'Pause':'Play');
  document.getElementById('stage').classList.toggle('playing',playing);
}

window.onSpotifyIframeApiReady = ()=>{};

window.__pauseSongPlayback=function(){if(currentSource==='spotify')return; if(playerReady&&player&&player.getPlayerState&&player.getPlayerState()===YT.PlayerState.PLAYING)player.pauseVideo()};
window.__nowPlaying=function(){
  if(currentSource==='spotify'){
    const s=SONG_LIST[currentIndex]||{};
    return{title:s.title||"Punjabi Wave",artist:s.artist||'',year:s.year||'',index:currentIndex,playing:false,time:0,duration:0,beatMs:beatMsFor(currentIndex),source:'spotify'};
  }
  const s=SONG_LIST[currentIndex]||{};const playing=playerReady&&player&&player.getPlayerState&&player.getPlayerState()===YT.PlayerState.PLAYING;
  const t=playerReady&&player&&player.getCurrentTime?player.getCurrentTime():0,d=playerReady&&player&&player.getDuration?player.getDuration():0;
  return{title:s.title||"Punjabi Wave",artist:s.artist||'',year:s.year||'',index:currentIndex,playing:!!playing,time:t,duration:d,beatMs:beatMsFor(currentIndex),source:'youtube'};
};

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
    const saved=isFavorite(index);
    return `<button class="song-card${index===currentIndex?' active':''}" data-index="${index}" data-i="${index}" type="button"><span class="num">${String(index+1).padStart(2,'0')}</span><span class="song-title">${esc(song.title)}</span><span class="song-meta"><span class="lang-dot" style="opacity:${song.lang==='hindi'?1:.4}"></span>${esc(song.artist)} · ${song.year}</span><span class="song-actions"><span class="save-btn${saved?' saved':''}" data-save="${index}" role="img" aria-label="${saved?'Saved':'Not saved'}">${saved?'★':'☆'}</span></span></button>`
  }).join('');
  if(empty)empty.hidden=matches.length>0;
  if($('vaultCount'))$('vaultCount').textContent=`${matches.length} ${matches.length===1?'track':'tracks'}`;
  grid.querySelectorAll('.song-card').forEach(card=>card.addEventListener('click',e=>{
    if(e.target.closest('.save-btn')){toggleFavorite(Number(e.target.closest('.save-btn').dataset.save));return}
    selectSong(Number(card.dataset.i),true);closePanel();
  }));
}
function openPanel(){
  $('vaultPanel').classList.add('open');$('vaultPanel').setAttribute('aria-hidden','false');
  setTimeout(()=>$('songSearch')?.focus(),200);
}
function closePanel(){
  $('vaultPanel')?.classList.remove('open');$('vaultPanel')?.setAttribute('aria-hidden','true');
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
function toggleMute(){
  if(currentSource==='spotify'){showToast('Spotify volume — use the Spotify card slider');return}
  if(!playerReady){showToast('Select a song first to control sound');return}
  isMuted=!isMuted;if(isMuted)player.mute();else player.unMute();$('muteBtn').textContent=isMuted?'Muted':'Sound';$('muteBtn').setAttribute('aria-pressed',String(isMuted))}
function showToast(message){const toast=$('toast');if(!toast)return;toast.textContent=message;toast.classList.add('show');clearTimeout(toast._timer);toast._timer=setTimeout(()=>toast.classList.remove('show'),2600)}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
window.addEventListener('resize',()=>{
  const inv=$('invidiousWrap'), sp=$('spotifyPlayerWrap');
  if(inv && !inv.hidden) positionEmbedPanel(inv);
  if(sp && !sp.hidden) positionEmbedPanel(sp);
});
