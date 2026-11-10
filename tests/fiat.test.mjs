import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/v2/engine.js';
import * as AI from '../src/v2/ai.js';
import {localFiat, chineseNumber, fiatContext} from '../src/v2/fiat.js';
import {planAllowed} from '../src/v2/plans.js';
import {funds} from '../src/v2/economy.js';

const ready = () => {const s = E.newGame(46); E.setFreedom(s, 1); return s;};
const result = (changes = [], facts = []) => ({title: '改写天下', narration: '旨意已经生效。', changes, facts});
const set = (path, value, lock = false) => ({path, value, lock});
class Storage {
  values = new Map();
  getItem(k) {return this.values.get(k) ?? null;}
  setItem(k, value) {this.values.set(k, value);}
}

test('言出法随：大额银两按实际万两入账，跨过要事与零时辰，不掷骰不消耗随机数', () => {
  const s = ready(), seed = s.seed, agenda = [...s.agenda];
  s.ap = 0; s.stats.inner = 0;
  const text = '国库增加一亿两，内帑增加100万两，圣躬设为100';
  const r = E.applyEdict(s, text, localFiat(s, text));
  assert.equal(r.stats.treasury, 10000);
  assert.equal(s.stats.treasury, 10800);
  assert.equal(s.ledger.treasury.in, 10000);
  assert.equal(s.stats.inner, 100);
  assert.equal(s.stats.health, 100);
  assert.equal(s.ap, 0);
  assert.equal(s.seed, seed);
  assert.deepEqual(s.agenda, agenda);
  assert.equal(r.fiat, true);
  assert.equal(r.optional, true);
});

test('言出法随：中文与小数单位精确，复合指令不会只执行识别出的一半', () => {
  const s = ready();
  for (const [text, value] of [['一亿', 1e8], ['一亿零三万二千', 100032000], ['1.5亿', 1.5e8], ['两千', 2000]]) {
    assert.equal(chineseNumber(text), value);
  }
  for (const [text, value] of [['国库增加1.5亿两', 15000], ['内帑增加两万两', 2], ['国库增加3.5万两', 3.5],
    ['国库增加一亿一千万两', 11000], ['国库增加一亿零三万二千两', 10003.2]]) {
    assert.equal(localFiat(s, text).changes[0].value, value);
  }
  assert.equal(localFiat(s, '国库增加一亿两，建立铁路'), null);
  assert.equal(localFiat(s, '国库增加一万两后减少二万两'), null);
});

test('言出法随：破格任命无人数、身份和定员限制，旧心结不拦直接设定情分', () => {
  const s = ready();
  s.people.C07.knot = {source: 'old', text: '旧事'};
  E.applyFiat(s, '让四位妃嫔同任大学士，年世兰情分满值', result([
    ...['C06', 'C07', 'C08', 'C09'].map(id => set('appointments.' + id, {office: 'scholar'})),
    set('people.C07.aff', 100), set('people.C09.place', '养心殿'), set('people.C09.available', true),
    set('people.C03.alive', true), set('people.C03.knot', null),
  ]));
  assert.equal(Object.values(s.appointments).filter(a => a.office === 'scholar').length, 5);
  assert.equal(s.people.C07.aff, 100);
  assert.equal(E.present(s, 'C09'), true);
  assert.equal(E.away(s, 'C09'), false);
  assert.equal(E.placeOf(s, 'C09'), '养心殿');
  assert.equal(E.gone(s, 'C03'), false);
  E.applyFiat(s, '封年世兰为首席大执政', result([set('appointments.C07', {office: null, title: '首席大执政'})]));
  assert.equal(E.titleOf(s, 'C07'), '首席大执政');
});

test('言出法随：永久设定在日常结算、跨月与读档后保持，切换档位后暂停并可解除', () => {
  const s = ready(); s.agenda = [];
  E.applyFiat(s, '圣躬永久满值，内帑永久一千，苏培盛情分永久满值', result([
    set('stats.health', 100, true), set('stats.inner', 1000, true), set('people.C02.aff', 100, true),
  ]));
  E.applyStats(s, {health: -40}); funds(s, {inner: -50}); E.gain(s, 'C02', -20);
  assert.equal(s.stats.health, 100); assert.equal(s.stats.inner, 1000); assert.equal(s.people.C02.aff, 100);
  for (let i = 0; i < 12; i++) {s.agenda = []; E.endMonth(s);}
  assert.equal(s.stats.health, 100); assert.equal(s.stats.inner, 1000); assert.equal(s.people.C02.aff, 100);
  const storage = new Storage(); E.save(s, storage);
  const raw = storage.getItem(E.SAVE_KEY), loaded = E.load(storage);
  assert.ok(loaded);
  assert.equal(loaded.stats.inner, 1000);
  assert.equal(loaded.people.C02.aff, 100);
  assert.equal(storage.getItem(E.SAVE_KEY), raw);
  E.setFreedom(loaded, 2); E.applyStats(loaded, {health: -5}); funds(loaded, {inner: -20});
  assert.equal(loaded.stats.health, 95); assert.equal(loaded.stats.inner, 980);
  E.setFreedom(loaded, 1);
  assert.equal(loaded.stats.health, 100);
  E.applyFiat(loaded, '取消圣躬锁定', result([{path: 'stats.health', op: 'unlock'}]));
  E.applyStats(loaded, {health: -5}); assert.equal(loaded.stats.health, 95);
  E.applyFiat(loaded, '内帑设为五百', result([set('stats.inner', 500)]));
  assert.equal(loaded.fiat.locks['stats.inner'], undefined);
  assert.equal(loaded.stats.inner, 500);
});

