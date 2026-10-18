// Every player-facing string lives here, in French ("tu"). Components never inline text.
// Typography (AC-35): U+00A0 before ":" and "%" and inside « », U+202F before "!", "?" and ";".
import { NBSP, NNBSP, formatInteger, label } from './format';

const q = (text: string) => `«${NBSP}${text}${NBSP}»`;
const pct = (n: number) => `${n}${NBSP}%`;

export const fr = {
  consent: {
    title: 'Statistiques anonymes',
    body:
      'Pour améliorer le jeu, tu peux partager des statistiques anonymes (parties jouées, scores, plantages). ' +
      'Aucune donnée personnelle, aucune publicité.',
    accept: 'Accepter',
    refuse: 'Refuser',
    footnote: "Tu pourras changer d'avis dans les Paramètres.",
  },
  guideOffer: {
    title: `Première partie guidée${NNBSP}?`,
    body: 'Un petit labyrinthe pour apprendre à jouer, en quelques bulles.',
    go: "C'est parti",
    skip: 'Passer',
  },
  home: {
    pitch: 'Mémorise le plan, puis trouve la sortie.',
    size: { small: 'Petit 8 × 6', medium: 'Moyen 14 × 9', large: 'Grand 20 × 12' },
    play: 'Jouer',
    scores: 'Scores',
    settings: 'Paramètres',
    about: 'À propos',
  },
  hud: {
    steps: (n: number) => `${formatInteger(n)} pas`,
    plan: (n: number) => `Plan${n ? ` (${n})` : ''} −${pct(8)}`,
    traces: (n: number) => `Traces${n ? ` (${n})` : ''} −${pct(12)}`,
    pause: 'Pause',
  },
  move: {
    forward: 'Tout droit',
    left: 'À gauche',
    right: 'À droite',
    back: 'Demi-tour',
  },
  plan: {
    introTitle: 'Mémorise le plan',
    introHint: "Touche l'écran pour entrer dans le labyrinthe",
    peekTitle: 'Plan',
    peekHint: `Touche l'écran pour reprendre (ce coup d'œil coûte ${pct(8)} du score)`,
    entrance: 'ENTRÉE',
    exit: 'SORTIE',
  },
  pause: {
    title: 'Pause',
    resume: 'Reprendre',
    quit: 'Abandonner',
  },
  victory: {
    title: (points: number, rating: string) => `${formatInteger(points)} points · ${rating}`,
    line: (steps: number, optimal: number, decisions: number, aid: string, baseline: number) =>
      `${steps} pas pour ${optimal} au mieux · ${decisions} choix · ${aid} · ${label('Suiveur de murs', `${baseline} pts`)}`,
    noAid: 'sans aide',
    aid: (p: number) => `aides −${pct(p)}`,
    best: `Meilleur score${NNBSP}!`,
    rank: (rank: number, total: number) => `${rank}e sur ${total}`,
    new: 'Nouveau labyrinthe',
    again: 'Refaire celui-ci',
    scores: 'Scores',
    home: 'Accueil',
  },
  rating: {
    r900: 'Sans faute',
    r750: 'Excellent',
    r600: 'Très bon',
    r450: 'Correct',
    r300: 'Laborieux',
    r0: 'Sorti par hasard',
  },
  scores: {
    title: 'Meilleurs scores',
    empty: 'Aucune partie enregistrée pour le moment.',
    hint: 'Touche une ligne pour rejouer ce labyrinthe.',
    close: 'Fermer',
    clear: "Effacer l'historique",
    confirm: `Confirmer${NNBSP}?`,
    steps: (steps: number, ratio: string) => `${steps} pas (×${ratio})`,
    noAid: '—',
    aid: (p: number) => `−${pct(p)}`,
    size: (w: number, h: number) => `${w}×${h}`,
  },
  settings: {
    title: 'Paramètres',
    sound: 'Son',
    haptics: 'Vibrations',
    scary: 'Mode frisson',
    scaryHint: 'Plus sombre, plus inquiétant. Déconseillé aux plus jeunes.',
    telemetry: 'Statistiques anonymes',
    telemetryHelp: "Aide à corriger les bugs et à améliorer le jeu. Aucune donnée personnelle n'est envoyée.",
    replayGuide: 'Rejouer la partie guidée',
    back: 'Retour',
  },
  guide: {
    skip: 'Passer',
    plan:
      `Mémorise bien ce plan${NBSP}: tu entres par ENTRÉE et tu dois trouver la SORTIE. ` +
      `Les symboles de couleur sont gravés sur les murs${NBSP}: ils t'aideront à savoir où tu es.`,
    arrows: "À chaque croisement, touche une flèche. Tu avances tout seul jusqu'au croisement suivant.",
    helps:
      `Perdu${NNBSP}? ${q('Plan')} remontre le plan avec ta position (−${pct(8)}). ` +
      `${q('Traces')} montre où tu es déjà passé (−${pct(12)}).`,
    score: `Moins de pas et moins d'aide, c'est plus de points. Essaie de battre le suiveur de murs${NNBSP}!`,
    next: 'Touche pour continuer',
  },
  // « À propos »: the story comes from the discovery brief (docs/BRIEF.md), quoted in the PRD (about.story).
  about: {
    title: 'À propos',
    whyTitle: 'Pourquoi ce jeu',
    story: [
      `Enfant, j'ai recopié ligne à ligne en GFA Basic un petit jeu de labyrinthe sur mon Atari ST${NBSP}: ` +
        'un de mes premiers programmes. ' +
        "Quelques années plus tard, le labyrinthe du manoir de The 7th Guest m'a fait frissonner. " +
        "J'ai créé ce jeu pour réunir ces deux souvenirs et les partager en famille.",
    ],
    gameTitle: 'Ce jeu',
    game: [
      'Créé par un développeur indépendant passionné. Inspiré de The 7th Guest, sans lien avec ses auteurs.',
      `Il a été imaginé et programmé sur mon temps libre, sans prétention${NBSP}: il n'est sans doute pas exempt ` +
        "de bugs. Merci d'avance pour ton indulgence.",
    ],
    dataTitle: 'Tes données',
    data: [
      "Aucun compte, aucune publicité. Des statistiques anonymes ne sont envoyées que si tu l'as accepté, et tu peux changer d'avis dans les Paramètres.",
    ],
    builtWith: 'Fait avec React Native, Expo et Three.js',
    version: (version: string) => `Version ${version}`,
    back: 'Retour',
  },
  errors: {
    title: 'Oups',
    body: 'Un problème est survenu. Relance le jeu.',
    retry: 'Réessayer',
  },
} as const;
