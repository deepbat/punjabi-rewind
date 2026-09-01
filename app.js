/* LIVE CLOCK — compact IST readout in the top-right HUD pill */
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

/* First-interaction hint fade: hide the onboarding line after a few seconds
   even if the person hasn't touched anything yet (they may just be watching). */
(function(){
  setTimeout(()=>{
    document.getElementById('onboardHint')?.classList.add('faded');
  }, 6000);
})();
