import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/v2/engine.js';
import {loadGallery, updateGallery} from '../src/v2/gallery.js';
import {budgetDisplay} from '../src/v2/presentation.js';

const playable = () => {
  const s = E.newGame(711);
  E.choose(s, 'M01', 'steady');
  s.agenda = [];
  return s;
};

test('全面审计：入夜后不能再用白天时辰，旧夜间存档仍能正常月结', () => {
  const s = playable();
  E.spendNight(s, null);
  const before = JSON.stringify(s);
  assert.equal(E.canAct(s), false);
  assert.throws(() => E.rest(s), /今夜|入夜/);
  assert.equal(JSON.stringify(s), before);
  const restored = E.load({getItem: () => before});
  assert.equal(restored.night, true);
  assert.equal(restored.ap, 3);
  E.endMonth(restored);
  assert.equal(restored.month, 2);
});

test('全面审计：阶段回顾不重复结算，拒绝时钱与进度保持原样', () => {
  const s = playable();
  s.year = 2;
  s.month = 12;
  s.ended = true;
  const before = JSON.stringify(s);
  assert.throws(() => E.endMonth(s), /回顾|接续|走完/);
  assert.equal(JSON.stringify(s), before);
});

test('全面审计：离场人物不再进入召见、赏赐、作陪或后续关系剧情', () => {
  const s = playable();
  Object.assign(s.people.C02, {aff: 80, first: true, firstAt: '1-0', met: true});
  s.flags.gone_C02 = true;
  const before = JSON.stringify(s);
  assert.equal(E.hasStory(s, 'C02'), false);
  assert.ok(!E.restCompanions(s).includes('C02'));
  assert.throws(() => E.beginChat(s, 'C02'));
  assert.throws(() => E.giveGift(s, 'C02', 'tea'));
  assert.throws(() => E.queueSpecial(s, 'C02'));
  assert.throws(() => E.giveGift(s, 'missing', 'tea'));
  assert.equal(JSON.stringify(s), before);
  s.visit = {id: 'C02', tier: 1, i: 0};
  assert.equal(E.visitOf(s), null);
  const withVisit = JSON.stringify(s);
  assert.throws(() => E.acceptVisit(s));
  assert.equal(JSON.stringify(s), withVisit);
});

test('全面审计：已离场人物不会在新月份来访或途中偶遇，负预算显示缺口', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const s = playable();
    s.seed = seed;
    for (const [id, p] of Object.entries(s.people)) {
      Object.assign(p, {met: true, available: true, aff: 80});
      s.flags['gone_' + id] = true;
    }
    E.startMonth(s);
    assert.equal(s.visit, null);
    s.agenda = [];
    assert.equal(E.rollSurprise(s), null);
  }
  const s = playable();
  s.stats.treasury = 0;
  for (const p of Object.values(s.provinces)) p.revenue = 0;
  const f = budgetDisplay(s);
  assert.equal(f.expected, 0);
  assert.ok(f.shortfall > 0);
});

test('全面审计：损坏的珍藏结构不妨碍继续保存游戏', () => {
  for (const raw of ['4', 'true', '[]', '{"ach":4,"seen":[]}']) {
    const storage = {getItem: () => raw, setItem() {}};
    assert.deepEqual(loadGallery(storage), {ach: {}, seen: {}});
    assert.doesNotThrow(() => updateGallery(playable(), storage));
  }
});
