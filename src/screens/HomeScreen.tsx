import { StyleSheet, Text, View } from 'react-native';

import { APP_NAME } from '../config/app';
import { fr } from '../i18n/fr';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { colors, font, spacing } from '../ui/theme';

type Props = { bestScore: number; onPlay: () => void; onSettings: () => void; onAbout: () => void };

export function HomeScreen({ bestScore, onPlay, onSettings, onAbout }: Props) {
  return (
    <Screen testID="home-screen">
      <View style={styles.hero}>
        <Text style={styles.title} accessibilityRole="header">
          {APP_NAME}
        </Text>
        {bestScore > 0 && <Text style={styles.best}>{fr.home.bestScore(bestScore)}</Text>}
      </View>
      <Button label={fr.home.play} onPress={onPlay} testID="home-play" />
      <Button label={fr.home.settings} onPress={onSettings} variant="secondary" testID="home-settings" />
      <Button label={fr.home.about} onPress={onAbout} variant="secondary" testID="home-about" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  title: { color: colors.text, fontSize: font.title, fontWeight: '800', textAlign: 'center' },
  best: { color: colors.accent, fontSize: font.body },
});
