import test from 'node:test';
import assert from 'node:assert/strict';
import {filterChildSentences, childPlanAllowed} from '../src/v2/plans.js';
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

test('A3 旧档普通和值房批折额度分别为六道与十道', () => {
  for (const council of [false, true]) {
    const s = oldSave(s => {
      s.agenda = [];
      if (council) s.done.W08 = 'council';
    });
    E.review(s);
    assert.equal(s.reviewSession.left, E.reviewLimit(s));
    assert.equal(E.reviewLimit(s), council ? 10 : 6);
  }
});

test('A4 构建版本参数不改变旧档版本与进度，仍能继续月初剧情', () => {
  const s = oldSave();
  const id = E.pendingScene(s);
  const sc = E.scene(id);
  E.choose(s, id, E.optionsFor(s, sc)[0].id);
  assert.ok(s.done[id]);
});

test('A5 原图移出后旧档人物与孩子立绘编号继续保留', () => {
  const s = oldSave(s => {s.children = []; s.inventory = [{name: '旧藏', authentic: true}];});
  assert.deepEqual(s.children, []);
  assert.equal(s.inventory[0].name, '旧藏');
  assert.equal(s.people.C02.aff, 30);
});

test('A6 临时脚本六例纳入皇嗣过滤回归，旧档孩子记录保留', () => {
  const s = oldSave(s => {s.children = [{id: 'K01', name: '弘昀', sex: '男', born: '2-3'}];});
  const allowed = [
    '孩子睡了，甄嬛依偎在你肩头。',
    '弘昀在隔间睡着。她与你云雨一番，情欲渐浓。',
    '皇子就在屏风后。你为她宽衣。',
    '你抱起弘昀亲了亲他的额头。',
    '她拥抱着孩子，轻声哄睡。',
  ];
  for (const text of allowed) assert.equal(filterChildSentences(text, 'C09', s), text);
  const forbidden = '弘昀长大后要做谁的恋人呢。';
  assert.equal(filterChildSentences(forbidden, 'C09', s), '');
  assert.equal(childPlanAllowed(forbidden, 'C09', s), false);
  assert.equal(s.children[0].name, '弘昀');
});
