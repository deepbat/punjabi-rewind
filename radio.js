/* Live Punjabi radio: independent internet-radio streams with automatic fail-over.
   These are third-party community streams (not run by this site) — small stations
   go up and down over time, so if one fails to connect within RADIO_TIMEOUT_MS,
   we silently advance to the next one in the list instead of just breaking.
   RADIO_STATIONS is read by scene.js to place the four beacons on the outer ring —
   edit it here only, positions in the scene follow automatically. */
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
    renderStationButtons();
    $('radioToggle').onclick=()=>{isLive?stopRadio():startRadio(stationIndex)};
    attachListeners(audio);
    // The music player may hand us a shared <audio> element at any time;
    // when it does, switch the radio engine onto it so there is one engine
    // across music + radio and the hidden fallback element is genuinely used.
    window.__setRadioAudioTarget=setRadioAudioTarget;
  }
  function attachListeners(target){
    target.addEventListener('playing',onConnected);
    target.addEventListener('error',()=>tryNext('stream error'));
    target.addEventListener('stalled',()=>tryNext('stalled'));
  }
  function setRadioAudioTarget(el){
    if(!el) return;
    if(el===audio) return;
    audio.pause();
    attachListeners(el);
    window.__radioAudioEl=el;
  }

  function renderStationButtons(){
    const wrap=$('radioStationList');
    wrap.innerHTML=RADIO_STATIONS.map((s,i)=>`<button class="radio-station-btn" data-i="${i}" type="button" aria-label="${esc(s.name)}" title="${esc(s.name)}"></button>`).join('');
    wrap.querySelectorAll('button').forEach(b=>b.onclick=()=>startRadio(+b.dataset.i));
  }

  function setActiveButton(i){
    document.querySelectorAll('.radio-station-btn').forEach((b,idx)=>b.classList.toggle('active',idx===i));
  }

  function startRadio(i){
    if(i>=RADIO_STATIONS.length){
      setStatus('All stations unreachable right now');
      setShellStatus('Radio standby');
      return;
    }
    userStopped=false;
    stationIndex=i;
    const s=RADIO_STATIONS[i];
    setActiveButton(i);
    $('radioStationName').textContent=s.name;
    setStatus('Tuning in…');
    setShellStatus(`Tuning · ${s.name}`);
    isLive=false;
    clearTimeout(connectTimer);
    try{
      const target=window.__radioAudioEl&&window.__radioAudioEl!==audio?window.__radioAudioEl:audio;
      target.pause();
      target.src=s.url;
      target.load();
      target.play().catch(()=>{});
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
    setStatus('Live now');
    setShellStatus(`Live radio · ${RADIO_STATIONS[stationIndex].name}`);
    $('dialGlyph').textContent='Ⅱ';
    $('radioToggle').setAttribute('aria-label','Pause live radio');
    $('radioToggle').setAttribute('aria-pressed','true');
    if(window.__pauseSongPlayback) window.__pauseSongPlayback();
    if(window.__setRadioMood) window.__setRadioMood(stationIndex);
  }

  function stopRadio(){
    userStopped=true;
    clearTimeout(connectTimer);
    audio.pause();
    isLive=false;
    setStatus('Radio off');
    setShellStatus('Dispatch online');
    $('dialGlyph').textContent='📡';
    $('radioToggle').setAttribute('aria-label','Play live radio');
    $('radioToggle').setAttribute('aria-pressed','false');
    if(window.__setRadioMood) window.__setRadioMood(null);
  }

  function setStatus(t){$('radioStatus').textContent=t}
  function setShellStatus(t){/* no dedicated shell-status readout in this build; kept as a no-op hook for future use */}
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

  window.__pauseRadio=stopRadio;
  window.__playRadioStation=(i)=>startRadio(i);
  document.addEventListener('DOMContentLoaded',init);
})();
