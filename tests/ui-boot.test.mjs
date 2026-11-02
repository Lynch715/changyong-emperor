import test from 'node:test';
import assert from 'node:assert/strict';

// 用最小页面壳加载真实入口，确保界面整理没有丢失任何视图函数。
test('D4 真实界面入口能完整启动，仍先显示年龄确认页', async () => {
  const keys = ['document', 'window', 'location', 'localStorage'];
  const original = Object.fromEntries(keys.map(key => [key, globalThis[key]]));
  const app = {innerHTML: '', addEventListener() {}};
  globalThis.document = {getElementById: () => app, addEventListener() {}};
  globalThis.window = {scrollTo() {}};
  globalThis.location = {href: 'http://localhost:5450/'};
  globalThis.localStorage = {getItem: () => null};
  try {
    await import('../src/v2/main.js');
    assert.ok(app.innerHTML.includes('入卷之前'));
  } finally {
    for (const key of keys) {
      if (original[key] === undefined) delete globalThis[key];
      else globalThis[key] = original[key];
    }
  }
});
