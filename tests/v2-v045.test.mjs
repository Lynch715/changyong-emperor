import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/v2/engine.js';

// 经由真实读档入口恢复旧字段，并核对玩家的进度、钱和人物均保留。
function oldSave(edit = () => {}) {
  const original = E.newGame(450);
  original.stats.treasury = 812.75;
  original.done.fixture = 'kept';
  edit(original);
  const text = JSON.stringify(original);
  const loaded = E.load({getItem: () => text, setItem: () => assert.fail('读档不得写回')});
  assert.ok(loaded);
  for (const key of ['version', 'year', 'month', 'stats', 'done', 'people', 'agenda', 'seed']) {
    assert.deepEqual(loaded[key], original[key], key);
  }
  return loaded;
}

test('A1 服务器调用上限修复后旧游戏存档仍可读取', () => {
  const s = oldSave();
  assert.equal(s.ap, 3);
  assert.ok(E.pendingScene(s));
});
