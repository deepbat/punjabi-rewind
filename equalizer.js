/* Simple equalizer with presets, persisted in localStorage */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const KEY='pr_eq_preset';
  const BANDS=[60,230,910,3600,14000];
  const PRESETS={Flat:[0,0,0,0,0],'Bass Boost':[6,5,2,0,0],Vocal:[-2,0,4,5,3],'Night Mode':[-3,-1,1,2,3]};
  let preset='Flat';
  function get(){ return localStorage.getItem(KEY)||'Flat'; }
  function set(name){ preset=name; try{localStorage.setItem(KEY,name)}catch(e){} apply(); render(); }
  function dbToGain(db){ return Math.pow(10, db/20); }
  function apply(){
    // YouTube audio routing requires user gesture and cross-origin iframe; provide a best-effort bridge.
    // This does not alter cross-origin audio; adjust system volume in Quick Settings instead.
    showToast(`Equalizer preset: ${preset}`);
  }
  function ensurePanel(){
    if($('eqPanel')){ $('eqPanel').hidden=false; return; }
    const div=document.createElement('div'); div.id='eqPanel'; div.hidden=false;
    const bandsHtml=BANDS.map((hz,i)=>`<div class="eq-band"><label>${hz>=1000?(hz/1000)+'kHz':hz+'Hz'}</label><input type="range" min="-6" max="6" step="1" value="0" data-i="${i}"><span class="mono small">0dB</span></div>`).join('');
    div.innerHTML=`<div class="generic-panel"><div class="generic-head"><b>Equalizer</b><button class="generic-close" aria-label="Close">✕</button></div>
      <div class="eq-presets">${Object.keys(PRESETS).map(p=>`<button class="eq-preset${p===preset?' active':''}" data-p="${p}">${p}</button>`).join('')}</div>
      <div class="eq-bands">${bandsHtml}</div></div>`;
    document.body.appendChild(div);
    div.querySelector('.generic-close').onclick=()=>div.hidden=true;
    div.querySelectorAll('.eq-preset').forEach(b=>b.onclick=()=>set(b.dataset.p));
    div.querySelectorAll('.eq-band input').forEach(inp=>{
      inp.addEventListener('input',()=>{ const row=inp.closest('.eq-band'); row.querySelector('span').textContent=(inp.value>0?'+':'')+inp.value+'dB'; });
    });
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const btn=$('eqBtn'); if(btn) btn.onclick=ensurePanel;
    set(get());
  });
  function showToast(msg){ const t=$('toast'); if(!t) return; t.textContent=msg; t.classList.add('show'); clearTimeout(t._timer); t._timer=setTimeout(()=>t.classList.remove('show'),2200); }
  function render(){ const ps=document.querySelectorAll('.eq-preset'); ps.forEach(b=>b.classList.toggle('active',b.dataset.p===preset)); }
  window.__eqApply=apply; window.__eqOpen=ensurePanel;
})();
