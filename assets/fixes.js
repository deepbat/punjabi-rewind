/* Punjabi Rewind fixes: Halo menu, non-fullscreen windows, fast YouTube/radio playback. */
(function(){
  'use strict';
  var $=function(id){return document.getElementById(id)};
  var fastFrame=null,fastIndex=-1,fastPlaying=false;

  /* Warm YouTube connection immediately so first click does not wait for DNS/TLS. */
  function warmYouTube(){
    ['https://www.youtube.com','https://www.youtube-nocookie.com','https://i.ytimg.com'].forEach(function(h){
      if(document.head.querySelector('link[href="'+h+'"]'))return;
      var l=document.createElement('link');l.rel='preconnect';l.href=h;l.crossOrigin='anonymous';document.head.appendChild(l);
    });
  }

  /* Keep desktop in a normal window. Browser F11 remains available for true fullscreen. */
  function forceWindowed(){
    var w=$('appWindow');if(!w)return;
    w.classList.remove('maximized');w.classList.add('windowed');
    w.style.marginLeft='0';
    if(!w.style.width)w.style.width='88vw';
    if(!w.style.height)w.style.height='72vh';
    w.style.left='6vw';w.style.top='72px';
  }
  function wireWindowedOpen(){
    ['taskbarAppBtn','desktopIconApp','startAppPunjabiRewind','startRecentPunjabiRewind'].forEach(function(id){
      var b=$(id);if(!b||b.dataset.windowedFix)return;b.dataset.windowedFix='1';
      b.addEventListener('click',function(){setTimeout(forceWindowed,0)},true);
    });
    forceWindowed();
  }

  /* Real clickable Halo menu. */
  function buildHaloMenu(){
    if($('haloMenu'))return;
    var d=$('win11Desktop');if(!d)return;
    var bar=document.createElement('nav');bar.id='haloMenu';bar.className='halo-menu';bar.setAttribute('aria-label','Desktop menu');
    bar.innerHTML='<div class="halo-menu-left">'+
      '<button type="button" data-menu="desktop">Desktop</button>'+
      '<button type="button" data-menu="file">File</button>'+
      '<button type="button" data-menu="edit">Edit</button>'+ 
      '<button type="button" data-menu="view">View</button>'+ 
      '<button type="button" data-menu="window">Window</button>'+ 
      '<button type="button" data-menu="help">Help</button>'+ 
      '</div><div class="halo-menu-right"><span>Everyday</span><span>⌕</span><span>◔</span><span>☷</span><span>♧</span><span id="haloMenuClock"></span></div>';
    d.insertBefore(bar,d.firstChild);
    bar.addEventListener('click',function(e){
      var b=e.target.closest('button[data-menu]');if(!b)return;
      var m=b.dataset.menu;
      if(m==='desktop')closeMenus();
      else if(m==='file')openApp('explorer');
      else if(m==='edit')toast('Edit options are available inside each app');
      else if(m==='view')toast('View: Details · Tiles · Refresh');
      else if(m==='window'){if(window.__openTaskView)window.__openTaskView();}
      else if(m==='help')toast('Punjabi Rewind · 50 tracks · Space = Play/Pause');
    });
    function tick(){var e=$('haloMenuClock');if(!e)return;var n=new Date(),h=n.getHours(),ap=h>=12?'PM':'AM';h=h%12||12;e.textContent=h+':'+String(n.getMinutes()).padStart(2,'0')+' '+ap}
    tick();setInterval(tick,15000);
  }
  function closeMenus(){try{document.querySelectorAll('.start-menu,.flyout,.widgets-flyout').forEach(function(x){x.setAttribute('aria-hidden','true')})}catch(_){} }
  function toast(m){try{if(window.__desktopToast)window.__desktopToast(m);else console.info(m)}catch(_){} }
  function openApp(id){try{if(window.__openApp)window.__openApp(id)}catch(_){} }

  /* Direct iframe player. It is created on the user's click, so it does not depend on the API script being ready. */
  function ensureFastFrame(){
    if(fastFrame)return fastFrame;
    fastFrame=document.createElement('iframe');
    fastFrame.id='instantYTPlayer';
    fastFrame.title='Punjabi Rewind YouTube player';
    fastFrame.width='200';fastFrame.height='200';fastFrame.frameBorder='0';
    fastFrame.allow='autoplay; encrypted-media; picture-in-picture';
    fastFrame.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
    fastFrame.style.cssText='position:fixed;left:-220px;bottom:-220px;width:200px;height:200px;opacity:.01;pointer-events:none;border:0;z-index:1;';
    document.body.appendChild(fastFrame);
    return fastFrame;
  }
  function postFast(command){
    if(!fastFrame||!fastFrame.contentWindow)return;
    try{fastFrame.contentWindow.postMessage(JSON.stringify({event:'command',func:command,args:[]}), 'https://www.youtube-nocookie.com')}catch(_){}
    try{fastFrame.contentWindow.postMessage(JSON.stringify({event:'command',func:command,args:[]}), 'https://www.youtube.com')}catch(_){}
  }
  function fastPlay(i){
    var songs=window.SONGS||[],s=songs[i],id=s&&s.youtubeIds&&s.youtubeIds[0];if(!s||!id)return false;
    if(fastPlaying&&fastIndex===i){postFast('pauseVideo');fastPlaying=false;setPlayIcon(false);return true;}
    var f=ensureFastFrame();
    fastIndex=i;fastPlaying=true;
    var origin=location.origin&&location.origin!=='null'?location.origin:'';
    f.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?autoplay=1&playsinline=1&controls=0&rel=0&modestbranding=1&enablejsapi=1&origin='+encodeURIComponent(origin);
    setPlayIcon(true);
    updateBillFast(s);
    if(window.__pauseRadio)window.__pauseRadio();
    return true;
  }
  function setPlayIcon(playing){var b=$('playBtn');if(b){b.textContent=playing?'Ⅱ':'▶';b.setAttribute('aria-label',playing?'Pause selected song':'Play selected song')}}
  function updateBillFast(s){
    if($('billTitle'))$('billTitle').textContent=s.title;
    if($('billArtist'))$('billArtist').textContent=s.artist+' · '+s.year;
    if($('currentTime'))$('currentTime').textContent='0:00';
    if($('duration'))$('duration').textContent='—';
    if($('progressBar'))$('progressBar').style.width='0%';
  }
  window.__fastPlay=fastPlay;

  /* Override selectSong only for clicks made before YT API is ready. */
  function wireFastSelect(){
    if(typeof window.selectSong!=='function'||window.selectSong.__fastWrapped)return;
    var original=window.selectSong;
    function wrapped(i,autoplay){
      if(autoplay&&!window.__ytPlayerReady){
        try{original(i,false)}catch(_){}
        fastPlay(i);
        return;
      }
      return original(i,autoplay);
    }
    wrapped.__fastWrapped=true;window.selectSong=wrapped;
  }

  function wirePlayButtons(){
    var grid=$('songGrid');
    if(grid&&!grid.dataset.fastClick){
      grid.dataset.fastClick='1';
      grid.addEventListener('click',function(e){
        var b=e.target.closest('.play-song[data-i]');if(!b)return;
        var i=Number(b.dataset.i);if(!Number.isFinite(i))return;
        if(!window.__ytPlayerReady){e.preventDefault();e.stopImmediatePropagation();try{if(window.selectSong)window.selectSong(i,false)}catch(_){}fastPlay(i);}
      },true);
    }
    var pb=$('playBtn');
    if(pb&&!pb.dataset.fastClick){
      pb.dataset.fastClick='1';
      pb.addEventListener('click',function(e){
        if(window.__ytPlayerReady)return;
        e.preventDefault();e.stopImmediatePropagation();
        var np=window.__nowPlaying&&window.__nowPlaying(),i=np&&Number.isFinite(np.index)?np.index:0;
        fastPlay(i);
      },true);
    }
    var pa=$('playAllBtn');
    if(pa&&!pa.dataset.fastClick){
      pa.dataset.fastClick='1';
      pa.addEventListener('click',function(e){
        if(window.__ytPlayerReady)return;
        var songs=window.SONGS||[];if(!songs.length)return;
        e.preventDefault();e.stopImmediatePropagation();fastPlay(0);
      },true);
    }
  }

  /* Mark API readiness without replacing the application's own callback. */
  function hookYT(){
    var old=window.onYouTubeIframeAPIReady;
    if(old&&old.__fastHook)return;
    window.onYouTubeIframeAPIReady=function(){
      window.__ytPlayerReady=true;
      if(typeof old==='function')return old.apply(this,arguments);
    };
    window.__ytPlayerReady=!!(window.YT&&window.YT.Player);
  }

  /* Fast radio: preload first station and play directly from the user's click. */
  function setupFastRadio(){
    var btn=$('radioToggle');if(!btn||btn.dataset.fastRadio)return;btn.dataset.fastRadio='1';
    var audio=new Audio();audio.preload='auto';var stations=window.RADIO_STATIONS||[];var idx=0,playing=false;
    if(stations[0]&&stations[0].url){audio.src=stations[0].url;try{audio.load()}catch(_){}
    }
    audio.addEventListener('playing',function(){playing=true;if($('radioStatus'))$('radioStatus').textContent='Live now';if($('dialGlyph'))$('dialGlyph').textContent='Ⅱ';btn.setAttribute('aria-pressed','true');if(window.__pauseSongPlayback)window.__pauseSongPlayback()});
    audio.addEventListener('error',function(){if(!stations.length)return;idx=(idx+1)%stations.length;var s=stations[idx];audio.src=s.url;try{audio.load();audio.play().catch(function(){})}catch(_){} });
    btn.onclick=function(e){
      e.preventDefault();e.stopImmediatePropagation();
      stations=window.RADIO_STATIONS||stations;
      if(playing){audio.pause();playing=false;if($('radioStatus'))$('radioStatus').textContent='Radio off';if($('dialGlyph'))$('dialGlyph').textContent='▶';btn.setAttribute('aria-pressed','false');return;}
      var s=stations[idx]||stations[0];if(!s)return;
      if(audio.src!==s.url){audio.src=s.url;try{audio.load()}catch(_){}
      }
      if($('radioStatus'))$('radioStatus').textContent='Tuning…';
      var p=audio.play();if(p&&p.catch)p.catch(function(){if($('radioStatus'))$('radioStatus').textContent='Tap radio again to play'});
    };
    window.__pauseRadio=function(){if(playing){audio.pause();playing=false;btn.setAttribute('aria-pressed','false');if($('dialGlyph'))$('dialGlyph').textContent='▶';if($('radioStatus'))$('radioStatus').textContent='Radio off'}};
  }

  function wireDesktopIcons(){
    var d=$('win11Desktop');if(!d||d.dataset.iconFix)return;d.dataset.iconFix='1';
    d.addEventListener('click',function(e){var icon=e.target.closest('.desktop-icon[data-app]');if(icon&&icon.dataset.app)openApp(icon.dataset.app)},true);
  }

  function init(){
    warmYouTube();buildHaloMenu();wireWindowedOpen();wireDesktopIcons();hookYT();wireFastSelect();wirePlayButtons();setupFastRadio();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  setTimeout(init,300);setTimeout(init,1000);setTimeout(init,2000);
})();
