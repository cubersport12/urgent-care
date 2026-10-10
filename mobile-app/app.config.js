const appJson = require('./app.json');

/** Сборка под RuStore: APP_TARGET=rustore → плагин RuStore Pay SDK. */
const isRustore = process.env.APP_TARGET === 'rustore';

const plugins = [...(appJson.expo.plugins || [])];
if (isRustore) {
  plugins.push([
    './plugins/with-rustore-pay',
    {
      consoleAppId: process.env.RUSTORE_CONSOLE_APP_ID || '',
      scheme: 'troubledent',
    },
  ]);
}
plugins.push('./plugins/with-android-signing');

/** @type {import('expo/config').ExpoConfig} */
const expo = {
  ...appJson.expo,
  plugins,
  experiments: {
    ...appJson.expo.experiments,
    baseUrl: process.env.EXPO_BASE_URL || appJson.expo.experiments.baseUrl,
  },
};

module.exports = { expo };
