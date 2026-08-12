/* Live Punjabi radio: independent internet-radio streams with automatic fail-over.
   These are third-party community streams (not run by this site) — small stations
   go up and down over time, so if one fails to connect within RADIO_TIMEOUT_MS,
   we silently advance to the next one in the list instead of just breaking.
   To add/remove/reorder stations, edit RADIO_STATIONS only. */
const RADIO_STATIONS = [
  {name:'Punjabi Radio USA', desc:'24/7 Punjabi music & talk, streamed via Voscast.', url:'https://s5.voscast.com:9281/stream'},
  {name:'CMR Punjabi HD', desc:'Punjabi hits from the CMR24 network.', url:'https://live.cmr24.net/CMR/Punjabi-MQ/icecast.audio'},
  {name:'Radio Chann Pardesi', desc:'Punjabi, Hindi, English & Gurbani mix.', url:'https://mehramedia.in:3021/'},
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
    $('liveDot').style.display='inline-block';
    $('radioPlayBtn').textContent='Ⅱ';
    $('radioPlayBtn').setAttribute('aria-label','Pause live radio');
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
    $('liveDot').style.display='none';
    $('radioPlayBtn').textContent='▶';
    $('radioPlayBtn').setAttribute('aria-label','Play live radio');
  }

  function setStatus(t){$('radioStatus').textContent=t}
  function setTuning(on){$('radioDial').classList.toggle('tuning',on)}
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

  window.__pauseRadio=stopRadio;
  document.addEventListener('DOMContentLoaded',init);
})();
