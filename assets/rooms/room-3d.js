/* Scène « Room 3D » : l'écosystème entre dans une Room, puis 3 cas d'usage (IA, flotte, partenaire).
   Chargée à la demande par la page ; dépend de three 0.160 (importmap). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ═══════════ Textes : français par défaut ; une autre langue = window.ROOM3D = { etapes, objets, libelles } ═══════════ */
const L = window.ROOM3D || {};
const TX = Object.assign({
  etape: 'Étape', pause: "Mettre en pause l'animation", reprendre: "Reprendre l'animation",
  modele: 'Modèle commun', source: 'Serveur · envoie à tous', expert: 'Expert invité', camion: 'Camion', production: 'Production',
  invitation: 'Invitation envoyée', enDirect: 'Messages, fichiers, voix : en direct entre entreprises', projetFini: 'Projet terminé : accès retiré',
  accesRetire: 'Accès retiré d’un coup', camionArrive: 'Un camion arrive', flotteAJour: 'Flotte à jour, le camion repart',
  recus: '1 envoi → {n} reçus en même temps', camionRejoint: 'Le camion rejoint la Room', envoiEnCours: 'Envoi en cours…',
  donneesEntrent: 'Vos données entrent', iaPrete: 'Votre IA entraînée, prête à l’emploi', modeleSort: 'Le modèle sort de la Room',
  partDonnees: 'Chaque machine reçoit sa part des données', diloco: 'Méthode DiLoCo · tour {k} : chacun apprend de son côté',
  miseEnCommun: 'Mise en commun → tout le monde reçoit le modèle à jour', chaine: 'Étape {k} / {n} · {nom}',
  reliesCamions: 'Chaque camion roule de son côté, tous restent reliés à la Room',
  reliesDrones: 'Chaque drone vole de son côté, tous restent reliés à la Room',
  bouchon: 'Bouchon signalé', itineraire: 'Toute la flotte reçoit le nouvel itinéraire',
  livraison: 'Livraison terminée', planning: 'Le planning de tous est mis à jour',
  anomalie: 'Anomalie repérée', position: 'Tous les drones reçoivent sa position',
  zone: 'Zone inspectée', repartition: 'Les autres drones se répartissent la suite',
  partage: '{evt} → partagé via la Room'
}, L.libelles || {});
const f = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k]);

/* ═══════════ Configuration : changer la scène = changer ces données ═══════════ */
const C = {
  couleurs: { encre: '#14171c', bleu: '#2350d8', bleuClair: '#8aa6ff', argile: '#f4f5f7', vert: '#16a34a', neutre: '#c9ced6' },
  // Où se place le centre de la scène dans la largeur de l'écran (0,66 = laisse la gauche au texte).
  centreEcran: { large: 0.71, etroit: 0.5 },
  camera: { fov: 22, distance: 15.5, hauteurDeg: 27, azimutDeg: -18 },
  sol: { demiLargeur: 3.9, demiProfondeur: 2.1, pas: 0.36 },
  // Objets de l'écosystème : type (voir FORMES), position au sol (x, z), rotation (degrés), description au survol.
  objets: [
    { type: 'donnees',   x: -2.05, z: -0.55, rot: 0,   nom: 'Données',     role: 'Vos fichiers et jeux de données, stockés à part.' },
    { type: 'gpu',       x: -0.95, z: 0.75,  rot: 0,   nom: 'GPU',         role: 'La puissance de calcul, souvent sous-utilisée.' },
    { type: 'ordinateur',x: 0.75,  z: 0.85,  rot: -12, nom: 'Ordinateur',  role: 'Le poste de travail de vos équipes.' },
    { type: 'telephone', x: 1.55,  z: 1.15,  rot: -20, nom: 'Téléphone',   role: 'Les appareils en déplacement.' },
    { type: 'telephone', x: 1.95,  z: 1.0,   rot: -8,  nom: 'Tablette',    role: 'Les appareils sur le terrain.' },
    { type: 'serveur',   x: 2.05,  z: -0.75, rot: 0,   nom: 'Serveur',     role: 'Vos serveurs, au bureau ou dans le cloud.' },
    { type: 'serveur',   x: 2.75,  z: -0.45, rot: 0,   nom: 'Cloud',       role: 'Vos serveurs loués dans le cloud.' },
    { type: 'navigateur',x: 0.1,   z: -1.0,  rot: 8,   nom: 'Navigateur',  role: 'Un simple onglet de navigateur peut rejoindre la Room.' }
  ],
  petitsCubes: [[-1.4, 1.05], [-0.35, -0.2], [1.05, -0.45], [1.3, 0.15], [-2.55, 0.65], [2.45, 0.75], [0.25, 1.55]],
  // Les échanges « ratés » d'aujourd'hui : un trait bleu part, puis s'éteint avant d'arriver.
  echecs: [[0, 1], [1, 2], [2, 3], [5, 2], [0, 5]],
  rythmeEchecs: 0.6, // secondes entre deux tentatives
  room: { centre: [0.45, 1.85, -0.1], rayon: 1.5, finesse: 2, echelleMembres: 0.62 },
  transition: 1.8, // secondes pour passer d'une étape à l'autre
  // L'histoire : chaque étape = un texte + un état de la scène. Ajouter une étape = ajouter une entrée.
  etapes: [
    { etat: 0, mode: 'isole', duree: 4, onglet: "Aujourd'hui", sur: "Aujourd'hui", titre: 'Vos machines travaillent chacune dans leur coin.',
      texte: 'GPU, serveurs, ordinateurs, navigateurs, données : tout est là, mais rien ne se parle vraiment.' },
    { etat: 1, mode: 'pair', duree: 4.5, onglet: 'La Room', sur: 'Avec une Room', titre: 'Une Room les réunit dans une bulle privée.',
      texte: 'Tous vos appareils entrent dans le même espace chiffré et se parlent directement, de pair à pair.' },
    // Cas d'usage : toujours la même grammaire, de gauche à droite. Ça entre → la Room travaille → un résultat sort.
    { etat: 1, mode: 'entrainement', cas: 'ia', duree: 8.5, onglet: 'IA', sur: 'Cas d’usage · Intelligence artificielle', titre: 'Entraînez votre IA sur vos propres données.',
      texte: 'Vos données entrent, vos GPU, ordinateurs et même un navigateur apprennent ensemble. Le modèle en sort prêt à être utilisé.' },
    // Éléments extérieurs : ils restent dehors, reliés à la Room par un fil ; l'info passe par la Room et change leur couleur.
    { etat: 1, mode: 'hub', cas: 'flotte', duree: 10.5, onglet: 'Flotte', sur: 'Cas d’usage · Flotte connectée', titre: 'Vos camions restent reliés, où qu’ils roulent.',
      texte: 'Chaque camion est connecté à la Room. Quand l’un apprend quelque chose, tous les autres le savent au même instant.' },
    { etat: 1, mode: 'hub', cas: 'drones', duree: 10.5, onglet: 'Drones', sur: 'Cas d’usage · Drones', titre: 'Vos drones partagent ce qu’ils voient, en direct.',
      texte: 'Chaque drone vole de son côté mais reste dans la Room : ce que l’un repère, tous les autres le reçoivent aussitôt.' },
    { etat: 1, mode: 'pair', cas: 'partenaires', duree: 6.5, onglet: 'Partenaires', sur: 'Cas d’usage · Partenaires', titre: 'Invitez un partenaire le temps d’un projet.',
      texte: 'Un expert, un client ou un financeur entre par invitation et échange en direct avec votre équipe. Projet terminé : son accès est retiré d’un coup.' }
  ],
  // Qui fait quoi dans chaque cas d'usage (numéros = ordre dans « objets »).
  roles: { source: 5, entraineurs: [1, 2, 5, 7, 3], chaine: [3, 0, 1, 5, 2], hub: [2, 3, 5, 6] },
  /* Éléments extérieurs (satellites) : chacun reste hors de la bulle, relié à elle par un fil.
     camions : voie (z), départ (x), vitesse (négative = vers la gauche). drones : rayon d'orbite, hauteur, vitesse angulaire, phase. */
  satellites: {
    flotte: { type: 'camion', echelle: .55, liste: [
      { z: 1.75, x: -2.6, v: .17 }, { z: 1.75, x: .8, v: .17 }, { z: 2.35, x: -.4, v: -.13 }, { z: 2.35, x: 2.7, v: -.13 }, { z: 2.95, x: -1.8, v: .11 }, { z: 2.95, x: 1.6, v: .11 } ] },
    drones: { type: 'drone', echelle: 1, liste: [
      { r: 2.2, h: 2.55, w: .16, p: 0 }, { r: 2.55, h: 1.35, w: -.12, p: 1.3 }, { r: 2.05, h: 2.8, w: .1, p: 2.6 }, { r: 2.7, h: 2.0, w: .14, p: 3.9 }, { r: 2.35, h: .95, w: -.15, p: 5.0 } ] }
  },
  // Les nouvelles qui circulent : à quel instant, quel élément les apprend, leur couleur, et ce qui en résulte.
  infos: {
    flotte: [ { t: 1.2, source: 0, couleur: 'bleu', evt: 'bouchon', res: 'itineraire' }, { t: 6.0, source: 3, couleur: 'vert', evt: 'livraison', res: 'planning' } ],
    drones: [ { t: 1.2, source: 1, couleur: 'bleu', evt: 'anomalie', res: 'position' }, { t: 6.0, source: 3, couleur: 'vert', evt: 'zone', res: 'repartition' } ]
  },
  // Caméra pour chaque état (0 = écosystème, 1 = Room).
  cadrages: [ { cible: [0.25, 0.35, 0], distance: 15.5 }, { cible: [0.4, 1.4, 0], distance: 15.5 } ]
};
/* ═══════════════════════════════════════════════════════════════════════════════ */
(L.etapes || []).forEach((e, i) => Object.assign(C.etapes[i], e));
// Intégré au héros : pas de texte à gauche, la scène est centrée dans sa fenêtre.
const INTEGRE = !!L.integre; if (INTEGRE) C.centreEcran = { large: .5, etroit: .5 };
(L.objets || []).forEach((o, i) => Object.assign(C.objets[i], o));

