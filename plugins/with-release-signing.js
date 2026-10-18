// Expo config plugin: applied at every `npx expo prebuild`, so release signing survives android/ regeneration.
const { withAppBuildGradle } = require('expo/config-plugins');

const { patchBuildGradle } = require('./release-signing-patch');

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('with-release-signing: only a Groovy android/app/build.gradle is supported');
    }
    cfg.modResults.contents = patchBuildGradle(cfg.modResults.contents);
    return cfg;
  });
};
