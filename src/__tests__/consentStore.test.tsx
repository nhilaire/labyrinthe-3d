// AC-02: whatever the storage or Firebase does, a tap on either consent button moves on to the guided game offer.
// A failed consent write is caught and reported, like the other stores.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordError } from '@react-native-firebase/crashlytics';
import { fireEvent, render, screen } from '@testing-library/react-native';

import App from '../App';
import { saveConsent } from '../telemetry/consentStore';
import * as telemetry from '../telemetry/telemetry';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('consent write failures (AC-02)', () => {
  it('saveConsent catches a storage failure and reports it', async () => {
    await telemetry.applyConsent(true);
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
    await expect(saveConsent('granted')).resolves.toBeUndefined();
    expect(recordError).toHaveBeenCalledTimes(1);
    await telemetry.applyConsent(false);
  });

  it('the consent screen moves on when the storage write rejects', async () => {
    await render(<App />);
    await screen.findByTestId('consent-screen');
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValue(new Error('disk full'));
    await fireEvent.press(screen.getByTestId('consent-refuse'));
    expect(await screen.findByTestId('guide-offer-screen')).toBeTruthy();
    await screen.unmount();
  });

  it('the consent screen moves on when applying the consent throws', async () => {
    await render(<App />);
    await screen.findByTestId('consent-screen');
    jest.spyOn(telemetry, 'applyConsent').mockRejectedValue(new Error('firebase down'));
    await fireEvent.press(screen.getByTestId('consent-accept'));
    expect(await screen.findByTestId('guide-offer-screen')).toBeTruthy();
    await screen.unmount();
  });
});
