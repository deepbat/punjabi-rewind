/* LIVE CLOCK — compact IST readout in the sidebar + hero */
(function(){
  const clockEl=document.getElementById('clockDisplay');
  const heroEl=document.getElementById('heroClock');
  if(!clockEl && !heroEl) return;
  function tick(){
    const now=new Date();
    const opts={timeZone:'Asia/Kolkata',hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'};
    let text='';
    try{
      text = new Intl.DateTimeFormat('en-GB',opts).format(now);
    }catch(e){
      text = now.toLocaleTimeString();
    }
    if(clockEl) clockEl.textContent = text + ' IST';
    if(heroEl) heroEl.textContent = text + ' IST';
  }
  tick(); setInterval(tick,1000);
})();
