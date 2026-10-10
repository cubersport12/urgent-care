/**
 * Expo config plugin: RuStore Pay SDK (только для rustore-сборки).
 *
 * Делает то, что описано в https://www.rustore.ru/help/sdk/pay/react-native/11-1-0:
 *  - maven-репозиторий RuStore + gradle-зависимость pay SDK;
 *  - регистрация RuStoreReactPayPackage в MainApplication;
 *  - processIntent в MainActivity (deeplink возврата из оплаты);
 *  - манифест: PayActivity, console_app_id_value, sdk_pay_scheme_value;
 *  - строковый ресурс CONSOLE_APPLICATION_ID.
 *
 * Props: consoleAppId (id приложения из RuStore Консоли), scheme (deeplink-схема).
 */
const {
  withProjectBuildGradle,
  withAppBuildGradle,
  withAndroidManifest,
  withMainApplication,
  withMainActivity,
  withStringsXml,
  createRunOncePlugin,
} = require('expo/config-plugins');

const PAY_SDK_VERSION = '11.1.0';
const RUSTORE_MAVEN = "maven { url 'https://nexus-external.rustore.ru/repository/maven-rustore-exposed' }";
const PAY_DEPENDENCY = `implementation("ru.rustore.sdk-wrapper.react-native:pay:${PAY_SDK_VERSION}")`;

const withRuStoreRepo = (config) =>
  withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('maven-rustore-exposed')) {
      config.modResults.contents = config.modResults.contents.replace(
        /allprojects\s*\{\s*repositories\s*\{/,
        (match) => `${match}\n        ${RUSTORE_MAVEN}`,
      );
    }
    return config;
  });

const withRuStoreDependency = (config) =>
  withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('sdk-wrapper.react-native:pay')) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s*\{/,
        (match) => `${match}\n    ${PAY_DEPENDENCY}`,
      );
    }
    return config;
  });

const withRuStorePackage = (config) =>
  withMainApplication(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes('RuStoreReactPayPackage')) {
      return config;
    }
    config.modResults.contents = contents
      .replace(
        /(import expo\.modules\.ReactNativeHostWrapper)/,
        'import ru.rustore.react.pay.RuStoreReactPayPackage\n\n$1',
      )
      .replace(
        /(PackageList\(this\)\.packages\.apply\s*\{)/,
        '$1\n              add(RuStoreReactPayPackage())',
      );
    return config;
  });

const withRuStoreIntentHandling = (config) =>
  withMainActivity(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes('RuStoreReactPayModule')) {
      return config;
    }
    config.modResults.contents = contents
      .replace(
        /(import com\.facebook\.react\.ReactActivity)/,
        'import ru.rustore.react.pay.RuStoreReactPayModule\n\n$1',
      )
      .replace(
        /(super\.onCreate\(null\))/,
        '$1\n    RuStoreReactPayModule.processIntent(intent)',
      )
      .replace(
        /(  override fun invokeDefaultOnBackPressed\(\) \{)/,
        '  override fun onNewIntent(intent: android.content.Intent) {\n    super.onNewIntent(intent)\n    RuStoreReactPayModule.processIntent(intent)\n  }\n\n$1',
      );
    return config;
  });

const withRuStoreManifest = (config, { scheme }) =>
  withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    manifest.manifest.$['xmlns:tools'] =
      manifest.manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';
    const application = manifest.manifest.application[0];
    application.activity = application.activity || [];
    if (!application.activity.some((a) => a.$['android:name']?.includes('PayActivity'))) {
      application.activity.push({
        $: {
          'android:name': 'ru.rustore.sdk.pay.internal.presentation.ui.PayActivity',
          'android:exported': 'false',
          'android:launchMode': 'singleTask',
          'tools:replace': 'android:launchMode',
        },
      });
    }
    application['meta-data'] = application['meta-data'] || [];
    const metas = application['meta-data'];
    const addMeta = (name, value) => {
      if (!metas.some((m) => m.$['android:name'] === name)) {
        metas.push({ $: { 'android:name': name, 'android:value': value } });
      }
    };
    addMeta('console_app_id_value', '@string/CONSOLE_APPLICATION_ID');
    addMeta('sdk_pay_scheme_value', scheme);
    return config;
  });

const withRuStoreStrings = (config, { consoleAppId }) =>
  withStringsXml(config, (config) => {
    config.modResults.resources = config.modResults.resources || {};
    config.modResults.resources.string = config.modResults.resources.string || [];
    const strings = config.modResults.resources.string;
    const existing = strings.find((s) => s.$.name === 'CONSOLE_APPLICATION_ID');
    if (existing) {
      existing._ = consoleAppId;
    } else {
      strings.push({ $: { name: 'CONSOLE_APPLICATION_ID' }, _: consoleAppId });
    }
    return config;
  });

const withRuStorePay = (config, props = {}) => {
  const scheme = props.scheme || 'troubledent';
  const consoleAppId = props.consoleAppId || '';
  config = withRuStoreRepo(config);
  config = withRuStoreDependency(config);
  config = withRuStorePackage(config);
  config = withRuStoreIntentHandling(config);
  config = withRuStoreManifest(config, { scheme });
  return withRuStoreStrings(config, { consoleAppId });
};

module.exports = createRunOncePlugin(withRuStorePay, 'with-rustore-pay', '1.0.0');
