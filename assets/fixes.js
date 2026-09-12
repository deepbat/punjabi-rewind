/* Punjabi Rewind interaction + instant-play fixes */
(function(){
  'use strict';
  var $=function(id){return document.getElementById(id)};
  var pendingSong=null, ytReady=false;

  function buildHaloMenu(){
    if($('haloMenu')) return;
    var d=$('win11Desktop'); if(!d) return;
    var bar=document.createElement('nav');
    bar.id='haloMenu'; bar.className='halo-menu'; bar.setAttribute('aria-label','Desktop menu');
    bar.innerHTML='<div class="halo-menu-left">'
      +'<button type="button" data-menu="desktop">Desktop</button><button type="button" data-menu="file">File</button><button type="button" data-menu="edit">Edit</button><button type="button" data-menu="view">View</button><button type="button" data-menu="window">Window</button><button type="button" data-menu="help">Help</button>'
      +'</div><div class="halo-menu-right"><span>Everyday</span><span>⌕</span><span>◔</span><span>☷</span><span>♧</span><span id="haloMenuClock"></span></div>';
    d.insertBefore(bar,d.firstChild);
    bar.addEventListener('click',function(e){
      var b=e.target.closest('button[data-menu]'); if(!b)return;
      var m=b.dataset.menu;
      if(m==='desktop') closeMenus();
      else if(m==='file') openApp('explorer');
      else if(m==='edit') showToast('Edit options are available inside each app');
      else if(m==='view') showToast('View: Details · Tiles · Refresh');
      else if(m==='window') { if(window.__openTaskView) window.__openTaskView(); else showToast('Task View'); }
      else if(m==='help') showToast('Punjabi Rewind · 50 tracks · Space = Play/Pause');
    });
    function tick(){var el=$('haloMenuClock');if(!el)return;var n=new Date(),h=n.getHours(),ap=h>=12?'PM':'AM';h=h%12||12;el.textContent=h+':'+String(n.getMinutes()).padStart(2,'0')+' '+ap;}
    tick(); setInterval(tick,15000);
  }
  function closeMenus(){try{document.querySelectorAll('.start-menu,.flyout,.widgets-flyout').forEach(function(x){x.setAttribute('aria-hidden','true')})}catch(_){}
  }
  function showToast(m){try{window.__desktopToast?window.__desktopToast(m):console.info(m)}catch(_){}
  }
  function openApp(id){try{if(window.__openApp)window.__openApp(id)}catch(_){}
  }

  function wireDesktopIcons(){
    var d=$('win11Desktop'); if(!d||d.dataset.iconFix)return; d.dataset.iconFix='1';
    d.addEventListener('click',function(e){var icon=e.target.closest('.desktop-icon[data-app]');if(icon&&icon.dataset.app)openApp(icon.dataset.app)},true);
  }

  var oldSelect=window.selectSong;
  if(oldSelect&&!oldSelect.__instantFix){
    var wrapped=function(i,autoplay){if(autoplay&&!ytReady){pendingSong=i;return oldSelect(i,false)}return oldSelect(i,autoplay)};
    wrapped.__instantFix=true; window.selectSong=wrapped;
  }
  var oldYTReady=window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady=function(){
    ytReady=true; if(typeof oldYTReady==='function')oldYTReady();
    if(pendingSong!==null){var i=pendingSong;pendingSong=null;setTimeout(function(){try{window.selectSong(i,true)}catch(_){}},0)}
  };

  function ensureInstantFrame(){
    if($('instantYTPlayer'))return;
    var f=document.createElement('iframe');f.id='instantYTPlayer';f.title='Instant song player';f.allow='autoplay; encrypted-media; picture-in-picture';f.setAttribute('frameborder','0');f.setAttribute('loading','eager');f.hidden=true;
    f.style.cssText='position:fixed;width:1px;height:1px;left:-2px;bottom:1px;opacity:.01;pointer-events:none;border:0;z-index:1;';document.body.appendChild(f);
  }
  function instantYT(i){var songs=window.SONGS||[],s=songs[i],id=s&&s.youtubeIds&&s.youtubeIds[0],host=$('instantYTPlayer');if(!id||!host)return;host.src='https://www.youtube.com/embed/'+encodeURIComponent(id)+'?autoplay=1&playsinline=1&rel=0&modestbranding=1';host.hidden=false;}
  function wireInstantSongButtons(){
    var g=$('songGrid');if(!g||g.dataset.instantFix)return;g.dataset.instantFix='1';
    g.addEventListener('click',function(e){var b=e.target.closest('.play-song[data-i]');if(!b)return;var i=Number(b.dataset.i);if(Number.isFinite(i)&&!ytReady)instantYT(i)},true);
    var all=$('playAllBtn');if(all)all.addEventListener('click',function(){if(!ytReady&&window.SONGS&&window.SONGS.length)instantYT(0)},true);
  }

  var radioAudio=null,radioIndex=0,radioPlaying=false;
  function setupFastRadio(){
    var btn=$('radioToggle');if(!btn||btn.dataset.fastRadio)return;btn.dataset.fastRadio='1';
    radioAudio=new Audio();radioAudio.preload='auto';
    var stations=window.RADIO_STATIONS||[];
    if(stations[0]&&stations[0].url){radioAudio.src=stations[0].url;try{radioAudio.load()}catch(_){}
    }
    radioAudio.addEventListener('playing',function(){radioPlaying=true;var s=stations[radioIndex],st=$('radioStatus'),name=$('radioStationName'),g=$('dialGlyph');if(st)st.textContent='Live now';if(name&&s)name.textContent=s.name;if(g)g.textContent='Ⅱ';btn.setAttribute('aria-pressed','true');btn.setAttribute('aria-label','Pause live radio');if(window.__pauseSongPlayback)window.__pauseSongPlayback()});
    btn.onclick=function(e){e.preventDefault();e.stopImmediatePropagation();stations=window.RADIO_STATIONS||stations;if(radioPlaying){radioAudio.pause();radioPlaying=false;btn.setAttribute('aria-pressed','false');btn.setAttribute('aria-label','Play live radio');if($('radioStatus'))$('radioStatus').textContent='Radio off';if($('dialGlyph'))$('dialGlyph').textContent='▶';return}var s=stations[radioIndex]||stations[0];if(!s)return;if(radioAudio.src!==s.url){radioAudio.src=s.url;try{radioAudio.load()}catch(_){} }if($('radioStatus'))$('radioStatus').textContent='Tuning in…';var p=radioAudio.play();if(p&&p.catch)p.catch(function(){});
    };
    document.querySelectorAll('.radio-station-btn').forEach(function(b){b.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();var i=Number(b.dataset.i);if(!Number.isFinite(i)||!stations[i])return;radioIndex=i;radioPlaying=false;radioAudio.pause();radioAudio.src=stations[i].url;try{radioAudio.load()}catch(_){}$('radioStationName').textContent=stations[i].name;$('radioStatus').textContent='Tuning in…';var p=radioAudio.play();if(p&&p.catch)p.catch(function(){})},true)});
    window.__pauseRadio=function(){if(radioAudio){radioAudio.pause();radioPlaying=false}};
  }

  function init(){buildHaloMenu();wireDesktopIcons();ensureInstantFrame();wireInstantSongButtons();setupFastRadio()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  setTimeout(init,500);setTimeout(init,1500);
})();
