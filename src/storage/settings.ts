// Player settings and small flags, kept on the phone. The telemetry consent lives in telemetry/consentStore.ts.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { MazeSize, SIZE_ORDER } from '../game/config';
import { reportError } from '../telemetry/telemetry';

const KEY = 'game.settings.v1';

export type Settings = {
  sound: boolean;
  haptics: boolean;
  scary: boolean;
  size: MazeSize;
  // The guided-game offer was answered (shown once, at first launch).
  guideOfferDone: boolean;
};

export const DEFAULT_SETTINGS: Settings = { sound: true, haptics: true, scary: false, size: 'medium', guideOfferDone: false };

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const v = JSON.parse(raw) as Partial<Settings>;
    return {
      sound: typeof v.sound === 'boolean' ? v.sound : DEFAULT_SETTINGS.sound,
      haptics: typeof v.haptics === 'boolean' ? v.haptics : DEFAULT_SETTINGS.haptics,
      scary: typeof v.scary === 'boolean' ? v.scary : DEFAULT_SETTINGS.scary,
      size: SIZE_ORDER.includes(v.size as MazeSize) ? (v.size as MazeSize) : DEFAULT_SETTINGS.size,
      guideOfferDone: typeof v.guideOfferDone === 'boolean' ? v.guideOfferDone : DEFAULT_SETTINGS.guideOfferDone,
    };
  } catch (error) {
    reportError(error, 'load_settings');
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(settings));
  } catch (error) {
    reportError(error, 'save_settings');
  }
}
