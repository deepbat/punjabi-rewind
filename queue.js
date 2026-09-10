/* Queue panel: upcoming tracks from current filter, drag reorder, remove, clear */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const SONG_LIST=window.SONGS||[];
  const SK='pr_queue';
  function load(){ try{return JSON.parse(sessionStorage.getItem(SK)||'[]')}catch(e){return[]} }
  function save(list){ try{sessionStorage.setItem(SK,JSON.stringify(list))}catch(e){} }
  let queue=load();
  function setQueue(list){ queue=list; save(list); render(); }
  function addIndex(i){ if(!SONG_LIST[i]) return; queue=[...new Set([...queue,i])]; save(queue); render(); }
  function removeIndex(i){ queue=queue.filter(x=>x!==i); save(queue); render(); }
  function clearQueue(){ queue=[]; save(queue); render(); }
  function move(from,to){ const arr=[...queue]; const [item]=arr.splice(from,1); arr.splice(to,0,item); queue=arr; save(queue); render(); }
  function filteredIndices(){ const term=(document.getElementById('songSearch')?.value||'').trim().toLowerCase(); const f=document.querySelector('.w11-nav-btn.active')?.dataset.filter||'all'; return SONG_LIST.map((s,i)=>({s,i})).filter(({s,i})=>{
    const mf=f==='all'||(f==='favorites'?getFavorites().includes(i):s.lang===f);
    const hay=`${s.title} ${s.artist} ${s.year}`.toLowerCase();
    return mf&&(!term||hay.includes(term));
  }).map(o=>o.i);
  }
  function getFavorites(){ try{return JSON.parse(localStorage.getItem('pr_favorites')||'[]').map(Number).filter(Number.isFinite)}catch(e){return[]} }
  function ensurePanel(){
    if($('queuePanel')){ $('queuePanel').hidden=false; return; }
    const div=document.createElement('div'); div.id='queuePanel'; div.hidden=false;
    div.innerHTML=`<div class="generic-panel"><div class="generic-head"><b>Queue</b><button class="generic-close" aria-label="Close">✕</button></div>
      <div class="queue-toolbar"><button class="queue-clear" id="queueClear">Clear</button><span class="mono small" id="queueCount">0</span></div>
      <ol id="queueList" class="queue-list"></ol></div>`;
    document.body.appendChild(div);
    div.querySelector('.generic-close').onclick=()=>{ div.hidden=true };
    div.querySelector('#queueClear').onclick=()=>{ clearQueue(); showToast('Queue cleared'); };
    div.addEventListener('dragstart',e=>{ const row=e.target.closest('.queue-item'); if(!row) return; e.dataTransfer.setData('text/plain',row.dataset.pos); });
  }
  function render(){
    const list=document.getElementById('queueList');
    const count=document.getElementById('queueCount');
    if(!list) return;
    const items=queue.map((songIndex,pos)=>{ const s=SONG_LIST[songIndex]; if(!s) return ''; return `<li class="queue-item" draggable="true" data-pos="${pos}" data-idx="${songIndex}"><span class="queue-num">${pos+1}</span><div class="queue-main"><strong>${esc(s.title)}</strong><small>${esc(s.artist)}</small></div><button class="queue-remove" data-idx="${songIndex}" aria-label="Remove">×</button></li>`; }).join('');
    list.innerHTML=items||'<li class="empty-state">Queue is empty. Open the Saved filter or play a track to add.</li>';
    if(count) count.textContent=`${queue.length} tracks`;
    list.querySelectorAll('.queue-item').forEach(row=>{
      row.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain',row.dataset.pos));
      row.addEventListener('dragover',e=>e.preventDefault());
      row.addEventListener('drop',e=>{ const from=parseInt(e.dataTransfer.getData('text/plain')); const to=parseInt(row.dataset.pos); if(Number.isFinite(from)&&Number.isFinite(to)) move(from,to); });
      row.addEventListener('dblclick',()=>{ const idx=parseInt(row.dataset.idx); if(window.selectSong) window.selectSong(idx,true); });
    });
    list.querySelectorAll('.queue-remove').forEach(btn=>btn.onclick=()=>removeIndex(parseInt(btn.dataset.idx)));
  }
  function showToast(msg){ const t=document.getElementById('toast'); if(!t) return; t.textContent=msg; t.classList.add('show'); clearTimeout(t._timer); t._timer=setTimeout(()=>t.classList.remove('show'),2200); }
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  window.__queue={setQueue,addIndex,removeIndex,clearQueue,open:()=>ensurePanel()};
  window.addEventListener('message',e=>{ if(e.data==='queue:open') ensurePanel(); });
})();
