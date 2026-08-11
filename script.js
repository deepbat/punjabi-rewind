const SONG_LIST = window.SONGS || [];
let currentIndex = 0, shuffle = false, player = null, playerReady = false;
let currentFilter = 'all';
const $=id=>document.getElementById(id);

document.addEventListener('DOMContentLoaded',()=>{
  $('songCount').textContent=SONG_LIST.length;
  $('artistCount').textContent=new Set(SONG_LIST.map(s=>s.artist)).size;
  $('year').textContent=new Date().getFullYear();
  populateArtistFilter(); renderSongs(); renderArtists();
  $('search').addEventListener('input',renderSongs); $('artistFilter').addEventListener('change',renderSongs); $('eraFilter').addEventListener('change',renderSongs);
  $('clearFilters').onclick=()=>{$('search').value='';$('artistFilter').value='all';$('eraFilter').value='all';renderSongs()};
  $('exploreBtn').onclick=()=>$('archive').scrollIntoView({behavior:'smooth'}); $('randomBtn').onclick=randomSong;
  $('playBtn').onclick=togglePlay; $('prevBtn').onclick=previous; $('nextBtn').onclick=next; $('stopBtn').onclick=stop;
  $('shuffleBtn').onclick=()=>{shuffle=!shuffle;$('shuffleBtn').textContent=shuffle?'⤨ ON':'⤨'};
  $('heroYoutubeBtn').onclick=openYoutube; $('heroSpotifyBtn').onclick=openSpotify;
  document.addEventListener('keydown',e=>{if(e.target.matches('input,select'))return;if(e.code==='Space'){e.preventDefault();togglePlay()}if(e.code==='ArrowRight')next();if(e.code==='ArrowLeft')previous()});
  if(SONG_LIST.length) selectSong(0,false);
});
function populateArtistFilter(){const artists=[...new Set(SONG_LIST.map(s=>s.artist))].sort();$('artistFilter').innerHTML='<option value="all">ALL ARTISTS</option>'+artists.map(a=>`<option>${escapeHtml(a)}</option>`).join('')}
function renderSongs(){const q=$('search').value.toLowerCase().trim(),af=$('artistFilter').value,ef=$('eraFilter').value;const rows=SONG_LIST.map((s,i)=>({...s,index:i})).filter(s=>(!q||`${s.title} ${s.artist}`.toLowerCase().includes(q))&&(af==='all'||s.artist===af)&&(ef==='all'||s.era===ef));$('resultCount').textContent=rows.length;$('songTable').innerHTML=rows.map((s,n)=>`<tr><td><button class="play-row" data-i="${s.index}">▶</button></td><td><b>${escapeHtml(s.title)}</b></td><td>${escapeHtml(s.artist)}</td><td>${s.year}</td><td>${s.era}</td><td>${s.youtubeId?`<a class="yt" href="https://www.youtube.com/watch?v=${s.youtubeId}" target="_blank" rel="noopener">▶</a>`:`<a class="yt" href="https://www.youtube.com/results?search_query=${encodeURIComponent(s.title+' '+s.artist)}" target="_blank" rel="noopener">⌕</a>`}</td><td><a class="sp" href="${s.spotifyUrl||`https://open.spotify.com/search/${encodeURIComponent(s.title+' '+s.artist)}`}" target="_blank" rel="noopener">●</a></td><td>⋮</td></tr>`).join('');document.querySelectorAll('.play-row').forEach(b=>b.onclick=()=>selectSong(+b.dataset.i,true))}
function renderArtists(){const m=new Map();SONG_LIST.forEach(s=>m.set(s.artist,(m.get(s.artist)||0)+1));$('artistGrid').className='artist-list';$('artistGrid').innerHTML=[...m.entries()].sort((a,b)=>b[1]-a[1]).map(([a,n])=>`<button class="artist-pill" data-a="${escapeAttr(a)}">${escapeHtml(a)} · ${n}</button>`).join('');document.querySelectorAll('.artist-pill').forEach(b=>b.onclick=()=>{$('artistFilter').value=b.dataset.a;$('archive').scrollIntoView({behavior:'smooth'});renderSongs()})}
function selectSong(i,autoplay=false){currentIndex=i;const s=SONG_LIST[i];$('cassetteTitle').textContent=s.title.toUpperCase();$('cassetteArtist').textContent=`${s.artist.toUpperCase()} · ${s.year}`;$('displayArtist').textContent=s.artist;$('displayTitle').textContent=s.title; if(playerReady&&player&&s.youtubeId){player.loadVideoById(s.youtubeId);if(!autoplay)player.pauseVideo()} else if(autoplay&&!s.youtubeId){openYoutube()} }
function onYouTubeIframeAPIReady(){player=new YT.Player('player',{videoId:'',playerVars:{autoplay:0,controls:0,rel:0,playsinline:1},events:{onReady:()=>{playerReady=true},onStateChange:e=>{$('playBtn').textContent=e.data===YT.PlayerState.PLAYING?'Ⅱ':'▶';if(e.data===YT.PlayerState.ENDED)next()}}})}
function togglePlay(){const s=SONG_LIST[currentIndex];if(!s)return;if(!s.youtubeId){openYoutube();return}if(!playerReady)return;const st=player.getPlayerState();st===YT.PlayerState.PLAYING?player.pauseVideo():player.playVideo()}
function stop(){if(playerReady)player.stopVideo();$('playBtn').textContent='▶'}
function next(){let i=shuffle?Math.floor(Math.random()*SONG_LIST.length):(currentIndex+1)%SONG_LIST.length;if(SONG_LIST.length>1&&shuffle&&i===currentIndex)i=(i+1)%SONG_LIST.length;selectSong(i,true)}
function previous(){selectSong((currentIndex-1+SONG_LIST.length)%SONG_LIST.length,true)}
function randomSong(){selectSong(Math.floor(Math.random()*SONG_LIST.length),true)}
function openYoutube(){const s=SONG_LIST[currentIndex];if(s?.youtubeId)window.open(`https://www.youtube.com/watch?v=${s.youtubeId}`,'_blank','noopener');else if(s)window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(s.title+' '+s.artist)}`,'_blank','noopener')}
function openSpotify(){const s=SONG_LIST[currentIndex];if(s?.spotifyUrl)window.open(s.spotifyUrl,'_blank','noopener');else if(s)window.open(`https://open.spotify.com/search/${encodeURIComponent(s.title+' '+s.artist)}`,'_blank','noopener')}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}function escapeAttr(s){return escapeHtml(s)}
