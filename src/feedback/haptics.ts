// Haptic feedback (« Vibrations »): a light tick on an arrow, a success notification at the exit. Nothing when the
// setting is off. The native module is injected so tests can check the calls.
import * as ExpoHaptics from 'expo-haptics';

type HapticsModule = Pick<typeof ExpoHaptics, 'impactAsync' | 'notificationAsync' | 'ImpactFeedbackStyle' | 'NotificationFeedbackType'>;

export function createHaptics(native: HapticsModule = ExpoHaptics) {
  let enabled = true;
  const safe = (p: Promise<void>) => p.catch(() => {});
  return {
    setEnabled(value: boolean) {
      enabled = value;
    },
    arrow() {
      if (enabled) safe(native.impactAsync(native.ImpactFeedbackStyle.Light));
    },
    exit() {
      if (enabled) safe(native.notificationAsync(native.NotificationFeedbackType.Success));
    },
  };
}

export type Haptics = ReturnType<typeof createHaptics>;
export const haptics = createHaptics();
