// Jest: unit tests for pure game logic + component tests (React Native Testing Library).
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./jest.setup.js'],
  // three ships ES modules only: let Babel transform it like the React Native packages.
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|three))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  // Full-app renders exceed the 5 s default when the emulator loads the machine during verify.
  testTimeout: 30000,
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/android/', '<rootDir>/ios/'],
};
