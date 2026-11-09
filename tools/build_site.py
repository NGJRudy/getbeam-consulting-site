#!/usr/bin/env python3
"""Build getbeam-consulting.com static site (FR + EN) from the design export.

Structure produced in ./site :
  index.html            -> language picker (navigator.language, saved choice)
  fr/index.html         -> page FR (+ ProductFrame.dc.html)
  en/index.html         -> page EN
  fr/mentions-legales.html, en/legal.html
  assets/ vendor/ support.js  (shared)
  CNAME, .nojekyll, 404.html
All texts live in the FR dict below: to change a wording, edit one entry.
"""
import os, re, shutil, json

SRC = os.path.join(os.path.dirname(__file__), 'site_src')
OUT = os.path.join(os.path.dirname(__file__), 'site')
DOMAIN = 'getbeam-consulting.com'
CONTACT_EMAIL = 'team@getbeam-consulting.com'
CONSOLE = 'https://console.b1m.ai'
DOCS = 'https://docs.b1m.ai'
# Liens externes (console, docs, GitHub, X) : nouvel onglet, le site reste ouvert.
_EXT_LINK = re.compile(r'<a (?![^>]*\btarget=)([^>]*\bhref="https?://(?!(?:www\.)?getbeam-consulting\.com)[^"]*"[^>]*)>')
def ext_new_tab(s):
    return _EXT_LINK.sub(r'<a target="_blank" rel="noopener" \1>', s)
# HubSpot form (portal 52267765). FORM_ID filled once the site form exists.
HS_PORTAL = '52267765'
HS_FORM_ID = os.environ.get('HS_FORM_ID', '6a12c0b5-ef91-4ec9-99cc-84fe26383859')  # form FR (new editor)
HS_REGION = os.environ.get('HS_REGION', 'na1')

