/* home-fixups.js — hide broken-image cards + dedupe carousels (2026-10-11 v2) */
(function(){
  var t;
  function clean(){
    var shelves=document.querySelectorAll('.prod-grid,.deal-grid');
    for(var s=0;s<shelves.length;s++){
      var seen={}, cards=shelves[s].querySelectorAll('.pcard');
      for(var i=0;i<cards.length;i++){
        var key=(cards[i].getAttribute('data-name')||'').trim().toLowerCase();
        if(!key) continue;
        if(seen[key]){ cards[i].remove(); continue; }
        seen[key]=1;
      }
    }
    var un=document.querySelectorAll('.pcard:not([data-imgok])');
    for(var j=0;j<un.length;j++){
      (function(card){
        card.setAttribute('data-imgok','1');
        var d=card.querySelector('.pcard-img'), url='';
        if(d){ var m=(d.getAttribute('style')||'').match(/url\(["']?([^"')]+)/); if(m) url=m[1]; }
        if(!url) url=card.getAttribute('data-img')||'';
        if(!url){ card.remove(); return; }
        var im=new Image();
        im.onerror=function(){ card.remove(); };
        im.onload=function(){ if(im.naturalWidth<=1) card.remove(); };
        im.src=url;
      })(un[j]);
    }
  }
  function schedule(){ clearTimeout(t); t=setTimeout(clean, 250); }
  function start(){
    clean();
    try{ new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true}); }catch(e){}
    setTimeout(clean,1500); setTimeout(clean,4000); setTimeout(clean,9000);
  }
  if(document.readyState!=='loading') start(); else document.addEventListener('DOMContentLoaded', start);
})();
