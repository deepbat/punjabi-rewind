/* Sticky Notes desktop app */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const KEY='pr_notes';
  function get(){ try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]} }
  function setAll(notes){ try{localStorage.setItem(KEY,JSON.stringify(notes))}catch(e){} }
  function open(){
    if($('stickyNotesApp')){ $('stickyNotesApp').hidden=false; return; }
    const notes=get();
    const div=document.createElement('div'); div.id='stickyNotesApp'; div.className='app-window'; div.hidden=false;
    div.innerHTML=`<div class="win-titlebar"><div class="win-titlebar-id"><span class="win-titlebar-icon">📝</span><span class="win-titlebar-text">Sticky Notes</span></div><div class="win-controls"><button class="win-btn win-close" aria-label="Close">×</button></div></div>
      <div class="generic-content"><div class="notes-toolbar"><button class="notes-add">+ New note</button></div><div class="notes-grid"></div></div>`;
    document.body.appendChild(div);
    const grid=div.querySelector('.notes-grid');
    function render(){
      const all=get();
      grid.innerHTML=all.map((n,idx)=>`<div class="sticky-note" data-idx="${idx}" style="background:${n.color||'#fff59d'}"><button class="note-close" aria-label="Delete">×</button><div class="note-text" contenteditable="true">${esc(n.text||'')}</div><input class="note-track" value="${esc(n.track||'')}" placeholder="Track link (optional)"><button class="note-color">🎨</button></div>`).join('');
      grid.querySelectorAll('.sticky-note').forEach(el=>{
        const idx=parseInt(el.dataset.idx);
        el.querySelector('.note-close').onclick=()=>{ const arr=get().filter((_,i)=>i!==idx); setAll(arr); render(); };
        el.querySelector('.note-text').addEventListener('input',()=>{ const arr=get(); arr[idx].text=el.querySelector('.note-text').textContent; setAll(arr); });
        el.querySelector('.note-track').addEventListener('input',()=>{ const arr=get(); arr[idx].track=el.querySelector('.note-track').value; setAll(arr); });
        el.querySelector('.note-color').onclick=()=>{ const colors=['#fff59d','#ffccbc','#c8e6c9','#bbdefb']; const arr=get(); arr[idx].color=colors[(colors.indexOf(arr[idx].color)+1)%colors.length]; setAll(arr); render(); };
      });
    }
    div.querySelector('.notes-add').onclick=()=>{ const arr=get(); arr.push({text:'',track:'',color:'#fff59d'}); setAll(arr); render(); };
    div.querySelector('.win-close').onclick=()=>div.remove();
    render();
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const btn=$('stickyNotesBtn'); if(btn) btn.onclick=open;
  });
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
})();
