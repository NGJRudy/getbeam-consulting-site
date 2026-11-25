/* Navigation de l'espace consultant BEAM.
   Onglets lus dans /x/navigation.json. Affichée seulement quand une session consultant existe sur ce téléphone.
   Téléphone : barre en bas. Ordinateur : barre en haut. Langue : celle de la page (attribut lang de <html>). */
(function(){
  'use strict';
  if(window.__beamNav) return; window.__beamNav=true;
  var CLE='beam-consultant', ID=/^[a-z0-9]{2,30}$/, JETON=/^[A-Za-z0-9_-]{16,128}$/, SUR=/^\/[A-Za-z0-9/_.\-]*(#[A-Za-z0-9_-]+)?$/, SEC=/^[A-Za-z0-9_-]{1,40}$/;
  var I={
    qr:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2"/>',
    entreprises:'<path d="M4 20V6a1 1 0 011-1h8a1 1 0 011 1v14M14 10h5a1 1 0 011 1v9M3 20h18M7.5 9h3M7.5 12.5h3M7.5 16h3"/>',
    agenda:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8.5 3v4M15.5 3v4M8 14h3"/>',
    academie:'<path d="M3 5h6a3 3 0 013 3v12a2 2 0 00-2-2H3zM21 5h-6a3 3 0 00-3 3v12a2 2 0 012-2h7z"/>',
    equipe:'<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0111 0M16 6.2a3 3 0 010 5.6M17.5 14.2a5.5 5.5 0 013 4.8"/>'
  };
  function session(){ try{ var s=JSON.parse(localStorage.getItem(CLE)||'null'); if(s&&ID.test(s.a)&&JETON.test(s.t)) return s; }catch(e){} return null; }
  function langue(){ return (document.documentElement.lang||'fr').slice(0,2)==='en'?'en':'fr'; }

  var css=document.createElement('style');
  css.textContent=
    '.bnav{position:fixed;left:0;right:0;bottom:0;z-index:9;background:rgba(255,255,255,.96);-webkit-backdrop-filter:saturate(1.4) blur(12px);backdrop-filter:saturate(1.4) blur(12px);border-top:1px solid #e3e6ea;padding:4px 4px calc(4px + env(safe-area-inset-bottom))}'+
    '.bnav ul{list-style:none;margin:0 auto;padding:0;display:flex;max-width:640px}'+
    '.bnav li{flex:1 1 0;min-width:0}'+
    '.bnav a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:56px;padding:4px 0;border-radius:12px;color:#5b6270;text-decoration:none;font:600 clamp(10px,2.85vw,12px)/14px "Open Sans",Arial,sans-serif;letter-spacing:-.01em;-webkit-tap-highlight-color:transparent}'+
    '.bnav a span{max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
    '.bnav svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}'+
    '.bnav a[aria-current="page"]{color:#14171c}'+
    '.bnav a[aria-current="page"] svg{stroke-width:2.2}'+
    '.bnav a[aria-current="page"] .pt{background:#14171c}'+
    '.bnav .ic{position:relative;display:flex;flex-direction:column;align-items:center}'+
    '.bnav .pt{display:block;width:18px;height:3px;border-radius:2px;margin-top:2px;background:transparent}'+
    '.bnav a:focus-visible{outline:3px solid #2350d8;outline-offset:-3px}'+
    'body.avec-bnav{padding-bottom:calc(76px + env(safe-area-inset-bottom))}'+
    'body.avec-bnav section[id]{scroll-margin-top:12px}'+
    '@media (min-width:760px){'+
      '.bnav{position:sticky;top:0;bottom:auto;border-top:0;border-bottom:1px solid #e3e6ea;padding:0 16px}'+
      '.bnav ul{max-width:760px;gap:4px}'+
      '.bnav li{flex:0 0 auto}'+
      '.bnav a{flex-direction:row;gap:8px;min-height:56px;padding:0 14px;font-size:14px;border-radius:0;position:relative}'+
      '.bnav svg{width:20px;height:20px}'+
      '.bnav .pt{display:none}'+
      '.bnav a[aria-current="page"]::after{content:"";position:absolute;left:14px;right:14px;bottom:0;height:3px;border-radius:3px 3px 0 0;background:#14171c}'+
      'body.avec-bnav{padding-bottom:0}'+
      'body.avec-bnav section[id]{scroll-margin-top:72px}'+
    '}'+
    '@media print{.bnav{display:none}body.avec-bnav{padding-bottom:0}}';
  document.head.appendChild(css);

  var nav=null, onglets=[], courant='';

  function surPage(o){ return (o.pages||[]).some(function(p){ return location.pathname.indexOf(p)===0; }); }
  function sectionVisible(id){ var e=document.getElementById(id); return e&&!e.hidden&&e.offsetParent!==null?e:null; }

  /* Onglet allumé : celui de la page ; sur une page à plusieurs onglets, celui de la partie affichée à l'écran. */
  function calculer(){
    var cand=onglets.filter(surPage); if(!cand.length) return '';
    if(cand.length===1) return cand[0].id;
    var ligne=window.innerHeight*0.35, choix=cand.filter(function(o){ return !(o.sections||[]).length; })[0]||cand[0], meilleur=-Infinity;
    cand.forEach(function(o){ (o.sections||[]).forEach(function(s){ var e=sectionVisible(s); if(!e) return; var top=e.getBoundingClientRect().top; if(top<=ligne&&top>meilleur){ meilleur=top; choix=o; } }); });
    return choix.id;
  }
  function allumer(){
    if(!nav) return; var id=calculer(); if(id===courant) return; courant=id;
    [].forEach.call(nav.querySelectorAll('a'),function(a){ if(a.dataset.id===id) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
  }
  function dessiner(){
    var s=session();
    if(!s){ if(nav){ nav.remove(); nav=null; document.body.classList.remove('avec-bnav'); } return; }
    var L=langue(), visibles=onglets.filter(function(o){ return !o.chef||s.chef===true; }).slice(0,5);
    if(!nav){ nav=document.createElement('nav'); nav.className='bnav'; document.body.appendChild(nav);
      var m=matchMedia('(min-width:760px)'); var placer=function(){ if(m.matches) document.body.insertBefore(nav,document.body.firstChild); else document.body.appendChild(nav); };
      placer(); if(m.addEventListener) m.addEventListener('change',placer); }
    nav.setAttribute('aria-label',L==='en'?'Consultant space':'Espace consultant');
    var ul=document.createElement('ul');
    visibles.forEach(function(o){
      var li=document.createElement('li'), a=document.createElement('a'); a.href=o.lien; a.dataset.id=o.id;
      a.innerHTML='<span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true">'+(I[o.icone]||I.qr)+'</svg><span class="pt"></span></span>';
      var t=document.createElement('span'); t.textContent=(o.libelle&&(o.libelle[L]||o.libelle.fr))||o.id; a.appendChild(t);
      a.addEventListener('click',function(e){ /* même page : aller à la partie sans recharger */
        var u=o.lien.split('#'); if(location.pathname!==u[0]) return;
        e.preventDefault();
        if(u[1]){ var c=sectionVisible(u[1]); if(c){ c.scrollIntoView({behavior:reduit()?'auto':'smooth',block:'start'}); history.replaceState(null,'','#'+u[1]); } }
        else { window.scrollTo({top:0,behavior:reduit()?'auto':'smooth'}); history.replaceState(null,'',location.pathname+location.search); }
      });
      li.appendChild(a); ul.appendChild(li);
    });
    nav.textContent=''; nav.appendChild(ul); document.body.classList.add('avec-bnav'); courant=''; allumer();
  }
  function reduit(){ return window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches; }

  /* Arrivée avec #section : la partie n'apparaît qu'une fois l'espace chargé, on attend qu'elle soit là. */
  function suivreAncre(){
    var h=location.hash.slice(1); if(!SEC.test(h)) return;
    var debut=Date.now(), t=setInterval(function(){
      var e=sectionVisible(h);
      if(e){ clearInterval(t); setTimeout(function(){ e.scrollIntoView({block:'start'}); allumer(); },60); }
      else if(Date.now()-debut>10000) clearInterval(t);
    },150);
  }

  function demarrer(){
    fetch('/x/navigation.json',{cache:'no-cache'}).then(function(r){ return r.json(); }).then(function(c){
      onglets=(c&&Array.isArray(c.onglets)?c.onglets:[]).filter(function(o){
        return o&&typeof o.id==='string'&&typeof o.lien==='string'&&SUR.test(o.lien)&&o.lien.indexOf('/consultants/')===0&&(o.sections||[]).every(function(s){ return SEC.test(s); });
      });
      dessiner(); suivreAncre();
      var att=0; window.addEventListener('scroll',function(){ if(att) return; att=requestAnimationFrame(function(){ att=0; allumer(); }); },{passive:true});
      window.addEventListener('resize',allumer);
      window.addEventListener('beam-session',dessiner);           /* session ouverte ou mise à jour sur cette page */
      window.addEventListener('storage',function(e){ if(e.key===CLE) dessiner(); });
      new MutationObserver(function(){ dessiner(); }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    }).catch(function(){});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',demarrer); else demarrer();
})();
