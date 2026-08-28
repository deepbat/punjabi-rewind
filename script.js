const SONG_LIST=window.SONGS||[];
let currentIndex=0, player=null, playerReady=false, isMuted=false, timer=null, idAttempt=0;
let activeFilter='all', searchTerm='';
let currentSource='youtube'; // youtube | spotify
let spotifyController=null;
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
  setFavorites(next);renderSongGrid();showToast(next.includes(index)?'Saved to your wave ★':'Removed from saved tracks');
}

function getFilteredSongs(){
  const q=searchTerm.trim().toLowerCase();
  return SONG_LIST.map((song,index)=>({song,index})).filter(({song,index})=>{
    const matchesFilter=activeFilter==='all'||(activeFilter==='favorites'?isFavorite(index):String(song.year)===activeFilter);
    const haystack=`${song.title} ${song.artist} ${song.year}`.toLowerCase();
    return matchesFilter&&(!q||haystack.includes(q));
  });
}

function renderDeckNext(){
  const wrap=$('deckNext'); if(!wrap) return;
  const len=SONG_LIST.length;
  if(!len){wrap.innerHTML='<span style="color:var(--muted);font:500 11px Outfit">No signal</span>';return}
  const items=[];
  for(let n=1;n<=3;n++){
    const idx=(currentIndex+n)%len;
    const s=SONG_LIST[idx];
    if(!s) continue;
    items.push(`<button class="next-card" data-jump="${idx}" type="button"><span class="n-num">${String(idx+1).padStart(2,'0')}</span><div style="min-width:0;text-align:left"><strong>${esc(s.title)}</strong><small>${esc(s.artist)} · ${s.year}</small></div><span class="go">↗</span></button>`);
  }
  wrap.innerHTML=items.join('');
  wrap.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>{selectSong(Number(b.dataset.jump),true)}));
}
function syncDeck(playing){
  const eq=$('deckEq'), label=$('deckEqLabel'), bpmEl=$('meterBpm');
  if(eq) eq.classList.toggle('playing', !!playing);
  if(label){
    if(playing){
      const s=SONG_LIST[currentIndex];
      label.textContent=`TRANSMITTING — ${s ? s.title.toUpperCase() : 'LIVE'} • ${currentSource.toUpperCase()}`;
    } else label.textContent='IDLE — AWAITING FREQUENCY';
  }
  if(bpmEl) bpmEl.textContent=Math.round(60000/beatMsFor(currentIndex))+' BPM';
  renderDeckNext();
}

document.addEventListener('DOMContentLoaded',()=>{
  renderSongGrid(); renderDeckNext(); syncDeck(false);
  $('enterBtn').onclick=()=>playCurrent(true);
  $('playBtn').onclick=togglePlay;
  $('prevBtn').onclick=previous;
  $('nextBtn').onclick=next;
  $('browseBtn').onclick=openPanel;
  $('deckShuffle')?.addEventListener('click',shuffleFiltered);
  $('deckQueueBrowse')?.addEventListener('click',openPanel);
  $('closePanel').onclick=closePanel;
  $('drawerScrim')?.addEventListener('click',closePanel);
  $('youtubeBtn').onclick=openYoutube;
  $('spotifyBtn').onclick=()=>openSpotify(false);
  $('spotifyClose')?.addEventListener('click',()=>switchToYouTube(false));
  $('invidiousClose')?.addEventListener('click',()=>{hideInvidious(); switchToYouTube(false); showToast('Proxy closed — back to YouTube');});
  $('muteBtn').onclick=toggleMute;
  $('homeBtn').onclick=e=>{e.preventDefault();closePanel();window.scrollTo?.(0,0)};
  $('songSearch')?.addEventListener('input',e=>{searchTerm=e.target.value;renderSongGrid()});
  $('clearSearch')?.addEventListener('click',()=>{$('songSearch').value='';searchTerm='';renderSongGrid();$('songSearch').focus()});
  $('shuffleBtn')?.addEventListener('click',shuffleFiltered);
  document.querySelectorAll('.filter-btn').forEach(button=>button.addEventListener('click',()=>{
    activeFilter=button.dataset.filter||'all';
    document.querySelectorAll('.filter-btn').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
    renderSongGrid();
  }));
  initProgressSeek();
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){if($('songsPanel')?.classList.contains('open'))closePanel();return}
    if(e.target.matches('input,button'))return;
    if(e.code==='Space'){e.preventDefault();togglePlay()}
    if(e.code==='ArrowRight')next();
    if(e.code==='ArrowLeft')previous();
  });
});

