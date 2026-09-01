(function(){
 const hint=document.getElementById('onboardHint'),hero=document.getElementById('heroCopy');
 const begin=document.getElementById('beginExplore');
 function enter(){hint?.classList.add('faded');hero?.classList.add('away');}
 begin?.addEventListener('click',()=>{enter();window.__enterAutopilot?.();setTimeout(()=>window.__exitAutopilot?.(),900)});
 setTimeout(()=>hint?.classList.add('faded'),7000);
 window.__enterExperience=enter;
})();