# ---------------------------------------------------------------- FR texts
FR_TEXT = {
 'New: Rooms connect your machines, buckets and AI agents in one private network.': 'Nouveau : les Rooms relient vos serveurs, buckets et agents IA dans un réseau privé.',
 'Read the guide': 'Lire le guide',
 'Product ▾': 'Produit ▾', 'Solutions ▾': 'Solutions ▾', 'Developers ▾': 'Développeurs ▾',
 'Integrations': 'Intégrations', 'Pricing': 'Tarifs',
 'Data Transfer': 'Transfert de données',
 'Move massive data. Pay egress once.': 'Déplacez des volumes massifs. Payez l’egress une seule fois.',
 'Hundreds of workers move your objects in parallel, from one source to every destination. The source is read once, every part is verified on arrival.':
   'Des centaines de nœuds transfèrent vos fichiers en parallèle, d’une source vers toutes vos destinations. La source n’est lue qu’une fois, chaque morceau est vérifié à l’arrivée.',
 'See pricing →': 'Voir les tarifs →',
 'Pay per TB, no contract': 'Payé au To, sans engagement',
 'Storage keys never leave your side': 'Vos clés de stockage restent chez vous',
 'Every part verified at arrival': 'Chaque morceau vérifié à l’arrivée',
 'Works with the storage you already run': 'Compatible avec le stockage que vous utilisez déjà',
 'Everything you need to move data at scale': 'Tout pour déplacer vos données à grande échelle',
 'A private network for your machines, buckets and agents': 'Un réseau privé pour vos serveurs, buckets et agents',
 'Roles, per-channel grants and invitations. End-to-end encrypted between agents.': 'Rôles, droits par canal et invitations. Chiffré de bout en bout entre agents.',
 'Explore Rooms': 'Découvrir les Rooms',
 'Fan-out': 'Fan-out',
 'One read, every destination': 'Une lecture, toutes les destinations',
 'The source is read once, whatever the number of targets. Egress paid once.': 'La source n’est lue qu’une fois, quel que soit le nombre de cibles. L’egress est payé une fois.',
 'See supported storage': 'Voir les stockages compatibles',
 'Telemetry': 'Télémétrie',
 'Watch every part land, live': 'Suivez chaque morceau arriver, en direct',
 'Throughput per destination, parts verified, slow chunks reassigned automatically.': 'Débit par destination, morceaux vérifiés, morceaux lents réattribués automatiquement.',
 'Read the transfer docs': 'Documentation des transferts',
 'Build data pipelines visually, on your own servers': 'Construisez vos pipelines de données visuellement, sur vos serveurs',
 'Schedules, integrity checks, branches and retries, self-hosted.': 'Planification, contrôles d’intégrité, branches et reprises, auto-hébergé.',
 'Explore Studio': 'Découvrir Studio',
 'How BEAM moves data': 'Comment BEAM déplace les données',
 'Three primitives, one network': 'Trois briques, un seul réseau',
 'Send once, send to many, or keep exchanging. Pick a primitive to see what it does.': 'Envoyer une fois, envoyer à plusieurs, ou échanger en continu. Choisissez une brique pour voir ce qu’elle fait.',
 'Read the docs →': 'Lire la documentation →',
 'Worked example': 'Exemple chiffré',
 'Copying 1 TB from Amazon S3 to four destinations costs $360 in egress alone. With BEAM, the source is read once: $130.10 in total.':
   'Copier 1 To depuis Amazon S3 vers quatre destinations coûte 360 $ d’egress à lui seul. Avec BEAM, la source n’est lue qu’une fois : 130,10 $ au total.',
 '4 sequential copies': '4 copies successives',
 'BEAM fan-out': 'Fan-out BEAM',
 'Amazon S3 internet egress at $0.09/GB (first 10 TB tier) for each copy, versus one read with BEAM plus $10/TB per destination and $0.10 per transfer. Illustrative, not a quote.':
   'Egress internet Amazon S3 à 0,09 $/Go (palier des 10 premiers To) pour chaque copie, contre une seule lecture avec BEAM plus 10 $/To par destination et 0,10 $ par transfert. Exemple indicatif, pas un devis.',
 'on this transfer': 'sur ce transfert',
 'Try your own numbers →': 'Testez avec vos chiffres →',
 'measured on 100 GB transfers, public network telemetry': 'mesurés sur des transferts de 100 Go, télémétrie publique du réseau',
 'source read, whatever the number of destinations': 'lecture de la source, quel que soit le nombre de destinations',
 'minimum chunk size, written directly to the destination': 'taille minimale d’un morceau, écrit directement à destination',
 'Pay for what you move': 'Payez ce que vous transférez',
 'Credits, no subscription. Pay by card in USD, or in TAO.': 'Des crédits, sans abonnement. Paiement par carte en USD, ou en TAO.',
 'Open the console →': 'Ouvrir la console →',
 'Transfers': 'Transferts',
 'per TB moved': 'par To transféré',
 '+ $0.10 per transfer': '+ 0,10 $ par transfert',
 'Fan-out: one source read for every destination': 'Fan-out : une seule lecture de la source pour toutes les destinations',
 'No minimum, no contract': 'Sans minimum, sans engagement',
 'to start a Room': 'pour démarrer une Room',
 'Messages and streams included': 'Messages et flux inclus',
 'Files billed per receiving member': 'Fichiers facturés par membre destinataire',
 'Partners join by invitation': 'Les partenaires rejoignent sur invitation',
 'workflows, self-hosted': 'workflows, auto-hébergés',
 'Runs on your Linux host with Docker': 'Tourne sur votre serveur Linux avec Docker',
 'You pay only for the transfers it runs': 'Vous ne payez que les transferts exécutés',
 'Schedules, checks, retries, history': 'Planification, contrôles, reprises, historique',
 'Plugs into the stack you already have': 'S’intègre à vos outils existants',
 'SDKs in four languages, a self-hosted Studio, an MCP server for AI agents and onchain receipts for smart contracts. Nothing to migrate.':
   'Des SDK en quatre langages, un Studio auto-hébergé, un serveur MCP pour les agents IA et des reçus onchain pour les smart contracts. Rien à migrer.',
 'See all integrations →': 'Voir toutes les intégrations →',
 'Studio on Docker': 'Studio sur Docker', 'MCP server': 'Serveur MCP',
 'Slack alerts': 'Alertes Slack', 'Chainlink CRE · testing': 'Chainlink CRE · en test',
 'Onchain receipts': 'Reçus onchain', 'HTTPS endpoints': 'Points d’accès HTTPS', 'REST API →': 'API REST →',
 'Security': 'Sécurité',
 'Your keys and your data stay yours': 'Vos clés et vos données restent à vous',
 'Designed for the questions security and procurement teams ask first.': 'Conçu pour les questions que vos équipes sécurité et achats posent en premier.',
 'Read the architecture →': 'Lire l’architecture →',
 'Credentials stay with you': 'Vos identifiants restent chez vous',
 'Your SDK or self-hosted Studio signs short-lived access for each chunk. Workers never receive your storage keys.':
   'Votre SDK ou votre Studio auto-hébergé signe un accès de courte durée pour chaque morceau. Les nœuds ne reçoivent jamais vos clés de stockage.',
 'Verified at arrival': 'Vérifié à l’arrivée',
 'Every part is checked at the destination before the object is finalized. Failed or slow chunks are retried elsewhere.':
   'Chaque morceau est contrôlé à destination avant que le fichier soit finalisé. Les morceaux en échec ou lents sont relancés ailleurs.',
 'End-to-end encrypted Rooms': 'Rooms chiffrées de bout en bout',
 'Objects and streams exchanged between agents in a Room are encrypted end to end with MLS. Workers only see ciphertext.':
   'Les fichiers et flux échangés entre agents dans une Room sont chiffrés de bout en bout avec MLS. Les nœuds ne voient que des données chiffrées.',
 'Scoped keys and budgets': 'Clés limitées et budgets',
 'Project-scoped API keys, key rotation, credit caps and monthly budgets with alerts. Usage exports through the management API.':
   'Clés d’API par projet, rotation des clés, plafonds de crédits et budgets mensuels avec alertes. Exports de consommation via l’API de gestion.',
 'In provider transfers, workers handle payload bytes in transit. Encrypt client-side, or use agent-only Room channels, for data no third party may read.':
   'Lors des transferts via le réseau, les nœuds manipulent les données en transit. Pour des données qu’aucun tiers ne doit lire, chiffrez côté client ou utilisez les canaux Room réservés aux agents.',
 'Ready to move data?': 'Prêt à déplacer vos données ?',
 'Run a proof of concept on your own data': 'Faites un test sur vos propres données',
 'Distributed data movement for clouds, servers and agents.': 'Transfert de données distribué pour clouds, serveurs et agents.',
 'Product': 'Produit', 'Transfers and fan-out': 'Transferts et fan-out',
 'Developers': 'Développeurs', 'Documentation': 'Documentation', 'Quickstart': 'Démarrage rapide',
 'API reference': 'Référence API', 'Network': 'Réseau', 'Orchestrators': 'Orchestrateurs', 'Company': 'Société',
 'Product and company names are trademarks of their respective owners, including Cloudflare® (Cloudflare, Inc.) and Amazon S3 (Amazon.com, Inc. or its affiliates). They are used only to describe technical compatibility; no partnership or endorsement is implied.':
   'Les noms de produits et de sociétés sont des marques de leurs propriétaires respectifs, notamment Cloudflare® (Cloudflare, Inc.) et Amazon S3 (Amazon.com, Inc. ou ses filiales). Ils sont cités uniquement pour indiquer une compatibilité technique, sans partenariat ni approbation.',
 # ProductFrame
 'Estimate a transfer': 'Estimez un transfert',
 'Choose a source, a volume and up to four destinations.': 'Choisissez une source, un volume et jusqu’à quatre destinations.',
 'Source': 'Source', 'Volume': 'Volume', 'Destinations': 'Destinations',
 'HTTPS server': 'Serveur HTTPS', 'GPU cluster': 'Cluster GPU', '✓ Verified': '✓ Vérifié',
 'Egress billed': 'Egress facturé', 'BEAM fee': 'Frais BEAM', 'Est. time': 'Durée estimée',
 'Estimate only. Times at 11 Gb/s, the low end of public network telemetry; Amazon S3 egress at $0.09/GB.':
   'Estimation uniquement. Durées calculées à 11 Gb/s, le bas de la fourchette de la télémétrie publique ; egress Amazon S3 à 0,09 $/Go.',
}
# strings inside the JS logic (primitives tabs + simulator)
FR_JS = {
 '"Point to point, at full speed"': '"Point à point, à pleine vitesse"',
 '"Objects are split into chunks of 40 MiB or more and written straight from source to destination by hundreds of workers. Slow chunks are reassigned automatically."':
   '"Les fichiers sont découpés en morceaux de 40 Mio ou plus, écrits directement de la source vers la destination par des centaines de nœuds. Les morceaux lents sont réattribués automatiquement."',
 '"Parallel multipart"': '"Multipart parallèle"',
 '{ k: "Chunk size", v: "40 MiB minimum" }': '{ k: "Taille des morceaux", v: "40 Mio minimum" }',
 '{ k: "Central relay", v: "None" }': '{ k: "Relais central", v: "Aucun" }',
 '{ k: "Integrity", v: "Verified per part" }': '{ k: "Intégrité", v: "Vérifiée par morceau" }',
 'label: "Transfer"': 'label: "Transfert"',
 '"One read, every destination"': '"Une lecture, toutes les destinations"',
 '"Name several destinations in a single transfer. The source is read once, so you pay its egress once, whatever the number of targets."':
   '"Indiquez plusieurs destinations dans un seul transfert. La source n’est lue qu’une fois : vous payez son egress une fois, quel que soit le nombre de cibles."',
 '"Egress paid once"': '"Egress payé une fois"',
 '{ k: "Source reads", v: "1\\u00d7" }': '{ k: "Lectures de la source", v: "1\\u00d7" }',
 '{ k: "Destinations", v: "N in one call" }': '{ k: "Destinations", v: "N en un appel" }',
 '{ k: "Each target", v: "Tracked and verified" }': '{ k: "Chaque cible", v: "Suivie et vérifiée" }',
 '"Ongoing exchange, with permissions"': '"Échange continu, avec des droits"',
 '"Machines, buckets and agents join a private Room with roles and per-channel grants. Partners join from an invitation, without a BEAM account."':
   '"Serveurs, buckets et agents rejoignent une Room privée, avec des rôles et des droits par canal. Les partenaires entrent sur invitation, sans compte BEAM."',
 '"End-to-end between agents"': '"Bout en bout entre agents"',
 '{ k: "Members", v: "Machines, buckets, agents" }': '{ k: "Membres", v: "Serveurs, buckets, agents" }',
 '{ k: "Access", v: "Per-channel grants" }': '{ k: "Accès", v: "Droits par canal" }',
 '{ k: "Onboarding", v: "Bounded invitations" }': '{ k: "Arrivée", v: "Invitations encadrées" }',
 # simulator
 "' destination' + (k > 1 ? 's' : '')": "' destination' + (k > 1 ? 's' : '')",
 "'× faster than sequential'": "'× plus rapide qu’en séquentiel'",
 "'one read · was '": "'une lecture · au lieu de '",
 "'one destination'": "'une destination'",
 "'egress-free source'": "'source sans egress'",
 "' at $10/TB + $0.10'": "' à 10 $/To + 0,10 $'",
 "'vs '": "'contre '",
 "' sequential'": "' en séquentiel'",
 "'You save'": "'Économie'",
 "'Extra cost'": "'Surcoût'",
 "'Total cost'": "'Coût total'",
 "'on this transfer'": "'sur ce transfert'",
 "'for an ≈ 11× faster transfer'": "'pour un transfert ≈ 11× plus rapide'",
 "'no egress · ≈ 11× faster'": "'sans egress · ≈ 11× plus rapide'",
}

