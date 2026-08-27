const SONG_LIST=window.SONGS||[];
let currentIndex=0, player=null, playerReady=false, isMuted=false, timer=null, idAttempt=0;
let activeFilter='all', searchTerm='';
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

document.addEventListener('DOMContentLoaded',()=>{
  renderSongGrid();
  $('enterBtn').onclick=()=>playCurrent(true);
  $('playBtn').onclick=togglePlay;
  $('prevBtn').onclick=previous;
  $('nextBtn').onclick=next;
  $('browseBtn').onclick=openPanel;
  $('closePanel').onclick=closePanel;
  $('drawerScrim')?.addEventListener('click',closePanel);
  $('youtubeBtn').onclick=openYoutube;
  $('spotifyBtn').onclick=openSpotify;
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
  updateProgressAccessibility(0,0);updateKinetic(s,false);highlightActiveCard(i);
  if(playerReady)loadExactSource(autoplay);
}
function updateKinetic(s,playing){
  const titleEl=$('kineticTitle');
  titleEl.innerHTML=`${esc(s.title)}<br><em>${esc(s.artist)}</em>`;
  titleEl.style.setProperty('--beat',beatMsFor(currentIndex)+'ms');titleEl.classList.toggle('is-playing',playing);
  $('kineticArtist').innerHTML=`<span>${s.year} · ${playing?'Now playing':'Queued'} on Punjabi Wave</span>`;
  $('nowLabel').textContent=playing?'NOW PLAYING':'READY TO PLAY';
}
function highlightActiveCard(i){document.querySelectorAll('.song-card').forEach(c=>c.classList.toggle('active',Number(c.dataset.index)===i))}
function loadExactSource(autoplay){
  const ids=SONG_LIST[currentIndex]?.youtubeIds||[],id=ids[idAttempt];
  if(!id){$('playerTitle').textContent='YouTube source unavailable';return}
  try{player.loadVideoById({videoId:id,startSeconds:0});if(!autoplay)player.pauseVideo()}catch(e){$('playerTitle').textContent='Unable to load source'}
}
function playCurrent(autoplay){
  if(!playerReady){showToast('Player is still tuning in — try again in a moment');return}
  if(window.__pauseRadio)window.__pauseRadio();
  const id=SONG_LIST[currentIndex]?.youtubeIds?.[idAttempt];if(!id)return;
  try{player.loadVideoById({videoId:id,startSeconds:0});if(autoplay)player.playVideo()}catch(e){}
}
function togglePlay(){
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

function onYouTubeIframeAPIReady(){
  player=new YT.Player('player',{height:'1',width:'1',videoId:'',playerVars:{autoplay:0,controls:0,rel:0,playsinline:1,modestbranding:1},events:{
    onReady:()=>{playerReady=true;if(SONG_LIST.length)selectSong(0,false)},
    onError:e=>{
      const ids=SONG_LIST[currentIndex]?.youtubeIds||[];
      if(idAttempt<ids.length-1){idAttempt++;loadExactSource(true);return}
      const blocked=e&&(e.data===101||e.data===150);
      $('playerTitle').textContent=blocked?"Can't play here — tap YOUTUBE to watch":'This YouTube source cannot be played here';
      $('youtubeBtn')?.classList.add('pulse-attn');setTimeout(()=>$('youtubeBtn')?.classList.remove('pulse-attn'),4000);
    },
    onStateChange:e=>{
      const s=SONG_LIST[currentIndex];
      if(e.data===YT.PlayerState.PLAYING){$('playBtn').textContent='Ⅱ';$('playBtn').setAttribute('aria-label','Pause selected song');$('npArt').textContent='Ⅱ';if(s)updateKinetic(s,true);startTimer()}
      else if(e.data===YT.PlayerState.PAUSED){$('playBtn').textContent='▶';$('playBtn').setAttribute('aria-label','Play selected song');if(s)updateKinetic(s,false);stopTimer()}
      else if(e.data===YT.PlayerState.ENDED){$('playBtn').textContent='▶';stopTimer();next()}
    }
  }});
}

window.__pauseSongPlayback=function(){if(playerReady&&player&&player.getPlayerState&&player.getPlayerState()===YT.PlayerState.PLAYING)player.pauseVideo()};
window.__nowPlaying=function(){
  const s=SONG_LIST[currentIndex]||{};const playing=playerReady&&player&&player.getPlayerState&&player.getPlayerState()===YT.PlayerState.PLAYING;
  const t=playerReady&&player&&player.getCurrentTime?player.getCurrentTime():0,d=playerReady&&player&&player.getDuration?player.getDuration():0;
  return{title:s.title||"Punjabi Wave",artist:s.artist||'',year:s.year||'',index:currentIndex,playing:!!playing,time:t,duration:d,beatMs:beatMsFor(currentIndex)};
};
window.__togglePlayback=togglePlay;window.__nextSong=next;window.__prevSong=previous;window.__playCurrentSong=()=>playCurrent(true);

function startTimer(){stopTimer();timer=setInterval(()=>{if(!player||!player.getCurrentTime)return;const t=player.getCurrentTime(),d=player.getDuration();$('currentTime').textContent=formatTime(t);$('duration').textContent=formatTime(d);const pct=d?`${Math.min(100,(t/d)*100)}%`:'0%';$('progressBar').style.width=pct;updateProgressAccessibility(t,d)},500)}
function stopTimer(){if(timer){clearInterval(timer);timer=null}}
function formatTime(s){if(!Number.isFinite(s))return'0:00';return`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`}
function updateProgressAccessibility(time,duration){const track=$('progressTrack');if(!track)return;track.setAttribute('aria-valuemax',String(Math.max(0,Math.round(duration||0))));track.setAttribute('aria-valuenow',String(Math.max(0,Math.round(time||0))));}
function initProgressSeek(){
  const track=$('progressTrack');if(!track)return;
  const seek=e=>{if(!playerReady||!player?.getDuration)return;const r=track.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),duration=player.getDuration();player.seekTo(ratio*duration,true)};
  track.addEventListener('click',seek);
  track.addEventListener('keydown',e=>{if(!playerReady||!player?.getCurrentTime)return;const d=player.getDuration()||0,t=player.getCurrentTime()||0;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();player.seekTo(Math.max(0,Math.min(d,t+(e.key==='ArrowRight'?10:-10))),true)}if(e.key==='Home'){e.preventDefault();player.seekTo(0,true)}if(e.key==='End'){e.preventDefault();player.seekTo(d,true)}});
}