const host = document.getElementById('r3d-scene'), tip = document.getElementById('r3d-tip');
const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
const qualite = { dpr: Math.min(2, devicePixelRatio), n: 0, somme: 0 }; // quatre marches au plus : 2 → 1,5 → 1
renderer.setPixelRatio(qualite.dpr);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
host.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const cle = new THREE.DirectionalLight('#ffffff', 1.1); cle.position.set(-4, 7, 5); scene.add(cle);
const camera = new THREE.PerspectiveCamera(C.camera.fov, 1, 0.1, 100);
const ENCRE = new THREE.Color(C.couleurs.encre), BLEU = new THREE.Color(C.couleurs.bleu), BLANC = new THREE.Color('#ffffff');

/* ── Matériaux : argile blanche mate + arêtes fines à l'encre, comme sur les images de référence ── */
const argile = new THREE.MeshStandardMaterial({ color: C.couleurs.argile, roughness: .62, metalness: 0, envMapIntensity: .9 });
const argileSombre = new THREE.MeshStandardMaterial({ color: '#c9ced6', roughness: .7 });
const fente = new THREE.MeshStandardMaterial({ color: '#7d838e', roughness: .8 });
const ecran = new THREE.MeshStandardMaterial({ color: '#dfe4ec', roughness: .25, metalness: 0 });
const trait = new THREE.LineBasicMaterial({ color: C.couleurs.encre, transparent: true, opacity: .45 });
function piece(geo, mat, parent, x = 0, y = 0, z = 0, aretes = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m);
  if (aretes) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 35), trait));
  return m;
}
const bloc = (w, h, d, r = 0.02) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));

/* ── Ombre de contact douce (texture dégradée), posée sous chaque objet ── */
const texOmbre = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(20,23,28,.42)'); r.addColorStop(.55, 'rgba(20,23,28,.12)'); r.addColorStop(1, 'rgba(20,23,28,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
function ombre(parent, w, d) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: texOmbre, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.002; m.renderOrder = -1; parent.add(m); (parent.userData.ombres ||= []).push(m.material); }

/* ── Registre des formes (modélisées en géométrie propre, d'après la fiche objets) ── */
const FORMES = {
  serveur(g) {
    const w = .5, h = 1.15, d = .5;
    piece(bloc(w, h, d, .03), argile, g, 0, h / 2 + .03, 0);
    const fg = new THREE.BoxGeometry(.3, .028, .012);
    for (let i = 0; i < 12; i++) piece(fg, fente, g, 0, .17 + i * .075, d / 2 + .002, false);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => piece(new THREE.CylinderGeometry(.025, .025, .03, 12), argileSombre, g, a * (w / 2 - .04), .015, b * (d / 2 - .04), false));
    ombre(g, .95, .95);
  },
  gpu(g) {
    const w = .62, h = .1, d = .3;
    for (let i = 0; i < 3; i++) {
      const y = .05 + i * (h + .025);
      piece(bloc(w, h, d, .012), argile, g, 0, y + h / 2, 0);
      for (let a = 0; a < 18; a++) piece(new THREE.BoxGeometry(.008, h * .62, .005), fente, g, -.05 + a * .019, y + h / 2, d / 2 + .002, false);
      piece(new THREE.BoxGeometry(.1, h * .45, .005), fente, g, -.22, y + h / 2, d / 2 + .002, false);
    }
    // Ventilateur sur la carte du haut.
    const top = .05 + 2 * (h + .025) + h + .001, f = new THREE.Group(); f.position.set(.12, top, 0); g.add(f);
    piece(new THREE.CylinderGeometry(.105, .105, .006, 40), argileSombre, f, 0, 0, 0);
    for (let p = 0; p < 9; p++) { const pale = piece(new THREE.BoxGeometry(.085, .004, .03), argile, f, 0, .005, 0, false); pale.rotation.y = p / 9 * Math.PI * 2; pale.position.set(Math.cos(-pale.rotation.y) * .05, .005, Math.sin(-pale.rotation.y) * .05); pale.rotation.x = .35; }
    piece(new THREE.CylinderGeometry(.028, .028, .012, 20), argile, f, 0, .006, 0);
    g.userData.ventilateur = f;
    ombre(g, 1.0, .65);
  },
  ordinateur(g) {
    const w = .58, d = .4;
    piece(bloc(w, .022, d, .008), argile, g, 0, .011, 0);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 12; c++) piece(new THREE.BoxGeometry(.034, .004, .03), argileSombre, g, -.22 + c * .04, .024, -.1 + r * .04, false);
    piece(new THREE.BoxGeometry(.16, .003, .09), argileSombre, g, 0, .023, .13, false);
    const charniere = new THREE.Group(); charniere.position.set(0, .02, -d / 2 + .005); charniere.rotation.x = -.32; g.add(charniere);
    piece(bloc(w, .38, .016, .008), argile, charniere, 0, .19, 0);
    piece(new THREE.PlaneGeometry(w - .04, .33), ecran, charniere, 0, .195, .0085, false);
    ombre(g, .95, .8);
  },
  telephone(g) {
    piece(bloc(.13, .012, .26, .006), argile, g, 0, .006, 0);
    piece(new THREE.PlaneGeometry(.115, .24), ecran, g, 0, .0125, 0, false).rotation.x = -Math.PI / 2;
    ombre(g, .32, .45);
  },
  donnees(g) {
    const n = 3, t = .19, e = .25, cote = e * (n - 1);
    let s = 3; const r = () => (s = s * 16807 % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++)
      if (j === 0 || r() < .7) piece(bloc(t, t, t, .012), argile, g, (i - 1) * e + (r() - .5) * .03, .04 + t / 2 + j * e, (k - 1) * e + (r() - .5) * .03);
    // Treillis : arêtes + points aux nœuds.
    const L = cote + e, pts = [], lp = [];
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) for (let k = 0; k <= n; k++) {
      const p = [-L / 2 + i * L / n, .04 + j * L / n - .02, -L / 2 + k * L / n]; pts.push(p);
      if (i < n) lp.push(...p, p[0] + L / n, p[1], p[2]); if (j < n) lp.push(...p, p[0], p[1] + L / n, p[2]); if (k < n) lp.push(...p, p[0], p[1], p[2] + L / n);
    }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: C.couleurs.encre, transparent: true, opacity: .55 })));
    const sp = new THREE.SphereGeometry(.016, 10, 8), noir = new THREE.MeshBasicMaterial({ color: C.couleurs.encre });
    const inst = new THREE.InstancedMesh(sp, noir, pts.length); pts.forEach((p, i) => inst.setMatrixAt(i, new THREE.Matrix4().makeTranslation(...p))); g.add(inst);
    ombre(g, 1.5, 1.5);
  },
  navigateur(g) { // une fenêtre de navigateur debout : barre d'onglets, adresse, contenu
    const w = .62, h = .44, cadre = new THREE.Group(); cadre.position.y = .03; cadre.rotation.x = -.12; g.add(cadre);
    piece(bloc(w, h, .025, .012), argile, cadre, 0, h / 2, 0);
    piece(new THREE.BoxGeometry(w - .02, .055, .004), argileSombre, cadre, 0, h - .04, .013, false);
    [-.26, -.235, -.21].forEach(x => piece(new THREE.CylinderGeometry(.008, .008, .004, 12).rotateX(Math.PI / 2), fente, cadre, x, h - .04, .016, false));
    piece(new THREE.BoxGeometry(.36, .022, .004), argile, cadre, .05, h - .04, .016, false);
    piece(new THREE.BoxGeometry(.25, .17, .004), ecran, cadre, -.13, .2, .013, false);
    [.2, .16, .12].forEach(y => piece(new THREE.BoxGeometry(.24, .016, .004), argileSombre, cadre, .16, y + .07, .013, false));
    piece(bloc(.16, .02, .12, .006), argile, g, 0, .01, 0);
    ombre(g, .85, .45);
  },
  camion(g) {
    const noir = new THREE.MeshStandardMaterial({ color: '#2a2e35', roughness: .8 });
    piece(bloc(.62, .34, .32, .02), argile, g, -.1, .1 + .17, 0);           // caisse
    piece(bloc(.24, .26, .3, .03), argile, g, .34, .1 + .13, 0);              // cabine
    piece(new THREE.BoxGeometry(.012, .1, .24), ecran, g, .462, .3, 0, false); // pare-brise
    piece(new THREE.BoxGeometry(.86, .04, .26), argileSombre, g, .02, .08, 0, false);
    [[-.3, 1], [-.3, -1], [.05, 1], [.05, -1], [.34, 1], [.34, -1]].forEach(([x, z]) => piece(new THREE.CylinderGeometry(.06, .06, .05, 20).rotateX(Math.PI / 2), noir, g, x, .06, z * .15, false));
    // Bande et toit peints : leur couleur montre la dernière information reçue.
    const peinture = new THREE.MeshStandardMaterial({ color: C.couleurs.neutre, roughness: .5 }); g.userData.peinture = peinture;
    piece(new THREE.BoxGeometry(.6, .07, .326), peinture, g, -.1, .37, 0, false);
    piece(new THREE.BoxGeometry(.5, .012, .25), peinture, g, -.1, .446, 0, false);
    piece(new THREE.BoxGeometry(.2, .012, .22), peinture, g, .34, .366, 0, false);
    ombre(g, 1.1, .55);
  },
  drone(g) { // corps, quatre bras, hélices (disques flous), plaque de statut colorée
    const peinture = new THREE.MeshStandardMaterial({ color: C.couleurs.neutre, roughness: .45 }); g.userData.peinture = peinture;
    const flou = new THREE.MeshBasicMaterial({ color: '#cfd5df', transparent: true, opacity: .55, depthWrite: false });
    piece(bloc(.17, .05, .17, .018), argile, g, 0, 0, 0);
    piece(new THREE.CylinderGeometry(.045, .045, .008, 24), peinture, g, 0, .03, 0, false);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => {
      const bras = piece(new THREE.BoxGeometry(.16, .018, .022), argile, g, a * .07, .005, b * .07, false); bras.rotation.y = Math.atan2(-b, a);
      piece(new THREE.CylinderGeometry(.012, .012, .03, 10), argileSombre, g, a * .13, .02, b * .13, false);
      piece(new THREE.CylinderGeometry(.075, .075, .003, 32), flou, g, a * .13, .038, b * .13, false);
    });
    piece(new THREE.SphereGeometry(.022, 12, 8), fente, g, 0, -.035, .04, false); // caméra
  },
  expert(g) { // une silhouette simple : la personne invitée
    piece(new THREE.CapsuleGeometry(.11, .2, 6, 16), argile, g, 0, .24, 0);
    piece(new THREE.SphereGeometry(.085, 24, 16), argile, g, 0, .52, 0);
    ombre(g, .4, .4);
  },
  production(g) { // le socle « Production » où le modèle entraîné est déposé
    piece(bloc(.5, .16, .5, .03), argile, g, 0, .08, 0);
    piece(new THREE.BoxGeometry(.36, .012, .012), new THREE.MeshBasicMaterial({ color: C.couleurs.bleu }), g, 0, .1, .252, false);
    ombre(g, .8, .8);
  },
  cube(g) { const t = .15; piece(bloc(t, t, t, .012), argile, g, 0, t / 2, 0); ombre(g, .32, .32); }
};

