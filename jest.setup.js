// Native modules are replaced by in-memory mocks so that tests run in Node.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-firebase/analytics', () => ({
  getAnalytics: jest.fn(() => ({})),
  logEvent: jest.fn(() => Promise.resolve()),
  setConsent: jest.fn(() => Promise.resolve()),
  setAnalyticsCollectionEnabled: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-firebase/crashlytics', () => ({
  getCrashlytics: jest.fn(() => ({})),
  log: jest.fn(),
  recordError: jest.fn(),
  setCrashlyticsCollectionEnabled: jest.fn(() => Promise.resolve()),
}));

// expo-gl has no WebGL in Node: the GL view renders as a plain View and never creates a context.
jest.mock('expo-gl', () => {
  const { View } = require('react-native');
  return { GLView: View };
});

// Native media modules: in-memory fakes (tests inject their own spies where the calls matter).
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(), remove: jest.fn(), volume: 1, loop: false })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn(), activateKeepAwakeAsync: jest.fn(), deactivateKeepAwake: jest.fn() }));
