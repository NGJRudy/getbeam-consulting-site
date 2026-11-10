#!/usr/bin/env python3
"""Pages QR des apporteurs : getbeam-consulting.com/go/<slug>/

Une page par apporteur, générée depuis x/apporteurs.json (registre).
La page affiche le formulaire HubSpot et remplit le champ caché
commercial_apporteur avec la valeur de l'apporteur.
Chaque page reçoit aussi son QR code (go/<slug>/qr.png, utilisé dans l'e-mail
d'accueil de l'apporteur) ; une copie peut être écrite dans le dossier donné en argument.

Usage : python3 tools/build_go.py [dossier_qr]
"""
import html, json, os, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REG = json.load(open(os.path.join(ROOT, 'x', 'apporteurs.json'), encoding='utf-8'))
GO = os.path.join(ROOT, 'go')
DOMAIN = 'https://getbeam-consulting.com'

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
// Remplit le champ caché commercial_apporteur (pré-remplissage HubSpot par l'adresse de la page).
(function(){{
  var p=new URLSearchParams(location.search);
  if(p.get('commercial_apporteur')!=={valeur_js}){{
    p.set('commercial_apporteur',{valeur_js});
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
    f = REG['formulaire']
    slugs = set()
    for a in REG['apporteurs']:
        slug = a['slug']
        assert slug.isalnum() and slug.islower(), slug
        slugs.add(slug)
        d = os.path.join(GO, slug)
        os.makedirs(d, exist_ok=True)
        page = PAGE.format(nom=html.escape(a['nom']), valeur_js=json.dumps(a['valeur']),
                           region=f['region'], form_id=f['form_id'], portal=f['portal'])
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(page)
        url = f'{DOMAIN}/go/{slug}/'
        import qrcode
        img = qrcode.make(url, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=3)
        img.save(os.path.join(d, 'qr.png'))
        if qr_dir:
            os.makedirs(qr_dir, exist_ok=True)
            img.save(os.path.join(qr_dir, f'QR-BEAM-{slug}.png'))
        print(slug, url)
    # Retire les pages des apporteurs supprimés du registre.
    for old in os.listdir(GO):
        if old not in slugs and os.path.isdir(os.path.join(GO, old)):
            shutil.rmtree(os.path.join(GO, old))
            print('supprimé', old)


if __name__ == '__main__':
    main()
