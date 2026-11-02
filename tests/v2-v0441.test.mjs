import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/v2/engine.js';
import * as T from '../src/v2/timeline.js';
import {CORE,PEOPLE} from '../src/v2/data.js';
import {runLongJourney,settleLongAgenda} from '../scripts/v044-balance.mjs';

const firstIds=CORE.map(id=>PEOPLE[id].first);
const storageOf=s=>({getItem:()=>JSON.stringify(s),setItem:()=>assert.fail('读档不得写回')});

test('0.44.1 首幕在相关主线之后当月接上，既有事项仍先处理且不重复排入', () => {
  const s = E.newGame(441);
  assert.deepEqual(s.agenda, ['M01']);
  E.choose(s, 'M01', E.optionsFor(s, E.scene(s, 'M01'))[0].id);
  assert.equal(s.people.C02.first, false, '正月先自由行动，茶叙移到二月');
  assert.ok(E.canAct(s));
  E.spendNight(s, null);
  E.endMonth(s);
  assert.deepEqual(s.agenda, ['R02-01']);
  assert.equal(
    T.scheduleIntroduction(
      s,
      (id) => E.scene(s, id),
      () => true,
    ),
    null,
  );
  E.choose(s, 'R02-01', 'warm');
  assert.equal(s.people.C02.firstAt, '1-2');
  assert.equal(E.storyOf(s, 'C02'), null, '同月不连播第二幕');

  s.month = 11;
  s.done.M06 = 'quiet';
  s.agenda = ['urgent-fixture', 'birth-fixture'];
  T.scheduleFlexible(
    s,
    (id) => E.scene(s, id),
    () => true,
  );
  assert.deepEqual(s.agenda, ['urgent-fixture', 'birth-fixture', 'XR09-01']);
  assert.equal(
    T.scheduleIntroduction(
      s,
      (id) => E.scene(s, id),
      () => true,
    ),
    null,
    '同月不再加入第二位',
  );
  s.agenda = ['XR09-01'];
  E.choose(s, 'XR09-01', 'develop');
  T.scheduleFlexible(
    s,
    (id) => E.scene(s, id),
    () => true,
  );
  assert.ok(!s.agenda.some((id) => firstIds.includes(id)), '首幕办完后重新调度，也不能同月再加一位');
});
test('0.44.1 主动暂缓首幕后，当月不因再次调度而拉回；次月可接在年节后', () => {
  const s = E.newGame(442);
  settleLongAgenda(s);
  s.month = 2;
  E.startMonth(s);
  settleLongAgenda(s);
  s.month = 10;
  E.startMonth(s);
  settleUntil(s, 'XR09-01');
  assert.equal(s.agenda[0], 'XR09-01');
  E.deferScene(s, 'XR09-01');
  assert.equal(
    T.scheduleIntroduction(
      s,
      (id) => E.scene(s, id),
      () => true,
      'M06',
    ),
    null,
  );
  assert.ok(!s.agenda.includes('XR09-01'));
  s.month = 11;
  s.agenda = ['festival-fixture'];
  T.scheduleFlexible(
    s,
    (id) => E.scene(s, id),
    () => true,
  );
  assert.deepEqual(s.agenda, ['festival-fixture', 'XR09-01']);
  assert.equal(s.campaign.deferred['XR09-01'].count, 1);
});
function settleUntil(s, target) {
  for (let n = 0; s.agenda[0] !== target && s.agenda.length && n < 20; n++) {
    const id = s.agenda[0];
    E.choose(s, id, E.optionsFor(s, E.scene(s, id))[0].id);
  }
}

test('0.44.1 三组逐月路线中九人首幕均在二年五月前完成，人物两难集中且主线顺序保留',()=>{
 const relevant=T.FLEX_STORIES.filter(e=>firstIds.includes(e.id)||/^K/.test(e.id));
 for(const seed of [44000,44097,44194]){
  const dates={},seenPerMonth={};
  const {s}=runLongJourney(seed,{months:108,onMonth:s=>{
   for(const e of relevant)if(s.done[e.id]&&!dates[e.id]){
    dates[e.id]=T.at(s);if(e.dep)assert.ok(s.done[e.dep],`${e.id}须先完成${e.dep}`);
    if(firstIds.includes(e.id)){const k=E.monthKey(s);seenPerMonth[k]=(seenPerMonth[k]||0)+1;}
   }
  }});
  for(const id of firstIds)assert.ok(dates[id]<=17,`${seed} ${id} 应在二年五月前完成`);
  for(const e of relevant.filter(e=>/^K/.test(e.id)))assert.ok(dates[e.id]<=T.serial([8,12]),`${seed} ${e.id}`);
  assert.ok(Object.values(seenPerMonth).every(n=>n<=1));
  assert.ok(s.done.W11,'六年前三卷主线仍正常走完');
  assert.equal(new Set(s.campaign.skipped).size,s.campaign.skipped.length);
 }
});

