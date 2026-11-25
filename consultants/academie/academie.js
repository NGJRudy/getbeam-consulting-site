/* Académie BEAM : socle commun aux pages de l'académie (session, config, langue, progression, couvertures).
   Tout le contenu vient de /x/academie.json. */
(function(){
  'use strict';
  var CLE='beam-consultant', CLE_LU='beam-academie-lu', CLE_P='beam-academie-page', CLE_L='beam-academie-langue';
  var ID=/^[a-z0-9]{2,30}$/, JETON=/^[A-Za-z0-9_-]{16,128}$/, DOC=/^[a-z0-9-]{2,40}$/, COUL=/^#[0-9A-Fa-f]{6}$/;
  var A={};
  A.T={
    fr:{titre:'Académie BEAM',intro:'Toutes les formations BEAM, au même endroit. Suivez le parcours dans l’ordre, puis gardez la boîte à outils sous la main.',
        retour:'Retour à mon espace',academie:'Académie',aide:'Une question ? team@getbeam-consulting.com',
        ouvrir:'Ouvrir',lire:'Commencer la lecture',reprendre:function(p){ return 'Reprendre à la page '+p; },relire:'Relire',
        pdf:'Télécharger le PDF',lu:'Marquer comme lu',fait:'Lu',min:' min',pages:function(n){ return n+' pages'; },
        bientot:'Bientôt disponible',enfr:'en français',nouveau:'À lire',encours:function(p,n){ return 'Page '+p+' sur '+n; },
        suivant:'Votre prochaine étape',commencer:'Commencer',bravo:'Vous avez tout lu. Gardez la boîte à outils sous la main.',
        attente:'Les prochains modules arrivent bientôt. En attendant, la boîte à outils est à vous.',
        progres:function(n,t){ return n+' sur '+t+' lus'; },
        objectifs:'Ce que vous saurez faire',programme:'Au programme',page:'p. ',
        fermer:'Fermer',pageX:function(p,n){ return 'Page '+p+' / '+n; },fin:'Module terminé',
        apres:'Ensuite',retourAcad:'Retour à l’académie',
        acces:'Cette page s’ouvre depuis votre espace consultant. Ouvrez-le avec le bouton de votre e-mail BEAM, puis revenez ici.',
        ferme:'L’académie n’est pas disponible pour le moment.',introuvable:'Ce module n’existe pas.'},
    en:{titre:'BEAM Academy',intro:'All BEAM training in one place. Follow the path in order, then keep the toolbox at hand.',
        retour:'Back to my space',academie:'Academy',aide:'Questions? team@getbeam-consulting.com',
        ouvrir:'Open',lire:'Start reading',reprendre:function(p){ return 'Continue at page '+p; },relire:'Read again',
        pdf:'Download the PDF',lu:'Mark as read',fait:'Read',min:' min',pages:function(n){ return n+' pages'; },
        bientot:'Coming soon',enfr:'in French',nouveau:'To read',encours:function(p,n){ return 'Page '+p+' of '+n; },
        suivant:'Your next step',commencer:'Start',bravo:'You have read everything. Keep the toolbox at hand.',
        attente:'The next modules are coming soon. In the meantime, the toolbox is yours.',
        progres:function(n,t){ return n+' of '+t+' read'; },
        objectifs:'What you will be able to do',programme:'What’s inside',page:'p. ',
        fermer:'Close',pageX:function(p,n){ return 'Page '+p+' / '+n; },fin:'Module complete',
        apres:'Next',retourAcad:'Back to the academy',
        acces:'This page opens from your consultant space. Open it with the button in your BEAM e-mail, then come back here.',
        ferme:'The academy is not available right now.',introuvable:'This module does not exist.'}
  };
  A.L='fr';
  try{ var l0=localStorage.getItem(CLE_L); if(l0==='en'||l0==='fr') A.L=l0; else if((navigator.language||'').slice(0,2)==='en') A.L='en'; }catch(e){}
  function lire(k){ try{ return JSON.parse(localStorage.getItem(k)||'{}')||{}; }catch(e){ return {}; } }
  A.lu=lire(CLE_LU); A.pos=lire(CLE_P);
  A.sauve=function(){ try{ localStorage.setItem(CLE_LU,JSON.stringify(A.lu)); localStorage.setItem(CLE_P,JSON.stringify(A.pos)); }catch(e){} };
  A.langue=function(l){ A.L=l; try{ localStorage.setItem(CLE_L,l); }catch(e){} };
  A.t=function(k){ return A.T[A.L][k]; };
  A.tx=function(o){ return o&&(o[A.L]||o.fr)||''; };
  A.sur=function(u){ return typeof u==='string'&&/^\/[A-Za-z0-9/_.\-]*$/.test(u); };
  A.el=function(tag,cls,txt){ var e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; };
  A.couleur=function(d){ return COUL.test(d.couleur||'')?d.couleur:'#14171C'; };
  /* Texte lisible sur la couleur du module : foncé sur une couleur claire, blanc sinon. */
  A.surCouleur=function(d){ var h=A.couleur(d), r=parseInt(h.substr(1,2),16), g=parseInt(h.substr(3,2),16), b=parseInt(h.substr(5,2),16);
    return (0.299*r+0.587*g+0.114*b)>160?'#14171C':'#FFFFFF'; };

  /* Langue réellement servie pour un document (le français si la version demandée n'existe pas). */
  A.version=function(d){ var f=d.fichier||{}; if(A.sur(f[A.L])) return A.L; if(A.sur(f.fr)) return 'fr'; return ''; };
  A.lien=function(d){ var v=A.version(d); return v?d.fichier[v]:''; };
  A.dispo=function(d){ return !!A.version(d); };
  A.nbPages=function(d){ var v=A.version(d); return v&&d.pages&&+d.pages[v]||0; };
  A.lecteur=function(d){ return d.type==='pdf'&&DOC.test(d.id)&&A.nbPages(d)>0; };
  A.dossier=function(d){ return '/consultants/academie/docs/'+d.id+'/'+A.version(d)+'/'; };
  A.pageModule=function(d){ return d.type==='pdf'?'/consultants/academie/module/?d='+encodeURIComponent(d.id):A.lien(d); };
  A.etat=function(d){ /* 'bientot' | 'lu' | 'encours' | 'nouveau' */
    if(!A.dispo(d)) return 'bientot';
    if(A.lu[d.id]) return 'lu';
    var p=A.pos[d.id]; if(p&&p.p>1) return 'encours';
    return 'nouveau';
  };

  /* Couverture : l'image générée par tools/academie_pages.py, sinon une couverture dessinée aux couleurs du module. */
  A.couverture=function(d,grande){
    var c=A.el('div','couv'+(grande?' grande':'')); c.style.setProperty('--m',A.couleur(d)); c.style.setProperty('--m-txt',A.surCouleur(d));
    if(A.lecteur(d)){
      var im=A.el('img'); im.src=A.dossier(d)+'couverture.webp'; im.alt=''; im.width=960; im.height=540; im.decoding='async';
      c.appendChild(im);
    } else {
      c.classList.add('dessin');
      var t=A.tx(d.titre), m=t.split(' · ');
      c.appendChild(A.el('span','couv-pill',(m.length>1?m[0]:A.t('academie')).toUpperCase()));
      c.appendChild(A.el('span','couv-titre',m.length>1?m.slice(1).join(' · '):t));
    }
    return c;
  };

  A.meta=function(d){
    var x=[]; if(d.minutes) x.push(d.minutes+A.t('min'));
    var n=A.nbPages(d); if(n) x.push(A.T[A.L].pages(n));
    if(A.L==='en'&&A.version(d)==='fr') x.push(A.t('enfr'));
    return x.join(' · ');
  };

  A.traduire=function(){
    document.documentElement.lang=A.L;
    [].forEach.call(document.querySelectorAll('[data-t]'),function(e){ var v=A.t(e.getAttribute('data-t')); if(typeof v==='string') e.textContent=v; });
    [].forEach.call(document.querySelectorAll('.langue button'),function(b){ b.setAttribute('aria-pressed',b.getAttribute('data-l')===A.L?'true':'false'); });
  };
  A.boutonsLangue=function(rendre){
    [].forEach.call(document.querySelectorAll('.langue button'),function(b){ b.onclick=function(){ A.langue(b.getAttribute('data-l')); A.traduire(); if(A.cfg) rendre(); }; });
  };

  /* Vérifie la session consultant puis charge la config. ok(cfg) ou erreur(message). */
  A.demarrer=function(ok,erreur){
    var a='',t='';
    try{ var s=JSON.parse(localStorage.getItem(CLE)||'null'); if(s){ a=s.a; t=s.t; } }catch(e){}
    if(!ID.test(a)||!JETON.test(t)){ erreur(A.t('acces')); return; }
    Promise.all([
      fetch('/x/consultants.json',{cache:'no-cache'}).then(function(r){ return r.json(); }),
      fetch('/x/academie.json',{cache:'no-cache'}).then(function(r){ return r.json(); })
    ]).then(function(v){
      var c=v[0], cfg=v[1];
      if(!c.webhook||!cfg||!Array.isArray(cfg.documents)) throw new Error('ferme');
      return fetch(c.webhook,{method:'POST',body:new URLSearchParams({action:'verification',id:a,jeton:t})}).then(function(r){ return r.json(); }).then(function(j){
        if(!j||j.ok!==true){ try{ localStorage.removeItem(CLE); }catch(e){} erreur(A.t('acces')); return; }
        A.cfg=cfg; ok(cfg);
      });
    }).catch(function(){ erreur(A.t('ferme')); });
  };
  window.Academie=A;
})();