function beatMsFor(i){const bpm=84+((i*7)%22);return Math.round(60000/bpm)}

function selectSong(i,autoplay=false){
  if(!SONG_LIST[i])return;
  currentIndex=i;idAttempt=0;
  const s=SONG_LIST[i];
  $('playerTitle').textContent=s.title;
  $('playerMeta').textContent=`${s.artist} · ${s.year}`;
  $('npArt').textContent='▶';
  $('currentTime').textContent='0:00';$('duration').textContent='0:00';$('progressBar').style.width='0%';
  $('progressBar').style.opacity='1';
  updateProgressAccessibility(0,0);updateKinetic(s,false);highlightActiveCard(i);syncDeck(false);
  hideSpotify(false); hideInvidious();
  currentSource='youtube';
  updateSourceBadge();
  if(playerReady)loadExactSource(autoplay);
}
function updateKinetic(s,playing){
  const titleEl=$('kineticTitle');
  titleEl.innerHTML=`${esc(s.title)}<br><em>${esc(s.artist)}</em>`;
  titleEl.style.setProperty('--beat',beatMsFor(currentIndex)+'ms');titleEl.classList.toggle('is-playing',playing);
  $('kineticArtist').innerHTML=`<span>${s.year} · ${playing?'Now playing':'Queued'} on Punjabi Wave</span>`;
  $('nowLabel').textContent=playing?'NOW PLAYING':'READY TO PLAY';
}
function updateSourceBadge(){
  const kicker=$('playerMeta');
  // subtle hint which source is active is shown via deck label; keep playerMeta clean
}
function highlightActiveCard(i){document.querySelectorAll('.song-card').forEach(c=>c.classList.toggle('active',Number(c.dataset.index)===i))}

