// The game: full-screen 3D view, HUD, arrows, plan overlays, pause, guide bubbles and the victory review.
// Rules live in game/session.ts, rendering in render/scene.ts; this screen wires them and re-renders only on game
// state changes (the render loop runs outside React).
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import { useKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AppState, BackHandler, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import type { MazeSize } from '../game/config';
import { MoveKind, startDirOf } from '../game/navigation';
import { aidPenalty } from '../game/score';
import { GameSession, INTRO_LOCK_MS } from '../game/session';
import { haptics } from '../feedback/haptics';
import { sound } from '../feedback/sound';
import { fr } from '../i18n/fr';
import { FrameStats } from '../render/frameStats';
import { MazeScene } from '../render/scene';
import type { SaveResult } from '../storage/scores';
import { trackGameAbandon, trackGameComplete, trackGameStart } from '../telemetry/gameEvents';
import { reportError, track } from '../telemetry/telemetry';
import { Button } from '../ui/Button';
import { Plan } from '../ui/Plan';
import { Screen } from '../ui/Screen';
import { colors, font, spacing } from '../ui/theme';

export type GameLaunch = {
  size: MazeSize;
  seed: number;
  replay?: { width: number; height: number };
  guided?: boolean;
  // When « Jouer » (or a replay) was tapped, for the maze-ready timing log (AC-31).
  requestedAt: number;
};

type Props = {
  launch: GameLaunch;
  scary: boolean;
  onHome: () => void;
  onScores: () => void;
  onPlay: (launch: GameLaunch) => void;
  onRecord: (session: GameSession) => Promise<SaveResult | null>;
};

const GLYPHS: Record<MoveKind, string> = { forward: '↑', left: '↰', right: '↱', back: '↩' };
const FRAME_LOG_EVERY = 600; // walking frames between two FRAME_STATS log lines (AC-30 device proof)

function logFrames(stats: FrameStats, size: MazeSize, scary: boolean) {
  console.log(`FRAME_STATS fps_avg=${stats.fpsAvg} slow_pct=${stats.slowPct} frames=${stats.frames} size=${size} scary=${scary ? 1 : 0}`);
}

export function GameScreen({ launch, scary, onHome, onScores, onPlay, onRecord }: Props) {
  useKeepAwake();
  const { width, height } = useWindowDimensions();
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const [session] = useState(
    () => new GameSession({ seed: launch.seed, now: Date.now(), size: launch.size, replay: launch.replay, guided: launch.guided }),
  );
  const sceneRef = useRef<MazeScene | null>(null);
  const frameRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const scaryRef = useRef(scary);
  const [saved, setSaved] = useState<SaveResult | null>(null);

  // AC-31: time from « Jouer » to the intro plan on screen.
  useEffect(() => {
    console.log(`MAZE_READY_MS ${Date.now() - launch.requestedAt} size=${session.size}`);
    sound.setAmbience(true);
    // Re-render when the intro lock ends, so the hint shows that a tap now enters the maze.
    const unlock = setTimeout(bump, INTRO_LOCK_MS);
    return () => {
      clearTimeout(unlock);
      sound.setAmbience(false);
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [launch.requestedAt, session]);

  useEffect(() => {
    scaryRef.current = scary;
    sceneRef.current?.setMood(scary);
    sound.setScary(scary);
  }, [scary]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const now = Date.now();
    sound.victory();
    haptics.exit();
    const stats = sceneRef.current?.stats ?? new FrameStats();
    logFrames(stats, session.size, scaryRef.current);
    trackGameComplete(track, session, now, stats, scaryRef.current);
    if (!session.guided) {
      onRecord(session)
        .then(setSaved)
        .catch((e) => reportError(e, 'record_score'));
    }
    bump();
  }, [onRecord, session]);

  const onContextCreate = useCallback(
    (gl: ExpoWebGLRenderingContext) => {
      let scene: MazeScene;
      try {
        scene = new MazeScene(gl);
      } catch (error) {
        reportError(error, 'create_scene');
        return;
      }
      sceneRef.current = scene;
      scene.setMood(scaryRef.current);
      scene.events = {
        onStep: (cadence) => sound.step(cadence),
        onTurn: (quarters) => sound.turn(quarters),
        onEmblem: (emblem) => sound.chime(emblem),
      };
      scene.mount(session.maze, session.landmarks, session.seed, { cell: session.pos, dir: session.facing });
      let last = Date.now();
      let logged = 0;
      const loop = () => {
        frameRef.current = requestAnimationFrame(loop);
        const now = Date.now();
        const dt = now - last;
        last = now;
        const arrived = scene.frame(dt, now, session.frozen);
        const frames = scene.stats.frames;
        if (frames - logged >= FRAME_LOG_EVERY) {
          logged = frames;
          logFrames(scene.stats, session.size, scaryRef.current);
        }
        if (arrived) {
          session.arrive(now);
          if (session.phase === 'won') finish();
          else bump();
        }
      };
      loop();
    },
    [finish, session],
  );

  const enterMaze = useCallback(() => {
    const route = session.tapIntro(Date.now());
    if (route) {
      trackGameStart(track, session, scaryRef.current);
      sceneRef.current?.startRoute(route.cells, startDirOf(route));
    }
    bump();
  }, [session]);

  const choose = useCallback(
    (kind: MoveKind) => {
      const move = session.moves.find((m) => m.kind === kind);
      if (!move) return;
      const route = session.choose(move);
      if (!route) return;
      haptics.arrow();
      sound.click();
      sceneRef.current?.startRoute(route.cells, startDirOf(route));
      bump();
    },
    [session],
  );

  const peek = useCallback(() => {
    session.togglePeek(Date.now());
    sound.click();
    bump();
  }, [session]);

  const toggleTraces = useCallback(() => {
    session.toggleTraces();
    sceneRef.current?.setTracesVisible(session.tracesVisible);
    sound.click();
    bump();
  }, [session]);

  const pause = useCallback(() => {
    session.pause(Date.now());
    bump();
  }, [session]);

  const resume = useCallback(() => {
    session.resume(Date.now());
    bump();
  }, [session]);

  const quit = useCallback(() => {
    trackGameAbandon(track, session, Date.now(), sceneRef.current?.stats ?? new FrameStats(), scaryRef.current);
    onHome();
  }, [onHome, session]);

  // App in the background: freeze the game; on return the pause overlay is shown (an open plan stays as it was).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        sound.setAmbience(true);
        return;
      }
      sound.setAmbience(false);
      if (session.started && session.phase !== 'won' && session.plan === null) {
        session.pause(Date.now());
        bump();
      }
    });
    return () => sub.remove();
  }, [session]);

  // Android back: pause during a game (resume if already paused), home after the exit.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (session.phase === 'won') onHome();
      else if (session.paused) resume();
      else pause();
      return true;
    });
    return () => sub.remove();
  }, [onHome, pause, resume, session]);

  const now = Date.now();
  const planSize = useMemo(() => ({ width: Math.min(width - 24, 900), height: height - 120 }), [width, height]);
  const showArrows = session.phase === 'choosing' && !session.frozen;
  const won = session.phase === 'won';
  const pose = session.phase === 'walking' && sceneRef.current ? sceneRef.current.pose() : { cell: session.pos, dir: session.facing };

  return (
    <Screen testID="game-screen">
      <View style={StyleSheet.absoluteFill}>
        <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} testID="game-gl" />
      </View>

      {!won && (
        <View style={styles.hud} pointerEvents="box-none">
          <View style={styles.chip} testID="hud-steps">
            <Text style={styles.chipText}>{fr.hud.steps(session.journey.steps)}</Text>
          </View>
          <Chip label={fr.hud.plan(session.peeks)} onPress={peek} testID="hud-plan" />
          <Chip label={fr.hud.traces(session.traces)} onPress={toggleTraces} active={session.tracesVisible} testID="hud-traces" />
          <Chip label={fr.hud.pause} onPress={pause} testID="hud-pause" />
        </View>
      )}

      {showArrows &&
        session.moves.map((m) => (
          <Pressable
            key={m.kind}
            testID={`arrow-${m.kind}`}
            accessibilityRole="button"
            accessibilityLabel={fr.move[m.kind]}
            onPress={() => choose(m.kind)}
            style={({ pressed }) => [styles.arrow, arrowPlace[m.kind], pressed && styles.pressed]}
          >
            <Text style={styles.arrowGlyph}>{GLYPHS[m.kind]}</Text>
            <Text style={styles.arrowLabel}>{fr.move[m.kind]}</Text>
          </Pressable>
        ))}

      {session.plan !== null && (
        <Pressable
          style={styles.overlay}
          testID={session.plan === 'intro' ? 'intro-plan' : 'peek-plan'}
          onPress={() => {
            if (session.plan === 'intro') enterMaze();
            else {
              session.closePeek(Date.now());
              bump();
            }
          }}
        >
          <Text style={styles.title}>{session.plan === 'intro' ? fr.plan.introTitle : fr.plan.peekTitle}</Text>
          <Text style={styles.subtitle} testID="plan-size">
            {fr.home.size[session.size]}
          </Text>
          <Plan
            maze={session.maze}
            landmarks={session.landmarks}
            player={session.plan === 'map' ? pose : null}
            width={planSize.width}
            height={planSize.height}
          />
          <Text
            style={[styles.subtitle, session.plan === 'intro' && !session.introUnlocked(now) && styles.dim]}
            testID={session.plan === 'intro' && !session.introUnlocked(now) ? 'plan-hint-locked' : 'plan-hint'}
          >
            {session.plan === 'intro' ? fr.plan.introHint : fr.plan.peekHint}
          </Text>
        </Pressable>
      )}

      {session.paused && (
        <View style={styles.overlay} testID="pause-overlay">
          <Text style={styles.bigTitle}>{fr.pause.title}</Text>
          <View style={styles.row}>
            <Button label={fr.pause.resume} compact onPress={resume} testID="pause-resume" />
            <Button label={fr.pause.quit} variant="secondary" compact onPress={quit} testID="pause-quit" />
          </View>
        </View>
      )}

      {won && session.score && (
        <View style={styles.overlay} testID="victory-overlay">
          <Text style={styles.title} testID="victory-title">
            {fr.victory.title(session.score.points, fr.rating[session.score.rating])}
          </Text>
          <Plan
            maze={session.maze}
            landmarks={session.landmarks}
            journey={session.journey}
            solution={session.report.path}
            network
            width={planSize.width}
            height={planSize.height - 70}
          />
          <Text style={styles.subtitle} testID="victory-line">
            {fr.victory.line(
              session.journey.steps,
              session.optimalSteps,
              session.decisions,
              session.peeks || session.traces ? fr.victory.aid(aidPenalty(session)) : fr.victory.noAid,
              session.baseline.points,
            )}
            {saved && saved.rank !== null ? `   ${saved.rank === 1 ? fr.victory.best : fr.victory.rank(saved.rank, saved.total)}` : ''}
          </Text>
          <View style={styles.row}>
            {!session.guided && (
              <>
                <Button
                  label={fr.victory.new}
                  compact
                  onPress={() => onPlay({ size: session.size, seed: (Math.random() * 0xffffffff) >>> 0, requestedAt: Date.now() })}
                  testID="victory-new"
                />
                <Button
                  label={fr.victory.again}
                  variant="secondary"
                  compact
                  onPress={() =>
                    onPlay({
                      size: session.size,
                      seed: session.seed,
                      replay: { width: session.width, height: session.height },
                      requestedAt: Date.now(),
                    })
                  }
                  testID="victory-again"
                />
                <Button label={fr.victory.scores} variant="secondary" compact onPress={onScores} testID="victory-scores" />
              </>
            )}
            <Button label={fr.victory.home} variant="secondary" compact onPress={onHome} testID="victory-home" />
          </View>
        </View>
      )}

      {session.bubble && (
        <Pressable
          style={styles.bubbleLayer}
          testID="guide-bubble"
          onPress={() => {
            if (session.plan === 'intro') enterMaze();
            else {
              session.dismissBubble(Date.now());
              bump();
            }
          }}
        >
          <View style={styles.bubble}>
            <Text style={styles.bubbleText} testID={`guide-${session.bubble}`}>
              {fr.guide[session.bubble]}
            </Text>
            <Text style={styles.bubbleHint}>{fr.guide.next}</Text>
          </View>
        </Pressable>
      )}

      {session.guided && !won && (
        <View style={styles.skip}>
          <Button label={fr.guide.skip} variant="secondary" compact onPress={quit} testID="guide-skip" />
        </View>
      )}
    </Screen>
  );
}

