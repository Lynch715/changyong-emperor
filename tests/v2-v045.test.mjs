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

test('B3 旧档情分和本月涨跌分别显示，读档后数字不重算', async () => {
  const {affectionChange} = await import('../src/v2/presentation.js');
  const s = oldSave(s => {s.people.C02.aff = 34; s.delta.people.C02 = 4;});
  assert.equal(`${E.affectionStage(s, 'C02')} · ${s.people.C02.aff}${affectionChange(s.delta.people.C02)}`,
    '相识 · 34（本月 +4）');
  assert.equal(affectionChange(-3), '（本月 -3）');
  assert.equal(affectionChange(0), '');
  assert.equal(s.people.C02.aff, 34);
  assert.equal(s.delta.people.C02, 4);
});

test('B4 旧档取消入夜不消耗时辰，不处理可选事项也可正常独寝结束本月', () => {
  const s = oldSave(s => {s.done.M01 = 'call'; s.agenda = [];});
  const before = JSON.stringify(s);
  assert.ok(E.canAct(s));
  assert.equal(JSON.stringify(s), before, '打开和取消确认框不调用引擎或改存档');
  E.spendNight(s, null);
  assert.equal(s.night, true);
  const report = E.endMonth(s);
  assert.equal(report.m, 1);
  assert.equal(s.month, 2);
  assert.equal(s.done['opening-relief'], undefined);
});

test('B5 旧档成就一显示便持久移除，刷新不重弹且其他庆贺仍保留', async () => {
  const {takeAchievement, updateGallery, GALLERY_KEY} = await import('../src/v2/gallery.js');
  const achievement = {id: 'tea', title: '一盏茶', icon: '茶', desc: '旧成就'};
  const s = oldSave(s => {
    s.done.M02 = 'tea';
    s.cele = [
      {k: 'ach', a: achievement}, {k: 'stage', id: 'C02', stage: '相知'}, {k: 'ach', a: achievement},
    ];
  });
  const values = new Map();
  const storage = {getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value)};
  const before = structuredClone(s);
  let saves = 0;
  const event = takeAchievement(s, state => {saves++; E.save(state, storage);}, storage);
  assert.equal(event.a.id, 'tea');
  assert.equal(saves, 1, '显示时即存档，无需等待点击关闭');
  assert.deepEqual(s.cele, [{k: 'stage', id: 'C02', stage: '相知'}]);
  const reloaded = E.load(storage);
  assert.deepEqual(reloaded.cele, s.cele);
  for (const key of ['stats', 'people', 'done', 'agenda', 'seed', 'ap']) assert.deepEqual(reloaded[key], before[key]);
  assert.ok(JSON.parse(storage.getItem(GALLERY_KEY)).ach.tea);
  assert.ok(!updateGallery(reloaded, storage).some(a => a.id === 'tea'), '旧队列带来的成就也不再次入队');
  assert.equal(takeAchievement(reloaded, () => assert.fail('非成就不得提前收取'), storage), null);
});

test('D1 56道短折均为两句且不超过60字，任意两折无相同的16字套话', async () => {
  const {MEMORIAL_POOL} = await import('../src/v2/government.js');
  const seen = new Set();
  for (const m of MEMORIAL_POOL) {
    assert.ok(m.body.length <= 60, m.title);
    assert.equal(m.body.split('。').filter(Boolean).length, 2, m.title);
    for (let i = 0; i <= m.body.length - 16; i++) {
      const part = m.body.slice(i, i + 16);
      assert.ok(!seen.has(part), part);
      seen.add(part);
    }
  }
});

test('D1 旧折原文保留，阅读时用短正文，查核细节随原办理结果回来', async () => {
  const G = await import('../src/v2/government.js');
  const originalBody = '旧正文不改写。' + '臣已令属员封存原册。'.repeat(10);
  const s = oldSave(s => {
    s.agenda = [];
    s.memorials = [{...G.MEMORIAL_POOL[0], uid: 'old-mem', body: originalBody}];
  });
  assert.equal(s.memorials[0].body, originalBody);
  assert.ok(E.memorialBody(s.memorials[0]).length <= 80);
  E.review(s);
  E.judgeMemorial(s, 'old-mem', 'inspect');
  s.month += 3;
  G.regionalMonth(s, {rand: () => 1, applyStats: E.applyStats});
  assert.match(s.govReports.at(-1).body, /埋桩护脚/);
  assert.ok(E.memorialBody(s.memorials[0]).length <= 80);
});