test('0.44.1 第四第五幕提前开放，真实夜间入口仍检查前幕、两月间隔、情分与心结',()=>{
 const s=E.newGame(443);settleLongAgenda(s);s.year=2;s.month=1;s.agenda=[];
 Object.assign(s.people.C02,{second:true,third:true,thirdAt:'1-12',aff:90});
 assert.equal(E.storyOf(s,'C02'),null,'前幕过去一个月还需等待');
 s.month=2;assert.equal(E.storyOf(s,'C02'),'Y02');
 E.queueSpecial(s,'C02');E.choose(s,'Y02','stay');assert.equal(s.people.C02.fourthAt,'2-2');
 s.month=4;s.night=false;assert.equal(E.storyOf(s,'C02'),null,'第五幕最早第三年');
 s.year=3;s.month=1;s.people.C02.fourthAt='2-12';assert.equal(E.storyOf(s,'C02'),null);
 s.month=2;s.people.C02.aff=79;assert.equal(E.storyOf(s,'C02'),null);
 s.people.C02.aff=90;s.people.C02.knot={source:'fixture'};assert.equal(E.storyOf(s,'C02'),null);
 s.people.C02.knot=null;s.people.C02.fourth=false;assert.equal(E.fifthReady(s,'C02'),false);
 s.people.C02.fourth=true;assert.equal(E.storyOf(s,'C02'),'Z02');
 E.queueSpecial(s,'C02');E.choose(s,'Z02','stay');assert.equal(s.people.C02.fifth,true);
 assert.equal(E.storyOf(s,'C02'),null,'完成后不重播');
});

test('0.44.1 异地仍走书信，离场人物不触发前移后的后续',()=>{
 const s=E.newGame(444);settleLongAgenda(s);s.year=3;s.month=2;s.agenda=[];
 s.flags.away_C03=true;
 Object.assign(s.people.C03,{met:true,first:true,second:true,third:true,thirdAt:'2-11',aff:90});
 assert.equal(E.fourthReady(s,'C03'),false);assert.equal(E.fourthReady(s,'C03',true),true);
 s.flags.gone_C03=true;assert.equal(E.fourthReady(s,'C03',true),false);
 s.flags.gone_C03=false;s.people.C03.fourth=true;s.people.C03.fourthAt='2-12';
 assert.equal(E.fifthReady(s,'C03',true),true);s.flags.gone_C03=true;assert.equal(E.fifthReady(s,'C03',true),false);
});

test('0.44.1 旧档原选择、当前卡、人物与延期记录不变，无时间线旧档不因前移多跳过事件',() => {
  const s = E.newGame(445);
  settleLongAgenda(s);
  s.year = 5;
  s.month = 7;
  s.agenda = ['K10'];
  s.stats.treasury = 781.25;
  s.campaign.deferred.K10 = { count: 2, until: T.at(s) + 1 };
  s.campaign.skipped.push('K11');
  const original = JSON.stringify(s),
    loaded = E.load(storageOf(s));
  for (const field of ['done', 'people', 'stats', 'agenda', 'campaign', 'log', 'seed'])
    assert.deepEqual(loaded[field], s[field], field);
  assert.equal(JSON.stringify(s), original);
  E.choose(loaded, 'K10', E.optionsFor(loaded, E.scene(loaded, 'K10'))[0].id);
  assert.ok(loaded.done.K10, '旧档中已排入且过了新窗口的卡仍能办完');
  assert.ok(loaded.campaign.skipped.includes('K11'), '不补播曾跳过的卡');
  const legacy = structuredClone(s);
  delete legacy.campaign;
  legacy.year = 3;
  legacy.month = 4;
  legacy.agenda = [];
  const adopted = E.load(storageOf(legacy));
  assert.ok(!adopted.campaign.skipped.includes('K10'));
  assert.ok(
    T.candidates(
      adopted,
      (id) => E.scene(adopted, id),
      () => true,
    ).some((e) => e.id === 'K10'),
  );
  for (const field of ['done', 'people', 'stats', 'agenda', 'log', 'seed'])
    assert.deepEqual(adopted[field], legacy[field], field);
});
