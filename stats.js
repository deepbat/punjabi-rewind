/* Stats dashboard: top artists, genre split, listening time */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  function getHistory(){ try{return JSON.parse(localStorage.getItem('pr_history')||'[]')}catch(e){return[]} }
  function getReactions(){ try{return JSON.parse(localStorage.getItem('pr_reactions')||'{}')}catch(e){return{}} }
  function open(){
    if($('statsPanel')){ $('statsPanel').hidden=false; return; }
    const history=getHistory();
    const reactions=getReactions();
    const songs=window.SONGS||[];
    const artistPlays={};
    history.forEach(h=>{ const s=songs[h.index]; if(s){ const a=s.artist; artistPlays[a]=(artistPlays[a]||0)+1; } });
    const top=Object.entries(artistPlays).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,count])=>`<li>${name} — <b>${count}</b></li>`).join('');
    const punjabi=history.filter(h=>songs[h.index]&&songs[h.index].lang==='punjabi').length;
    const hindi=history.filter(h=>songs[h.index]&&songs[h.index].lang==='hindi').length;
    const total=history.length||1;
    const pPct=Math.round(punjabi/total*100);
    const hPct=Math.round(hindi/total*100);
    const mins=Math.round((history.length*3.5));
    const div=document.createElement('div'); div.id='statsPanel'; div.hidden=false;
    div.innerHTML=`<div class="generic-panel"><div class="generic-head"><b>Stats</b><button class="generic-close" aria-label="Close">✕</button></div>
      <div class="stats-grid"><div class="stat-card"><b>${history.length}</b><span>Total plays</span></div><div class="stat-card"><b>${mins}</b><span>Minutes listened</span></div></div>
      <h4 class="stats-h">Genre split</h4>
      <canvas id="statsPie" width="220" height="220"></canvas>
      <h4 class="stats-h">Top artists</h4>
      <ol class="stats-top">${top||'<li>No plays yet.</li>'}</ol></div>`;
    document.body.appendChild(div);
    div.querySelector('.generic-close').onclick=()=>div.remove();
    const c=document.getElementById('statsPie'); if(c){ const ctx=c.getContext('2d'); drawPie(ctx,pPct,hPct); }
  }
  function drawPie(ctx,pPct,hPct){
    const w=220,h=220,r=90; ctx.clearRect(0,0,w,h);
    const data=[{v:pPct,c:'#ECA31C'},{v:hPct,c:'#D14A3F'}];
    let start= -Math.PI/2; data.forEach(d=>{ const angle=d.v/100*Math.PI*2; ctx.beginPath(); ctx.moveTo(w/2,h/2); ctx.arc(w/2,h/2,r,start,start+angle); ctx.closePath(); ctx.fillStyle=d.c; ctx.fill(); start+=angle; });
    ctx.fillStyle='#F3F3F3'; ctx.font='600 12px Segoe UI Variable Text,Segoe UI,sans-serif'; ctx.textAlign='center'; ctx.fillText(`Punjabi ${pPct}%`,w/2,h/2-6); ctx.fillText(`Hindi ${hPct}%`,w/2,h/2+12);
  }
  document.addEventListener('DOMContentLoaded',()=>{ const btn=$('navStats'); if(btn) btn.onclick=open; window.__openStats=open; });
})();
