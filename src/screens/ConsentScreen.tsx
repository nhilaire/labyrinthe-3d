import { StyleSheet, Text, View } from 'react-native';

import { fr } from '../i18n/fr';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { colors, font, spacing } from '../ui/theme';

// First-launch consent (GDPR/CNIL): both choices are equally easy, nothing is sent before a choice.
export function ConsentScreen({ onDecision }: { onDecision: (granted: boolean) => void }) {
  return (
    <Screen testID="consent-screen">
      <View style={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          {fr.consent.title}
        </Text>
        <Text style={styles.body}>{fr.consent.body}</Text>
        <Text style={styles.footnote}>{fr.consent.footnote}</Text>
      </View>
      <Button label={fr.consent.accept} onPress={() => onDecision(true)} testID="consent-accept" />
      <Button label={fr.consent.refuse} onPress={() => onDecision(false)} variant="secondary" testID="consent-refuse" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', gap: spacing.md },
  title: { color: colors.text, fontSize: font.title, fontWeight: '800' },
  body: { color: colors.text, fontSize: font.body, lineHeight: 24 },
  footnote: { color: colors.muted, fontSize: font.small },
});
