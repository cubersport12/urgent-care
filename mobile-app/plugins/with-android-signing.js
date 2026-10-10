/**
 * Expo config plugin: release-подпись Android через env (CI).
 *
 * Если заданы ANDROID_KEYSTORE_FILE (путь относительно android/app/),
 * ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS и ANDROID_KEY_PASSWORD —
 * release-сборка подписывается release-keystore; иначе остаётся debug
 * (локальная разработка не меняется).
 */
const { withAppBuildGradle, createRunOncePlugin } = require('expo/config-plugins');

const withAndroidSigning = (config) => {
  return withAppBuildGradle(config, (config) => {
    const {
      ANDROID_KEYSTORE_FILE,
      ANDROID_KEYSTORE_PASSWORD,
      ANDROID_KEY_ALIAS,
      ANDROID_KEY_PASSWORD,
    } = process.env;
    if (!ANDROID_KEYSTORE_FILE) {
      return config; // локальная сборка — debug-подпись как раньше
    }
    const contents = config.modResults.contents;
    if (contents.includes('signingConfigs.release')) {
      return config;
    }
    config.modResults.contents = contents
      .replace(
        /signingConfigs\s*\{/,
        `signingConfigs {
        release {
            storeFile file('${ANDROID_KEYSTORE_FILE}')
            storePassword '${ANDROID_KEYSTORE_PASSWORD}'
            keyAlias '${ANDROID_KEY_ALIAS}'
            keyPassword '${ANDROID_KEY_PASSWORD}'
        }`,
      )
      .replace(
        /(release\s*\{\s*\n[^\n]*\n[^\n]*\n)(\s*)(signingConfig signingConfigs\.debug)/,
        '$1$2signingConfig signingConfigs.release',
      );
    return config;
  });
};

module.exports = createRunOncePlugin(withAndroidSigning, 'with-android-signing', '1.0.0');
