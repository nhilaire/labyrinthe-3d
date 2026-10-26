import { useEffect } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { LANGUAGE_NAMES, LANGUAGES, LanguageSetting } from '../i18n';
import { useI18n } from '../i18n/I18nProvider';
import type { Settings } from '../storage/settings';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { colors, font, spacing } from '../ui/theme';

export type Toggle = 'sound' | 'haptics' | 'scary';

type Props = {
  settings: Settings;
  telemetryEnabled: boolean;
  onToggle: (key: Toggle, value: boolean) => void;
  onToggleTelemetry: (granted: boolean) => void;
  onReplayGuide: () => void;
  onBack: () => void;
};

function Row(props: { label: string; help?: string; value: boolean; onChange: (v: boolean) => void; testID: string }) {
  const { label, help, value, onChange, testID } = props;
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.label}>{label}</Text>
        {help && <Text style={styles.help}>{help}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} testID={testID} trackColor={{ true: colors.accent, false: colors.surface }} />
    </View>
  );
}

export function SettingsScreen({ settings, telemetryEnabled, onToggle, onToggleTelemetry, onReplayGuide, onBack }: Props) {
  const { t, setting, setSetting } = useI18n();
  // Each language is named in itself; « Automatique » follows the phone.
  const choices: { value: LanguageSetting; label: string }[] = [
    { value: 'auto', label: t.settings.languageAuto },
    ...LANGUAGES.map((language) => ({ value: language, label: LANGUAGE_NAMES[language] })),
  ];
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  return (
    <Screen testID="settings-screen">
      <Text style={styles.title} accessibilityRole="header">
        {t.settings.title}
      </Text>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.grid}>
          <Row label={t.settings.sound} value={settings.sound} onChange={(v) => onToggle('sound', v)} testID="settings-sound" />
          <Row label={t.settings.haptics} value={settings.haptics} onChange={(v) => onToggle('haptics', v)} testID="settings-haptics" />
        </View>
        <Row label={t.settings.scary} help={t.settings.scaryHint} value={settings.scary} onChange={(v) => onToggle('scary', v)} testID="settings-scary" />
        <Row label={t.settings.telemetry} help={t.settings.telemetryHelp} value={telemetryEnabled} onChange={onToggleTelemetry} testID="settings-telemetry" />
        <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={t.settings.language}>
          <Text style={styles.label}>{t.settings.language}</Text>
          <View style={styles.choices}>
            {choices.map(({ value, label }) => {
              const selected = value === setting;
              return (
                <Pressable
                  key={value}
                  testID={`settings-language-${value}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={label}
                  onPress={() => setSetting(value)}
                  style={[styles.choice, selected && styles.choiceSelected]}
                >
                  <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <View style={styles.buttons}>
        <Button label={t.settings.back} variant="secondary" compact onPress={onBack} testID="settings-back" />
        <Button label={t.settings.replayGuide} variant="secondary" compact onPress={onReplayGuide} testID="settings-replay-guide" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: font.heading, fontWeight: '800' },
  body: { gap: spacing.sm, paddingBottom: spacing.sm },
  grid: { flexDirection: 'row', gap: spacing.sm },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md },
  rowText: { flex: 1, gap: spacing.xs },
  label: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  help: { color: colors.muted, fontSize: font.small },
  buttons: { flexDirection: 'row', gap: spacing.sm },
  group: { gap: spacing.sm, backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { minHeight: 44, justifyContent: 'center', borderRadius: 14, borderWidth: 2, borderColor: colors.muted, paddingHorizontal: spacing.md },
  choiceSelected: { borderColor: colors.accent },
  choiceText: { color: colors.text, fontSize: font.body },
  choiceTextSelected: { fontWeight: '800' },
});