UI = {
 'fr': dict(lang='fr', title='BEAM — Transférez vos données massives, payez l’egress une fois',
            desc='BEAM déplace vos données d’une source vers toutes vos destinations en parallèle. La source est lue une fois : jusqu’à −64 % sur l’egress. Démo et test sur vos données.',
            book='Prendre rendez-vous', console='Ouvrir la console', console_short='Console',
            final_primary='Prendre rendez-vous', final_secondary='Ouvrir la console',
            hero_primary='Prendre rendez-vous', sim_cta='Parler de ce transfert',
            other_lang='EN', other_href='../en/', legal_href='mentions-legales.html',
            legal='Mentions légales', privacy='Confidentialité', cookies='Cookies',
            contact='Contact', copyright='© 2026 Beam Consulting. Partenaire commercial de BEAM.',
            m_title='Parlons de vos transferts de données',
            m_sub='Un expert vous rappelle sous 24 h ouvrées pour une démo de 30 minutes et un test sur vos propres données.',
            m_fallback='Le formulaire ne s’affiche pas ? Écrivez-nous à',
            m_close='Fermer', m_privacy='Vos informations servent uniquement à vous recontacter au sujet de BEAM.', m_privacy_link='Politique de confidentialité'),
 'en': dict(lang='en', title='BEAM — Move massive data, pay egress once',
            desc='BEAM moves your data from one source to every destination in parallel. The source is read once: up to −64% on egress. Book a demo and a test on your own data.',
            book='Book a call', console='Open the console', console_short='Console',
            final_primary='Book a call', final_secondary='Open the console',
            hero_primary='Book a call', sim_cta='Discuss this transfer',
            other_lang='FR', other_href='../fr/', legal_href='legal.html',
            legal='Legal notice', privacy='Privacy', cookies='Cookies',
            contact='Contact', copyright='© 2026 Beam Consulting. Sales partner of BEAM.',
            m_title='Let’s talk about your data transfers',
            m_sub='An expert gets back to you within one business day for a 30-minute demo and a test on your own data.',
            m_fallback='Form not showing? Email us at',
            m_close='Close', m_privacy='Your details are only used to contact you about BEAM.', m_privacy_link='Privacy policy'),
}

