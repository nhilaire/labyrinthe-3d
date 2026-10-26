import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appName } from '../config/app';
import { MazeSize, SIZE_ORDER } from '../game/config';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { colors, font, spacing } from '../ui/theme';

type Props = {
  size: MazeSize;
  onSize: (size: MazeSize) => void;
  onPlay: () => void;
  onScores: () => void;
  onSettings: () => void;
  onAbout: () => void;
};

export function HomeScreen({ size, onSize, onPlay, onScores, onSettings, onAbout }: Props) {
  const { t, language } = useI18n();
  return (
    <Screen testID="home-screen">
      <View style={styles.layout}>
        <View style={styles.hero}>
          <Text style={styles.title} accessibilityRole="header">
            {appName(language)}
          </Text>
          <Text style={styles.pitch}>{t.home.pitch}</Text>
        </View>
        <View style={styles.menu}>
          <View style={styles.sizes} accessibilityRole="radiogroup">
            {SIZE_ORDER.map((s) => (
              <Pressable
                key={s}
                testID={`home-size-${s}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: s === size }}
                accessibilityLabel={t.home.size[s]}
                onPress={() => onSize(s)}
                style={({ pressed }) => [styles.size, s === size && styles.sizeOn, pressed && styles.pressed]}
              >
                <Text style={[styles.sizeText, s === size && styles.sizeTextOn]}>{t.home.size[s]}</Text>
              </Pressable>
            ))}
          </View>
          <Button label={t.home.play} onPress={onPlay} testID="home-play" />
          <View style={styles.row}>
            <View style={styles.cell}>
              <Button label={t.home.scores} onPress={onScores} variant="secondary" testID="home-scores" />
            </View>
            <View style={styles.cell}>
              <Button label={t.home.settings} onPress={onSettings} variant="secondary" testID="home-settings" />
            </View>
            <View style={styles.cell}>
              <Button label={t.home.about} onPress={onAbout} variant="secondary" testID="home-about" />
            </View>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  hero: { flex: 1, gap: spacing.sm },
  title: { color: colors.accent, fontSize: 44, fontWeight: '800', letterSpacing: 1 },
  pitch: { color: colors.muted, fontSize: font.body },
  menu: { flex: 1.2, gap: spacing.md },
  sizes: { flexDirection: 'row', gap: spacing.sm },
  size: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  sizeOn: { borderColor: colors.accent, backgroundColor: 'rgba(255,217,168,0.16)' },
  sizeText: { color: colors.muted, fontSize: font.small, fontWeight: '600' },
  sizeTextOn: { color: colors.accent },
  pressed: { opacity: 0.8 },
  row: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1 },
});
