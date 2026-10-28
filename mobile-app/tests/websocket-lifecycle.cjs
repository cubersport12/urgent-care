// Run with node tests/websocket-lifecycle.cjs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

async function check(file, connectName, disconnectName) {
  const sockets = [];
  const timers = new Map();
  let nextTimer = 0;
  class FakeSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    constructor(url) { this.url = url; this.readyState = FakeSocket.CONNECTING; sockets.push(this); }
    close() { this.readyState = 3; }
    send(value) { this.sent = value; }
  }
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '..', 'lib', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, {
    exports,
    require: (id) => id === '@/api/client' ? { API_BASE_URL: 'https://example.test' } : { getSessionId: () => 'session' },
    WebSocket: FakeSocket,
    setTimeout: (fn) => { const id = ++nextTimer; timers.set(id, fn); return id; },
    clearTimeout: (id) => timers.delete(id),
    setInterval: (fn) => { const id = ++nextTimer; timers.set(id, fn); return id; },
    clearInterval: (id) => timers.delete(id),
  });
  await exports[connectName]();
  await exports[connectName]();
  assert.equal(sockets.length, 1, 'connecting twice must reuse the active socket');
  const first = sockets[0];
  first.readyState = FakeSocket.OPEN;
  first.onopen();
  [...timers.values()][0]();
  assert.equal(first.sent, 'ping');
  exports[disconnectName]();
  await exports[connectName]();
  const second = sockets[1];
  first.onclose();
  assert.equal(timers.size, 0, 'old close must not schedule a reconnect');
  second.onclose();
  assert.equal(timers.size, 1, 'unexpected close must schedule one reconnect');
  const reconnect = [...timers.values()][0];
  reconnect();
  await Promise.resolve();
  assert.equal(sockets.length, 3);
  exports[disconnectName]();
}

(async () => {
  await check('notifications-ws.ts', 'connectNotificationsWs', 'disconnectNotificationsWs');
  await check('support-ws.ts', 'connectSupportWs', 'disconnectSupportWs');
  console.log('WebSocket lifecycle checks passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
