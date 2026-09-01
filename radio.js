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
window.RADIO_STATIONS = RADIO_STATIONS;
const RADIO_TIMEOUT_MS = 6000;

(function(){
  const $=id=>document.getElementById(id);
  let audio=null, stationIndex=0, isLive=false, connectTimer=null, userStopped=false;

  function init(){
    audio=new Audio();
    audio.preload='none';
    $('radioToggle').onclick=()=>{isLive?stopRadio():startRadio(stationIndex)};
    audio.addEventListener('playing',onConnected);
    audio.addEventListener('error',()=>tryNext('stream error'));
    audio.addEventListener('stalled',()=>tryNext('stalled'));
  }

  function startRadio(i){
    if(i>=RADIO_STATIONS.length){
      setStatus('All stations unreachable right now');
      return;
    }
    userStopped=false;
    stationIndex=i;
    const s=RADIO_STATIONS[i];
    setStatus(`Tuning · ${s.name}…`);
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
    setStatus(`Live · ${RADIO_STATIONS[stationIndex].name}`);
    $('radioToggle').textContent='Radio ●';
    $('radioToggle').setAttribute('aria-label','Pause live radio');
    $('radioToggle').setAttribute('aria-pressed','true');
    if(window.__pauseSongPlayback) window.__pauseSongPlayback();
    if(window.__setAccentFromStation) window.__setAccentFromStation(stationIndex);
  }

  function stopRadio(){
    userStopped=true;
    clearTimeout(connectTimer);
    audio.pause();
    isLive=false;
    setStatus('');
    $('radioToggle').textContent='Radio';
    $('radioToggle').setAttribute('aria-label','Play live radio');
    $('radioToggle').setAttribute('aria-pressed','false');
    if(window.__setAccentFromStation) window.__setAccentFromStation(null);
  }

  function setStatus(t){const el=$('radioStatus');el.hidden=!t;el.textContent=t}
  window.__pauseRadio=stopRadio;
  document.addEventListener('DOMContentLoaded',init);
})();
