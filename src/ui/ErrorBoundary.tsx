import { Component, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fr } from '../i18n/fr';
import { reportError } from '../telemetry/telemetry';
import { Button } from './Button';
import { colors, font, spacing } from './theme';

type State = { failed: boolean };

// Catches render errors, reports them (if consented) and shows a French fallback instead of a blank screen.
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    reportError(error, 'render_error');
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{fr.errors.title}</Text>
        <Text style={styles.body}>{fr.errors.body}</Text>
        <Button label={fr.errors.retry} onPress={() => this.setState({ failed: false })} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center', gap: spacing.md },
  title: { color: colors.text, fontSize: font.heading, fontWeight: '700' },
  body: { color: colors.muted, fontSize: font.body },
});