// ── Hybrid sources ──
// Like saloon.wtf: they pick only embed-allowed IDs and use hidden YT.Player with minimal playerVars.
// We do the same, but when owner blocks (101/150) we first try Invidious proxy (bypasses embed flag),
// then fall back to Spotify search embed — so user never sees "blocked".
function spotifyEmbedUrl(song){
  if(!song) return null;
  if(song.spotifyId && /^[A-Za-z0-9]{22}$/.test(song.spotifyId)){
    return `https://open.spotify.com/embed/track/${song.spotifyId}?utm_source=generator&theme=0`;
  }
  const q=encodeURIComponent(`${song.title} ${song.artist}`);
  return `https://open.spotify.com/embed/search/${q}?utm_source=generator&theme=0`;
}
function showInvidious(song, videoId){
  const wrap=$('invidiousWrap'), frame=$('invidiousPlayer');
  if(!wrap||!frame||!song||!videoId) return false;
  // yewtu.be / inv.nadeko.net are public Invidious instances that proxy YouTube and ignore embed-disabled flag
  // saloon.wtf doesn't need this because they curated 90s IDs that are embed-allowed; we need it for newer Punjabi Vevo blocks
  const hosts=['https://yewtu.be','https://inv.nadeko.net','https://invidious.nerdvpn.de'];
  const host=hosts[0];
  frame.src=`${host}/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&modestbranding=1`;
  wrap.hidden=false; wrap.style.display='flex';
  const hidden=$('player')?.parentElement;
  if(hidden) hidden.style.display='none';
  // hide spotify if visible
  const spWrap=$('spotifyPlayerWrap'); if(spWrap){spWrap.hidden=true; spWrap.style.display='none';}
  currentSource='youtube';
  syncDeck(true);
  showToast('YouTube blocked — proxied via Invidious ✦ tap × to close');
  $('playerTitle').textContent=song.title + ' — Proxy';
  $('npArt').textContent='▶';
  $('playBtn').textContent='Ⅱ';
  $('currentTime').textContent='PROXY';
  $('duration').textContent='—';
  $('progressBar').style.width='100%';
  $('progressBar').style.opacity='0.6';
  return true;
}
function hideInvidious(){
  const wrap=$('invidiousWrap'), frame=$('invidiousPlayer');
  if(wrap){wrap.hidden=true; wrap.style.display='none';}
  if(frame) frame.src='about:blank';
  const hidden=$('player')?.parentElement;
  if(hidden) hidden.style.display='';
}
function showSpotify(song){
  const wrap=$('spotifyPlayerWrap'), frame=$('spotifyPlayer');
  if(!wrap||!frame||!song) return;
  const url=spotifyEmbedUrl(song);
  frame.src=url;
  wrap.hidden=false;
  wrap.style.display='flex';
  // hide YouTube tiny player visually but keep it paused
  const hidden=$('player')?.parentElement;
  if(hidden) hidden.style.display='none';
  currentSource='spotify';
  syncDeck(false);
  showToast('YouTube blocked — switched to Spotify ✦');
  $('playerTitle').textContent=song.title + ' — Spotify';
  $('npArt').textContent='♫';
  $('playBtn').textContent='▶';
  // timebar indeterminate for Spotify (no API without Premium)
  $('currentTime').textContent='SPOTIFY';
  $('duration').textContent='—';
  $('progressBar').style.width='100%';
}
function hideSpotify(restoreYouTube){
  const wrap=$('spotifyPlayerWrap'), frame=$('spotifyPlayer');
  if(wrap){ wrap.hidden=true; wrap.style.display='none'; }
  if(frame) frame.src='about:blank';
  const hidden=$('player')?.parentElement;
  if(hidden) hidden.style.display='';
  if(restoreYouTube) currentSource='youtube';
  hideInvidious();
}
function switchToSpotify(autoplay){
  const s=SONG_LIST[currentIndex];
  if(!s) return;
  // pause YouTube before switching
  try{ if(playerReady&&player&&player.pauseVideo) player.pauseVideo(); }catch(e){}
  stopTimer();
  showSpotify(s);
}
function switchToYouTube(autoplay){
  hideSpotify(true);
  syncDeck(false);
  $('playerTitle').textContent=SONG_LIST[currentIndex]?.title||'SELECT A SONG';
  $('playerMeta').textContent=`${SONG_LIST[currentIndex]?.artist||''} · ${SONG_LIST[currentIndex]?.year||''}`;
  $('currentTime').textContent='0:00';$('duration').textContent='0:00';$('progressBar').style.width='0%';
  if(autoplay) playCurrent(true);
  else if(playerReady) loadExactSource(false);
}

