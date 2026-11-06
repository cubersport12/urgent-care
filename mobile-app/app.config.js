const appJson = require('./app.json');

const plugins = [...(appJson.expo.plugins || [])];
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
