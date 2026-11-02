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

test('B1 正月只办惊梦即可自由行动，可选赈济不耗时辰且报告有两类变化', () => {
  const s = E.newGame(451);
  assert.deepEqual(s.agenda, ['M01']);
  assert.throws(() => E.openingEdict(s), /惊梦/);
  E.choose(s, 'M01', 'call');
  assert.ok(E.canAct(s));
  assert.deepEqual(s.agenda, []);
  const before = structuredClone(s.stats), ap = s.ap;
  const result = E.openingEdict(s);
  assert.equal(s.ap, ap);
  assert.deepEqual(result.stats, {treasury: -10, people: 3});
  assert.equal(s.stats.treasury, before.treasury - 10);
  assert.equal(s.stats.people, before.people + 3);
  assert.equal(E.openingDecree(s), null);
  assert.throws(() => E.openingEdict(s), /办过/);
  E.spendNight(s, null);
  const report = E.endMonth(s);
  assert.ok(report.stats.people >= 3);
  assert.ok(report.ledger.treasury.out >= 10);
  assert.ok(Object.values(report.stats).filter(v => v !== 0).length >= 2);
  assert.ok(s.agenda.includes('R02-01'));
  assert.ok(!s.agenda.includes('M02'));
  assert.equal(E.scene('R02-01').title, '留茶夜谈');
});

test('B1 不办可选朝政也能结束正月，不罚不顺延；两条路线的二月进度一致', () => {
  const play = issue => {
    const s = E.newGame(452);
    E.choose(s, 'M01', 'call');
    if (issue) E.openingEdict(s);
    E.spendNight(s, null);
    const report = E.endMonth(s);
    return {s, report};
  };
  const skipped = play(false), issued = play(true);
  assert.equal(skipped.s.month, 2);
  assert.equal(E.openingDecree(skipped.s), null);
  assert.equal(skipped.s.done['opening-relief'], undefined);
  assert.deepEqual(skipped.s.agenda, issued.s.agenda);
  assert.deepEqual(skipped.s.people, issued.s.people);
  assert.equal(skipped.s.stats.people + 3, issued.s.stats.people);
  assert.equal(skipped.s.stats.treasury - 10, issued.s.stats.treasury);
  assert.equal(skipped.report.ledger.treasury.out + 10, issued.report.ledger.treasury.out);
});

test('B1 旧正月待办不删改，已经过正月的旧档不补发可选旨意', () => {
  const january = oldSave(s => {s.agenda = ['M02', 'R02-01']; s.done.M01 = 'call';});
  E.choose(january, 'M02', 'tea');
  E.choose(january, 'R02-01', 'warm');
  assert.equal(january.people.C02.first, true);
  const later = oldSave(s => {s.year = 3; s.month = 1; s.agenda = [];});
  assert.equal(E.openingDecree(later), null);
  const before = JSON.stringify(later);
  assert.throws(() => E.openingEdict(later), /过了/);
  assert.equal(JSON.stringify(later), before);
});

test('B2 旧档首页仅显示已知收支预估，查看不改账；元年未办过的零值项目隐藏', async () => {
  const {budgetDisplay} = await import('../src/v2/presentation.js');
  const s = oldSave();
  const before = JSON.stringify(s), display = budgetDisplay(s);
  assert.equal(display.income, s.ledger.treasury.in);
  assert.equal(display.outgo, s.ledger.treasury.out);
  assert.equal(display.expected, 844.75);
  assert.equal(display.showProjects, false);
  assert.equal(display.showPolicy, false);
  assert.equal(JSON.stringify(s), before);
  s.fiscal.projects.salt.pending = {level: 1, due: 2};
  s.policies.huohao.active = true;
  assert.equal(budgetDisplay(s).showProjects, true);
  assert.equal(budgetDisplay(s).showPolicy, true);
});