/* ── Le sol : réseau en losanges, points noirs aux nœuds, fondu sur les bords ── */
const S = C.sol, sol = new THREE.Group(); scene.add(sol);
const noeuds = [];
{
  let s = 9; const r = () => (s = s * 16807 % 2147483647) / 2147483647;
  const cols = Math.round(S.demiLargeur * 2 / S.pas), rows = Math.round(S.demiProfondeur * 2 / S.pas);
  for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++)
    noeuds.push({ p: new THREE.Vector3(-S.demiLargeur + j * S.pas + (i % 2) * S.pas / 2, 0, -S.demiProfondeur + i * S.pas), i, j, t: r() });
  const fond = p => { const ex = Math.hypot(p.x / S.demiLargeur, p.z / S.demiProfondeur); return Math.max(0, 1 - Math.max(0, ex - .35) / .6) ** 1.5; };
  const lp = [], lc = [];
  const idx = (i, j) => i * (cols + 1) + j;
  for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
    const a = noeuds[idx(i, j)];
    const voisins = [[i, j + 1], [i + 1, j + (i % 2)], [i + 1, j - 1 + (i % 2)]];
    voisins.forEach(([y, x]) => { if (y > rows || x < 0 || x > cols) return; const b = noeuds[idx(y, x)];
      const f = Math.min(fond(a.p), fond(b.p)) * .2; lp.push(...a.p.toArray(), ...b.p.toArray()); lc.push(.08, .09, .11, f, .08, .09, .11, f); });
  }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); lg.setAttribute('color', new THREE.Float32BufferAttribute(lc, 4));
  sol.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false })));
  // Points : instanciés, aplatis sur le sol, taille variée (quelques gros, beaucoup de petits).
  const disque = new THREE.CircleGeometry(1, 16); disque.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff' }); // la couleur de chaque point vient de setColorAt
  const inst = new THREE.InstancedMesh(disque, mat, noeuds.length), m4 = new THREE.Matrix4(), col = new THREE.Color();
  noeuds.forEach((n, k) => { const f = fond(n.p); const t = n.t < .75 ? .012 : n.t < .95 ? .019 : .028;
    m4.compose(n.p.clone().setY(.001), new THREE.Quaternion(), new THREE.Vector3(t, 1, t)); inst.setMatrixAt(k, m4);
    inst.setColorAt(k, col.setRGB(1, 1, 1).lerp(new THREE.Color(C.couleurs.encre), Math.min(1, f * 1.4)));  });
  sol.add(inst);
}

/* ── Placement des objets ── */
/* Fusion des petites pièces sans arêtes (fentes, touches, pales) : beaucoup moins d'appels de dessin. */
function fusionner(g) {
  const par = new Map();
  g.traverse(m => { if (m.parent && m.parent === g.userData.ventilateur) return; if (m.isMesh && !m.isInstancedMesh && m.children.length === 0 && m.material !== argile && m.parent) { m.updateMatrix(); (par.get(m.material) || par.set(m.material, []).get(m.material)).push(m); } });
  par.forEach((liste, mat) => { if (liste.length < 3) return;
    const geos = liste.map(m => { m.updateWorldMatrix(true, false); const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(); return m.geometry.clone().applyMatrix4(inv.multiply(m.matrixWorld)); });
    const fus = mergeGeometries(geos.map(x => x.index ? x.toNonIndexed() : x)); liste.forEach(m => m.parent.remove(m)); if (fus) g.add(new THREE.Mesh(fus, mat)); });
}
const objets = C.objets.map(o => { const g = new THREE.Group(); FORMES[o.type](g); fusionner(g); g.position.set(o.x, 0, o.z); g.rotation.y = THREE.MathUtils.degToRad(o.rot); g.userData = { ...g.userData, ...o }; scene.add(g); return g; });
const cubes = C.petitsCubes.map(([x, z]) => { const g = new THREE.Group(); FORMES.cube(g); g.position.set(x, 0, z); g.userData.x = x; g.userData.z = z; g.userData.rot = 0; scene.add(g); return g; });
const membres = [...objets, ...cubes];
// Acteurs des cas d'usage : ils viennent de l'extérieur, entrent dans la Room, puis ressortent.
const ACTEURS = { camion: { nom: TX.camion, echelle: .6 }, expert: { nom: TX.expert, echelle: .85 }, production: { nom: TX.production, echelle: .8 } };
Object.entries(ACTEURS).forEach(([type, a]) => { a.g = new THREE.Group(); FORMES[type](a.g); fusionner(a.g); a.g.scale.setScalar(.001); a.vis = 0; scene.add(a.g); });
// Éléments extérieurs : créés une fois, cachés tant que leur cas d'usage n'est pas à l'écran.
const COUL = { neutre: new THREE.Color(C.couleurs.neutre), bleu: new THREE.Color(C.couleurs.bleu), vert: new THREE.Color(C.couleurs.vert) };
const SAT = {};
Object.entries(C.satellites).forEach(([cas, cfg]) => SAT[cas] = cfg.liste.map((p, k) => { const g = new THREE.Group(); FORMES[cfg.type](g); fusionner(g); g.scale.setScalar(.001); scene.add(g);
  const s = { g, p, k, cfg, vis: 0, cible: 0, actif: 0, x: p.x || 0, a: p.p || 0, coul: COUL.neutre.clone(), vise: COUL.neutre.clone() }; g.userData.satellite = s; return s; }));
const tousSat = Object.values(SAT).flat();

