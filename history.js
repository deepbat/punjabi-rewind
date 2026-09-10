/* Listening history: last 50 played tracks with timestamp */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const KEY='pr_history';
  function get(){ try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]} }
  function add(songIndex){ const list=get(); const entry={index:songIndex, ts:Date.now()}; const next=[entry,...list.filter(x=>x.index!==songIndex)].slice(0,50); try{localStorage.setItem(KEY,JSON.stringify(next))}catch(e){} }
  function renderHistory(){
    const list=get();
    const items=list.map((h,i)=>{ const s=window.SONGS&&window.SONGS[h.index]; if(!s) return ''; const d=new Date(h.ts); return `<li class="hist-item" data-index="${h.index}"><span class="hist-ts mono small">${d.toLocaleDateString()} ${d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span><div><strong>${esc(s.title)}</strong><small>${esc(s.artist)}</small></div><button class="hist-play" data-i="${h.index}" aria-label="Play">▶</button></li>`; }).join('');
    const html=`<div class="generic-panel"><div class="generic-head"><b>History</b><button class="generic-close" aria-label="Close">✕</button></div><ol class="hist-list">${items||'<li class="empty-state">No plays yet.</li>'}</ol></div>`;
    const div=document.createElement('div'); div.id='historyPanel'; div.hidden=false; div.innerHTML=html; document.body.appendChild(div);
    div.querySelector('.generic-close').onclick=()=>div.remove();
    div.querySelectorAll('.hist-play').forEach(b=>b.onclick=()=>{ if(window.selectSong){ window.selectSong(parseInt(b.dataset.i),true); div.remove(); } });
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const btn=$('historyBtn'); if(btn) btn.onclick=renderHistory;
    window.__historyRender=renderHistory;
  });
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  window.__historyAdd=add;
})();
