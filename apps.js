/* Desktop apps registry + window wiring for new apps */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);

  function openWindow({key, title, icon, html, width=520, height=380}){
    if($('win-'+key)){ focus('win-'+key); return; }
    const el=document.createElement('section');
    el.className='win-window windowed app-window';
    el.id='win-'+key;
    el.style.width=width+'px'; el.style.height=height+'px';
    el.style.left='80px'; el.style.top='60px';
    el.setAttribute('role','dialog');
    el.setAttribute('aria-label',title);
    el.innerHTML=`<header class="win-titlebar"><div class="win-titlebar-id"><span class="win-titlebar-icon">${icon}</span><span class="win-titlebar-text">${title}</span></div><div class="win-controls"><button class="win-btn win-min" aria-label="Minimize">&#65372;</button><button class="win-btn win-max" aria-label="Maximize">&#9723;</button><button class="win-btn win-close" aria-label="Close">×</button></div></header><div class="generic-content">${html}</div>`;
    document.getElementById('win11Desktop').appendChild(el);
    const tbar=el.querySelector('.win-titlebar');
    const minBtn=el.querySelector('.win-min');
    const maxBtn=el.querySelector('.win-max');
    const closeBtn=el.querySelector('.win-close');
    let dragging=false,sx=0,sy=0,wx=0,wy=0;
    tbar.addEventListener('pointerdown',e=>{
      if(e.target.closest('.win-controls')) return;
      dragging=true; sx=e.clientX; sy=e.clientY; wx=el.offsetLeft; wy=el.offsetTop; tbar.setPointerCapture(e.pointerId);
    });
    tbar.addEventListener('pointermove',e=>{ if(!dragging) return; el.style.left=wx+(e.clientX-sx)+'px'; el.style.top=wy+(e.clientY-sy)+'px'; });
    tbar.addEventListener('pointerup',e=>{ dragging=false; try{tbar.releasePointerCapture(e.pointerId)}catch(_){} });
    minBtn.onclick=()=>el.hidden=true;
    closeBtn.onclick=()=>el.remove();
    maxBtn.onclick=()=>{ el.classList.toggle('maximized'); };
    bringToFront(el);
  }
  function bringToFront(el){ let z=20; if(window.__zTop) z=window.__zTop+1; if(window.__zTop!==undefined) window.__zTop=z; el.style.zIndex=z; }
  document.addEventListener('DOMContentLoaded',()=>{
    // Desktop icons
    $('#desktopIconLyrics')?.addEventListener('click',()=>$('#startAppLyrics')?.click());
    $('#desktopIconArtists')?.addEventListener('click',()=>$('#startAppArtists')?.click());
    $('#desktopIconPlaylists')?.addEventListener('click',()=>$('#startAppPlaylists')?.click());
    $('#desktopIconStickyNotes')?.addEventListener('click',()=>$('#startAppStickyNotes')?.click());
    $('#desktopIconHistory')?.addEventListener('click',()=>{ if(window.__historyRender) window.__historyRender(); });
    $('#desktopIconStats')?.addEventListener('click',()=>{ if(window.__openStats) window.__openStats(); });

    // Start menu entries
    $('#startAppLyrics')?.addEventListener('click',()=>{
      openWindow({key:'lyrics', title:'Lyrics', icon:'🎤', width:520, height:460, html:`<div class="lyrics-app"><div class="lyrics-toolbar"><button class="eq-preset" id="lyricEn">English</button><button class="eq-preset" id="lyricHi">Hindi</button><button class="eq-preset" id="lyricBoth">Both</button></div><div class="lyrics-body" id="lyricText">Play a song to see lyrics.</div></div>`});
      setTimeout(()=>{ const s=window.SONGS&&window.SONGS[window.currentIndex||0]; if(s){ const box=document.getElementById('lyricText'); if(box){ const key=window.LYRICS_KEY?window.LYRICS_KEY(s.title,s.artist):s.title+'|'+s.artist; const txt=window.LYRICS&&window.LYRICS[key]; box.textContent=txt? txt.en+'\\n\\n'+txt.hi :'Lyrics coming soon for this track.'; } } },100);
    });
    $('#startAppArtists')?.addEventListener('click',()=>{
      const list=(window.SONGS||[]).slice(0,8).map((s,i)=>`<li data-i="${i}"><strong>${s.title}</strong><small>${s.artist}</small><button class="play-song" data-i="${i}">▶</button></li>`).join('');
      openWindow({key:'artists', title:'Artists', icon:'🎙️', width:520, height:420, html:`<div class="artists-app"><div class="artists-list"><ol>${list}</ol></div></div>`});
    });
    $('#startAppPlaylists')?.addEventListener('click',()=>{
      const items=(window.PLAYLISTS||[]).map((p,i)=>`<li data-p="${i}"><strong>${p.name}</strong><small>${p.desc}</small><button class="play-song" data-p="${i}">▶</button></li>`).join('');
      openWindow({key:'playlists', title:'Playlists', icon:'🎧', width:520, height:420, html:`<div class="playlists-app"><ol class="playlists-list">${items||'<li>No playlists.</li>'}</ol></div>`});
    });
    $('#startAppStickyNotes')?.addEventListener('click',()=>{
      openWindow({key:'stickyNotes', title:'Sticky Notes', icon:'📝', width:560, height:380, html:`<div class="sticky-app"><div class="notes-toolbar"><button class="notes-add">+ New note</button></div><div class="notes-grid" id="notesGrid"></div></div>`});
    });
    $('#startAppHistory')?.addEventListener('click',()=>{ if(window.__historyRender) window.__historyRender(); else alert('History will appear after you play tracks.'); });
    $('#startAppStats')?.addEventListener('click',()=>{ if(window.__openStats) window.__openStats(); else alert('Stats available after some plays.'); });
    $('#startAppWhatsNew')?.addEventListener('click',()=>{ if(window.__desktopToast) window.__desktopToast('🆕 3 new tracks added this week'); });

    // Sidebar nav buttons
    $('#navQueue')?.addEventListener('click',()=>{ if(window.__queue) window.__queue.open(); else alert('Queue will populate from Saved/playback.'); });
    $('#navLyrics')?.addEventListener('click',()=>$('#startAppLyrics')?.click());
    $('#navPlaylists')?.addEventListener('click',()=>$('#startAppPlaylists')?.click());
    $('#navHistory')?.addEventListener('click',()=>{ if(window.__historyRender) window.__historyRender(); else alert('History will appear after you play tracks.'); });
    $('#navStats')?.addEventListener('click',()=>{ if(window.__openStats) window.__openStats(); else alert('Stats available after some plays.'); });

    // Playbar buttons
    $('#queueBtn')?.addEventListener('click',()=>{ if(window.__queue) window.__queue.open(); else alert('Queue will populate from Saved/playback.'); });
    $('#sleepBtn')?.addEventListener('click',()=>{ if(window.__sleepToggle) window.__sleepToggle(); });
    $('#eqBtn')?.addEventListener('click',()=>{ if(window.__eqOpen) window.__eqOpen(); else alert('EQ presets available in this build.'); });
    const historyBtn=$('historyBtn'); if(historyBtn) historyBtn.onclick=()=>{ if(window.__historyRender) window.__historyRender(); };
  });
})();
