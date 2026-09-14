/* Prevent the site's automatic fullscreen request. Browser/app manual fullscreen remains available through the browser's own controls. */
(function(){
  try{
    var root=document.documentElement;
    if(!root.requestFullscreen||root.__punjabiRewindFullscreenGuard)return;
    var original=root.requestFullscreen.bind(root);
    root.__punjabiRewindFullscreenGuard=true;
    root.__manualPunjabiRewindFullscreen=function(){
      root.requestFullscreen=original;
      return original();
    };
    root.requestFullscreen=function(){
      return Promise.reject(new DOMException('Manual fullscreen only','NotAllowedError'));
    };
  }catch(_){}
})();
