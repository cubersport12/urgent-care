const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { AndroidConfig } = require('expo/config-plugins');

const appJson = fs.readFileSync(path.join(__dirname, '../app.json'), 'utf8');
for (const file of ['android-build.yml', 'release.yml']) {
  const workflow = fs.readFileSync(path.join(__dirname, '../../.github/workflows', file), 'utf8');
  assert.match(workflow, /group: android-apk-build\s+queue: max/);
  const script = workflow.match(/- name: Generate Android project \(Expo prebuild\)[\s\S]*?node -e "([\s\S]*?)"\s*\n\s*npx expo prebuild/);
  assert.ok(script, `Missing Android prebuild version script in ${file}`);

  function buildConfig(now) {
    let result;
    const fakeFs = {
      readFileSync: () => appJson,
      writeFileSync: (_file, content) => { result = content; },
    };
    vm.runInNewContext(script[1], {
      require: () => fakeFs,
      Date: { now: () => now },
      console: { log() {} },
    });
    return JSON.parse(result).expo;
  }

  const first = buildConfig(Date.UTC(2026, 10, 7));
  const second = buildConfig(Date.UTC(2026, 10, 7, 0, 0, 1));
  assert.equal(first.version, JSON.parse(appJson).expo.version);
  assert.equal(first.android.versionCode, 216172800);
  assert.equal(second.android.versionCode, first.android.versionCode + 1);
  assert.throws(() => buildConfig((1577836800 + 2100000001) * 1000), /out of range/);
  const gradle = AndroidConfig.Version.setVersionName(first,
    AndroidConfig.Version.setVersionCode(first, 'versionCode 1\nversionName "old"'));
  assert.match(gradle, new RegExp(`versionCode ${first.android.versionCode}\\b`));
  assert.ok(gradle.includes(`versionName "${first.version}"`));
  console.log(`${file}: versionCode ${first.android.versionCode}, versionName ${first.version}`);
}
