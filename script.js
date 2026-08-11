const SONG_LIST = Array.isArray(window.SONGS) ? window.SONGS : [];
let currentIndex=0, player=null, playerReady=false, isMuted=false, timer=null;
const $=id=>document.getElementById(id);

document.addEventListener("DOMContentLoaded",()=>{
  $("songSlider").max=Math.max(0,SONG_LIST.length-1);
  $("songNumber").textContent=`01 / ${String(SONG_LIST.length).padStart(2,"0")}`;
  renderSongGrid();
  if(SONG_LIST.length) selectSong(0,false);

  $("enterBtn").onclick=()=>playCurrent(true);
  $("playBtn").onclick=togglePlay;
  $("prevBtn").onclick=previous;
  $("nextBtn").onclick=next;
  $("songSlider").oninput=()=>selectSong(+$("songSlider").value,false);
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
  });
});

function selectSong(i,autoplay=false){
  if(!SONG_LIST[i])return;
  currentIndex=i;
  const s=SONG_LIST[i];
  $("songSlider").value=i;
  $("songNumber").textContent=`${String(i+1).padStart(2,"0")} / ${String(SONG_LIST.length).padStart(2,"0")}`;
  $("cassetteTitle").textContent=s.title.toUpperCase();
  $("cassetteMeta").textContent=`${s.artist.toUpperCase()} · ${s.year}`;
  $("displayArtist").textContent=s.artist;
  $("displayTitle").textContent=s.title;
  $("currentTime").textContent="0:00";
  $("duration").textContent="0:00";
  $("progressBar").style.width="0%";
  if(playerReady) loadExactSource(autoplay);
}

function loadExactSource(autoplay){
  const id=SONG_LIST[currentIndex]?.youtubeIds?.[0];
  if(!id){$("displayTitle").textContent="YouTube source unavailable";return}
  try{
    player.loadVideoById({videoId:id,startSeconds:0});
    if(!autoplay)player.pauseVideo();
  }catch(e){$("displayTitle").textContent="Unable to load source"}
}

function playCurrent(autoplay){
  if(!playerReady)return;
  const id=SONG_LIST[currentIndex]?.youtubeIds?.[0];
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
      onReady:()=>{playerReady=true},
      onError:()=>{$("displayTitle").textContent="This YouTube source cannot be played here"},
      onStateChange:e=>{
        if(e.data===YT.PlayerState.PLAYING){
          $("playBtn").textContent="Ⅱ";
          startTimer();
        }else if(e.data===YT.PlayerState.PAUSED){
          $("playBtn").textContent="▶";
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
function openPanel(){$("songsPanel").classList.add("open");$("songsPanel").scrollIntoView({behavior:"smooth"})}
function closePanel(){$("songsPanel").classList.remove("open")}
function openYoutube(){
  const id=SONG_LIST[currentIndex]?.youtubeIds?.[0];
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
