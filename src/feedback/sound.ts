// Game sounds (« Son »), played from the WAV files rendered by scripts/generate-sfx.mjs. The ambience drone loops
// during a game (one octave lower in « Mode frisson », with a distant creak every 20-40 s); footsteps follow the
// real walk cadence; a whoosh on turns, a click on arrows and buttons, a chime per emblem, a chord at the exit.
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const FILES = {
  ambience: require('../../assets/sfx/ambience.wav'),
  ambienceScary: require('../../assets/sfx/ambience-scary.wav'),
  steps: [
    require('../../assets/sfx/step-0.wav'),
    require('../../assets/sfx/step-1.wav'),
    require('../../assets/sfx/step-2.wav'),
    require('../../assets/sfx/step-3.wav'),
  ],
  turn1: require('../../assets/sfx/turn-1.wav'),
  turn2: require('../../assets/sfx/turn-2.wav'),
  click: require('../../assets/sfx/click.wav'),
  chimes: [
    require('../../assets/sfx/chime-0.wav'),
    require('../../assets/sfx/chime-1.wav'),
    require('../../assets/sfx/chime-2.wav'),
    require('../../assets/sfx/chime-3.wav'),
    require('../../assets/sfx/chime-4.wav'),
    require('../../assets/sfx/chime-5.wav'),
  ],
  victory: require('../../assets/sfx/victory.wav'),
  creak: require('../../assets/sfx/creak.wav'),
};

const AMBIENCE_VOLUME = 0.35;

type Players = {
  ambience: AudioPlayer;
  ambienceScary: AudioPlayer;
  steps: AudioPlayer[];
  turn1: AudioPlayer;
  turn2: AudioPlayer;
  click: AudioPlayer;
  chimes: AudioPlayer[];
  victory: AudioPlayer;
  creak: AudioPlayer;
};

export type SoundEngine = ReturnType<typeof createSound>;

export function createSound(make: (source: number) => AudioPlayer = (s) => createAudioPlayer(s)) {
  let players: Players | null = null;
  let enabled = true;
  let scary = false;
  let ambienceOn = false;
  let stepIndex = 0;
  let creakTimer: ReturnType<typeof setTimeout> | null = null;

  function load(): Players {
    if (players) return players;
    // Plays even when the phone is on vibrate (the source game's ambience is part of the experience).
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
    // Each player logs its first load and any error: the device proof of AC-28 reads them in logcat.
    const traced = (name: string, source: number) => {
      const p = make(source);
      let loaded = false;
      p.addListener?.('playbackStatusUpdate', (status) => {
        if (status.isLoaded && !loaded) {
          loaded = true;
          console.log(`SOUND_LOADED ${name} duration=${status.duration}`);
        }
        if (status.playing) console.log(`SOUND_PLAYING ${name}`);
      });
      return p;
    };
    players = {
      ambience: traced('ambience', FILES.ambience),
      ambienceScary: traced('ambience-scary', FILES.ambienceScary),
      steps: FILES.steps.map((src: number, i: number) => traced(`step-${i}`, src)),
      turn1: traced('turn-1', FILES.turn1),
      turn2: traced('turn-2', FILES.turn2),
      click: traced('click', FILES.click),
      chimes: FILES.chimes.map((src: number, i: number) => traced(`chime-${i}`, src)),
      victory: traced('victory', FILES.victory),
      creak: traced('creak', FILES.creak),
    };
    players.ambience.loop = true;
    players.ambienceScary.loop = true;
    return players;
  }

  function play(p: AudioPlayer, volume = 1) {
    if (!enabled) return;
    try {
      p.volume = volume;
      p.seekTo(0).catch(() => {});
      p.play();
    } catch (error) {
      // A sound must never break the game.
      console.log(`SOUND_ERROR ${String(error)}`);
    }
  }

  function scheduleCreak() {
    if (creakTimer) clearTimeout(creakTimer);
    creakTimer = null;
    if (!scary || !ambienceOn || !enabled) return;
    creakTimer = setTimeout(() => {
      play(load().creak, 0.5 + Math.random() * 0.4);
      scheduleCreak();
    }, 20000 + Math.random() * 20000);
  }

  function refreshAmbience() {
    const p = load();
    const active = scary ? p.ambienceScary : p.ambience;
    const other = scary ? p.ambience : p.ambienceScary;
    try {
      other.pause();
      if (enabled && ambienceOn) {
        active.volume = AMBIENCE_VOLUME;
        active.play();
      } else active.pause();
    } catch (error) {
      console.log(`SOUND_ERROR ${String(error)}`);
    }
    scheduleCreak();
  }

  return {
    get enabled() {
      return enabled;
    },
    setEnabled(value: boolean) {
      enabled = value;
      refreshAmbience();
    },
    setScary(value: boolean) {
      scary = value;
      refreshAmbience();
    },
    // Ambience on during a game, off on the menus.
    setAmbience(on: boolean) {
      ambienceOn = on;
      refreshAmbience();
    },
    step(cadence: number) {
      const p = load();
      stepIndex = (stepIndex + 1) % p.steps.length;
      play(p.steps[stepIndex], Math.max(0.35, Math.min(1, cadence)));
    },
    turn(quarters: number) {
      const p = load();
      play(quarters >= 2 ? p.turn2 : p.turn1, 0.8);
    },
    click() {
      play(load().click, 0.7);
    },
    chime(emblem: number) {
      const p = load();
      play(p.chimes[emblem % p.chimes.length], 0.8);
    },
    victory() {
      play(load().victory, 0.9);
    },
    dispose() {
      if (creakTimer) clearTimeout(creakTimer);
      if (!players) return;
      const all = [players.ambience, players.ambienceScary, players.turn1, players.turn2, players.click, players.victory, players.creak, ...players.steps, ...players.chimes];
      all.forEach((p) => {
        try {
          p.remove();
        } catch {
          // ignore
        }
      });
      players = null;
    },
  };
}

export const sound = createSound();
