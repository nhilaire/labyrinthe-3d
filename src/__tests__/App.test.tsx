import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';

import App from '../App';
import { APP_NAME } from '../config/app';

// render/fireEvent are awaited: asynchronous in React Native Testing Library 14+, harmless before.
describe('App', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('asks for consent in French on first launch, then shows the home screen', async () => {
    await render(<App />);
    expect(await screen.findByText('Votre vie privée')).toBeTruthy();
    await fireEvent.press(screen.getByText('Refuser'));
    expect(await screen.findByText('Jouer')).toBeTruthy();
    expect(screen.getByText(APP_NAME)).toBeTruthy();
  });

  it('shows the About screen: story, word from the author, data, version', async () => {
    await AsyncStorage.setItem('telemetry.consent.v1', 'denied');
    await render(<App />);
    await fireEvent.press(await screen.findByText('À propos'));
    expect(screen.getByTestId('about-screen')).toBeTruthy();
    expect(screen.getByText("L'histoire de ce jeu")).toBeTruthy();
    expect(screen.getByText(/développeur passionné/)).toBeTruthy();
    expect(screen.getByText(/bugs/)).toBeTruthy();
    expect(screen.getByText(/^Version [0-9]+[.][0-9]+[.][0-9]+$/)).toBeTruthy();
  });

  it('does not ask again once the player has chosen', async () => {
    await AsyncStorage.setItem('telemetry.consent.v1', 'denied');
    await render(<App />);
    expect(await screen.findByText('Jouer')).toBeTruthy();
    expect(screen.queryByText('Votre vie privée')).toBeNull();
  });
});
