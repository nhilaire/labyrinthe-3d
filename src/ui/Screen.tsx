import { ReactNode } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';

import { colors, spacing } from './theme';

// Full-screen landscape container; the system bars stay hidden (immersive game, plugins/with-fullscreen.js).
export function Screen({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View testID={testID} style={styles.screen}>
      <StatusBar hidden />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, gap: spacing.md },
});