test('D2 旧档已付的批折额度保留，折匣只留一句说明而完整规则移入怎么玩', async () => {
  const {readFile} = await import('node:fs/promises');
  const s = oldSave(s => {s.reviewSession = {at: 1, charged: true, left: 4, held: ['kept']};});
  E.review(s);
  assert.equal(s.reviewSession.left, 4);
  assert.deepEqual(s.reviewSession.held, ['kept']);
  const source = await readFile(new URL('../src/v2/main.js', import.meta.url), 'utf8');
  const memorial = source.slice(source.indexOf('function memorialView('), source.indexOf('function edictView('));
  assert.ok(memorial.includes('急灾排在最前。查核只查清楚，办事还要另拨银子。'));
  assert.ok(!memorial.includes('钱粮清欠准奏后'));
  const help = source.slice(source.indexOf('function playHelp('), source.indexOf('const KIND_NAME='));
  assert.ok(help.includes('钱粮清欠准奏后'));
  assert.ok(help.includes('一个时辰可批'));
});

test('D3 新边务七题只分配边省，旧折的省份与已经发出的朱批不被改写', async () => {
  const G = await import('../src/v2/government.js');
  const border = G.MEMORIAL_POOL.filter(m => m.type === '边务');
  assert.equal(border.length, 7);
  const s = oldSave(s => {
    s.memorials = [{...border.find(m => m.title === '边堡待修'), province: '湖广', uid: 'old-border'}];
  });
  assert.equal(s.memorials[0].province, '湖广', '不改写旧案已经记录的上奏省份');
  for (const m of border) {
    assert.ok(G.BORDER_PROVINCES.includes(m.province), m.title);
    const fresh = G.addMemorial(s, m);
    assert.ok(!fresh.author.includes('湖广'));
    assert.ok(['陕甘', '云贵', '四川'].includes(fresh.province));
  }
});

test('D4 月报不出现零值或未开启的入账项目，正月支出用途与总数对上', async () => {
  const {monthIncomeText, treasuryExpenseText} = await import('../src/v2/presentation.js');
  const s = E.newGame(454);
  E.choose(s, 'M01', 'call');
  E.openingEdict(s);
  E.spendNight(s, null);
  const report = E.endMonth(s);
  assert.equal(report.ledger.treasury.out, 30);
  assert.deepEqual(report.expenses, {赈济: 10, 军政: 20});
  assert.match(treasuryExpenseText(report), /赈济 10/);
  assert.match(treasuryExpenseText(report), /军政 20/);
  const text = monthIncomeText({fiscal: {
    base: 52, province: 0, office: 0, projects: 0, policySpent: 0, unlocked: {projects: false, policy: false},
  }});
  assert.equal(text, '月底入账：常例 52 万两。');
  for (const label of ['地方浮动', '户部浮动', '理财', '新政实付', '0 万两']) assert.ok(!text.includes(label));
  assert.equal(monthIncomeText({fiscal: {base: 0, projects: 10, unlocked: {projects: false}}}), '');
});

test('D4 旧档本月已花的钱只标未分项，余额与旧账均保留，新增支出可继续记账', async () => {
  const {treasuryExpenseText} = await import('../src/v2/presentation.js');
  const s = oldSave(s => {delete s.expenseUses; s.agenda = []; s.ledger.treasury.out = 7;});
  assert.deepEqual(s.expenseUses, {});
  assert.equal(s.stats.treasury, 812.75);
  E.spendNight(s, null);
  const report = E.endMonth(s);
  assert.equal(report.ledger.treasury.out, 27);
  assert.equal(treasuryExpenseText(report), '支出去向（万两）：军政 20 · 旧账未分项 7。');
});

test('D4 免费朝政结果返回御案不再抽随机插曲，仍不占时辰或要事位', async () => {
  const {readFile} = await import('node:fs/promises');
  const s = E.newGame(4540);
  E.choose(s, 'M01', 'call');
  const result = E.openingEdict(s);
  assert.equal(result.optional, true);
  assert.equal(s.ap, 3);
  assert.deepEqual(s.agenda, []);
  const source = await readFile(new URL('../src/v2/main.js', import.meta.url), 'utf8');
  const view = source.slice(source.indexOf('function resultView('), source.indexOf('function nightView('));
  assert.ok(view.includes("r.optional ? 'go' : 'done'"));
});