function renderSongGrid(){
  const grid=$('songGrid'),empty=$('emptyState'),matches=getFilteredSongs();if(!grid)return;
  grid.innerHTML=matches.map(({song,index})=>{
    const saved=isFavorite(index),initial=esc((song.title||'P').slice(0,1).toUpperCase());
    return `<article class="song-card${index===currentIndex?' active':''}" data-index="${index}"><span class="num">${String(index+1).padStart(2,'0')}</span><span class="song-art" aria-hidden="true">${initial}</span><div class="song-main"><strong>${esc(song.title)}</strong><small>${esc(song.artist)} · ${song.year}</small></div><div class="song-actions"><button class="save-btn${saved?' saved':''}" data-save="${index}" type="button" aria-label="${saved?'Remove':'Save'} ${esc(song.title)}" aria-pressed="${saved}">${saved?'★':'☆'}</button><button class="play-song" data-i="${index}" type="button" aria-label="Play ${esc(song.title)}">▶</button></div></article>`
  }).join('');
  if(empty)empty.hidden=matches.length>0;
  if($('drawerCount'))$('drawerCount').textContent=`${matches.length} ${matches.length===1?'track':'tracks'}`;
  if($('trackCountLabel'))$('trackCountLabel').textContent=`${SONG_LIST.length} TRACKS`;
  // also update meta tag live
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
function openSpotify(){const s=SONG_LIST[currentIndex];if(s)window.open(`https://open.spotify.com/search/${encodeURIComponent(`${s.title} ${s.artist}`)}`,'_blank','noopener')}
function toggleMute(){if(!playerReady){showToast('Select a song first to control sound');return}isMuted=!isMuted;if(isMuted)player.mute();else player.unMute();$('muteBtn').textContent=isMuted?'SOUND OFF':'SOUND ON';$('muteBtn').setAttribute('aria-pressed',String(isMuted))}
function showToast(message){const toast=$('shareToast');if(!toast)return;toast.textContent=message;toast.classList.add('show');clearTimeout(toast._timer);toast._timer=setTimeout(()=>toast.classList.remove('show'),2600)}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
