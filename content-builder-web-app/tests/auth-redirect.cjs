// Run with node tests/auth-redirect.cjs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

async function check(base, current, expected) {
  let configured;
  let redirected;
  const exports = {};
  const code = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '../src/app/core/api/api-client.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const client = { setConfig: (value) => { configured = value; } };
  const context = {
    exports, URL, Headers, Request,
    require: (id) => id === './generated/client.gen' ? { client } : { environment: { apiUrl: 'https://example.test' } },
    localStorage: { getItem: () => 'session', removeItem: () => {} },
    document: { baseURI: `https://example.test${base}` },
    window: { location: { pathname: current, assign: (url) => { redirected = url; } } },
    fetch: async () => ({ status: 401 }),
  };
  vm.runInNewContext(code, context);
  exports.configureApiClient();
  await configured.fetch('https://example.test/api/v1/folders');
  assert.equal(redirected, expected);
}

(async () => {
  await check('/', '/dashboard', 'https://example.test/login');
  await check('/content-builder/', '/content-builder/content', 'https://example.test/content-builder/login');
  await check('/urgent-care/content-builder/', '/urgent-care/content-builder/content', 'https://example.test/urgent-care/content-builder/login');
  await check('/content-builder/', '/content-builder/login', undefined);
  console.log('Base href redirect checks passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