test('言出法随：一条指令的所有变化原子提交，坏字段、溢出与原型路径不污染存档', () => {
  for (const change of [set('stats.treasury', Infinity), set('__proto__.polluted', true),
    set('people.C07.aff.extra', 50), set('appointments.C99', {office: 'hubu'}), set('year', 9000),
    {path: 'stats.treasury', op: 'add', value: Number.MAX_SAFE_INTEGER / 100},
    set('policies.land.host', '__proto__'), set('stats.court', '100')]) {
    const s = ready(), raw = JSON.stringify(s);
    assert.throws(() => E.applyFiat(s, '国库加银并改写', result([set('stats.inner', 1000), change])));
    assert.equal(JSON.stringify(s), raw);
  }
  assert.equal({}.polluted, undefined);
});

test('言出法随：世界事实持久保存、更新和撤销，旧存档与其他档位的规则仍可用', () => {
  const s = ready(), storage = new Storage();
  E.applyFiat(s, '建立蒸汽铁路', result([], [{key: 'railway', text: '京城至江南的蒸汽铁路已经通车。'}]));
  E.save(s, storage); const loaded = E.load(storage);
  assert.match(fiatContext(loaded), /铁路已经通车/);
  E.applyFiat(loaded, '铁路延至广东', result([], [{key: 'railway', text: '铁路已经延伸至广东。'}]));
  assert.equal(Object.keys(loaded.fiat.facts).length, 1);
  E.applyFiat(loaded, '撤销铁路设定', result([], [{key: 'railway', text: ''}]));
  assert.equal(fiatContext(loaded), '');
  for (const level of [2, 3]) {
    E.setFreedom(loaded, level); const raw = JSON.stringify(loaded);
    assert.throws(() => E.applyFiat(loaded, '改写', result([set('stats.health', 100)])));
    assert.equal(JSON.stringify(loaded), raw);
    assert.equal(localFiat(loaded, '国库增加一亿两'), null);
  }
  const old = E.newGame(7), raw = JSON.stringify(old);
  assert.ok(E.load({getItem: () => raw})); assert.equal(JSON.stringify(old), raw);
  s.freedom = 2;
  assert.equal(planAllowed('强迫贪官退赃', null, s), false);
  s.freedom = 1;
  assert.equal(planAllowed('强迫贪官退赃', null, s), true);
  assert.equal(planAllowed('让未成年皇子读书', null, s), true);
});

async function withModel(value, fn) {
  const oldFetch = globalThis.fetch, oldStorage = globalThis.localStorage, oldDoc = globalThis.document, calls = [];
  globalThis.localStorage = new Storage(); globalThis.document = undefined;
  globalThis.fetch = async (url, options) => {
    if (url === '/api/status') return {ok: true, json: async () => ({configured: true})};
    calls.push(JSON.parse(options.body)); return {ok: true, json: async () => ({value})};
  };
  try {await AI.initAI(); await fn(calls);} finally {
    globalThis.fetch = oldFetch; globalThis.localStorage = oldStorage; globalThis.document = oldDoc;
  }
}

test('审计：永久职位恢复不复活已明确离世的人物，地方改写同步全国指标', () => {
  const s = ready(), storage = new Storage();
  E.applyFiat(s, '年世兰永久任大学士', result([set('appointments.C07', {office: 'scholar'}, true)]));
  E.applyFiat(s, '年世兰离世', result([set('people.C07.alive', false)]));
  const records = s.appointmentHistory.C07.length;
  E.save(s, storage);
  assert.equal(E.gone(s, 'C07'), true);
  assert.equal(E.gone(E.load(storage), 'C07'), true);
  assert.equal(s.appointmentHistory.C07.length, records);
  const before = {...s.stats};
  E.applyFiat(s, '河南民生和吏治各提高十点', result([
    {path: 'provinces.河南.livelihood', op: 'add', value: 10},
    {path: 'provinces.河南.integrity', op: 'add', value: 10},
  ]));
  assert.equal(s.stats.people, before.people + 1);
  assert.equal(s.stats.court, before.court + 1);
});

