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

test('A2 旧档打开合上不扣时辰，首次落笔扣一次，再开沿用额度', () => {
  const s = oldSave(s => {s.agenda = [];});
  const ap = s.ap;
  E.review(s);
  E.review(s);
  assert.equal(s.ap, ap);
  E.judgeMemorial(s, s.memorials[0].uid, 'reject');
  assert.equal(s.ap, ap - 1);
  const left = s.reviewSession.left;
  E.review(s);
  E.judgeMemorial(s, s.memorials[0].uid, 'reject');
  assert.equal(s.ap, ap - 1);
  assert.equal(s.reviewSession.left, left - 1);
  E.rest(s);
  assert.equal(s.reviewSession, null);
});

test('A2 已付过时辰的旧批折档继续用，不重复扣；无时辰也能浏览', () => {
  const s = oldSave(s => {
    s.agenda = [];
    s.ap = 0;
    s.reviewSession = {at: 1, left: 3, held: []};
  });
  E.review(s);
  E.judgeMemorial(s, s.memorials[0].uid, 'hold');
  assert.equal(s.ap, 0);
  s.reviewSession = null;
  E.review(s);
  assert.throws(() => E.judgeMemorial(s, s.memorials[1].uid, 'reject'), /时辰/);
  assert.equal(s.reviewSession.left, 6);
});