def sub_text(src, mapping):
    """Replace text nodes (>  text  <) exactly, keeping surrounding whitespace."""
    for en, fr in mapping.items():
        pat = re.compile(r'>(\s*)' + re.escape(en) + r'(\s*)<')
        src, n = pat.subn(lambda m: '>' + m.group(1) + fr + m.group(2) + '<', src)
    return src

def must_replace(src, old, new, count=1, label=''):
    n = src.count(old)
    if n < 1:
        raise SystemExit(f'MISSING [{label}]: {old[:90]}')
    return src.replace(old, new) if count == 0 else src.replace(old, new, count)

def modal_html(u):
    form_div = '<div id="hs-form"></div>'
    return f'''
<!-- Contact (hors composant design : formulaire HubSpot) -->
<div id="contact-modal" role="dialog" aria-modal="true" aria-labelledby="cm-title" hidden>
  <div class="cm-backdrop" data-close></div>
  <div class="cm-card">
    <button class="cm-x" type="button" data-close aria-label="{u['m_close']}">×</button>
    <p class="cm-eyebrow">BEAM</p>
    <h2 id="cm-title">{u['m_title']}</h2>
    <p class="cm-sub">{u['m_sub']}</p>
    {form_div}
    <p class="cm-note">{u['m_fallback']} <a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a></p>
    <p class="cm-note">{u['m_privacy']} <a href="{u['legal_href']}#confidentialite">{u['m_privacy_link']}</a></p>
  </div>
</div>
<style>
#contact-modal[hidden]{{display:none}}
#contact-modal{{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:16px}}
.cm-backdrop{{position:absolute;inset:0;background:rgba(11,13,16,.55);backdrop-filter:blur(4px)}}
.cm-card{{position:relative;width:min(560px,calc(100vw - 32px));box-sizing:border-box;max-height:calc(100vh - 32px);overflow:auto;background:#fff;border-radius:20px;padding:32px;box-shadow:0 30px 60px -24px rgba(20,23,28,.45);font:400 16px/26px 'Open Sans',Arial,sans-serif;color:#14171c}}
.cm-card h2{{font:600 26px/32px 'Open Sans',Arial,sans-serif;margin:4px 0 8px}}
.cm-eyebrow{{font:500 12px/16px 'IBM Plex Mono',monospace;letter-spacing:.08em;color:#2350d8;margin:0}}
.cm-sub{{color:#5b6270;margin:0 0 20px}}
.cm-note{{font-size:13px;line-height:20px;color:#5b6270;margin:12px 0 0}}
.cm-x{{position:absolute;top:12px;right:12px;width:40px;height:40px;border:0;border-radius:999px;background:#f4f5f7;font-size:24px;line-height:1;cursor:pointer;color:#14171c}}
.lang-switch{{font:600 13px/20px 'Open Sans',Arial,sans-serif;color:#14171c;text-decoration:none;padding:8px 10px;border-radius:999px}}
.lang-switch:hover{{background:#f4f5f7}}
@media (max-width:600px){{.cm-card{{padding:24px 20px}}}}
</style>
<script>
(function(){{
  var PORTAL="{HS_PORTAL}", FORM="{HS_FORM_ID}", REGION="{HS_REGION}", LANG="{u['lang']}";
  var modal=document.getElementById('contact-modal'), loaded=false, lastFocus=null;
  function loadForm(){{
    if(loaded||!FORM) return; loaded=true;
    var box=document.getElementById('hs-form'); var f=document.createElement('div');
    f.className='hs-form-frame'; f.setAttribute('data-region',REGION); f.setAttribute('data-form-id',FORM); f.setAttribute('data-portal-id',PORTAL);
    box.appendChild(f);
    var s=document.createElement('script'); s.src='https://js.hsforms.net/forms/embed/'+PORTAL+'.js'; s.defer=true;
    document.head.appendChild(s);
  }}
  function open(){{ lastFocus=document.activeElement; modal.hidden=false; document.body.style.overflow='hidden'; loadForm(); var x=modal.querySelector('.cm-x'); x&&x.focus(); }}
  function close(){{ modal.hidden=true; document.body.style.overflow=''; if(location.hash==='#contact') history.replaceState(null,'',location.pathname+location.search); lastFocus&&lastFocus.focus&&lastFocus.focus(); }}
  document.addEventListener('click',function(e){{
    var a=e.target.closest&&e.target.closest('a[href="#contact"]'); if(a){{ e.preventDefault(); open(); return; }}
    if(e.target.closest&&e.target.closest('[data-close]')) close();
  }});
  document.addEventListener('keydown',function(e){{ if(e.key==='Escape'&&!modal.hidden) close(); }});
  if(location.hash==='#contact') open();
  window.addEventListener('hashchange',function(){{ if(location.hash==='#contact') open(); }});
  try{{ localStorage.setItem('lang',LANG); }}catch(e){{}}
}})();
</script>
'''

