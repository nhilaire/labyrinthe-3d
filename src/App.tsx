import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AboutScreen } from './screens/AboutScreen';
import { ConsentScreen } from './screens/ConsentScreen';
import { GameScreen } from './screens/GameScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { loadBestScore, saveBestScore } from './storage/bestScore';
import { Consent, loadConsent, saveConsent } from './telemetry/consentStore';
import { applyConsent } from './telemetry/telemetry';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { colors } from './ui/theme';

type Route = 'home' | 'game' | 'settings' | 'about';

export default function App() {
  const [consent, setConsentState] = useState<Consent | 'loading'>('loading');
  const [route, setRoute] = useState<Route>('home');
  const [bestScore, setBestScore] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [storedConsent, storedBest] = await Promise.all([loadConsent(), loadBestScore()]);
      if (storedConsent !== 'unknown') await applyConsent(storedConsent === 'granted');
      if (alive) {
        setConsentState(storedConsent);
        setBestScore(storedBest);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const decide = useCallback(async (granted: boolean) => {
    const value = granted ? 'granted' : 'denied';
    await saveConsent(value);
    await applyConsent(granted);
    setConsentState(value);
  }, []);

  const onGameOver = useCallback(async (score: number) => {
    setBestScore((current) => Math.max(current, score));
    await saveBestScore(score);
  }, []);

  let content: React.ReactNode;
  if (consent === 'loading') {
    content = (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  } else if (consent === 'unknown') {
    content = <ConsentScreen onDecision={decide} />;
  } else if (route === 'game') {
    content = <GameScreen onExit={() => setRoute('home')} onGameOver={onGameOver} />;
  } else if (route === 'about') {
    content = <AboutScreen onBack={() => setRoute('home')} />;
  } else if (route === 'settings') {
    content = <SettingsScreen telemetryEnabled={consent === 'granted'} onToggleTelemetry={decide} onBack={() => setRoute('home')} />;
  } else {
    content = <HomeScreen bestScore={bestScore} onPlay={() => setRoute('game')} onSettings={() => setRoute('settings')} onAbout={() => setRoute('about')} />;
  }

  return <ErrorBoundary>{content}</ErrorBoundary>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
