// Every player-facing string lives here, in French. Components never inline text.
import { label, NBSP } from './format';

export const fr = {
  consent: {
    title: 'Votre vie privée',
    body:
      "Nous aimerions mesurer de façon anonyme l'utilisation du jeu et détecter les plantages afin de l'améliorer. " +
      "Aucune donnée personnelle n'est collectée et rien n'est utilisé à des fins publicitaires.",
    accept: 'Accepter',
    refuse: 'Refuser',
    footnote: "Vous pourrez changer d'avis à tout moment dans les paramètres.",
  },
  home: {
    play: 'Jouer',
    settings: 'Paramètres',
    about: 'À propos',
    bestScore: (score: number) => label('Meilleur score', score),
  },
  game: {
    tap: `Touchez${NBSP}!`,
    score: (score: number) => label('Score', score),
    timeLeft: (seconds: number) => label('Temps', `${seconds}${NBSP}s`),
    over: 'Partie terminée',
    finalScore: (score: number) => label('Votre score', score),
    playAgain: 'Rejouer',
    home: 'Accueil',
  },
  // « À propos ». The story comes from the discovery brief (docs/BRIEF.md, "Story (About screen)"), quoted in the PRD.
  // The word from the author keeps its meaning in every game (passionate developer, free time, bugs are possible);
  // adapt its tone (tu / vous) and details to the game.
  about: {
    title: 'À propos',
    storyTitle: "L'histoire de ce jeu",
    story: ['Un petit jeu fait maison, sans publicité ni compte.'],
    authorTitle: "Un mot de l'auteur",
    author: [
      "Ce jeu ne sort pas d'un studio : il a été imaginé et programmé sur mon temps libre, par un développeur passionné, sans prétention.",
      "Il est donc perfectible et sans doute pas exempt de bugs. Si quelque chose ne marche pas comme prévu, merci d'avance pour votre indulgence.",
    ],
    dataTitle: 'Vos données',
    data: [
      "Aucun compte, aucune publicité. Des statistiques anonymes ne sont envoyées que si vous l'avez accepté, et vous pouvez changer d'avis dans les paramètres.",
    ],
    version: (version: string) => `Version ${version}`,
    back: 'Retour',
  },
  settings: {
    title: 'Paramètres',
    telemetry: 'Partager des statistiques anonymes',
    telemetryHelp: "Aide à corriger les bugs et à améliorer le jeu. Aucune donnée personnelle n'est envoyée.",
    back: 'Retour',
  },
  errors: {
    title: 'Oups',
    body: 'Un problème est survenu. Relancez le jeu.',
    retry: 'Réessayer',
  },
} as const;