def head_meta(u, path):
    return (f'<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            f'<meta name="description" content="{u["desc"]}">\n'
            f'<link rel="canonical" href="https://{DOMAIN}/{path}">\n'
            f'<link rel="alternate" hreflang="fr" href="https://{DOMAIN}/fr/">\n'
            f'<link rel="alternate" hreflang="en" href="https://{DOMAIN}/en/">\n'
            f'<link rel="alternate" hreflang="x-default" href="https://{DOMAIN}/">\n'
            f'<meta property="og:title" content="{u["title"]}">\n'
            f'<meta property="og:description" content="{u["desc"]}">\n'
            f'<meta property="og:url" content="https://{DOMAIN}/{path}">\n'
            f'<meta property="og:type" content="website">\n'
            f'<link rel="icon" href="../favicon.svg" type="image/svg+xml">\n')

def build_main(lang):
    u = UI[lang]
    s = open(os.path.join(SRC, 'Main.dc.html'), encoding='utf-8').read()
    # shared files one level up
    for a in ('./vendor/', './support.js', './assets/'):
        s = s.replace(a, '../' + a[2:])
    s = must_replace(s, '<html lang="en">', f'<html lang="{lang}">', label='lang')
    s = must_replace(s, '<title>BEAM · Home · desktop</title>', f'<title>{u["title"]}</title>\n' + head_meta(u, lang + '/'), label='title')
    # --- CTAs
    s = must_replace(s, 'border: 1px solid #14171c; color: #14171c; text-decoration: none;">Read the docs</a>',
                     f'border: 1px solid #14171c; color: #14171c; text-decoration: none;">{u["console_short"]}</a>', label='nav docs txt')
    s = must_replace(s, '<a href="https://docs.b1m.ai" style="font: 600 14px/20px \'Open Sans\', Arial, sans-serif; padding: 8px 14px;',
                     f'<a href="{u["other_href"]}" class="lang-switch" hreflang="{u["other_lang"].lower()}" aria-label="{u["other_lang"]}">{u["other_lang"]}</a><a href="{CONSOLE}" style="font: 600 14px/20px \'Open Sans\', Arial, sans-serif; padding: 8px 14px;', label='nav docs href')
    s = must_replace(s, '<a href="https://console.b1m.ai" style="font: 600 14px/20px \'Open Sans\', Arial, sans-serif; padding: 9px 15px; border-radius: 999px; background: #0b0d10; color: #ffffff; text-decoration: none;">Start building</a>',
                     f'<a href="#contact" style="font: 600 14px/20px \'Open Sans\', Arial, sans-serif; padding: 9px 15px; border-radius: 999px; background: #0b0d10; color: #ffffff; text-decoration: none;">{u["book"]}</a>', label='nav cta')
    s = re.sub(r'<a href="https://console\.b1m\.ai"( style="font: 600 15px/22px[^"]*">)Start a transfer</a>',
               lambda m: '<a href="#contact"' + m.group(1) + u['hero_primary'] + '</a>', s)
    if u['hero_primary'] not in s: raise SystemExit('hero cta')
    s = must_replace(s, '<a href="https://console.b1m.ai" style="font: 600 16px/24px \'Open Sans\', Arial, sans-serif; padding: 12px 24px; border-radius: 999px; background: #ffffff; color: #0b0d10; text-decoration: none;">Start building</a>',
                     f'<a href="#contact" style="font: 600 16px/24px \'Open Sans\', Arial, sans-serif; padding: 12px 24px; border-radius: 999px; background: #ffffff; color: #0b0d10; text-decoration: none;">{u["final_primary"]}</a>', label='final cta')
    s = re.sub(r'<a href="https://docs\.b1m\.ai/docs/developer-quickstart"( style="font: 600 16px/24px[^"]*">)Read the quickstart</a>',
               lambda m: f'<a href="{CONSOLE}"' + m.group(1) + u['final_secondary'] + '</a>', s)
    # --- footer: dead links
    s = s.replace('<a href="#" style="color: #14171c; text-decoration: none; line-height: 30px;">Telemetry</a>', '')
    s = s.replace('<a href="#" style="color: #14171c; text-decoration: none; line-height: 30px;">Status</a>', '')
    s = re.sub(r'<a href="#"( style="color: #14171c; text-decoration: none; line-height: 30px;">)Orchestrators</a>',
               lambda m: f'<a href="{DOCS}"' + m.group(1) + 'Orchestrators</a>', s)
    s = s.replace('<a href="#" style="color: #14171c; text-decoration: none; line-height: 30px;">About</a>', '')
    s = s.replace('<a href="#" style="color: #14171c; text-decoration: none; line-height: 30px;">Blog</a>', '')
    s = re.sub(r'<a href="#"( style="color: #14171c; text-decoration: none; line-height: 30px;">)Contact</a>',
               lambda m: '<a href="#contact"' + m.group(1) + u['contact'] + '</a>', s)
    s = re.sub(r'<a href="#"( style="color: #14171c; text-decoration: none; line-height: 30px;">)X</a>', '', s)
    s = must_replace(s, '<a href="#" style="color: #5b6270;">Terms</a><a href="#" style="color: #5b6270;">Privacy</a><a href="#" style="color: #5b6270;">Cookies</a>',
                     f'<a href="{u["legal_href"]}" style="color: #5b6270;">{u["legal"]}</a><a href="{u["legal_href"]}#confidentialite" style="color: #5b6270;">{u["privacy"]}</a><a href="{u["legal_href"]}#cookies" style="color: #5b6270;">{u["cookies"]}</a>', label='legal links')
    s = re.sub(r'>(\s*)© 2026 BEAM\. All rights reserved\.(\s*)<', lambda m: '>' + m.group(1) + u['copyright'] + m.group(2) + '<', s)
    s = s.replace('href="#" aria-label="BEAM home"', 'href="./" aria-label="BEAM"')
    if lang == 'fr':
        s = sub_text(s, FR_TEXT)
        for en, fr in FR_JS.items():
            s = s.replace(en, fr)
        s = s.replace('aria-label="Open menu"', 'aria-label="Ouvrir le menu"')
    # contact modal after the design component
    s = must_replace(s, '</body>', modal_html(u) + '</body>', label='body')
    return s

