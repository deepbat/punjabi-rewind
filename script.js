const SONG_LIST = Array.isArray(window.SONGS) ? window.SONGS : [];
let currentIndex=0, player=null, playerReady=false, isMuted=false, timer=null, idAttempt=0;
const $=id=>document.getElementById(id);

document.addEventListener("DOMContentLoaded",()=>{
  renderSongGrid();

  $("enterBtn").onclick=()=>playCurrent(true);
  $("playBtn").onclick=togglePlay;
  $("prevBtn").onclick=previous;
  $("nextBtn").onclick=next;
  $("browseBtn").onclick=()=>openPanel();
  $("closePanel").onclick=()=>closePanel();
  $("youtubeBtn").onclick=()=>openYoutube();
  $("spotifyBtn").onclick=()=>openSpotify();
  $("muteBtn").onclick=toggleMute;
  $("homeBtn").onclick=e=>{e.preventDefault();window.scrollTo({top:0,behavior:"smooth"})};
  document.addEventListener("keydown",e=>{
    if(e.target.matches("input,button"))return;
    if(e.code==="Space"){e.preventDefault();togglePlay()}
    if(e.code==="ArrowRight")next();
    if(e.code==="ArrowLeft")previous();
    if(e.code==="Escape")closePanel();
  });
});

// deterministic pseudo-BPM pulse per song, purely for the kinetic-type animation flavor (not verified audio data)
function beatMsFor(i){
  const bpm=84+((i*7)%22);
  return Math.round(60000/bpm);
}

function selectSong(i,autoplay=false){
  if(!SONG_LIST[i])return;
  currentIndex=i;
  idAttempt=0;
  const s=SONG_LIST[i];
  $("playerTitle").textContent=s.title;
  $("playerMeta").textContent=`${s.artist} · ${s.year}`;
  $("npArt").textContent="▶";
  $("currentTime").textContent="0:00";
  $("duration").textContent="0:00";
  $("progressBar").style.width="0%";
  updateKinetic(s,false);
  highlightActiveCard(i);
  if(playerReady) loadExactSource(autoplay);
}

function updateKinetic(s,playing){
  const titleEl=$("kineticTitle");
  titleEl.innerHTML=`${esc(s.title)}<br><em>${esc(s.artist)}</em>`;
  titleEl.style.setProperty('--beat',beatMsFor(currentIndex)+'ms');
  titleEl.classList.toggle('is-playing',playing);
  $("kineticArtist").innerHTML=`<span>${s.year} · Now ${playing?'playing':'queued'} on Deepak's Punjabi Songs</span>`;
  $("nowLabel").textContent=playing?"NOW PLAYING":"READY TO PLAY";
}

function highlightActiveCard(i){
  document.querySelectorAll(".song-card").forEach((c,idx)=>c.classList.toggle("active",idx===i));
}

function loadExactSource(autoplay){
  const ids=SONG_LIST[currentIndex]?.youtubeIds||[];
  const id=ids[idAttempt];
  if(!id){$("playerTitle").textContent="YouTube source unavailable";return}
  try{
    player.loadVideoById({videoId:id,startSeconds:0});
    if(!autoplay)player.pauseVideo();
  }catch(e){$("playerTitle").textContent="Unable to load source"}
}

function playCurrent(autoplay){
  if(!playerReady)return;
  if(window.__pauseRadio) window.__pauseRadio(); // songs and live radio don't play together
  const ids=SONG_LIST[currentIndex]?.youtubeIds||[];
  const id=ids[idAttempt];
  if(!id)return;
  try{
    player.loadVideoById({videoId:id,startSeconds:0});
    if(autoplay)player.playVideo();
  }catch(e){}
}

function togglePlay(){
  if(!playerReady)return;
  const state=player.getPlayerState();
  if(state===YT.PlayerState.PLAYING) player.pauseVideo();
  else playCurrent(true);
}

function previous(){selectSong((currentIndex-1+SONG_LIST.length)%SONG_LIST.length,true)}
function next(){selectSong((currentIndex+1)%SONG_LIST.length,true)}