/* ══════════ La Room : sphère géodésique qui se dessine de bas en haut ══════════ */
const R = C.room, centreRoom = new THREE.Vector3(...R.centre), room = new THREE.Group(); room.position.copy(centreRoom); scene.add(room);
const sommets = [], aretes = [];
{
  const ico = new THREE.IcosahedronGeometry(R.rayon, R.finesse), pa = ico.attributes.position, cles = new Map(), id = i => { const v = new THREE.Vector3().fromBufferAttribute(pa, i), k = v.toArray().map(x => x.toFixed(4)).join(); if (!cles.has(k)) { cles.set(k, sommets.length); sommets.push(v); } return cles.get(k); };
  const vus = new Set();
  for (let i = 0; i < pa.count; i += 3) { const t = [id(i), id(i + 1), id(i + 2)]; [[0, 1], [1, 2], [2, 0]].forEach(([a, b]) => { const x = Math.min(t[a], t[b]), y = Math.max(t[a], t[b]), k = x + ',' + y; if (!vus.has(k)) { vus.add(k); aretes.push([x, y]); } }); }
}
const PROF = `float prof(vec3 p){ vec4 mv=modelViewMatrix*vec4(p,1.); float zc=(modelViewMatrix*vec4(0.,0.,0.,1.)).z; return clamp(.6+(mv.z-zc)*.32,.2,1.); }`;
const uRevele = { value: 0 }, uAttenue = { value: 1 }; // uAttenue : la bulle s'efface un peu quand les échanges commencent
{
  const p = [], h = [];
  aretes.forEach(([a, b]) => { p.push(...sommets[a].toArray(), ...sommets[b].toArray()); h.push(sommets[a].y, sommets[b].y); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  room.add(new THREE.LineSegments(g, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uRevele, uAttenue, uR: { value: R.rayon }, uC: { value: new THREE.Color(C.couleurs.bleu) } },
    vertexShader: `uniform float uRevele; uniform float uAttenue; uniform float uR; varying float vA; ${PROF}
      void main(){ float h=(position.y+uR)/(2.*uR); vA=smoothstep(h-.02,h+.06,uRevele*1.08)*prof(position)*.62*uAttenue; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 uC; varying float vA; void main(){ if(vA<.003) discard; gl_FragColor=vec4(uC,vA); }`
  })));
}
// Nœuds : petites perles bleues, qui apparaissent avec le maillage.
const perle = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: C.couleurs.bleu }), sommets.length);
let gr = 21; const rr = () => (gr = gr * 16807 % 2147483647) / 2147483647;
const tailles = sommets.map(() => rr() < .8 ? .018 : .032);
room.add(perle);
// Voile bleu très léger à l'intérieur (plus dense au centre).
const voile = new THREE.Mesh(new THREE.SphereGeometry(R.rayon * .99, 48, 32), new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, uniforms: { uRevele, uC: { value: new THREE.Color(C.couleurs.bleuClair) } },
  vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 uC; uniform float uRevele; varying vec3 vN; varying vec3 vV; void main(){ float f=abs(dot(vN,vV)); gl_FragColor=vec4(uC,pow(f,2.)*.16*smoothstep(.5,1.,uRevele)); }`
}));
room.add(voile);

/* Place de chaque membre dans la bulle : répartis régulièrement, à différentes hauteurs. */
membres.forEach((g, i) => {
  // Les gros objets et les petits cubes alternent, pour que les objets se répartissent sur toute la hauteur.
  const n = membres.length, j = i < objets.length ? i * 2 : (i - objets.length) * 2 + 1, y = 1 - 2 * (j + .5) / n, r = Math.sqrt(1 - y * y), a = j * Math.PI * (3 - Math.sqrt(5));
  g.userData.dansRoom = new THREE.Vector3(Math.cos(a) * r * .66, y * .62 - .05, Math.sin(a) * r * .66).multiplyScalar(R.rayon).add(centreRoom);
  g.userData.retard = (i % 8) * .045 + (i >= objets.length ? .08 : 0);
  g.userData.echelleRoom = ({ telephone: 1.5, navigateur: .85, ordinateur: .8, donnees: .42 })[g.userData.type] || R.echelleMembres;
});

/* ══════════ Formations : chaque méthode range les membres dans une figure simple et reconnaissable ══════════
   pair = anneau (tout le monde se parle) · multicast = étoile (un au centre, tous autour)
   entrainement = roue (le modèle au centre, les machines qui apprennent autour) · automatisation = chaîne (de gauche à droite) */
const anneauY = () => centreRoom.y - .12;
const surAnneau = (k, n, r) => new THREE.Vector3(Math.cos(k / n * Math.PI * 2 + .5) * r, 0, Math.sin(k / n * Math.PI * 2 + .5) * r * .9).add(centreRoom).setY(anneauY());
const droiteEcran = new THREE.Vector3(1, 0, 0);
// Place réservée à l'acteur dans la figure, et points d'entrée (à gauche) et de sortie (à droite) hors de la bulle.
const placeActeur = () => casCourant === 'flotte' ? surAnneau(objets.length - 1, objets.length, 1.02) : surAnneau(objets.length, objets.length + 1, .98);
const dehors = (cote, out = new THREE.Vector3()) => out.copy(centreRoom).addScaledVector(droiteEcran, cote * (C.room.rayon * .95 + .45)).setY(centreRoom.y - C.room.rayon * .72);
let casCourant = null;
function formation(mode, i) { // → [position, visible]
  const O = objets.length, estCube = i >= O;
  if (mode === 'isole' || mode === 'pair') return estCube ? [membres[i].userData.dansRoomInitial, mode === 'isole'] : [surAnneau(i, O + (casCourant === 'partenaires' ? 1 : 0), .98), true];
  if (estCube) return [centreRoom, false];
  if (mode === 'multicast') { if (i === C.roles.source) return [centreRoom.clone().setY(anneauY()), true]; const autres = objets.map((_, j) => j).filter(j => j !== C.roles.source); return [surAnneau(autres.indexOf(i), autres.length + (casCourant === 'flotte' ? 1 : 0), 1.02), true]; }
  if (mode === 'entrainement') { const W = C.roles.entraineurs, k = W.indexOf(i); return k < 0 ? [centreRoom, false] : [surAnneau(k + 1.6, W.length, 1.05), true]; }
  if (mode === 'hub') { const Hb = C.roles.hub, k = Hb.indexOf(i); return k < 0 ? [centreRoom, false] : [surAnneau(k + .5, Hb.length, .62), true]; }
  if (mode === 'automatisation') { const Ch = C.roles.chaine, k = Ch.indexOf(i); if (k < 0) return [centreRoom, false];
    return [centreRoom.clone().addScaledVector(droiteEcran, -1.08 + k * 2.16 / (Ch.length - 1)).setY(anneauY() + Math.sin(k / (Ch.length - 1) * Math.PI) * .18), true]; }
  return [centreRoom, true];
}
membres.forEach((g, i) => { g.userData.dansRoomInitial = g.userData.dansRoom.clone(); g.userData.vis = 1; });
membres.forEach((g, i) => { if (i < objets.length) g.userData.dansRoom.copy(formation('pair', i)[0]); });

/* Traînées bleues : le chemin parcouru par chaque objet qui monte. */
const SEGT = 14, MAXL = membres.length * SEGT;
const lPos = new Float32Array(MAXL * 6), lCol = new Float32Array(MAXL * 6).fill(1);
const lGeo = new LineSegmentsGeometry(); lGeo.setPositions(lPos); lGeo.setColors(lCol);
const lMat = new LineMaterial({ vertexColors: true, linewidth: 2.5, worldUnits: false });
const lTraines = new LineSegments2(lGeo, lMat); lTraines.frustumCulled = false; scene.add(lTraines);
const chemin = (g, t, out) => { const a = g.userData.surSol, b = g.userData.dansRoom; // courbe : monte d'abord, puis glisse vers sa place
  const c1 = a.clone().setY(a.y + 1.1), c2 = b.clone().lerp(centreRoom, -.15).setY(b.y - .6);
  const u = 1 - t; return out.set(0, 0, 0).addScaledVector(a, u * u * u).addScaledVector(c1, 3 * u * u * t).addScaledVector(c2, 3 * u * t * t).addScaledVector(b, t * t * t); };

/* ── Les échanges ratés d'aujourd'hui : un tiret bleu part, ralentit et s'éteint avant d'arriver ── */
const tentatives = [];
const MAXT = 6, tPos = new Float32Array(MAXT * 2 * 3), tCol = new Float32Array(MAXT * 2 * 3);
const tGeo = new LineSegmentsGeometry(); tGeo.setPositions(tPos); tGeo.setColors(tCol);
const tMat = new LineMaterial({ vertexColors: true, linewidth: 4, worldUnits: false });
const tLignes = new LineSegments2(tGeo, tMat); tLignes.frustumCulled = false; scene.add(tLignes);
const bord = (g, vers) => { const p = g.position.clone(), d = vers.clone().sub(p).setY(0).normalize(); return p.add(d.multiplyScalar(.42)).setY(.02); };
function tenter() {
  const [a, b] = C.echecs[Math.floor(Math.random() * C.echecs.length)], A = objets[a], B = objets[b];
  tentatives.push({ de: bord(A, B.position), vers: bord(B, A.position), t0: horloge, abandon: .45 + Math.random() * .3 });
}

/* ── Caméra : interpolée entre les cadrages des états ; la scène se décale à droite pour le texte ── */
const cible = new THREE.Vector3(); let W = 1, H = 1, etroit = false;
function cadrer() {
  W = host.clientWidth; H = host.clientHeight; etroit = W < 820;
  renderer.setSize(W, H, false); camera.aspect = W / H; tMat.resolution.set(W, H); lMat.resolution.set(W, H); if (window.__fMat) window.__fMat.resolution.set(W, H);
  membres.forEach(g => g.userData.surSol = new THREE.Vector3(g.userData.x * (etroit ? .62 : 1), 0, g.userData.z));
}
let zoom = 0, decal = 0, vueRoute = 0; // vueRoute : la caméra regarde les routes (cas « flotte ») // decal : recentre la scène pendant les cas d'usage
function placerCamera(m) {
  const a = C.cadrages[0], b = C.cadrages[1];
  cible.fromArray(a.cible).lerp(new THREE.Vector3(...b.cible), m).lerp(centreRoom, zoom * .8).add(v2.set(0, -.4, .85).multiplyScalar(vueRoute));
  const k = C.camera, base = (a.distance + (b.distance - a.distance) * m) * (1 - .24 * zoom);
  const dist = base * (etroit ? Math.max(1, 1.05 / (W / H)) * .82 : Math.max(1, 1.5 / (W / H))) * (INTEGRE ? (etroit ? 1.12 : .8) : 1);
  const el = THREE.MathUtils.degToRad(k.hauteurDeg), az = THREE.MathUtils.degToRad(k.azimutDeg);
  camera.position.set(cible.x + Math.sin(az) * Math.cos(el) * dist, cible.y + Math.sin(el) * dist, cible.z + Math.cos(az) * Math.cos(el) * dist);
  camera.lookAt(cible);
  camera.setViewOffset(W, H, (0.5 - (etroit ? C.centreEcran.etroit : C.centreEcran.large - (INTEGRE ? 0 : .06) * decal)) * W, etroit ? 0 : -H * .04, W, H);
  camera.updateProjectionMatrix();
}
addEventListener('resize', cadrer); cadrer();

/* ══════════ L'histoire : avance toute seule, sans clic. Pause possible (accessibilité). ══════════ */
const E = C.etapes, el = id => document.getElementById(id);
const nav = el('r3d-nav'), btnPause = el('r3d-pause'), texte = el('r3d-texte');
const points = E.map((e, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'r3d-dot'; b.setAttribute('aria-label', `${TX.etape} ${i + 1} : ${e.sur}`); b.innerHTML = `${e.onglet}<i></i>`;
  b.addEventListener('click', () => allerA(i)); nav.insertBefore(b, btnPause); return b; });
let etape = 0, tEtape = 0, enPause = reduit, survolActif = false, m = 0;
function afficherTexte(i) {
  texte.classList.add('r3d-sort');
  setTimeout(() => { el('r3d-sur').textContent = E[i].sur; el('r3d-titre').textContent = E[i].titre; if (el('r3d-lead')) el('r3d-lead').textContent = E[i].texte; texte.classList.remove('r3d-sort'); }, texte.dataset.pret ? 380 : 0);
  texte.dataset.pret = 1;
}
function allerA(i) { etape = (i + E.length) % E.length; tEtape = 0; afficherTexte(etape); points.forEach((p, k) => k === etape ? p.setAttribute('aria-current', 'step') : p.removeAttribute('aria-current')); }
function majPause() { btnPause.classList.toggle('r3d-lecture', enPause); btnPause.setAttribute('aria-label', enPause ? TX.reprendre : TX.pause); }
btnPause.addEventListener('click', () => { enPause = !enPause; majPause(); });
allerA(0); majPause();

/* ── Survol : nom et rôle de l'objet ── */
const ray = new THREE.Raycaster(), souris = new THREE.Vector2(9, 9); let survol = null, sx = 0, sy = 0;
host.addEventListener('pointermove', e => { const r = host.getBoundingClientRect(); sx = e.clientX - r.left; sy = e.clientY - r.top; souris.set(sx / r.width * 2 - 1, -(sy / r.height) * 2 + 1); });
host.addEventListener('pointerleave', () => souris.set(9, 9));
let px = 0, py = 0;
const facile = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();


/* ══════════ Les échanges dans la Room : chaque cas d'usage a sa propre « signature » de mouvement ══════════ */
const tA = new THREE.Vector3(), tB = new THREE.Vector3(), tC = new THREE.Vector3();
const centreDe = (x, out) => x === 'c' ? out.copy(cristal.position) : x.isObject3D ? out.copy(x.position).setY(x.position.y + .12 * x.scale.x) : out.copy(membres[x].position).setY(membres[x].position.y + .1 * membres[x].scale.x);
// Liens autorisés : chaque membre est relié à ses 3 voisins les plus proches dans la bulle.
const O = objets.length, idxObjets = objets.map((_, i) => i);
const LIENS = {
  isole: [], pair: idxObjets.flatMap(i => [[i, (i + 1) % O], [i, (i + 3) % O]]),
  multicast: idxObjets.filter(i => i !== C.roles.source).map(i => [C.roles.source, i]),
  entrainement: C.roles.entraineurs.map(i => ['c', i]),
  automatisation: C.roles.chaine.slice(0, -1).map((a, k) => [a, C.roles.chaine[k + 1]])
};
LIENS.hub = C.roles.hub.map(i => ['c', i]); LIENS.flotte = LIENS.multicast; LIENS.ia = LIENS.entrainement; LIENS.partenaires = LIENS.pair;
let liens = LIENS.pair;
const liPos = new Float32Array(40 * 6), liGeo = new THREE.BufferGeometry(); liGeo.setAttribute('position', new THREE.BufferAttribute(liPos, 3));
const liMat = new THREE.LineBasicMaterial({ color: C.couleurs.bleu, transparent: true, opacity: 0, depthWrite: false });
const liLignes = new THREE.LineSegments(liGeo, liMat); liLignes.frustumCulled = false; scene.add(liLignes);
// Étiquettes directes : le nom de chaque membre actif, posé sous lui (pas besoin de survoler).
const puces = [...objets.map(g => { const d = document.createElement('div'); d.className = 'r3d-chip'; d.textContent = g.userData.nom; host.parentElement.appendChild(d); return d; })];
const puce = (txt, cl = 'r3d-chip') => { const d = document.createElement('div'); d.className = cl; d.textContent = txt; host.parentElement.appendChild(d); return d; };
Object.values(ACTEURS).forEach(a => a.puce = puce(a.nom));
const puceEntree = puce('', 'r3d-chip'), puceSortie = puce('', 'r3d-chip r3d-sortie');
const puceModele = document.createElement('div'); puceModele.className = 'r3d-chip r3d-c'; puceModele.textContent = TX.modele;
const puceSource = puce(TX.source, 'r3d-chip r3d-c'); host.parentElement.appendChild(puceModele);
// Paquets de données (tête + petite traînée) et anneaux d'arrivée.
const MAXP = 420, paqMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), MAXP); paqMesh.frustumCulled = false; scene.add(paqMesh);
for (let i = 0; i < MAXP; i++) paqMesh.setColorAt(i, COUL.bleu); // couleur par paquet (bleu par défaut, vert pour la 2e nouvelle…)
let paquets = [];
function envoyer(a, b, dur, o = {}) { paquets.push({ a, b, t0: horloge + (o.delai || 0), dur, taille: o.taille || .042, fin: o.fin, couleur: o.couleur || COUL.bleu }); }
// Point d'attache du fil sur la bulle : là où la ligne élément → centre traverse la sphère.
const ancre = (p, out) => out.copy(p).sub(centreRoom).normalize().multiplyScalar(R.rayon * .98).add(centreRoom);
function posPaquet(p, t, out) {
  const sa = p.a.isObject3D && p.a.userData.satellite, sb = p.b.isObject3D && p.b.userData.satellite;
  if (sa || sb) { // le long du fil : élément extérieur → bord de la bulle → centre de la Room (ou l'inverse)
    centreDe(sa ? p.a : p.b, tA); ancre(tA, tB); centreDe('c', tC); const tt = sa ? t : 1 - t;
    const d1 = tA.distanceTo(tB), d2 = tB.distanceTo(tC), k = tt * (d1 + d2);
    return k < d1 ? out.copy(tA).lerp(tB, k / d1) : out.copy(tB).lerp(tC, (k - d1) / d2); }
  centreDe(p.a, tA); centreDe(p.b, tB); tC.copy(tA).add(tB).multiplyScalar(.5).lerp(centreRoom, .3); const u = 1 - t;
  return out.copy(tA).multiplyScalar(u * u).addScaledVector(tC, 2 * u * t).addScaledVector(tB, t * t); }
const anneaux = Array.from({ length: 40 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 48), new THREE.MeshBasicMaterial({ color: C.couleurs.bleu, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); m.visible = false; scene.add(m); return { m, t0: -9, x: 0, taille: .3 }; });
function anneau(x, taille = .32, couleur = COUL.bleu) { const a = anneaux.find(r => horloge - r.t0 > .8) || anneaux[0]; a.t0 = horloge; a.x = x; a.taille = taille; a.m.visible = true; a.m.material.color.copy(couleur); }
// Le modèle commun (entraînement IA) : un cristal au centre de la Room.
const cristal = new THREE.Group(); cristal.position.copy(centreRoom); cristal.scale.setScalar(.001); scene.add(cristal);
{ const ico = new THREE.IcosahedronGeometry(.24, 0);
  cristal.add(new THREE.Mesh(ico, new THREE.MeshBasicMaterial({ color: C.couleurs.bleuClair, transparent: true, opacity: .35, depthWrite: false })));
  cristal.add(new THREE.LineSegments(new THREE.EdgesGeometry(ico), new THREE.LineBasicMaterial({ color: C.couleurs.bleu })));
  const coeur = new THREE.IcosahedronGeometry(.11, 1); cristal.add(new THREE.LineSegments(new THREE.EdgesGeometry(coeur), new THREE.LineBasicMaterial({ color: C.couleurs.bleu, transparent: true, opacity: .6 }))); }
let cristalCible = 0, cristalPouls = 0;
// Anneaux d'entraînement local : un cercle qui tourne autour de chaque machine qui apprend.
const cerclesLocaux = C.roles.entraineurs.map(() => { const pts = new THREE.EllipseCurve(0, 0, 1, 1, 0, Math.PI * 1.6).getPoints(40).map(p => new THREE.Vector3(p.x, 0, p.y));
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: C.couleurs.bleu, transparent: true, opacity: 0 })); scene.add(l); return l; });
// Fils : un trait fin de chaque élément extérieur jusqu'à la bulle ; il s'éclaire quand une donnée y passe.
const MAXF = tousSat.length, fPos = new Float32Array(MAXF * 6), fCol = new Float32Array(MAXF * 6).fill(1);
const fGeo = new LineSegmentsGeometry(); fGeo.setPositions(fPos); fGeo.setColors(fCol);
const fMat = new LineMaterial({ vertexColors: true, linewidth: 1.6, worldUnits: false });
window.__fMat = fMat; fMat.resolution.set(W, H);
const fLignes = new LineSegments2(fGeo, fMat); fLignes.frustumCulled = false; scene.add(fLignes);
const FIL = new THREE.Color(C.couleurs.bleuClair).lerp(BLANC, .45);
const puceEvt = puce('', 'r3d-chip r3d-c');
let evtTxt = '', evtSat = null, resCouleur = 'bleu', etatsInfos = [];
const badge = document.getElementById('r3d-badge');
if (INTEGRE) document.getElementById('r3d-texte').appendChild(badge);
let modeCourant = null, evt = 0, recus = 0, tour = 0, sortieTxt = '', entreeTxt = '', donneesEnvoyees = false;
const srcDonnees = new THREE.Object3D(); scene.add(srcDonnees);
// Trajet d'un acteur : dehors à gauche → sa place dans la Room (arrivée à tA1) → reste → ressort à droite (de tB à tB2).
function trajet(t, tA1, tB, tB2) {
  const g = dehors(-1, new THREE.Vector3()), p = placeActeur(), d = dehors(1, new THREE.Vector3());
  if (t < tA1) return g.lerp(p, facile(Math.max(0, t) / tA1));
  if (t < tB) return p.setY(p.y + Math.sin(horloge * 1.3) * .02);
  return p.lerp(d, facile(Math.min(1, (t - tB) / (tB2 - tB))));
}
function activite(dt) {
  const e = E[etape], actif = m > .97 ? e.mode : 'isole';
  const cas = m > .97 ? (e.cas || null) : null, cle = actif + '/' + cas;
  if (cle !== modeCourant) { modeCourant = cle; casCourant = cas; evt = 0; donneesEnvoyees = false; recus = 0; tour = 0; badge.style.opacity = 0; liens = LIENS[actif] || []; paquets = []; cristal.position.copy(centreRoom);
    etatsInfos = []; evtSat = null; tousSat.forEach(s => { s.coul.copy(COUL.neutre); s.vise.copy(COUL.neutre); }); }
  const t = tEtape, tc = cas === 'ia' ? t - 1.2 : t; // l'entraînement démarre une fois les données arrivées
  sortieTxt = ''; entreeTxt = ''; evtTxt = '';
  tousSat.forEach(s => s.cible = 0);
  Object.values(ACTEURS).forEach(a => a.cible = 0);
  liMat.opacity = THREE.MathUtils.clamp((m - .9) / .1, 0, 1) * .45;
  // Hiérarchie : quand les échanges commencent, la bulle passe au second plan pour que les données ressortent.
  uAttenue.value += ((actif === 'isole' ? 1 : .3) - uAttenue.value) * Math.min(1, dt * 3);
  cristalCible = actif === 'entrainement' ? 1 : 0;
  if (SAT[cas]) { // éléments extérieurs reliés : les nouvelles passent par la Room et changent la couleur de chacun
    const Ss = SAT[cas], infos = C.infos[cas] || [];
    Ss.forEach(s => s.cible = 1);
    // Bavardage de fond : un élément envoie à un autre, toujours en passant par la Room (lentement, discret).
    if (t > evt) { const a = Ss[Math.floor(Math.random() * Ss.length)], b = Ss[(a.k + 1 + Math.floor(Math.random() * (Ss.length - 1))) % Ss.length];
      envoyer(a.g, 'c', 1.1, { taille: .026 }); envoyer('c', b.g, 1.1, { delai: 1.1, taille: .026 }); evt = t + .55; }
    let derniere = -1;
    infos.forEach((inf, k) => { if (t < inf.t) return; derniere = k; const cl = COUL[inf.couleur], src = Ss[inf.source];
      if (!etatsInfos[k]) { etatsInfos[k] = { recus: 0 }; src.vise.copy(cl); anneau(src.g, .42, cl);
        // 1) la nouvelle monte vers la Room ; 2) la Room la renvoie à tous, en même temps (dehors et dedans)
        envoyer(src.g, 'c', 1.2, { taille: .055, couleur: cl, fin: () => { anneau('c', .55, cl);
          const cibles = [...Ss.filter(s => s !== src).map(s => s.g), ...C.roles.hub];
          cibles.forEach(c => envoyer('c', c, 1.4, { taille: .05, couleur: cl, fin: () => { etatsInfos[k].recus++; anneau(c, c.isObject3D ? .38 : .3, cl); if (c.isObject3D) c.userData.satellite.vise.copy(cl); } })); } }); }
    });
    if (derniere < 0) afficherBadge(cas === 'flotte' ? TX.reliesCamions : TX.reliesDrones);
    else { const inf = infos[derniere], st = etatsInfos[derniere], cl = inf.couleur; evtSat = Ss[inf.source]; evtTxt = TX[inf.evt];
      afficherBadge(st.recus ? f(TX.recus, { n: st.recus }) : f(TX.partage, { evt: TX[inf.evt] }));
      if (st.recus >= Ss.length - 1) { sortieTxt = TX[inf.res]; resCouleur = cl; } }
  } else if (cas === 'partenaires') { // l'expert entre, échange avec l'équipe, puis son accès est retiré
    const X = ACTEURS.expert, dans = t > 1.0 && t < 4.0;
    X.cible = t < 5.2 ? 1 : 0; X.g.position.copy(trajet(t, 1.0, 4.0, 5.0));
    const voisinsX = [[X.g, 0], [X.g, objets.length - 1], [X.g, 2]];
    liens = dans ? [...LIENS.pair, ...voisinsX] : LIENS.pair;
    if (t > evt) { const [a, b] = dans && Math.random() < .45 ? voisinsX[Math.floor(Math.random() * 3)] : LIENS.pair[Math.floor(Math.random() * LIENS.pair.length)];
      Math.random() < .5 ? envoyer(a, b, .7) : envoyer(b, a, .7); evt = t + .1; }
    if (t < 1.2) entreeTxt = TX.invitation;
    afficherBadge(t < 4.0 ? TX.enDirect : TX.projetFini);
    if (t > 4.6) sortieTxt = TX.accesRetire;
  } else if (actif === 'pair') { // des échanges de pair à pair, partout, dans les deux sens
    if (t > evt) { const [a, b] = liens[Math.floor(Math.random() * liens.length)]; Math.random() < .5 ? envoyer(a, b, .75) : envoyer(b, a, .75); evt = t + .09; }
  } else if (actif === 'multicast') { // un envoi, tous reçoivent sur la même image
    const flotte = cas === 'flotte', K = ACTEURS.camion, departs = flotte ? [1.35] : [.35, 2.6];
    if (flotte) { K.cible = 1; K.g.position.copy(trajet(t, 1.1, 3.5, 4.7)); liens = t > 1.1 && t < 3.5 ? [...LIENS.multicast, [C.roles.source, K.g]] : LIENS.multicast;
      if (t < 1.1) entreeTxt = TX.camionArrive; if (t > 4.7) sortieTxt = TX.flotteAJour; }
    departs.forEach((d, k) => { if (evt <= k && t > d) { evt = k + 1; recus = 0; anneau(C.roles.source, .45);
      const cibles = [...idxObjets.filter(i => i !== C.roles.source), ...(flotte ? [K.g] : [])];
      cibles.forEach(i => envoyer(C.roles.source, i, 1.0, { delai: .25, taille: .055, fin: () => { recus++; anneau(i); } })); } });
    afficherBadge(recus ? f(TX.recus, { n: recus }) : (flotte && t < 1.35 ? TX.camionRejoint : TX.envoiEnCours));
  } else if (actif === 'entrainement') { // apprentissage local, puis mise en commun, puis renvoi à tous (DiLoCo)
    const W = C.roles.entraineurs;
    if (cas === 'ia') { // 1) vos données entrent ; 3) le modèle entraîné sort vers la production
      if (!donneesEnvoyees && t > .1) { donneesEnvoyees = true; dehors(-1, srcDonnees.position); W.forEach((i, j) => envoyer(srcDonnees, i, .9, { delai: j * .12, taille: .04, fin: () => anneau(i, .26) })); }
      if (t < 1.6) entreeTxt = TX.donneesEntrent;
      const P = ACTEURS.production; dehors(1, P.g.position); P.cible = t > 5.4 ? 1 : 0;
      if (t > 6.0) { const v = facile(Math.min(1, (t - 6.0) / .9)); cristal.position.copy(centreRoom).lerp(v2.copy(P.g.position).setY(P.g.position.y + .32), v); }
      if (t > 6.9) sortieTxt = TX.iaPrete;
    }
    if (tc < 0 || (cas === 'ia' && t > 6.0)) { afficherBadge(cas === 'ia' && t > 6.0 ? TX.modeleSort : TX.partDonnees); cerclesLocaux.forEach(l => l.material.opacity = Math.max(0, l.material.opacity - dt * 3)); }
    else {
    const cycle = 2.4, k = Math.floor(tc / cycle), u = tc - k * cycle;
    if (evt <= k * 3 && u > 1.1) { evt = k * 3 + 1; W.forEach(i => envoyer(i, 'c', .55, { taille: .03 })); }
    if (evt === k * 3 + 1 && u > 1.7) { evt = k * 3 + 2; cristalPouls = 1; anneau('c', .5); tour = k + 1; W.forEach(i => envoyer('c', i, .55, { taille: .04, fin: () => anneau(i, .28) })); }
    cerclesLocaux.forEach((l, j) => { const g = membres[W[j]]; centreDe(W[j], l.position); l.position.y -= .06; l.scale.setScalar(.3 * g.scale.x / .62 + .05);
      l.rotation.y -= dt * (u < 1.1 ? 5 : 1); l.material.opacity = u < 1.1 ? .85 : .25; });
    afficherBadge(u < 1.1 ? f(TX.diloco, { k: k + 1 }) : TX.miseEnCommun);
    }
  } else if (actif === 'automatisation') { // une chaîne : chaque machine déclenche la suivante
    const Ch = C.roles.chaine, pas = .85, k = Math.floor(t / pas);
    if (evt <= k && k < Ch.length - 1) { evt = k + 1; anneau(Ch[k], .3); envoyer(Ch[k], Ch[k + 1], .7, { taille: .04, fin: () => anneau(Ch[k + 1], .34) }); }
    afficherBadge(f(TX.chaine, { k: Math.min(k + 1, Ch.length), n: Ch.length, nom: membres[Ch[Math.min(k, Ch.length - 1)]].userData.nom }));
  }
  // Éléments extérieurs : roulent / volent lentement, apparaissent en douceur, prennent la couleur de la nouvelle reçue.
  tousSat.forEach(s => { const g = s.g, p = s.p; s.vis += (s.cible - s.vis) * Math.min(1, dt * 3);
    let bord = 1;
    if (s.cfg.type === 'camion') { if (!reduit) s.x += p.v * dt; if (s.x > 3.6) s.x = -3.4; if (s.x < -3.4) s.x = 3.6;
      bord = THREE.MathUtils.clamp(Math.min(3.6 - s.x, s.x + 3.4) / .6, 0, 1); g.position.set(s.x, 0, p.z); g.rotation.y = p.v > 0 ? 0 : Math.PI; }
    else { if (!reduit) s.a += p.w * dt; g.position.set(centreRoom.x + Math.cos(s.a) * p.r, p.h + Math.sin(horloge * 1.7 + p.p) * .05, centreRoom.z + Math.sin(s.a) * p.r * .8); g.rotation.y = -s.a; }
    g.scale.setScalar(Math.max(.001, s.vis * s.cfg.echelle * bord));
    s.coul.lerp(s.vise, Math.min(1, dt * 6)); if (g.userData.peinture) g.userData.peinture.color.copy(s.coul);
    s.actif = Math.max(0, s.actif - dt * 1.5); });
  // Acteurs : apparaissent / disparaissent en douceur.
  Object.values(ACTEURS).forEach(a => { a.vis += (a.cible - a.vis) * Math.min(1, dt * 5); a.g.scale.setScalar(Math.max(.001, a.vis * a.echelle)); a.g.rotation.y = Math.atan2(-droiteEcran.z, droiteEcran.x); });
  if (actif !== 'entrainement') cerclesLocaux.forEach(l => l.material.opacity = Math.max(0, l.material.opacity - dt * 3));
  // Cristal : apparaît, tourne, bat au moment de la mise en commun.
  const sc = THREE.MathUtils.lerp(cristal.scale.x, cristalCible * (1 + cristalPouls * .35), Math.min(1, dt * 6)); cristal.scale.setScalar(Math.max(.001, sc));
  cristal.rotation.y += dt * .8; cristal.rotation.x += dt * .3; cristalPouls = Math.max(0, cristalPouls - dt * 2.5);
}
function afficherBadge(txt) { if (badge.textContent !== txt) badge.textContent = txt; badge.style.opacity = 1; }
function dessinerEchanges() {
  const off = host.offsetTop, offL = host.offsetLeft;
  const placer = (d, p, dy = 6) => { tA.copy(p).project(camera); const demi = d.offsetWidth / 2 + 8; d.style.left = (THREE.MathUtils.clamp((tA.x + 1) / 2 * W, demi, W - demi) + offL) + 'px'; // jamais coupée au bord de l'écran
    d.style.top = ((1 - tA.y) / 2 * H + off + dy) + 'px'; };
  // Liens
  liens.forEach(([a, b], k) => { centreDe(a, tA).toArray(liPos, k * 6); centreDe(b, tB).toArray(liPos, k * 6 + 3); }); liGeo.setDrawRange(0, liens.length * 2); liGeo.attributes.position.needsUpdate = true;
  // Étiquettes directes
  const mon = m > .97 && !modeCourant.startsWith('isole') && !(etroit && (modeCourant.startsWith('pair') || modeCourant.startsWith('multicast')));
  // Qui nommer : dans un cas d'usage, seulement les acteurs de l'histoire (sinon 8 étiquettes se disputent l'œil).
  const utile = i => SAT[casCourant] ? false : casCourant === 'partenaires' ? false : modeCourant.startsWith('entrainement') ? C.roles.entraineurs.includes(i) : true;
  const pris = [];
  const libre = (x, y, w) => { if (pris.some(r => Math.abs(r[0] - x) < (r[2] + w) / 2 + 4 && Math.abs(r[1] - y) < 24)) return false; pris.push([x, y, w]); return true; };
  Object.values(ACTEURS).forEach(a => { if (a.vis > .7) { tA.copy(a.g.position).project(camera); pris.push([(tA.x + 1) / 2 * W, (1 - tA.y) / 2 * H + 6, a.nom.length * 7 + 16]); } });
  objets.forEach((g, i) => { const d = puces[i]; let ok = mon && g.userData.vis > .7 && utile(i);
    if (ok) { tA.copy(g.position).setY(g.position.y - .06).project(camera); const x = (tA.x + 1) / 2 * W, y = (1 - tA.y) / 2 * H + 6; ok = libre(x, y, g.userData.nom.length * 7 + 16);
      if (ok) { d.style.left = (x + offL) + 'px'; d.style.top = (y + off) + 'px'; } }
    d.style.opacity = ok ? 1 : 0; });
  Object.values(ACTEURS).forEach(a => { const ok = m > .97 && a.vis > .7; a.puce.style.opacity = ok ? 1 : 0; if (ok) placer(a.puce, v1.copy(a.g.position).setY(a.g.position.y - .04)); });
  puceEntree.style.opacity = entreeTxt && m > .97 ? 1 : 0; if (entreeTxt) { puceEntree.textContent = entreeTxt; placer(puceEntree, dehors(-1, v1).setY(v1.y + .35), 0); }
  puceSortie.style.opacity = sortieTxt && m > .97 ? 1 : 0; if (sortieTxt) { puceSortie.textContent = sortieTxt; placer(puceSortie, dehors(1, v1).setY(v1.y - .2), 10); }
  const okS = false; puceSource.style.opacity = okS ? 1 : 0; if (okS) placer(puceSource, v1.copy(objets[C.roles.source].position).setY(objets[C.roles.source].position.y - .06));
  const okM = mon && modeCourant.startsWith('entrainement') && !(casCourant === 'ia' && tEtape > 6.0); puceModele.style.opacity = okM ? 1 : 0;
  if (okM) { tA.copy(centreRoom).setY(centreRoom.y - .3).project(camera); puceModele.style.left = ((tA.x + 1) / 2 * W + offL) + 'px'; puceModele.style.top = ((1 - tA.y) / 2 * H + off) + 'px'; }
  // Fils des éléments extérieurs
  tousSat.forEach((s, k) => { if (s.vis < .02) { fPos.fill(0, k * 6, k * 6 + 6); fCol.fill(1, k * 6, k * 6 + 6); return; }
    centreDe(s.g, tA); ancre(tA, tB); tA.toArray(fPos, k * 6); tB.toArray(fPos, k * 6 + 3);
    const c = FIL.clone().lerp(s.coul.equals(COUL.neutre) ? BLEU : s.coul, .25 + .6 * s.actif).lerp(BLANC, 1 - s.vis * (s.g.scale.x / (s.cfg.echelle || 1)));
    fCol.set([c.r, c.g, c.b, c.r, c.g, c.b], k * 6); });
  fGeo.setPositions(fPos); fGeo.setColors(fCol);
  puceEvt.style.opacity = evtTxt && evtSat && m > .97 ? 1 : 0; if (evtTxt && evtSat) { puceEvt.textContent = evtTxt; placer(puceEvt, v1.copy(evtSat.g.position).setY(evtSat.g.position.y + .45), -26); }
  puceSortie.classList.toggle('r3d-vert', resCouleur === 'vert');
  // Paquets
  let n = 0; const garde = [];
  for (const p of paquets) { const t = (horloge - p.t0) / p.dur;
    if (t >= 1) { p.fin && p.fin(); continue; } garde.push(p); if (t < 0) continue;
    for (let q = 0; q < 4 && n < MAXP; q++, n++) { const tt = Math.max(0, t - q * .045), s = p.taille * (1 - q * .2); posPaquet(p, tt, v1); paqMesh.setMatrixAt(n, m4.compose(v1, q0, v2.set(s, s, s))); paqMesh.setColorAt(n, p.couleur); }
    [p.a, p.b].forEach(x => { if (x.isObject3D && x.userData.satellite) x.userData.satellite.actif = 1; }); }
  paquets = garde; paqMesh.count = n; paqMesh.instanceMatrix.needsUpdate = true; if (paqMesh.instanceColor) paqMesh.instanceColor.needsUpdate = true;
  // Anneaux : s'agrandissent et s'effacent, toujours face à la caméra
  anneaux.forEach(a => { const e = (horloge - a.t0) / .8; if (e > 1) { a.m.visible = false; return; } centreDe(a.x, a.m.position); a.m.quaternion.copy(camera.quaternion);
    a.m.scale.setScalar(a.taille * (.35 + e * .9)); a.m.material.opacity = (1 - e) * .9; });
  // Badge au-dessus de la Room
  if (INTEGRE) { if (m <= .9) badge.style.opacity = 0; }
  else if (m > .9) { tA.copy(centreRoom).setY(centreRoom.y + R.rayon + .25).project(camera); badge.style.left = ((tA.x + 1) / 2 * W) + 'px'; badge.style.top = ((1 - tA.y) / 2 * H + host.offsetTop) + 'px'; }
  else badge.style.opacity = 0;
}

/* ── Boucle ── */
const horlogeGL = new THREE.Clock(); let horloge = 0, prochaine = 0.15, visible = true;
let dansEcran = true; new IntersectionObserver(([e]) => { dansEcran = e.isIntersecting; visible = dansEcran && !document.hidden; }).observe(host);
document.addEventListener('visibilitychange', () => { visible = dansEcran && !document.hidden; horlogeGL.getDelta(); });
renderer.setAnimationLoop(() => {
  const brut = horlogeGL.getDelta(), dt = Math.min(.05, brut); if (!visible) return; horloge += dt;
  qualite.n++; qualite.somme += brut; if (qualite.n === 90) { const moy = qualite.somme / 90; qualite.n = 0; qualite.somme = 0;
    if (moy > 1 / 45 && qualite.dpr > 1) { qualite.dpr = Math.max(1, qualite.dpr - .5); renderer.setPixelRatio(qualite.dpr); cadrer(); } }

  // Avance automatique de l'histoire (en pause si demandé, ou pendant qu'on lit une info-bulle).
  if (!enPause && !survolActif) { tEtape += dt; if (tEtape > E[etape].duree) allerA(etape + 1); }
  points.forEach((p, i) => p.lastChild.style.width = (i < etape ? 100 : i > etape ? 0 : Math.min(100, tEtape / E[etape].duree * 100)) + '%');
  // État de la scène : glisse doucement vers celui de l'étape.
  const viseM = E[etape].etat; m = reduit ? viseM : m + Math.sign(viseM - m) * Math.min(Math.abs(viseM - m), dt / C.transition);
  const me = facile(m);
  vueRoute += ((m > .97 && E[etape].cas === 'flotte' ? 1 : 0) - vueRoute) * Math.min(1, dt * 1.8);
  decal += ((m > .97 && E[etape].cas && !SAT[E[etape].cas] ? 1 : 0) - decal) * Math.min(1, dt * 1.8);
  zoom += ((m > .97 && SAT[E[etape].cas] ? -.12 : m > .97 && E[etape].cas ? .35 : m > .97 && E[etape].mode !== 'pair' ? 1 : m > .97 ? .55 : 0) - zoom) * Math.min(1, dt * 1.8);
  placerCamera(me);

  if (!reduit) {
    const cx = souris.x > 5 ? 0 : souris.x, cy = souris.y > 5 ? 0 : souris.y;
    px += (cx - px) * Math.min(1, dt * 2); py += (cy - py) * Math.min(1, dt * 2);
    scene.rotation.y = px * .06; scene.position.y = py * .04;
    objets.forEach(g => { if (g.userData.ventilateur) g.userData.ventilateur.rotation.y += dt * 2.2; });
    if (m < .05 && horloge > prochaine) { tenter(); prochaine = horloge + C.rythmeEchecs * (.7 + Math.random() * .6); }
    room.rotation.y += dt * .05 * me;
  }

  // La Room se dessine de bas en haut.
  uRevele.value = THREE.MathUtils.clamp((m - .05) / .75, 0, 1);
  sommets.forEach((v, i) => { const h = (v.y + R.rayon) / (2 * R.rayon), s = THREE.MathUtils.smoothstep(uRevele.value * 1.08, h, h + .08) * tailles[i] * (.55 + .45 * uAttenue.value);
    perle.setMatrixAt(i, m4.compose(v, q0, v1.set(s, s, s))); });
  perle.instanceMatrix.needsUpdate = true;

  // Les membres montent dans la bulle, chacun avec un léger décalage, et laissent une traînée.
  let nl = 0;
  droiteEcran.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
  const modeVise = m > .97 ? E[etape].mode : 'isole';
  membres.forEach((g, i) => {
    const u = g.userData, p = facile(THREE.MathUtils.clamp((m - u.retard) / (1 - .55), 0, 1));
    // Une méthode = une formation : les membres glissent vers leur place, ceux qui ne participent pas s'effacent.
    const [cibleF, visF] = formation(modeVise, i);
    if (m > .97) u.dansRoom.lerp(cibleF, Math.min(1, dt * 3.2)); else if (i < objets.length) u.dansRoom.copy(formation('pair', i)[0]);
    u.vis += ((visF ? 1 : 0) - u.vis) * Math.min(1, dt * 4);
    chemin(g, p, g.position);
    if (p > .98) g.position.y += Math.sin(horloge * 1.3 + u.retard * 20) * .025; // flotte doucement
    g.scale.setScalar(Math.max(.001, (1 + ((u.echelleRoom || R.echelleMembres) - 1) * p) * (p > .5 ? u.vis : 1)));
    (u.ombres || []).forEach(mt => mt.opacity = 1 - Math.min(1, p * 3));
    // Traînée : de la position actuelle vers l'arrière du chemin, s'éteint à l'arrivée.
    const vie = p > 0 && p < 1 ? 1 : 0, long = Math.min(p, .35);
    for (let k = 0; k < SEGT; k++, nl++) {
      if (!vie) { lPos.fill(0, nl * 6, nl * 6 + 6); lCol.fill(1, nl * 6, nl * 6 + 6); continue; }
      const t0 = p - long * k / SEGT, t1 = p - long * (k + 1) / SEGT;
      chemin(g, t0, v1).toArray(lPos, nl * 6); chemin(g, t1, v2).toArray(lPos, nl * 6 + 3);
      const a = BLEU.clone().lerp(BLANC, .05 + .9 * k / SEGT), b = BLEU.clone().lerp(BLANC, .05 + .9 * (k + 1) / SEGT);
      lCol.set([a.r, a.g, a.b, b.r, b.g, b.b], nl * 6);
    }
  });
  lGeo.setPositions(lPos); lGeo.setColors(lCol);

  // Tentatives ratées (étape 1 seulement).
  let n = 0;
  for (let i = tentatives.length - 1; i >= 0; i--) {
    const t = tentatives[i], e = (horloge - t.t0) / 1.8; if (e > 1 || m > .1) { tentatives.splice(i, 1); continue; }
    if (n >= MAXT) continue;
    const av = t.abandon * (1 - Math.pow(1 - Math.min(1, e * 1.6), 3)), queue = Math.max(0, av - .14);
    const a = t.de.clone().lerp(t.vers, queue), b = t.de.clone().lerp(t.vers, av), al = e < .6 ? 1 : 1 - (e - .6) / .4;
    a.toArray(tPos, n * 6); b.toArray(tPos, n * 6 + 3);
    const q = BLEU.clone().lerp(BLANC, 1 - al * .35), h = BLEU.clone().lerp(BLANC, 1 - al);
    tCol.set([q.r, q.g, q.b, h.r, h.g, h.b], n * 6); n++;
  }
  for (let k = n; k < MAXT; k++) { tPos.fill(0, k * 6, k * 6 + 6); tCol.fill(1, k * 6, k * 6 + 6); }
  tGeo.setPositions(tPos); tGeo.setColors(tCol);

  activite(dt); dessinerEchanges();
  renderer.render(scene, camera);

  // Survol (après rendu) : met aussi l'histoire en pause le temps de lire.
  ray.setFromCamera(souris, camera);
  const hit = souris.x < 5 ? ray.intersectObjects(objets.filter(o => o.userData.vis > .5), true)[0] : null;
  let g = hit && hit.object; while (g && !objets.includes(g)) g = g.parent;
  if (g !== survol) { survol = g; survolActif = !!g; if (g) tip.innerHTML = `<b>${g.userData.nom}</b><span>${g.userData.role}</span>`; tip.style.opacity = g ? 1 : 0; host.style.cursor = g ? 'help' : ''; }
  if (survol) { const r = host.getBoundingClientRect(), hr = host.parentElement.getBoundingClientRect(); tip.style.left = (sx + r.left - hr.left) + 'px'; tip.style.top = (sy + r.top - hr.top) + 'px'; }
  if (!window.__pret) host.closest('.r3d').classList.add('r3d-pret'); window.__pret = true; window.__appels = renderer.info.render.calls; window.__m = m; window.__t = tEtape;
});
window.__allerA = allerA;