def build_frame(lang):
    u = UI[lang]
    s = open(os.path.join(SRC, 'ProductFrame.dc.html'), encoding='utf-8').read()
    for a in ('./vendor/', './support.js', './assets/'):
        s = s.replace(a, '../' + a[2:])
    s = re.sub(r'<a class="sim-cta" href="https://console\.b1m\.ai"', '<a class="sim-cta" href="#contact"', s)
    s = re.sub(r'>(\s*)Run this transfer', lambda m: '>' + m.group(1) + u['sim_cta'], s)
    if lang == 'fr':
        s = sub_text(s, FR_TEXT)
        for en, fr in FR_JS.items():
            s = s.replace(en, fr)
    return s

LEGAL = {
 'fr': ('Mentions légales et confidentialité', '''
<h1>Mentions légales et confidentialité</h1>
<p class="warn">⚠ Texte de base à faire relire par un juriste avant toute campagne.</p>
<h2>Éditeur du site</h2>
<p>Beam Consulting, activité commerciale de NGJR Labs LLC, 1603 Capitol Ave, Suite 413 C1379, Cheyenne, Wyoming 82001, États-Unis.<br>Contact : <a href="mailto:{mail}">{mail}</a>.<br>Beam Consulting est partenaire commercial de BEAM. Le service BEAM est fourni par son éditeur, selon ses propres conditions.</p>
<h2>Hébergement</h2>
<p>GitHub Pages, GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis.</p>
<h2 id="confidentialite">Données personnelles</h2>
<p>Les informations envoyées via le formulaire de contact (nom, e-mail professionnel, société, fonction, message) servent uniquement à vous recontacter au sujet de BEAM. Elles sont enregistrées dans notre CRM (HubSpot) et ne sont ni vendues ni cédées.</p>
<p>Base légale : votre demande de contact. Durée de conservation : 3 ans après le dernier échange.</p>
<p>Vous pouvez demander l’accès, la rectification ou la suppression de vos données à tout moment en écrivant à <a href="mailto:{mail}">{mail}</a>. Vous pouvez aussi saisir la CNIL (cnil.fr).</p>
<h2 id="cookies">Cookies</h2>
<p>Ce site n’utilise pas de cookies publicitaires ni de mesure d’audience. Le formulaire de contact est fourni par HubSpot, qui peut déposer des cookies strictement nécessaires à son fonctionnement.</p>
<p><a href="./">← Retour à l’accueil</a></p>'''),
 'en': ('Legal notice and privacy', '''
<h1>Legal notice and privacy</h1>
<h2>Publisher</h2>
<p>Beam Consulting, a trading activity of NGJR Labs LLC, 1603 Capitol Ave, Suite 413 C1379, Cheyenne, Wyoming 82001, USA.<br>Contact: <a href="mailto:{mail}">{mail}</a>.<br>Beam Consulting is a sales partner of BEAM. The BEAM service is provided by its publisher under its own terms.</p>
<h2>Hosting</h2>
<p>GitHub Pages, GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA.</p>
<h2 id="confidentialite">Personal data</h2>
<p>Details sent through the contact form (name, work email, company, role, message) are only used to contact you about BEAM. They are stored in our CRM (HubSpot) and are never sold or shared.</p>
<p>Legal basis: your contact request. Retention: 3 years after our last exchange.</p>
<p>You can ask to access, correct or delete your data at any time by writing to <a href="mailto:{mail}">{mail}</a>.</p>
<h2 id="cookies">Cookies</h2>
<p>This site uses no advertising or analytics cookies. The contact form is provided by HubSpot, which may set cookies strictly needed for it to work.</p>
<p><a href="./">← Back to home</a></p>'''),
}

