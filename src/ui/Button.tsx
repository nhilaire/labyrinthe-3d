import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, font, spacing } from './theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  testID?: string;
  compact?: boolean;
};

export function Button({ label, onPress, variant = 'primary', testID, compact = false }: Props) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.base, compact && styles.compact, primary ? styles.primary : styles.secondary, variant === 'danger' && styles.danger, pressed && styles.pressed]}
    >
      <Text style={[styles.label, primary ? styles.primaryLabel : styles.secondaryLabel, variant === 'danger' && styles.dangerLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, borderRadius: 14, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  compact: { minHeight: 48, alignSelf: 'auto', paddingHorizontal: spacing.md },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  danger: { borderColor: colors.danger },
  pressed: { opacity: 0.8 },
  label: { fontSize: font.body, fontWeight: '700' },
  primaryLabel: { color: colors.accentText },
  secondaryLabel: { color: colors.text },
  dangerLabel: { color: colors.danger },
});