function Chip({ label, onPress, active = false, testID }: { label: string; onPress: () => void; active?: boolean; testID: string }) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={8}
      style={({ pressed }) => [styles.chip, styles.chipButton, active && styles.chipActive, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const arrowPlace = StyleSheet.create({
  forward: { top: '16%', alignSelf: 'center' },
  left: { left: '5%', top: '42%' },
  right: { right: '5%', top: '42%' },
  back: { bottom: '8%', alignSelf: 'center' },
});

const styles = StyleSheet.create({
  hud: { position: 'absolute', top: spacing.sm, left: spacing.md, flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipButton: { minHeight: 40 },
  chipActive: { borderColor: 'rgba(255,217,168,0.7)', backgroundColor: 'rgba(255,217,168,0.18)' },
  chipText: { color: colors.muted, fontSize: 13, letterSpacing: 0.3 },
  chipTextActive: { color: colors.accent },
  arrow: {
    position: 'absolute',
    minWidth: 96,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,217,168,0.4)',
    backgroundColor: 'rgba(18,13,24,0.55)',
  },
  pressed: { opacity: 0.7 },
  arrowGlyph: { color: colors.accent, fontSize: 32, lineHeight: 36 },
  arrowLabel: { color: colors.accent, fontSize: 13 },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: 6,
  },
  title: { color: colors.text, fontSize: 19, fontWeight: '700' },
  bigTitle: { color: colors.text, fontSize: font.title, fontWeight: '800', marginBottom: spacing.md },
  subtitle: { color: colors.muted, fontSize: 13, textAlign: 'center', paddingHorizontal: spacing.md },
  dim: { opacity: 0.35 },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  bubbleLayer: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: spacing.lg },
  bubble: {
    maxWidth: 620,
    backgroundColor: 'rgba(33,24,20,0.96)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.md,
    gap: spacing.xs,
  },
  bubbleText: { color: colors.text, fontSize: font.body, lineHeight: 23 },
  bubbleHint: { color: colors.accent, fontSize: font.small, textAlign: 'right' },
  skip: { position: 'absolute', top: spacing.sm, right: spacing.md },
});
