#!/usr/bin/env python3
"""Génère les pages « documentation + agenda » (un seul lien dans l'e-mail J0) depuis tools/doc_pages.json."""
import json, html, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cfg = json.load(open(os.path.join(ROOT, 'tools', 'doc_pages.json'), encoding='utf-8'))
LOGO = open(os.path.join(ROOT, 'favicon.svg'), encoding='utf-8').read()
TPL = """<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>{titre} · BEAM</title><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=Open+Sans:wght@400;600;700&display=swap">
<style>
*{{box-sizing:border-box}}body{{margin:0;background:#f4f5f7;color:#14171c;font:400 16px/26px 'Open Sans',Arial,sans-serif}}
.w{{max-width:1040px;margin:0 auto;padding:24px 16px 48px}}.top{{display:flex;align-items:center;gap:10px;font-weight:700;font-size:18px}}.top svg{{width:28px;height:28px}}
.grid{{display:grid;grid-template-columns:1fr 1.15fr;gap:24px;margin-top:24px;align-items:start}}@media(max-width:860px){{.grid{{grid-template-columns:1fr}}}}
.card{{background:#fff;border-radius:20px;padding:28px;box-shadow:0 20px 40px -28px rgba(20,23,28,.35)}}
.eb{{font:500 12px/16px 'IBM Plex Mono',monospace;letter-spacing:.08em;color:#2350d8;text-transform:uppercase;margin:0 0 6px}}
h1{{font:700 28px/34px 'Open Sans',Arial,sans-serif;margin:0 0 12px}}h2{{font:600 20px/28px 'Open Sans',Arial,sans-serif;margin:0 0 4px}}
ul{{padding-left:20px;margin:16px 0 24px}}li{{margin:6px 0}}.btn{{display:inline-block;background:#14171c;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px}}
.btn:hover{{background:#2350d8}}.sub{{color:#5b6270;margin:0 0 12px}}.cal{{min-height:640px}}
</style></head><body><div class="w">
<div class="top">{logo}<span>BEAM</span></div>
<div class="grid">
<div class="card"><p class="eb">Documentation</p><h1>{titre}</h1><p>{intro}</p><ul>{points}</ul>
<a class="btn" href="{doc}" target="_blank" rel="noopener">Lire la documentation →</a></div>
<div class="card"><p class="eb">15 minutes</p><h2>On en parle ?</h2><p class="sub">Choisissez un créneau : votre cas, ce que BEAM change concrètement, et la suite si c'est pertinent.</p>
<div class="cal"><div class="meetings-iframe-container" data-src="{meeting}"></div></div></div>
</div></div>
<script>(function(){{try{{var q=new URLSearchParams(location.search),c=document.querySelector('.meetings-iframe-container'),s=c.getAttribute('data-src');['email','firstName','lastName'].forEach(function(k){{var v=q.get(k);if(v)s+='&'+k+'='+encodeURIComponent(v)}});c.setAttribute('data-src',s)}}catch(e){{}}}})();</script>
<script src="https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js"></script>
</body></html>
"""
for path, p in cfg['pages'].items():
    out = os.path.join(ROOT, path, 'index.html'); os.makedirs(os.path.dirname(out), exist_ok=True)
    pts = ''.join('<li>%s</li>' % html.escape(x) for x in p['points'])
    open(out, 'w', encoding='utf-8').write(TPL.format(titre=html.escape(p['titre']), intro=html.escape(p['intro']), points=pts,
        doc=html.escape(p['doc']), meeting=html.escape(cfg['meeting']), logo=LOGO))
    print('ok', path)
