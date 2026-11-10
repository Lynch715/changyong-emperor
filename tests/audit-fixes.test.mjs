import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/v2/engine.js';
import * as F from '../src/v2/family.js';
import {childrenSection} from '../src/v2/family-ui.js';
import {nightText} from '../src/v2/presentation.js';
import {LONG_STORIES} from '../src/v2/long-stories.js';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

test('B01 四段立绘按真实周岁切换，旧出生记录和已有选图保留', () => {
 const s = E.newGame(711);
 const child = {id: 'K01', name: '弘宁', sex: '男', mother: 'C07', born: '1-3',
  art: {infant: 'k_infant_03', youth: 'k_youth_04'}, traits: [], notes: []};
 s.children.push(child);
 s.year = 6; s.month = 3;
 const restored = E.load({getItem: () => JSON.stringify(s)}), c = restored.children[0];
 assert.equal(c.born, '1-3'); assert.equal(c.art.infant, 'k_infant_03'); assert.equal(c.art.youth, 'k_youth_04');
 assert.equal(F.childStage(restored, c), 'child');
 assert.equal(c.art.child, 'k_child_01');
 assert.match(childrenSection(restored), /kid_child_01-mobile/);
 assert.doesNotMatch(childrenSection(restored), /更换婴儿/);
 for (const [year, month, stage] of [[1, 3, 'infant'], [2, 2, 'infant'], [2, 3, 'toddler'],
  [5, 2, 'toddler'], [5, 3, 'child'], [11, 2, 'child'], [11, 3, 'youth']]) {
  Object.assign(restored, {year, month}); assert.equal(F.childStage(restored, c), stage);
 }
 assert.throws(() => E.changeChildArt(restored, c.id, 'k_child_02'));
});

test('B01–B03 六张补图的提示词、原图和20张运行图均有登记且校验一致', async () => {
 const registry = JSON.parse(await readFile(new URL('../design/S11/0.47-审计修复美术.json', import.meta.url), 'utf8'));
 assert.equal(registry.assets.length, 6);
 assert.equal(registry.assets.flatMap(a => a.exports).length, 20);
 for (const asset of registry.assets) {
  assert.equal(asset.generator, 'built-in image_gen');
  assert.equal(asset.status, 'generated-reviewed');
  assert.ok(asset.prompt.length > 100);
  for (const item of asset.exports) {
   const bytes = await readFile(new URL('../' + item.path, import.meta.url));
   assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256);
   assert.ok(bytes.length > 1000);
   if (item.path.endsWith('.png')) assert.equal(bytes[25], 6);
  }
 }
});

test('C02 重写后半程群像仍保留全部编号、排期、前置与选项数值', () => {
 const mechanics = LONG_STORIES.map(s => ({id: s.id, earliest: s.earliest, latest: s.latest, dep: s.dep,
  options: s.options.map(o => ({id: o.id, effects: o.effects}))}));
 const hash = createHash('sha256').update(JSON.stringify(mechanics)).digest('hex');
 assert.equal(hash, '5c0f6c53d55050c631bbd51eec73c284c0b1504bd5a038189c3612419018e01b');
 assert.equal(LONG_STORIES.filter(s => s.actor === 'C28').length, 13);
 for (const actor of ['C03', 'C05', 'C07']) assert.ok(LONG_STORIES.filter(s => s.actor === actor).length >= 4);
 const s = E.newGame(711); s.year = 16;
 const first = E.scene(s, 'H1601'), later = new Set();
 for (const option of first.options) {
  s.done.H1601 = option.id;
  later.add(E.scene(s, 'H1602').body);
 }
 assert.equal(later.size, 3);
 s.flags.gone_C03 = true;
 assert.equal(E.scene(s, 'H1601').actor, 'C28');
 assert.doesNotMatch(E.scene(s, 'H1601').body, /年羹尧托人送来/);
});

test('C01 季节夜话不会在夏冬写入秋或花开，选择不改变存档', () => {
 const s = E.newGame(711), before = JSON.stringify(s);
 for (const month of [4, 5, 6, 10, 11, 12]) {
  const current = {...s, month};
  assert.doesNotMatch(nightText(current, 'C02'), /入秋/);
  assert.doesNotMatch(nightText(current, 'C09'), /海棠开了/);
  assert.doesNotMatch(nightText(current, 'C10'), /菊花开了/);
 }
 assert.equal(JSON.stringify(s), before);
});

test('B01 一岁和四岁换图沿用家庭向导，不重复发放或改写其他年龄的图片', () => {
 const s = E.newGame(711);
 s.children = [{id: 'K01', name: '静宁', sex: '女', mother: 'C07', born: '1-3',
  art: {infant: 'k_infant_05'}, traits: [], notes: []}];
 s.year = 2; s.month = 3; E.startMonth(s);
 const id = s.agenda.find(id => id === 'PG-toddler-K01');
 assert.ok(id); s.agenda = [id]; E.choose(s, id, 'art');
 assert.equal(s.familyArt.stage, 'toddler');
 E.changeChildArt(s, 'K01', 'k_toddler_02');
 E.startMonth(s);
 assert.ok(!s.agenda.includes(id));
 assert.equal(s.children[0].art.infant, 'k_infant_05');
 s.year = 5; E.startMonth(s);
 assert.ok(s.agenda.includes('PG-child-K01'));
});