function loadExactSource(autoplay){
  // if we are in Spotify mode, don't load YouTube
  if(currentSource==='spotify') return;
  const ids=SONG_LIST[currentIndex]?.youtubeIds||[],id=ids[idAttempt];
  if(!id){$('playerTitle').textContent='YouTube source unavailable — trying Spotify…'; switchToSpotify(autoplay); return}
  try{player.loadVideoById({videoId:id,startSeconds:0});if(!autoplay)player.pauseVideo()}catch(e){$('playerTitle').textContent='Unable to load source'; switchToSpotify(autoplay)}
}
function playCurrent(autoplay){
  if(currentSource==='spotify'){
    const s=SONG_LIST[currentIndex];
    if(!$('spotifyPlayerWrap')||$('spotifyPlayerWrap').hidden) showSpotify(s);
    showToast('Playing on Spotify — press Play inside the Spotify card ✦');
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
function previous(){selectSong((currentIndex-1+SONG_LIST.length)%SONG_LIST.length,true)}
function next(){selectSong((currentIndex+1)%SONG_LIST.length,true)}
function shuffleFiltered(){
  const pool=getFilteredSongs();if(!pool.length){showToast('No tracks to shuffle in this view');return}
  const pick=pool[Math.floor(Math.random()*pool.length)];selectSong(pick.index,true);closePanel();
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
      // 1) try Invidious proxy first (like saloon.wtf's embed-allowed curation but proxied) — preserves YouTube audio
      if(blocked && vid && showInvidious(s, vid)){
        $('youtubeBtn')?.classList.add('pulse-attn');setTimeout(()=>$('youtubeBtn')?.classList.remove('pulse-attn'),4000);
        return;
      }
      // 2) then fall back to Spotify as mixture
      if(s){
        showToast(blocked?'YouTube blocked — switching to Spotify…':'Source blocked — switching to Spotify…');
        switchToSpotify(true);
        $('youtubeBtn')?.classList.add('pulse-attn');setTimeout(()=>$('youtubeBtn')?.classList.remove('pulse-attn'),4000);
        return;
      }
      const msg=blocked?"Can't embed here — opening YouTube…":'YouTube blocked this embed — skipping…';
      showToast(msg);
      $('playerTitle').textContent=blocked?"Blocked on embed — tap YOUTUBE to watch ↘":'Source blocked — warping to next track…';
      clearTimeout(ytErrorSkipTimer);
      ytErrorSkipTimer=setTimeout(()=>{
        const nextIdx=(currentIndex+1)%SONG_LIST.length;
        if(nextIdx!==currentIndex){ showToast('Warping to next track → '+(SONG_LIST[nextIdx]?.title||'')); selectSong(nextIdx,true); }
      },1600);
    },
    onStateChange:e=>{
      const s=SONG_LIST[currentIndex];
      if(e.data===YT.PlayerState.PLAYING){$('playBtn').textContent='Ⅱ';$('playBtn').setAttribute('aria-label','Pause selected song');$('npArt').textContent='Ⅱ';if(s)updateKinetic(s,true);syncDeck(true);startTimer()}
      else if(e.data===YT.PlayerState.PAUSED){$('playBtn').textContent='▶';$('playBtn').setAttribute('aria-label','Play selected song');if(s)updateKinetic(s,false);syncDeck(false);stopTimer()}
      else if(e.data===YT.PlayerState.ENDED){$('playBtn').textContent='▶';stopTimer();syncDeck(false);next()}
    }
  }});
}

// Spotify IFrame API (optional, for future play-state sync)
window.onSpotifyIframeApiReady = (api)=>{
  // not required for search-embed; kept for when you add real spotifyIds with Premium control
  try{
    const wrap=$('spotifyPlayer');
    if(!wrap) return;
  }catch(e){}
};

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
window.__togglePlayback=togglePlay;window.__nextSong=next;window.__prevSong=previous;window.__playCurrentSong=()=>playCurrent(true);

function startTimer(){stopTimer();timer=setInterval(()=>{if(currentSource==='spotify')return;if(!player||!player.getCurrentTime)return;const t=player.getCurrentTime(),d=player.getDuration();$('currentTime').textContent=formatTime(t);$('duration').textContent=formatTime(d);const pct=d?`${Math.min(100,(t/d)*100)}%`:'0%';$('progressBar').style.width=pct;updateProgressAccessibility(t,d)},500)}
function stopTimer(){if(timer){clearInterval(timer);timer=null}}
function formatTime(s){if(!Number.isFinite(s))return'0:00';return`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`}
function updateProgressAccessibility(time,duration){const track=$('progressTrack');if(!track)return;track.setAttribute('aria-valuemax',String(Math.max(0,Math.round(duration||0))));track.setAttribute('aria-valuenow',String(Math.max(0,Math.round(time||0))));}
function initProgressSeek(){
  const track=$('progressTrack');if(!track)return;
  const seek=e=>{if(currentSource==='spotify'){showToast('Seeking only on YouTube — use Spotify slider');return}if(!playerReady||!player?.getDuration)return;const r=track.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),duration=player.getDuration();player.seekTo(ratio*duration,true)};
  track.addEventListener('click',seek);
  track.addEventListener('keydown',e=>{if(!playerReady||!player?.getCurrentTime)return;const d=player.getDuration()||0,t=player.getCurrentTime()||0;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();player.seekTo(Math.max(0,Math.min(d,t+(e.key==='ArrowRight'?10:-10))),true)}if(e.key==='Home'){e.preventDefault();player.seekTo(0,true)}if(e.key==='End'){e.preventDefault();player.seekTo(d,true)}});
}

