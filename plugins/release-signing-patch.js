// Patches android/app/build.gradle so that release builds are signed with the factory keystore.
// Credentials are read from Gradle properties (user-level ~/.gradle/gradle.properties), never from the repository.
// Used by plugins/with-release-signing.js (Expo prebuild) and scripts/apply-release-signing.js (bare).
const MARKER = 'FACTORY_RELEASE_SIGNING';
const VERSION_MARKER = 'FACTORY_VERSION';

function patchBuildGradle(src, { version = false } = {}) {
  let out = src;

  if (!out.includes(MARKER)) {
    const withConfig = out.replace(
      /signingConfigs\s*\{/,
      (m) => `${m}
        // ${MARKER}: credentials come from ~/.gradle/gradle.properties (never from the repository)
        release {
            if (project.hasProperty('FACTORY_STORE_FILE')) {
                storeFile file(FACTORY_STORE_FILE)
                storePassword FACTORY_STORE_PASSWORD
                keyAlias FACTORY_KEY_ALIAS
                keyPassword FACTORY_KEY_PASSWORD
            }
        }`,
    );
    if (withConfig === out) throw new Error('release-signing-patch: "signingConfigs {" block not found');
    const releaseRe = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/;
    if (!releaseRe.test(withConfig)) throw new Error('release-signing-patch: release buildType signingConfig not found');
    out = withConfig.replace(
      releaseRe,
      "$1signingConfig project.hasProperty('FACTORY_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
    );
  }

  // Bare projects only: versionName/versionCode come from package.json (Expo does it in app.config.js).
  if (version && !out.includes(VERSION_MARKER)) {
    out = out.replace(
      /^android\s*\{/m,
      (m) => `// ${VERSION_MARKER}: version comes from package.json (single source of truth)
def factoryVersionName = new groovy.json.JsonSlurper().parse(file("../../package.json")).version
def factoryVersionCode = factoryVersionName.tokenize('.').collect { it.toInteger() }.with { it[0] * 10000 + it[1] * 100 + it[2] }

${m}`,
    );
    out = out.replace(/versionCode\s+\d+/, 'versionCode factoryVersionCode').replace(/versionName\s+"[^"]*"/, 'versionName factoryVersionName');
  }

  return out;
}

module.exports = { patchBuildGradle, MARKER };
