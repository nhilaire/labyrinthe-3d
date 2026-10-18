// AC-01, AC-02, AC-22, AC-33 at component level (the Maestro flows prove them on the device).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';

import App from '../App';
import { APP_NAME } from '../config/app';
import { fr } from '../i18n/fr';
import { DEFAULT_SETTINGS } from '../storage/settings';

const answered = async (settings = { ...DEFAULT_SETTINGS, guideOfferDone: true }) => {
  await AsyncStorage.setItem('telemetry.consent.v1', 'denied');
  await AsyncStorage.setItem('game.settings.v1', JSON.stringify(settings));
};

// render/fireEvent are awaited: asynchronous in React Native Testing Library 14+.
describe('App', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('asks for consent in French, then offers the guided game, then shows the home screen', async () => {
    await render(<App />);
    expect(await screen.findByText('Statistiques anonymes')).toBeTruthy();
    expect(screen.getByText('Accepter')).toBeTruthy();
    await fireEvent.press(screen.getByText('Refuser'));
    expect(await screen.findByText(fr.guideOffer.title)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('guide-offer-skip'));
    expect(await screen.findByText('Jouer')).toBeTruthy();
    expect(screen.getByText(APP_NAME)).toBeTruthy();
  });

  it('does not ask again once the player has chosen and answered the offer', async () => {
    await render(<App />);
    await fireEvent.press(await screen.findByText('Refuser'));
    await fireEvent.press(await screen.findByTestId('guide-offer-skip'));
    await screen.findByTestId('home-screen');
    await screen.unmount();
    await render(<App />);
    expect(await screen.findByTestId('home-screen')).toBeTruthy();
    expect(screen.queryByText('Statistiques anonymes')).toBeNull();
    expect(screen.queryByText(fr.guideOffer.title)).toBeNull();
  });

  it('remembers the chosen size', async () => {
    await answered();
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('home-size-large'));
    await screen.unmount();
    await render(<App />);
    const large = await screen.findByTestId('home-size-large');
    expect(large.props.accessibilityState).toMatchObject({ selected: true });
  });

  it('shows the About screen: story verbatim, passionate developer, no affiliation, version', async () => {
    await answered();
    await render(<App />);
    await fireEvent.press(await screen.findByText('À propos'));
    expect(screen.getByTestId('about-screen')).toBeTruthy();
    expect(screen.getByText(fr.about.story[0])).toBeTruthy();
    expect(screen.getByText(/Atari ST/)).toBeTruthy();
    expect(screen.getByText(/développeur indépendant passionné/)).toBeTruthy();
    expect(screen.getByText(/sans lien avec ses auteurs/)).toBeTruthy();
    expect(screen.getByText(/^Version [0-9]+[.][0-9]+[.][0-9]+$/)).toBeTruthy();
  });

  it('opens the settings with the PRD toggles, scary mode off by default', async () => {
    await answered();
    await render(<App />);
    await fireEvent.press(await screen.findByText('Paramètres'));
    expect(screen.getByText('Son')).toBeTruthy();
    expect(screen.getByText('Vibrations')).toBeTruthy();
    expect(screen.getByTestId('settings-scary').props.value).toBe(false);
    expect(screen.getByText('Rejouer la partie guidée')).toBeTruthy();
  });
});
