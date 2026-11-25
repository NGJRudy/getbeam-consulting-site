#!/usr/bin/env python3
"""Académie BEAM : prépare les images du lecteur et la couverture de chaque module PDF.

Source unique : x/academie.json. Pour chaque document de type « pdf » qui a un fichier :
  consultants/academie/docs/<id>/<langue>/p-01.webp ... (une image par page, 1600 px de large)
  consultants/academie/docs/<id>/<langue>/couverture.webp (haut de la page 1, format 16:9)
puis écrit le nombre de pages (« pages ») et la hauteur de chaque page (« hauteurs ») dans x/academie.json.

Ajouter un module = déposer le PDF, compléter x/academie.json, lancer ce script. Rien d'autre à coder.
Il faut pdftoppm (poppler) et Pillow.
"""
import json, os, re, shutil, subprocess, sys, tempfile
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = os.path.join(ROOT, 'x', 'academie.json')
LARGEUR, COUV = 1600, (960, 540)
SUR = re.compile(r'^/[A-Za-z0-9/_.\-]*\.pdf$')
ID = re.compile(r'^[a-z0-9-]{2,40}$')


def traiter(doc_id, langue, chemin, cadrage=None):
    pdf = os.path.join(ROOT, chemin.lstrip('/'))
    if not os.path.isfile(pdf):
        sys.exit(f'PDF introuvable : {chemin}')
    sortie = os.path.join(ROOT, 'consultants', 'academie', 'docs', doc_id, langue)
    if os.path.isdir(sortie):
        shutil.rmtree(sortie)
    os.makedirs(sortie)
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(['pdftoppm', '-png', '-scale-to-x', str(LARGEUR), '-scale-to-y', '-1', pdf, os.path.join(tmp, 'p')],
                       check=True, stderr=subprocess.DEVNULL)
        pages = sorted(f for f in os.listdir(tmp) if f.endswith('.png'))
        hauteurs = []
        for i, f in enumerate(pages, 1):
            im = Image.open(os.path.join(tmp, f)).convert('RGB')
            hauteurs.append(im.size[1])
            im.save(os.path.join(sortie, f'p-{i:02d}.webp'), 'WEBP', quality=82, method=6)
            if i == 1:
                w, h = im.size
                # cadrage_couverture = [gauche, haut, droite] en fractions de la page 1 (par défaut toute la largeur, en haut)
                x0, y0, x1 = cadrage if cadrage and len(cadrage) == 3 else (0, 0, 1)
                L = round((x1 - x0) * w); X, Y = round(x0 * w), round(y0 * h)
                hc = min(h - Y, round(L * COUV[1] / COUV[0]))
                im.crop((X, Y, X + L, Y + hc)).resize(COUV, Image.LANCZOS).save(
                    os.path.join(sortie, 'couverture.webp'), 'WEBP', quality=84, method=6)
    return hauteurs


def main():
    cfg = json.load(open(CFG, encoding='utf-8'))
    for d in cfg['documents']:
        if d.get('type') != 'pdf' or not ID.match(d.get('id', '')):
            continue
        nb, haut = {}, {}
        for langue, chemin in (d.get('fichier') or {}).items():
            if chemin and SUR.match(chemin):
                haut[langue] = traiter(d['id'], langue, chemin, d.get('cadrage_couverture'))
                nb[langue] = len(haut[langue])
                print(f"{d['id']} [{langue}] : {nb[langue]} pages")
        d['pages'] = nb
        d['hauteurs'] = haut  # hauteur de chaque page pour une largeur de 1600 px (réserve la place dans le lecteur)
    with open(CFG, 'w', encoding='utf-8') as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)
        f.write('\n')


if __name__ == '__main__':
    main()
