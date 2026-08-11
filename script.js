const SONG_LIST = Array.isArray(window.SONGS) ? window.SONGS : [];
let currentIndex=0, shuffle=false, player=null, playerReady=false, sourceIndex=0, failedSources=new Set();
const $=id=>document.getElementById(id);

document.addEventListener('DOMContentLoaded',()=>{
  $('songCount').textContent=SONG_LIST.length;
  $('artistCount').textContent=new Set(SONG_LIST.map(s=>s.artist)).size;
  $('resultCount').textContent=SONG_LIST.length;
  $('year').textContent=new Date().getFullYear();
  populateArtistFilter(); renderSongs(); renderArtists();
  $('search').addEventListener('input',renderSongs); $('artistFilter').addEventListener('change',renderSongs); $('eraFilter').addEventListener('change',renderSongs);
  $('clearFilters').onclick=()=>{$('search').value='';$('artistFilter').value='all';$('eraFilter').value='all';renderSongs()};
  $('exploreBtn').onclick=()=>$('archive').scrollIntoView({behavior:'smooth'}); $('randomBtn').onclick=randomSong;
  $('playBtn').onclick=togglePlay; $('prevBtn').onclick=previous; $('nextBtn').onclick=next; $('stopBtn').onclick=stop;
  $('shuffleBtn').onclick=()=>{shuffle=!shuffle;$('shuffleBtn').textContent=shuffle?'⤨ ON':'⤨'};
  $('heroYoutubeBtn').onclick=()=>playCurrent(true); $('heroSpotifyBtn').onclick=openSpotify;
  document.addEventListener('keydown',e=>{if(e.target.matches('input,select'))return;if(e.code==='Space'){e.preventDefault();togglePlay()}if(e.code==='ArrowRight')next();if(e.code==='ArrowLeft')previous()});
  if(SONG_LIST.length) selectSong(0,false);
});
function populateArtistFilter(){const artists=[...new Set(SONG_LIST.map(s=>s.artist))].sort();$('artistFilter').innerHTML='<option value="all">ALL ARTISTS</option>'+artists.map(a=>`<option value="${esc(a)}">${esc(a)}</option>`).join('')}
function renderSongs(){const q=$('search').value.toLowerCase().trim(),af=$('artistFilter').value,ef=$('eraFilter').value;const rows=SONG_LIST.map((s,i)=>({...s,index:i})).filter(s=>(!q||`${s.title} ${s.artist}`.toLowerCase().includes(q))&&(af==='all'||s.artist===af)&&(ef==='all'||s.era===ef));$('resultCount').textContent=rows.length;$('songTable').innerHTML=rows.map((s,n)=>`<tr><td>${String(n+1).padStart(2,'0')}</td><td><b>${esc(s.title)}</b></td><td>${esc(s.artist)}</td><td>${s.year}</td><td>${s.era}</td><td><button class="play-row" data-i="${s.index}" title="Play in player">▶</button></td><td><button class="sp" data-i="${s.index}" title="Open Spotify search">●</button></td></tr>`).join('');document.querySelectorAll('.play-row').forEach(b=>b.onclick=()=>selectSong(+b.dataset.i,true));document.querySelectorAll('.sp').forEach(b=>b.onclick=()=>openSpotifyFor(+b.dataset.i))}
function renderArtists(){const m=new Map();SONG_LIST.forEach(s=>m.set(s.artist,(m.get(s.artist)||0)+1));$('artistGrid').className='artist-list';$('artistGrid').innerHTML=[...m.entries()].sort((a,b)=>b[1]-a[1]).map(([a,n])=>`<button class="artist-pill" data-a="${esc(a)}">${esc(a)} · ${n}</button>`).join('');document.querySelectorAll('.artist-pill').forEach(b=>b.onclick=()=>{$('artistFilter').value=b.dataset.a;$('archive').scrollIntoView({behavior:'smooth'});renderSongs()})}
function selectSong(i,autoplay=false){if(!SONG_LIST[i])return;currentIndex=i;sourceIndex=0;failedSources.clear();const s=SONG_LIST[i];$('cassetteTitle').textContent=s.title.toUpperCase();$('cassetteArtist').textContent=`${s.artist.toUpperCase()} · ${s.year}`;$('displayArtist').textContent=s.artist;$('displayTitle').textContent=s.title;$('duration').textContent='--:--';$('currentTime').textContent='00:00';$('progressBar').style.width='0%';if(playerReady&&s.youtubeIds?.length){loadCurrentSource(autoplay)}else if(autoplay)showStatus('No YouTube source available')}
function loadCurrentSource(autoplay){const s=SONG_LIST[currentIndex],id=s?.youtubeIds?.[sourceIndex];if(!id){showStatus('YouTube source unavailable');return}if(failedSources.has(id)){sourceIndex++;return loadCurrentSource(autoplay)}try{player.loadVideoById({videoId:id,startSeconds:0});if(!autoplay)player.pauseVideo();else player.playVideo()}catch(e){sourceIndex++;loadCurrentSource(autoplay)}}
function onYouTubeIframeAPIReady(){player=new YT.Player('player',{height:'1',width:'1',videoId:'',playerVars:{autoplay:0,controls:0,rel:0,playsinline:1,modestbranding:1},events:{onReady:()=>{playerReady=true},onError:()=>{const id=SONG_LIST[currentIndex]?.youtubeIds?.[sourceIndex];if(id)failedSources.add(id);sourceIndex++;if(sourceIndex<(SONG_LIST[currentIndex]?.youtubeIds?.length||0))loadCurrentSource(true);else showStatus('This song cannot be embedded by YouTube. Choose another source.')},onStateChange:e=>{if(e.data===YT.PlayerState.PLAYING){$('playBtn').textContent='Ⅱ';$('displayTitle').textContent=SONG_LIST[currentIndex].title}else if(e.data===YT.PlayerState.PAUSED){$('playBtn').textContent='▶'}else if(e.data===YT.PlayerState.ENDED){$('playBtn').textContent='▶';next()}},onPlaybackQualityChange:()=>{}}})}
function togglePlay(){if(!playerReady)return;const s=SONG_LIST[currentIndex];if(!s)return;if(player.getPlayerState()===YT.PlayerState.PLAYING)player.pauseVideo();else playCurrent(true)}
function playCurrent(autoplay){if(!playerReady){showStatus('Player is loading...');return}if(!SONG_LIST[currentIndex]?.youtubeIds?.length){showStatus('YouTube source unavailable');return}loadCurrentSource(autoplay)}
function stop(){if(playerReady)player.stopVideo();$('playBtn').textContent='▶';$('currentTime').textContent='00:00';$('progressBar').style.width='0%'}
function next(){if(!SONG_LIST.length)return;let i=shuffle?Math.floor(Math.random()*SONG_LIST.length):(currentIndex+1)%SONG_LIST.length;if(shuffle&&SONG_LIST.length>1&&i===currentIndex)i=(i+1)%SONG_LIST.length;selectSong(i,true)}
function previous(){if(!SONG_LIST.length)return;selectSong((currentIndex-1+SONG_LIST.length)%SONG_LIST.length,true)}
function randomSong(){if(SONG_LIST.length)selectSong(Math.floor(Math.random()*SONG_LIST.length),true)}
function openSpotify(){openSpotifyFor(currentIndex)}
function openSpotifyFor(i){const s=SONG_LIST[i];if(!s)return;window.open(`https://open.spotify.com/search/${encodeURIComponent(s.title+' '+s.artist)}`,'_blank','noopener')}
function showStatus(message){$('displayTitle').textContent=message}
function esc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
setInterval(()=>{if(!playerReady||!player||!SONG_LIST[currentIndex])return;try{if(player.getPlayerState()===YT.PlayerState.PLAYING){const t=player.getCurrentTime()||0,d=player.getDuration()||0;$('currentTime').textContent=fmt(t);$('duration').textContent=fmt(d);$('progressBar').style.width=d?`${Math.min(100,t/d*100)}%`:'0%'}}catch(e){}},500);
function fmt(sec){sec=Math.max(0,Math.floor(sec||0));return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`}