function onYouTubeIframeAPIReady(){
  player=new YT.Player("player",{
    height:"1",width:"1",videoId:"",
    playerVars:{autoplay:0,controls:0,rel:0,playsinline:1,modestbranding:1},
    events:{
      onReady:()=>{playerReady=true;if(SONG_LIST.length)selectSong(0,false)},
      onError:(e)=>{
        // try the next known YouTube id for this song (some entries carry fallbacks) before giving up
        const ids=SONG_LIST[currentIndex]?.youtubeIds||[];
        if(idAttempt<ids.length-1){idAttempt++;loadExactSource(true);return}
        // error codes 101/150 = the rights holder has disabled embedding for this video specifically
        // (common on label-managed catalogs) — that's different from a broken/missing link, so say so
        // and point at the direct YouTube button instead of dead-ending.
        const blocked=e && (e.data===101 || e.data===150);
        $("playerTitle").textContent=blocked?"Can't play here — tap YOUTUBE to watch":"This YouTube source cannot be played here";
        $("youtubeBtn")?.classList.add("pulse-attn");
        setTimeout(()=>$("youtubeBtn")?.classList.remove("pulse-attn"),4000);
      },
      onStateChange:e=>{
        const s=SONG_LIST[currentIndex];
        if(e.data===YT.PlayerState.PLAYING){
          $("playBtn").textContent="Ⅱ";
          $("npArt").textContent="Ⅱ";
          if(s)updateKinetic(s,true);
          startTimer();
        }else if(e.data===YT.PlayerState.PAUSED){
          $("playBtn").textContent="▶";
          if(s)updateKinetic(s,false);
          stopTimer();
        }else if(e.data===YT.PlayerState.ENDED){
          $("playBtn").textContent="▶";
          stopTimer();
          next();
        }
      }
    }
  });
}

window.__pauseSongPlayback=function(){
  if(playerReady && player && player.getPlayerState && player.getPlayerState()===YT.PlayerState.PLAYING){
    player.pauseVideo();
  }
};

// ---- hooks for livemode.js (full-screen visualizer) ----
window.__nowPlaying=function(){
  const s=SONG_LIST[currentIndex]||{};
  const playing=playerReady && player && player.getPlayerState && player.getPlayerState()===YT.PlayerState.PLAYING;
  const t=(playerReady && player && player.getCurrentTime) ? player.getCurrentTime() : 0;
  const d=(playerReady && player && player.getDuration) ? player.getDuration() : 0;
  return {title:s.title||'Deepak\'s Punjabi Songs',artist:s.artist||'',year:s.year||'',index:currentIndex,playing:!!playing,time:t,duration:d,beatMs:beatMsFor(currentIndex)};
};
window.__togglePlayback=togglePlay;
window.__nextSong=next;
window.__prevSong=previous;
window.__playCurrentSong=()=>playCurrent(true);

function startTimer(){
  stopTimer();
  timer=setInterval(()=>{
    if(!player||!player.getCurrentTime)return;
    const t=player.getCurrentTime(),d=player.getDuration();
    $("currentTime").textContent=formatTime(t);
    $("duration").textContent=formatTime(d);
    $("progressBar").style.width=d?`${(t/d)*100}%`:"0%";
  },500);
}
function stopTimer(){if(timer){clearInterval(timer);timer=null}}
function formatTime(s){if(!Number.isFinite(s))return"0:00";return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`}

function renderSongGrid(){
  $("songGrid").innerHTML=SONG_LIST.map((s,i)=>`
    <div class="song-card">
      <span class="num">${String(i+1).padStart(2,"0")}</span>
      <div><strong>${esc(s.title)}</strong><small>${esc(s.artist)} · ${s.year}</small></div>
      <button data-i="${i}" aria-label="Play ${esc(s.title)}">▶</button>
    </div>`).join("");
  document.querySelectorAll(".song-card button").forEach(b=>b.onclick=()=>{
    selectSong(+b.dataset.i,true);
    closePanel();
    window.scrollTo({top:0,behavior:"smooth"});
  });
}
function openPanel(){
  $("songsPanel").classList.add("open");
  $("songsPanel").scrollIntoView({behavior:"smooth",block:"start"});
}
function closePanel(){$("songsPanel").classList.remove("open")}
function openYoutube(){
  const id=SONG_LIST[currentIndex]?.youtubeIds?.[idAttempt];
  if(id)window.open(`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,"_blank","noopener");
}
function openSpotify(){
  const s=SONG_LIST[currentIndex];
  if(s)window.open(`https://open.spotify.com/search/${encodeURIComponent(`${s.title} ${s.artist}`)}`,"_blank","noopener");
}
function toggleMute(){
  if(!playerReady)return;
  isMuted=!isMuted;
  if(isMuted)player.mute();else player.unMute();
  $("muteBtn").textContent=isMuted?"SOUND OFF":"SOUND ON";
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
