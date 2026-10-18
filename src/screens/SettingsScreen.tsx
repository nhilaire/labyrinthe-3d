import { useEffect } from 'react';
import { BackHandler, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { fr } from '../i18n/fr';
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
        {fr.settings.title}
      </Text>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.grid}>
          <Row label={fr.settings.sound} value={settings.sound} onChange={(v) => onToggle('sound', v)} testID="settings-sound" />
          <Row label={fr.settings.haptics} value={settings.haptics} onChange={(v) => onToggle('haptics', v)} testID="settings-haptics" />
        </View>
        <Row label={fr.settings.scary} help={fr.settings.scaryHint} value={settings.scary} onChange={(v) => onToggle('scary', v)} testID="settings-scary" />
        <Row label={fr.settings.telemetry} help={fr.settings.telemetryHelp} value={telemetryEnabled} onChange={onToggleTelemetry} testID="settings-telemetry" />
      </ScrollView>
      <View style={styles.buttons}>
        <Button label={fr.settings.back} variant="secondary" compact onPress={onBack} testID="settings-back" />
        <Button label={fr.settings.replayGuide} variant="secondary" compact onPress={onReplayGuide} testID="settings-replay-guide" />
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
});
