import test from 'node:test';
import assert from 'node:assert/strict';

// 用最小页面壳加载真实入口，确保界面整理没有丢失任何视图函数。
test('D4 真实界面入口能完整启动，仍先显示年龄确认页', async () => {
  const keys = ['document', 'window', 'location', 'localStorage'];
  const original = Object.fromEntries(keys.map(key => [key, globalThis[key]]));
  const listeners = {};
  const app = {innerHTML: '', addEventListener(type, fn) {listeners[type] = fn;}};
  const stored = new Map();
  globalThis.document = {getElementById: () => app, addEventListener() {}};
  globalThis.window = {scrollTo() {}};
  globalThis.location = {href: 'http://localhost:5450/'};
  globalThis.localStorage = {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
  };
  try {
    await import('../src/v2/main.js');
    assert.ok(app.innerHTML.includes('入卷之前'));
    const {confirmAge} = await import('../src/v2/audience.js');
    confirmAge();
    const link = {dataset: {act: 'go', to: 'settings'}};
    listeners.click({target: {closest: () => link}, preventDefault() {}});
    assert.match(app.innerHTML, /name="remember" aria-describedby="remember-key-hint"\s+checked/);
    assert.match(app.innerHTML, /id="remember-key-hint">密钥会以明文保存在本浏览器。/);
  } finally {
    for (const key of keys) {
      if (original[key] === undefined) delete globalThis[key];
      else globalThis[key] = original[key];
    }
  }
});
