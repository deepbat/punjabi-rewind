/* Sleep timer: cycles 15/30/45/60/Off; pauses playback on expiry */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const CYCLE=[15,30,45,60];
  let minutes=0, endAt=0, ticker=null;
  function remaining(){ return Math.max(0, Math.round((endAt - Date.now())/1000)); }
  function format(s){ return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}` }
  function start(m){ stop(); minutes=m; endAt=Date.now()+m*60*1000; ticker=setInterval(tick,1000); tick(); if(window.__pauseSongPlayback) window.__pauseSongPlayback(); showToast(`Sleep timer: ${m} min`); }
  function stop(){ clearInterval(ticker); ticker=null; minutes=0; const btn=$('sleepBtn'); if(btn){ btn.textContent='Sleep'; btn.setAttribute('aria-pressed','false'); } }
  function tick(){ const r=remaining(); const btn=$('sleepBtn'); if(!btn) return; if(r<=0){ stop(); if(window.__pauseSongPlayback) window.__pauseSongPlayback(); showToast('Sleep timer — paused'); return; } btn.textContent=`Sleep ${format(r)}`; }
  function toggle(){ if(minutes>0){ stop(); showToast('Sleep timer off'); return; } const next=CYCLE.find(m=>!(minutes>0 && minutes===m))||CYCLE[0]; start(next); }
  document.addEventListener('DOMContentLoaded',()=>{
    const btn=$('sleepBtn'); if(btn) btn.onclick=toggle;
  });
  window.__sleepToggle=toggle;
})();
