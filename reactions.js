/* Reactions: emoji votes per track */
(function(){
  'use strict';
  const KEY='pr_reactions';
  function get(){ try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return{}} }
  function setAll(obj){ try{localStorage.setItem(KEY,JSON.stringify(obj))}catch(e){} }
  function add(songIndex, emoji){ const all=get(); const k=String(songIndex); all[k]=all[k]||{}; all[k][emoji]=(all[k][emoji]||0)+1; setAll(all); }
  function count(songIndex, emoji){ const all=get(); return (all[String(songIndex)]||{})[emoji]||0; }
  function emojiBar(songIndex){ return ['🔥','💖','🎶','👑'].map(e=>`<button class="emoji-btn" data-emoji="${e}" aria-label="${e}"><span class="emoji-count">${count(songIndex,e)}</span> ${e}</button>`).join(''); }
  function injectIntoGrid(){
    document.querySelectorAll('.song-card').forEach(card=>{
      if(card.querySelector('.emoji-bar')) return;
      const i=parseInt(card.dataset.index);
      const bar=document.createElement('div'); bar.className='emoji-bar'; bar.innerHTML=emojiBar(i);
      const actions=card.querySelector('.song-actions'); if(actions) actions.insertAdjacentElement('afterend',bar);
      bar.querySelectorAll('.emoji-btn').forEach(b=>b.onclick=()=>add(i,b.dataset.emoji));
    });
  }
  const mo=new MutationObserver(injectIntoGrid);
  document.addEventListener('DOMContentLoaded',()=>{ const grid=document.getElementById('songGrid'); if(grid) mo.observe(grid,{childList:true}); });
})();
