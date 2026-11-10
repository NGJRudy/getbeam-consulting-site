#!/usr/bin/env python3
"""Pages QR des apporteurs : getbeam-consulting.com/go/<id>/

Source unique : x/apporteurs.json (id, nom, actif).
- Une page par apporteur : le formulaire HubSpot, avec le champ caché
  apporteur_id rempli par l'identifiant (jamais le nom : un identifiant
  simple ne casse rien, même avec accents ou homonymes).
- Son QR code : go/<id>/qr.png (utilisé dans l'e-mail d'accueil).
- La table « nom affiché » de x/seq-fr.json (clé apporteurs) est régénérée
  depuis le registre : on ne la modifie plus à la main.

Usage : python3 tools/build_go.py [dossier_qr]
"""
import collections, html, json, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REG_PATH = os.path.join(ROOT, 'x', 'apporteurs.json')
SEQ_PATH = os.path.join(ROOT, 'x', 'seq-fr.json')
GO = os.path.join(ROOT, 'go')
DOMAIN = 'https://getbeam-consulting.com'
ID_RE = re.compile(r'^[a-z0-9]{2,30}$')

PAGE = '''<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>BEAM · Parlons de vos données</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap">
<style>
html,body{{margin:0;background:#f4f5f7;color:#14171c;font:400 16px/24px 'Open Sans',Arial,sans-serif}}
main{{box-sizing:border-box;width:min(600px,100%);margin:0 auto;padding:16px}}
.card{{background:#fff;border-radius:16px;padding:8px 4px;box-shadow:0 12px 32px -20px rgba(20,23,28,.35)}}
.from{{margin:4px 4px 12px;font-size:14px;color:#5b6270}}
</style></head>
<body><main>
<p class="from">Vous avez rencontré <strong>{nom}</strong> de l’équipe BEAM.</p>
<div class="card"><div class="hs-form-frame" data-region="{region}" data-form-id="{form_id}" data-portal-id="{portal}"></div></div>
</main>
<script>
// Champ caché apporteur_id = identifiant de l'apporteur (pré-remplissage HubSpot par l'adresse de la page).
(function(){{
  var p=new URLSearchParams(location.search);
  if(p.get('apporteur_id')!=={id_js}){{
    p.set('apporteur_id',{id_js});
    history.replaceState(null,'',location.pathname+'?'+p.toString());
  }}
  var s=document.createElement('script');
  s.src='https://js.hsforms.net/forms/embed/{portal}.js'; s.defer=true;
  document.head.appendChild(s);
}})();
</script>
</body></html>
'''


def main():
    qr_dir = sys.argv[1] if len(sys.argv) > 1 else None
    reg = json.load(open(REG_PATH, encoding='utf-8'))
    f = reg['formulaire']
    ids = set()
    for a in reg['apporteurs']:
        aid = a['id']
        assert ID_RE.match(aid), f'identifiant invalide : {aid!r} (a-z, 0-9)'
        assert aid not in ids, f'identifiant en double : {aid}'
        assert a.get('nom', '').strip(), f'nom manquant pour {aid}'
        ids.add(aid)
        d = os.path.join(GO, aid)
        os.makedirs(d, exist_ok=True)
        page = PAGE.format(nom=html.escape(a['nom']), id_js=json.dumps(aid),
                           region=f['region'], form_id=f['form_id'], portal=f['portal'])
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(page)
        url = f'{DOMAIN}/go/{aid}/'
        import qrcode
        img = qrcode.make(url, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=3)
        img.save(os.path.join(d, 'qr.png'))
        if qr_dir:
            os.makedirs(qr_dir, exist_ok=True)
            img.save(os.path.join(qr_dir, f'QR-BEAM-{aid}.png'))
        print(aid, url, '' if a.get('actif', True) else '(inactif)')
    # Retire les pages des apporteurs supprimés du registre.
    for old in os.listdir(GO):
        if old not in ids and os.path.isdir(os.path.join(GO, old)):
            shutil.rmtree(os.path.join(GO, old))
            print('supprimé', old)
    # Régénère la table des noms affichés de seq-fr.json (identifiant ET ancienne valeur → nom).
    seq = json.load(open(SEQ_PATH, encoding='utf-8'), object_pairs_hook=collections.OrderedDict)
    table = collections.OrderedDict([('_aide', 'GÉNÉRÉ par tools/build_go.py depuis x/apporteurs.json : ne pas modifier ici.')])
    for a in reg['apporteurs']:
        table[a['id']] = a['nom']
        if a.get('ancienne_valeur'):
            table[a['ancienne_valeur']] = a['nom']
    seq['apporteurs'] = table
    json.dump(seq, open(SEQ_PATH, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
