/* LIVE CLOCK — IST, shown small in the top-right HUD */
(function(){
  const clockEl=document.getElementById('clockDisplay');
  if(!clockEl) return;
  function tick(){
    const now=new Date();
    const opts={timeZone:'Asia/Kolkata',hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'};
    try{
      clockEl.textContent = new Intl.DateTimeFormat('en-GB',opts).format(now);
    }catch(e){
      clockEl.textContent = now.toLocaleTimeString();
    }
  }
  tick(); setInterval(tick,1000);
})();
