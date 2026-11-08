import AsyncStorage from '@react-native-async-storage/async-storage';

import { reportError } from './telemetry';

export type Consent = 'granted' | 'denied' | 'unknown';

const KEY = 'telemetry.consent.v1';

export async function loadConsent(): Promise<Consent> {
  try {
    const value = await AsyncStorage.getItem(KEY);
    return value === 'granted' || value === 'denied' ? value : 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function saveConsent(value: 'granted' | 'denied'): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, value);
  } catch (error) {
    reportError(error, 'save_consent');
  }
}
