/* LIVE CLOCK — IST, driving the top-plate LCD */
(function(){
  const clockEl=document.getElementById('clockDisplay');
  const dateEl=document.getElementById('clockDate');
  if(!clockEl) return;
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

/* One quiet settle-in on load for the three console modules — no repeats, no scroll triggers. */
(function(){
  document.addEventListener('DOMContentLoaded',()=>{
    const seq=[document.querySelector('.tuner-module'),document.querySelector('.deck-module'),document.querySelector('.vault-module')];
    seq.forEach((el,i)=>{
      if(!el) return;
      el.style.opacity='0';
      el.style.transform='translateY(8px)';
      el.style.transition='opacity .45s ease, transform .45s ease';
      setTimeout(()=>{el.style.opacity='1';el.style.transform='translateY(0)'},70+i*80);
    });
  });
})();
