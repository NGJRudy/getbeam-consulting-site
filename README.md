# getbeam-consulting.com

Site vitrine entreprises de BEAM (Beam Consulting), servi par GitHub Pages.

- `/` choisit la langue (navigateur, ou choix mémorisé) puis redirige vers `/fr/` ou `/en/`.
- `fr/`, `en/` : page générée depuis la maquette (`Main.dc.html` + `ProductFrame.dc.html`), runtime `support.js` + `vendor/`.
- Bouton « Prendre rendez-vous » / « Book a call » : fenêtre avec le formulaire HubSpot (portail 52267765).
- `tools/build_site.py` : script de génération (textes FR, liens, fenêtre de contact). Modifier les textes là, régénérer, committer.
