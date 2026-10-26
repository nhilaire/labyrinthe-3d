import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from '../i18n/I18nProvider';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { colors, font, spacing } from '../ui/theme';

// First launch, after consent: offers the guided first game. Either answer marks the offer as done.
export function GuideOfferScreen({ onGo, onSkip }: { onGo: () => void; onSkip: () => void }) {
  const { t } = useI18n();
  return (
    <Screen testID="guide-offer-screen">
      <View style={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          {t.guideOffer.title}
        </Text>
        <Text style={styles.body}>{t.guideOffer.body}</Text>
      </View>
      <View style={styles.buttons}>
        <View style={styles.cell}>
          <Button label={t.guideOffer.go} onPress={onGo} testID="guide-offer-go" />
        </View>
        <View style={styles.cell}>
          <Button label={t.guideOffer.skip} variant="secondary" onPress={onSkip} testID="guide-offer-skip" />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', gap: spacing.md },
  title: { color: colors.accent, fontSize: font.title, fontWeight: '800' },
  body: { color: colors.text, fontSize: font.body },
  buttons: { flexDirection: 'row', gap: spacing.md },
  cell: { flex: 1 },
});
