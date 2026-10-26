import { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { aidPenalty } from '../game/score';
import { useI18n } from '../i18n/I18nProvider';
import { ScoreRecord, clearScores, loadScores } from '../storage/scores';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { colors, font, spacing } from '../ui/theme';

const SHOWN = 20;

type Props = { onBack: () => void; onReplay: (record: ScoreRecord) => void };

export function ScoresScreen({ onBack, onReplay }: Props) {
  const { t } = useI18n();
  const [scores, setScores] = useState<ScoreRecord[] | null>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadScores().then((list) => alive && setScores(list));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  const clear = async () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    await clearScores();
    setScores([]);
    setArmed(false);
  };

  return (
    <Screen testID="scores-screen">
      <Text style={styles.title} accessibilityRole="header">
        {t.scores.title}
      </Text>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {scores?.length === 0 && (
          <Text style={styles.empty} testID="scores-empty">
            {t.scores.empty}
          </Text>
        )}
        {scores?.slice(0, SHOWN).map((e, i) => (
          <Pressable
            key={e.id}
            testID={`scores-row-${i}`}
            accessibilityRole="button"
            onPress={() => onReplay(e)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={[styles.cell, styles.rank]}>{i + 1}</Text>
            <Text style={[styles.cell, styles.points]}>{e.points}</Text>
            <Text style={[styles.cell, styles.wide]}>{t.rating[e.rating]}</Text>
            <Text style={[styles.cell, styles.wide]}>{t.scores.steps(e.steps, (e.steps / e.optimalSteps).toFixed(2))}</Text>
            <Text style={styles.cell}>{e.peeks || e.traces ? t.scores.aid(aidPenalty(e)) : t.scores.noAid}</Text>
            <Text style={styles.cell}>{t.scores.size(e.width, e.height)}</Text>
            <Text style={[styles.cell, styles.replay]}>↻</Text>
          </Pressable>
        ))}
      </ScrollView>
      {scores && scores.length > 0 && <Text style={styles.hint}>{t.scores.hint}</Text>}
      <View style={styles.buttons}>
        <Button label={t.scores.close} variant="secondary" compact onPress={onBack} testID="scores-close" />
        {scores && scores.length > 0 && (
          <Button label={armed ? t.scores.confirm : t.scores.clear} variant="danger" compact onPress={clear} testID="scores-clear" />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: font.heading, fontWeight: '800' },
  list: { flex: 1 },
  listContent: { paddingBottom: spacing.sm },
  empty: { color: colors.muted, fontSize: font.body, textAlign: 'center', marginTop: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  pressed: { backgroundColor: 'rgba(255,217,168,0.08)' },
  cell: { flex: 1.2, color: colors.text, fontSize: font.small },
  rank: { flex: 0.5, color: colors.muted },
  points: { flex: 0.9, color: colors.accent, fontSize: font.body, fontWeight: '700' },
  wide: { flex: 1.8 },
  replay: { flex: 0.4, color: colors.accent, textAlign: 'right', fontSize: font.body },
  hint: { color: colors.muted, fontSize: font.small },
  buttons: { flexDirection: 'row', gap: spacing.sm },
});
