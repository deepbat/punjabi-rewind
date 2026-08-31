/* LIVE CLOCK — IST */
(function(){
  const clockEl=document.getElementById('clockDisplay');
  const dateEl=document.getElementById('clockDate');
  if(!clockEl) return;
  function pad(n){return String(n).padStart(2,'0')}
  function tick(){
    const now=new Date();
    const opts={timeZone:'Asia/Kolkata',hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit',weekday:'short',day:'2-digit',month:'short'};
    try{
      const parts=new Intl.DateTimeFormat('en-GB',opts).formatToParts(now);
      const get=t=> (parts.find(p=>p.type===t)?.value||'');
      clockEl.textContent = `${get('hour')}:${get('minute')}:${get('second')} IST`;
      dateEl.textContent = `${get('weekday')} ${get('day')} ${get('month')}`;
    }catch(e){
      clockEl.textContent = now.toLocaleTimeString();
      dateEl.textContent = now.toDateString();
    }
  }
  tick(); setInterval(tick,1000);
})();

/* One orchestrated load-in — masthead, tuner, and bill settle into place once. No scroll-triggered repeats. */
(function(){
  document.addEventListener('DOMContentLoaded',()=>{
    const seq=[document.querySelector('.masthead'),document.querySelector('.stat-row'),document.querySelector('.tuner'),document.querySelector('.bill')];
    seq.forEach((el,i)=>{
      if(!el) return;
      el.style.opacity='0';
      el.style.transform='translateY(10px)';
      el.style.transition='opacity .5s ease, transform .5s ease';
      setTimeout(()=>{el.style.opacity='1';el.style.transform='translateY(0)'},80+i*90);
    });
  });
})();
