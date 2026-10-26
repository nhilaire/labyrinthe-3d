import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';

import { parseTestLink } from './app/testLink';
import { haptics } from './feedback/haptics';
import { sound } from './feedback/sound';
import { GUIDED_SEED, MazeSize } from './game/config';
import type { GameSession } from './game/session';
import { LanguageSetting } from './i18n';
import { I18nProvider } from './i18n/I18nProvider';
import { AboutScreen } from './screens/AboutScreen';
import { ConsentScreen } from './screens/ConsentScreen';
import { GameLaunch, GameScreen } from './screens/GameScreen';
import { GuideOfferScreen } from './screens/GuideOfferScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ScoresScreen } from './screens/ScoresScreen';
import { SettingsScreen, Toggle } from './screens/SettingsScreen';
import { loadLanguageSetting, saveLanguageSetting } from './storage/languageSetting';
import { ScoreRecord, saveScore } from './storage/scores';
import { DEFAULT_SETTINGS, Settings, loadSettings, saveSettings } from './storage/settings';
import { Consent, loadConsent, saveConsent } from './telemetry/consentStore';
import { applyConsent, track } from './telemetry/telemetry';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { colors } from './ui/theme';

type Route = 'home' | 'game' | 'scores' | 'settings' | 'about' | 'guideOffer';

const randomSeed = () => (Math.random() * 0xffffffff) >>> 0;

export default function App() {
  const [consent, setConsentState] = useState<Consent | 'loading'>('loading');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [languageSetting, setLanguageSetting] = useState<LanguageSetting>('auto');
  const [route, setRoute] = useState<Route>('home');
  const [launch, setLaunch] = useState<GameLaunch | null>(null);
  // A new key remounts the game screen for every new game (a new maze, a replay).
  const [gameKey, setGameKey] = useState(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const consentRef = useRef(consent);
  consentRef.current = consent;

  // The switch is immediate (context), then saved; a game in progress is not touched.
  const changeLanguage = useCallback((value: LanguageSetting) => {
    setLanguageSetting(value);
    void saveLanguageSetting(value);
  }, []);

  const play = useCallback((next: GameLaunch) => {
    setLaunch(next);
    setGameKey((k) => k + 1);
    setRoute('game');
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [storedConsent, storedSettings, storedLanguage] = await Promise.all([loadConsent(), loadSettings(), loadLanguageSetting()]);
      if (storedConsent !== 'unknown') await applyConsent(storedConsent === 'granted');
      sound.setEnabled(storedSettings.sound);
      sound.setScary(storedSettings.scary);
      haptics.setEnabled(storedSettings.haptics);
      if (alive) {
        setSettings(storedSettings);
        setLanguageSetting(storedLanguage);
        setRoute(storedSettings.guideOfferDone ? 'home' : 'guideOffer');
        setConsentState(storedConsent);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Testing deep link (PRD D4), once the player has answered the consent screen.
  useEffect(() => {
    const open = (url: string | null) => {
      const target = parseTestLink(url);
      if (!target || consentRef.current === 'unknown' || consentRef.current === 'loading') return;
      play({ size: target.size, seed: target.seed, requestedAt: Date.now() });
    };
    const sub = Linking.addEventListener('url', ({ url }) => open(url));
    if (consent !== 'loading' && consent !== 'unknown') Linking.getInitialURL().then(open).catch(() => {});
    return () => sub.remove();
  }, [consent, play]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch };
    setSettings(next);
    saveSettings(next);
    return next;
  }, []);

  const decide = useCallback(async (granted: boolean) => {
    const value = granted ? 'granted' : 'denied';
    await saveConsent(value);
    await applyConsent(granted);
    setConsentState(value);
  }, []);

  const toggle = useCallback(
    (key: Toggle, value: boolean) => {
      updateSettings({ [key]: value });
      if (key === 'sound') sound.setEnabled(value);
      if (key === 'haptics') haptics.setEnabled(value);
      if (key === 'scary') {
        sound.setScary(value);
        track('settings_change', { setting: 'scary', value: value ? 'on' : 'off' });
      }
    },
    [updateSettings],
  );

  const startGuided = useCallback(() => {
    updateSettings({ guideOfferDone: true });
    play({ size: 'small', seed: GUIDED_SEED, guided: true, requestedAt: Date.now() });
  }, [play, updateSettings]);

  const record = useCallback(
    (s: GameSession) =>
      saveScore({
        points: s.score!.points,
        rating: s.score!.rating,
        steps: s.journey.steps,
        optimalSteps: s.optimalSteps,
        decisions: s.decisions,
        peeks: s.peeks,
        traces: s.traces,
        seed: s.seed,
        width: s.width,
        height: s.height,
      }),
    [],
  );

  const replay = useCallback(
    (e: ScoreRecord) =>
      play({ size: settingsRef.current.size, seed: e.seed, replay: { width: e.width, height: e.height }, requestedAt: Date.now() }),
    [play],
  );

  const home = useCallback(() => setRoute('home'), []);

  let content: React.ReactNode;
  if (consent === 'loading') {
    content = (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  } else if (consent === 'unknown') {
    content = <ConsentScreen onDecision={decide} />;
  } else if (route === 'guideOffer') {
    content = (
      <GuideOfferScreen
        onGo={startGuided}
        onSkip={() => {
          updateSettings({ guideOfferDone: true });
          track('tutorial_end', { skipped: true });
          setRoute('home');
        }}
      />
    );
  } else if (route === 'game' && launch) {
    content = (
      <GameScreen
        key={gameKey}
        launch={launch}
        scary={settings.scary}
        onHome={home}
        onScores={() => setRoute('scores')}
        onPlay={play}
        onRecord={record}
      />
    );
  } else if (route === 'scores') {
    content = <ScoresScreen onBack={home} onReplay={replay} />;
  } else if (route === 'about') {
    content = <AboutScreen onBack={home} />;
  } else if (route === 'settings') {
    content = (
      <SettingsScreen
        settings={settings}
        telemetryEnabled={consent === 'granted'}
        onToggle={toggle}
        onToggleTelemetry={decide}
        onReplayGuide={startGuided}
        onBack={home}
      />
    );
  } else {
    content = (
      <HomeScreen
        size={settings.size}
        onSize={(size: MazeSize) => updateSettings({ size })}
        onPlay={() => play({ size: settings.size, seed: randomSeed(), requestedAt: Date.now() })}
        onScores={() => setRoute('scores')}
        onSettings={() => setRoute('settings')}
        onAbout={() => setRoute('about')}
      />
    );
  }

  return (
    <I18nProvider setting={languageSetting} onChange={changeLanguage}>
      <ErrorBoundary>{content}</ErrorBoundary>
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
