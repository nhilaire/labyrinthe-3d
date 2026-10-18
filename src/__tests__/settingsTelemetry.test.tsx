// AC-03 (unset consent, turned off in Settings, settings_change) and AC-27 (the telemetry toggle persists).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logEvent, setAnalyticsCollectionEnabled } from '@react-native-firebase/analytics';
import { setCrashlyticsCollectionEnabled } from '@react-native-firebase/crashlytics';
import { fireEvent, render, screen } from '@testing-library/react-native';

import App from '../App';
import { DEFAULT_SETTINGS } from '../storage/settings';
import { isTelemetryEnabled, track } from '../telemetry/telemetry';

const start = async (consent: 'granted' | 'denied') => {
  await AsyncStorage.setItem('telemetry.consent.v1', consent);
  await AsyncStorage.setItem('game.settings.v1', JSON.stringify({ ...DEFAULT_SETTINGS, guideOfferDone: true }));
};

const openSettings = async () => {
  await render(<App />);
  await fireEvent.press(await screen.findByTestId('home-settings'));
  return screen.getByTestId('settings-telemetry');
};

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('telemetry consent from the settings (AC-03, AC-27)', () => {
  it('sends nothing while the consent is unset (consent screen not answered)', async () => {
    await render(<App />);
    expect(await screen.findByTestId('consent-screen')).toBeTruthy();
    expect(isTelemetryEnabled()).toBe(false);
    track('game_start', { size: 'small', replay: false, guided: false, scary: false });
    expect(logEvent).not.toHaveBeenCalled();
    await screen.unmount();
  });

  it('turning statistics off in Settings disables collection, stops events and persists', async () => {
    await start('granted');
    const toggle = await openSettings();
    expect(toggle.props.value).toBe(true);
    expect(isTelemetryEnabled()).toBe(true);
    await fireEvent(toggle, 'valueChange', false);
    expect(setAnalyticsCollectionEnabled).toHaveBeenLastCalledWith(expect.anything(), false);
    expect(setCrashlyticsCollectionEnabled).toHaveBeenLastCalledWith(expect.anything(), false);
    expect(await AsyncStorage.getItem('telemetry.consent.v1')).toBe('denied');
    track('game_start', { size: 'small', replay: false, guided: false, scary: false });
    expect(logEvent).not.toHaveBeenCalled();
    await screen.unmount();
    // After a restart the toggle is still off.
    const again = await openSettings();
    expect(again.props.value).toBe(false);
    expect(isTelemetryEnabled()).toBe(false);
    await screen.unmount();
  });

  it('turning statistics back on persists too', async () => {
    await start('denied');
    const toggle = await openSettings();
    expect(toggle.props.value).toBe(false);
    await fireEvent(toggle, 'valueChange', true);
    expect(await AsyncStorage.getItem('telemetry.consent.v1')).toBe('granted');
    await screen.unmount();
    expect((await openSettings()).props.value).toBe(true);
    await screen.unmount();
  });

  it('sends settings_change when « Mode frisson » changes, with consent', async () => {
    await start('granted');
    await openSettings();
    await fireEvent(screen.getByTestId('settings-scary'), 'valueChange', true);
    expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'settings_change', { setting: 'scary', value: 'on' });
    await fireEvent(screen.getByTestId('settings-scary'), 'valueChange', false);
    expect(logEvent).toHaveBeenLastCalledWith(expect.anything(), 'settings_change', { setting: 'scary', value: 'off' });
    await screen.unmount();
  });
});