test('审计：永久银两保留真实支出及补足记录，月报新政开支不被固定余额吞掉', () => {
  const s = ready(); s.agenda = [];
  E.applyFiat(s, '国库永久保持一千', result([set('stats.treasury', 1000, true)]));
  const before = structuredClone(s.ledger.treasury);
  funds(s, {treasury: -20}, '军政');
  assert.equal(s.stats.treasury, 1000);
  assert.equal(s.ledger.treasury.out - before.out, 20);
  assert.equal(s.ledger.treasury.in - before.in, 20);
  assert.equal(s.expenseUses.军政, 20);
  s.policies.land.progress = 100;
  const r = E.endMonth(s);
  assert.equal(r.fiscal.policySpent, 1);
  assert.ok(r.ledger.treasury.out >= r.publicOutgo + r.fiscal.policySpent);
  assert.equal(r.balances.treasury, 1000);
});

test('审计：一档纯聊天无需编造世界变化，仍计对话次数；命令入口不接受空执行', async () => {
  const response = {...result(), narration: '苏培盛给你添了热茶，低声问今日可曾歇好。', conversation: true};
  await withModel(response, async () => {
    const s = ready(), before = {...s.stats}, c = {id: 'C02', turns: 0};
    const reply = await AI.chatReply(s, c.id, [{who: 'player', text: '今日睡得很好，你也歇歇。'}]);
    assert.ok(reply?.fiat);
    E.applyFiatChat(s, c, '今日睡得很好，你也歇歇。', reply.fiat);
    assert.equal(c.turns, 1);
    assert.equal(s.count.lines, 1);
    assert.deepEqual(s.stats, before);
    assert.equal(await AI.fiatResult(s, '修一条铁路'), null);
  });
});

test('缓存：变化的数值、事实、人物与骰面仍发送最新上下文，固定规则逐字相同', async () => {
  await withModel({reply: '奴才记下了。', affection: 1, narration: '你定下新规。', changes: [], facts: [{key: 'new', text: '新规已立。'}]},
    async calls => {
      const s = ready(); E.setFreedom(s, 2);
      await AI.chatReply(s, 'C02', [{who: 'player', text: '早安'}], {fate: {tier: 0}});
      s.stats.health = 19; s.people.C07.memories.push({text: '今天临帖'});
      s.fiat = {facts: {rail: '铁路通车了。'}, locks: {}};
      await AI.chatReply(s, 'C07', [{who: 'player', text: '午安'}], {fate: {tier: 4}});
      assert.equal(calls[0].system, calls[1].system);
      assert.match(calls[1].user, /铁路通车了/);
      assert.match(calls[1].user, /圣躬19/);
      assert.match(calls[1].user, /今天临帖/);
      assert.match(calls[0].user, /大凶/);
      assert.match(calls[1].user, /大吉/);
      E.setFreedom(s, 1);
      await AI.fiatResult(s, '设立书院');
      s.fiat.facts.rail = '铁路已延伸到广东。'; s.stats.inner = 321;
      await AI.fiatResult(s, '扩建书院');
      assert.equal(calls[2].system, calls[3].system);
      assert.match(calls[3].user, /铁路已延伸到广东/);
      assert.match(calls[3].user, /"inner":321/);
    });
});

test('言出法随：下旨、召见、夜间、休养共用改写协议，事实进入后续上下文', async () => {
  await withModel(result([set('stats.inner', 1000)], [{key: 'railway', text: '蒸汽铁路已建成。'}]), async calls => {
    const s = ready();
    const edict = await AI.edictResult(s, '让蒸汽铁路建成并赐内帑一千万两', []);
    E.applyEdict(s, '修铁路并赐银', edict);
    assert.equal(s.stats.inner, 1000);
    const chat = await AI.chatReply(s, 'C02', [{who: 'player', text: '在铁路上设学堂'}]);
    assert.ok(chat.fiat);
    assert.match(calls.at(-1).user, /蒸汽铁路已建成/);
    assert.match(calls.at(-1).system, /不受史实/);
    assert.doesNotMatch(calls.at(-1).system, /根本做不到|情分变化多少/);
    assert.ok((await AI.nightScene(s, 'C07', '在铁路专列里赏月')).fiat);
    assert.ok((await AI.restScene(s, '坐专列南巡')).fiat);
    assert.equal(calls.length, 4);
    for (const c of calls) {assert.ok(c.system.length <= 8000); assert.ok(c.user.length <= 12000);}
  });
  await withModel({narration: '完成了。'}, async () => {
    const s = ready(), raw = JSON.stringify(s);
    assert.equal(await AI.fiatResult(s, '修一条铁路'), null);
    assert.match(AI.aiError(), /完整结果/);
    assert.equal(JSON.stringify(s), raw);
  });
});