function renderSongGrid(){
  const grid=$('songGrid'),empty=$('emptyState'),matches=getFilteredSongs();if(!grid)return;
  grid.innerHTML=matches.map(({song,index},pos)=>{
    const saved=isFavorite(index),initial=esc((song.title||'P').slice(0,1).toUpperCase()),stagger=pos%18;
    const hasSpotify=!!song.spotifyId;
    return `<article class="song-card${index===currentIndex?' active':''}" data-index="${index}" style="--stagger:${stagger}"><span class="num">${String(index+1).padStart(2,'0')}</span><span class="song-art" aria-hidden="true">${initial}</span><div class="song-main"><strong>${esc(song.title)}${hasSpotify?' <span style="color:var(--teal);font-size:9px">● SPOTIFY</span>':''}</strong><small>${song.lang==='hindi'?'<span class="lang-dot hindi" title="Hindi"></span>':'<span class="lang-dot punjabi" title="Punjabi"></span>'} ${esc(song.artist)} · ${song.year}</small></div><div class="song-actions"><button class="save-btn${saved?' saved':''}" data-save="${index}" type="button" aria-label="${saved?'Remove':'Save'} ${esc(song.title)}" aria-pressed="${saved}">${saved?'★':'☆'}</button><button class="play-song" data-i="${index}" type="button" aria-label="Play ${esc(song.title)}">▶</button></div></article>`
  }).join('');
  if(empty)empty.hidden=matches.length>0;
  if($('drawerCount'))$('drawerCount').textContent=`${matches.length} ${matches.length===1?'track':'tracks'}`;
  if($('trackCountLabel'))$('trackCountLabel').textContent=`${SONG_LIST.length} TRACKS`;
  document.title=`Punjabi Wave — Hindi & Punjabi Hits 2024–2026`;
  grid.querySelectorAll('.play-song').forEach(button=>button.addEventListener('click',()=>{selectSong(Number(button.dataset.i),true);closePanel()}));
  grid.querySelectorAll('.save-btn').forEach(button=>button.addEventListener('click',()=>toggleFavorite(Number(button.dataset.save))));
}
function openPanel(){
  $('songsPanel').classList.add('open');$('songsPanel').setAttribute('aria-hidden','false');$('drawerScrim')?.classList.add('open');
  setTimeout(()=>$('songSearch')?.focus(),180);
}
function closePanel(){
  $('songsPanel')?.classList.remove('open');$('songsPanel')?.setAttribute('aria-hidden','true');$('drawerScrim')?.classList.remove('open');
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
  // also embed inside if not externalOnly and YouTube failed before
  if(!externalOnly && currentSource==='youtube'){
    // let user stay on YouTube unless blocked; Spotify button as direct embed toggle
    const wrap=$('spotifyPlayerWrap');
    if(wrap && wrap.hidden) showSpotify(s);
  }
}
function toggleMute(){
  if(currentSource==='spotify'){showToast('Spotify volume — use the Spotify card slider');return}
  if(!playerReady){showToast('Select a song first to control sound');return}
  isMuted=!isMuted;if(isMuted)player.mute();else player.unMute();$('muteBtn').textContent=isMuted?'SOUND OFF':'SOUND ON';$('muteBtn').setAttribute('aria-pressed',String(isMuted))}
function showToast(message){const toast=$('shareToast');if(!toast)return;toast.textContent=message;toast.classList.add('show');clearTimeout(toast._timer);toast._timer=setTimeout(()=>toast.classList.remove('show'),2600)}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

/* ── 3D Tilt Effect on Song Cards ── */
(function initTilt(){
  document.addEventListener('mousemove',e=>{
    document.querySelectorAll('.song-card').forEach(card=>{
      const r=card.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5;
      const y=(e.clientY-r.top)/r.height-.5;
      const inBounds=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
      if(inBounds){
        card.style.transform=`perspective(600px) rotateX(${(-y*8).toFixed(2)}deg) rotateY(${(x*8).toFixed(2)}deg) translateY(-2px)`;
      }else{
        card.style.transform='';
      }
    });
  });
})();
