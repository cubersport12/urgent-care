const appJson = require('./app.json');

/** @type {import('expo/config').ExpoConfig} */
const expo = {
  ...appJson.expo,
  experiments: {
    ...appJson.expo.experiments,
    baseUrl: process.env.EXPO_BASE_URL || appJson.expo.experiments.baseUrl,
  },
};

module.exports = { expo };
