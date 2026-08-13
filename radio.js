/* Live Punjabi radio: independent internet-radio streams with automatic fail-over.
   These are third-party community streams (not run by this site) — small stations
   go up and down over time, so if one fails to connect within RADIO_TIMEOUT_MS,
   we silently advance to the next one in the list instead of just breaking.
   To add/remove/reorder stations, edit RADIO_STATIONS only. */
const RADIO_STATIONS = [
  {name:'Punjabi Radio USA', desc:'24/7 Punjabi music & talk, streamed via Voscast.', url:'https://s5.voscast.com:9281/stream'},
  {name:'ClubHouse Punjabi Vibes', desc:'Non-stop Punjabi party & DJ mix from SwaggerBeat.', url:'https://liveradio.swaggerbeat.com:8022/stream'},
  {name:'Harman Radio Australia', desc:'Punjabi geet, culture & community from Down Under.', url:'https://radio.sanbroz.com/listen/harman_radio_australia/radio.mp3'},
  {name:'Start Radio', desc:'AzuraCast Punjabi station, 128kbps MP3.', url:'https://canada.startradio.in:8000/radio.mp3'},
];
const RADIO_TIMEOUT_MS = 6000;

(function(){
  const $=id=>document.getElementById(id);
  let audio=null, stationIndex=0, isLive=false, connectTimer=null, userStopped=false;

  function init(){
    audio=new Audio();
    audio.preload='none';
    renderStationButtons();
    $('radioPlayBtn').onclick=()=>{isLive?stopRadio():startRadio(stationIndex)};
    $('radioJumpBtn')?.addEventListener('click',e=>{
      e.preventDefault();
      document.getElementById('radioSection').scrollIntoView({behavior:'smooth',block:'start'});
    });
    audio.addEventListener('playing',onConnected);
    audio.addEventListener('error',()=>tryNext('stream error'));
    audio.addEventListener('stalled',()=>tryNext('stalled'));
  }

  function renderStationButtons(){
    const wrap=$('radioStationList');
    wrap.innerHTML=RADIO_STATIONS.map((s,i)=>`<button class="radio-station-btn" data-i="${i}" type="button">${esc(s.name)}</button>`).join('');
    wrap.querySelectorAll('button').forEach(b=>b.onclick=()=>startRadio(+b.dataset.i));
  }

  function setActiveButton(i){
    document.querySelectorAll('.radio-station-btn').forEach((b,idx)=>b.classList.toggle('active',idx===i));
  }

  function startRadio(i){
    if(i>=RADIO_STATIONS.length){
      setStatus('ALL STATIONS UNREACHABLE RIGHT NOW');
      setShellStatus('RADIO STANDBY');
      setTuning(false);
      return;
    }
    userStopped=false;
    stationIndex=i;
    const s=RADIO_STATIONS[i];
    setActiveButton(i);
    $('radioStationName').textContent=s.name;
    $('radioDesc').textContent=s.desc;
    setStatus('TUNING IN…');
    setShellStatus(`TUNING · ${s.name}`);
    setTuning(true);
    isLive=false;
    clearTimeout(connectTimer);
    try{
      audio.pause();
      audio.src=s.url;
      audio.load();
      audio.play().catch(()=>{});
    }catch(e){tryNext('exception');return}
    connectTimer=setTimeout(()=>{ if(!isLive) tryNext('timeout') },RADIO_TIMEOUT_MS);
  }

  function tryNext(reason){
    if(userStopped)return;
    clearTimeout(connectTimer);
    startRadio(stationIndex+1);
  }

  function onConnected(){
    isLive=true;
    clearTimeout(connectTimer);
    setTuning(false);
    setStatus('LIVE NOW');
    setShellStatus(`LIVE RADIO · ${RADIO_STATIONS[stationIndex].name}`);
    $('liveDot').style.display='inline-block';
    $('radioPlayBtn').textContent='Ⅱ';
    $('radioPlayBtn').setAttribute('aria-label','Pause live radio');
    $('radioPlayBtn').setAttribute('aria-pressed','true');
    // pause any YouTube song playback so audio doesn't overlap
    if(window.__pauseSongPlayback) window.__pauseSongPlayback();
  }

  function stopRadio(){
    userStopped=true;
    clearTimeout(connectTimer);
    audio.pause();
    isLive=false;
    setTuning(false);
    setStatus('OFFLINE · TAP TO TUNE IN');
    setShellStatus('DASHBOARD ONLINE');
    $('liveDot').style.display='none';
    $('radioPlayBtn').textContent='▶';
    $('radioPlayBtn').setAttribute('aria-label','Play live radio');
    $('radioPlayBtn').setAttribute('aria-pressed','false');
  }

  function setStatus(t){$('radioStatus').textContent=t}
  function setShellStatus(t){if($('shellStatus'))$('shellStatus').textContent=t}
  function setTuning(on){$('radioDial').classList.toggle('tuning',on)}
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

  window.__pauseRadio=stopRadio;
  document.addEventListener('DOMContentLoaded',init);
})();