def legal_page(lang):
    title, body = LEGAL[lang]
    return f'''<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · Beam Consulting</title><meta name="robots" content="noindex"><link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap">
<style>body{{margin:0;background:#fff;color:#14171c;font:400 16px/26px 'Open Sans',Arial,sans-serif}}main{{max-width:720px;margin:0 auto;padding:48px 16px 96px}}
h1{{font:600 32px/40px 'Open Sans',Arial,sans-serif}}h2{{font:600 20px/28px 'Open Sans',Arial,sans-serif;margin-top:32px}}a{{color:#2350d8}}.warn{{background:#fff4e0;color:#a35f00;padding:8px 12px;border-radius:8px}}</style>
</head><body><main>{body.format(mail=CONTACT_EMAIL)}</main></body></html>'''

ROOT_INDEX = '''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>BEAM — Beam Consulting</title>
<link rel="alternate" hreflang="fr" href="https://{d}/fr/"><link rel="alternate" hreflang="en" href="https://{d}/en/">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<script>
(function(){{var l=null;try{{l=localStorage.getItem('lang')}}catch(e){{}}
if(l!=='fr'&&l!=='en'){{var ls=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'en']);
l='en';for(var i=0;i<ls.length;i++){{var c=String(ls[i]||'').toLowerCase();if(c.indexOf('fr')===0){{l='fr';break}}if(c.indexOf('en')===0){{break}}}}}}
location.replace(l+'/'+location.hash);}})();
</script></head><body style="font-family:Arial,sans-serif;padding:24px">
<noscript><a href="fr/">Français</a> · <a href="en/">English</a></noscript></body></html>'''.replace('{d}', DOMAIN).replace('{{', '{').replace('}}', '}')

