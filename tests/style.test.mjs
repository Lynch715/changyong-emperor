import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {lineViolations} from '../scripts/check-style.mjs';
import * as E from '../src/v2/engine.js';

test('E1 新增和改动行超过160字符会失败，中文按字符计数，旧行只允许逐字不变', () => {
  assert.deepEqual(lineViolations('fixture.js', '字'.repeat(160), {}), []);
  assert.equal(lineViolations('fixture.js', '字'.repeat(161), {}).length, 1);
  const original = 'x'.repeat(200), hash = createHash('sha256').update(original).digest('hex');
  assert.deepEqual(lineViolations('fixture.js', original, {'fixture.js': [hash]}), []);
  assert.equal(lineViolations('fixture.js', original + 'changed', {'fixture.js': [hash]}).length, 1);
});

test('E1 检查工具不改存档，旧v1档仍通过load保留剧情与现金', () => {
  const original = E.newGame(4510);
  original.version = 1;
  original.done.M01 = 'call'; original.agenda = []; original.stats.treasury = 720.25;
  const raw = JSON.stringify(original), loaded = E.load({getItem: () => raw});
  assert.ok(loaded);
  assert.deepEqual(loaded.done, original.done);
  assert.equal(loaded.stats.treasury, 720.25);
  assert.deepEqual(loaded.agenda, []);
});