FAVICON = None

def main():
    if os.path.exists(OUT): shutil.rmtree(OUT)
    os.makedirs(OUT)
    for d in ('assets', 'vendor'):
        shutil.copytree(os.path.join(SRC, d), os.path.join(OUT, d))
    shutil.copy(os.path.join(SRC, 'support.js'), OUT)
    main_src = open(os.path.join(SRC, 'Main.dc.html'), encoding='utf-8').read()
    path_d = re.search(r'<svg width="28" height="28" viewBox="0 0 660 661"[^>]*><path d="([^"]+)"', main_src).group(1)
    open(os.path.join(OUT, 'favicon.svg'), 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 661"><path fill="#14171c" d="{path_d}"/></svg>')
    for lang in ('fr', 'en'):
        d = os.path.join(OUT, lang); os.makedirs(d)
        page = ext_new_tab(build_main(lang))
        open(os.path.join(d, 'Main.dc.html'), 'w', encoding='utf-8').write(page)
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(page)
        open(os.path.join(d, 'ProductFrame.dc.html'), 'w', encoding='utf-8').write(build_frame(lang))
        open(os.path.join(d, UI[lang]['legal_href']), 'w', encoding='utf-8').write(legal_page(lang))
    open(os.path.join(OUT, 'index.html'), 'w').write(ROOT_INDEX)
    open(os.path.join(OUT, '404.html'), 'w').write(ROOT_INDEX)
    open(os.path.join(OUT, 'CNAME'), 'w').write(DOMAIN + '\n')
    open(os.path.join(OUT, '.nojekyll'), 'w').write('')
    # report untranslated FR text nodes
    fr = open(os.path.join(OUT, 'fr', 'index.html'), encoding='utf-8').read()
    body = fr.split('<x-dc>')[1].split('<script type="text/x-dc"')[0]
    body = re.sub(r'<style.*?</style>', '', body, flags=re.S)
    left = [n.strip() for n in re.findall(r'>([^<>]+)<', body) if n.strip() in FR_TEXT]
    print('FR untranslated keys still present:', left)
    print('built', OUT, 'form id:', HS_FORM_ID or '(none yet)')

if __name__ == '__main__':
    main()
