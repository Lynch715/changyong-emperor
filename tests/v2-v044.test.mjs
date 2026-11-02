import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/v2/engine.js';
import * as F from '../src/v2/family.js';
import * as M from '../src/v2/major-events.js';
import * as Fiscal from '../src/v2/fiscal.js';
import {FLEX_STORIES,CHECKPOINTS} from '../src/v2/timeline.js';
import {planAllowed} from '../src/v2/plans.js';
import {canBeTender} from '../src/v2/audience.js';
import {festivalOf,festId} from '../src/v2/festivals.js';
import {runLongJourney,settleLongAgenda,continueLongCampaign,longStoryList} from '../scripts/v044-balance.mjs';

const storageOf=s=>({getItem:()=>JSON.stringify(s),setItem:()=>assert.fail('读档不能写回')});
const serial=value=>Array.isArray(value)?(value[0]-1)*12+value[1]:F.serial(value);
const flexList=()=>Array.isArray(FLEX_STORIES)?FLEX_STORIES:Object.entries(FLEX_STORIES).map(([id,v])=>({id,...v}));
const ready=()=>{const s=E.newGame(440);settleLongAgenda(s);s.memorials=[];s.followups=[];return s;};
// 跨月案例照常批折，避免随机灾情积压把测试目标连续挤过整个窗口。
const reviewPending=s=>{E.archiveReports(s);if(!E.canAct(s)||!E.memorialCounts(s).pending)return;E.review(s);while(s.reviewSession.left){const m=s.memorials.find(m=>!m.result&&!m.inspectionPending&&!s.reviewSession.held.includes(m.uid));if(!m)break;E.judgeMemorial(s,m.uid,s.stats.treasury>=E.memorialCost(m,'approve')?'approve':'hold');}};

test('0.44 三十年分阶段回顾及四十八张后半程故事有明确排期、先后和有效分支',() => {
  assert.deepEqual(CHECKPOINTS, [2, 4, 6, 10, 15, 20, 25, 30]);
  const stories = longStoryList();
  assert.equal(stories.length, 48);
  assert.equal(new Set(stories.map((x) => x.id)).size, 48);
  const s = ready();
  for (const story of stories) {
    const sc = E.scene(s, story.id);
    assert.ok(sc, story.id);
    assert.ok(sc.title);
    assert.ok(sc.body);
    assert.ok(sc.options.length >= 2, story.id);
    assert.equal(new Set(sc.options.map((o) => o.id)).size, sc.options.length);
  }
  for (const story of flexList()) {
    assert.ok(serial(story.earliest) <= serial(story.latest), story.id);
    assert.ok(E.scene(s, story.id), story.id);
  }
  assert.equal(E.canContinueCampaign(s), false);
});

test('0.44 旧六年结局与已在七年以后的档案惰性接入，钱、人物、选择和当月要事保留',()=>{
 for(const year of [6,12,35]){
  const s=ready();s.year=year;s.month=year===6?12:7;s.vol=3;s.ended=year===6;s.stats.treasury=786.62;s.done.K10='keep';s.agenda=['Y10'];s.familyContinuation=year>6;delete s.campaign;
  const before=structuredClone(s),l=E.load(storageOf(s));assert.ok(l);assert.equal(l.stats.treasury,786.62);for(const field of ['people','done','agenda','memorials','followups','children','pregnancy'])assert.deepEqual(l[field],before[field],field);assert.equal(l.year,year);assert.equal(l.month,before.month);
  assert.ok(E.campaignInfo(l).title);if(year===6){assert.ok(E.canContinueCampaign(l));l.agenda=[];E.continueFamily(l);assert.equal(l.year,7);assert.equal(l.month,1);assert.equal(l.vol,3);}else assert.equal(l.ended,false);
  if(year===12){assert.equal(l.done.H1201,undefined,'不得虚构已经经历前半段');assert.ok(l.campaign.skipped.includes('H1201'));assert.ok(l.campaign.skipped.includes('H1202'),'未来后半段随错过的前半段一起退出');assert.ok(!E.upcomingStories(l).some(x=>x.id==='H1202'),'待办不能永远显示等待已经错过的前事');}
  if(year===35){assert.ok(l.campaign.skipped.includes('O35A'));assert.ok(l.campaign.skipped.includes('O35B'));assert.ok(!E.upcomingStories(l).some(x=>x.id==='O35B'));}
  const original=JSON.stringify(l);E.initCampaign(l);assert.equal(JSON.stringify(l),original,'重复初始化不重排或补发');
 }
});

test('0.44 旧档不会补播已过期的未发生普通事件，已经排到本月的原卡仍可处理',() => {
  const s = ready();
  s.year = 20;
  s.month = 3;
  s.vol = 3;
  s.agenda = ['K10'];
  delete s.campaign;
  delete s.done.K10;
  const l = E.load(storageOf(s));
  assert.deepEqual(l.agenda, ['K10']);
  assert.ok(E.scene(l, 'K10'));
  const oldIds = flexList()
    .filter((x) => serial(x.latest) < F.now(l))
    .map((x) => x.id);
  settleLongAgenda(l);
  E.startMonth(l);
  for (const id of oldIds) assert.ok(!l.agenda.includes(id), '不补播：' + id);
});

test('0.44 柔性事件暂缓后重排，最多三次；固定年节和急灾不可延期',() => {
  const { s } = runLongJourney(44000, { months: 26 });
  s.agenda = ['K10'];
  const id = 'K10';
  for (let count = 0; count < 3; count++) {
    assert.ok(E.canDeferScene(s, id));
    const beforeCash = s.stats.treasury,
      ap = s.ap;
    E.deferScene(s, id);
    assert.equal(s.stats.treasury, beforeCash);
    assert.equal(s.ap, ap);
    assert.ok(!s.agenda.includes(id));
    assert.ok(E.upcomingStories(s).some((x) => x.id === id));
    let waited = 0;
    do {
      settleLongAgenda(s);
      reviewPending(s);
      E.spendNight(s, null);
      E.endMonth(s);
      continueLongCampaign(s);
      waited++;
    } while (!s.agenda.includes(id) && waited < 24);
    assert.ok(s.agenda.includes(id), '暂缓的原卡会在后续可用月份重到');
    assert.ok(waited >= 1);
  }
  assert.equal(E.canDeferScene(s, id), false);
  assert.throws(() => E.deferScene(s, id));
  const due = ready();
  due.year = 4;
  due.month = 6;
  due.agenda = ['K10'];
  assert.equal(E.canDeferScene(due, 'K10'), false, '最迟安排时间已到，不能再次主动暂缓');
  const fixed = festId(20, festivalOf(20, 1));
  assert.ok(E.scene(due, fixed));
  s.dyn ??= {};
  s.dyn['urgent-fixture'] = {
    id: 'urgent-fixture',
    kind: 'majorEvent',
    disaster: '河南',
    title: '急灾',
    options: [],
  };
  s.agenda = [fixed, 'urgent-fixture'];
  for (const id of s.agenda) {
    assert.equal(E.canDeferScene(s, id), false);
    assert.throws(() => E.deferScene(s, id));
  }
});

test('0.44 到期孕期和孩子十岁换图不会为普通故事让位，三十岁皇嗣仍永久保护',() => {
  const s = ready();
  s.pregnancy.C09 = {
    start: '1-1',
    due: '1-11',
    care: 0,
    risk: 0,
    known: true,
    fake: false,
    threats: [],
    handled: [],
  };
  s.year = 1;
  s.month = 11;
  E.startMonth(s);
  const birth = s.agenda.find((id) => E.scene(s, id)?.familyType === 'birth');
  assert.ok(birth);
  assert.equal(E.canDeferScene(s, birth), false);
  settleLongAgenda(s);
  assert.equal(s.children.length, 1);
  const child = s.children[0];
  assert.equal(child.born, '1-11');
  s.year = 11;
  s.month = 11;
  s.vol = 3;
  s.agenda = [];
  E.startMonth(s);
  const youth = s.agenda.find((id) => E.scene(s, id)?.familyType === 'youth');
  assert.ok(youth);
  assert.equal(E.canDeferScene(s, youth), false);
  settleLongAgenda(s);
  assert.equal(child.youthChosen, true);
  s.year = 31;
  assert.equal(F.childAge(s, child), 30);
  assert.match(F.childrenContext(s), /30岁，未成年/);
  assert.equal(canBeTender(s, child.id), false);
  for (const word of ['恋爱', '亲吻', '婚配', '侍寝']) assert.equal(planAllowed(word, child.id, s), false);
  assert.equal(planAllowed('一起读书', child.id, s), true);
});

test('0.44 历史回报满一百二十条后大型政务仍可发生且报告继续滚动',()=>{
 const s=ready();s.majorEvent=null;s.majorEventAt=null;s.majorEventReports=Array.from({length:120},(_,i)=>({at:i}));let id=M.scheduleMajorEvent(s,()=>0,1);assert.ok(id);assert.ok(M.majorScene(s,id));
 for(let step=0;step<6;step++){const sc=M.majorScene(s,id);s.agenda=[id];E.choose(s,id,sc.options[0].id);if(!s.majorEvent)break;const at=s.majorEvent.nextAt;s.year=Math.floor((at-1)/12)+1;s.month=(at-1)%12+1;id=M.scheduleMajorEvent(s,()=>0,1);assert.ok(id);}
 assert.equal(s.majorEvent,null);assert.equal(s.majorEventReports.length,120);assert.ok(s.majorEventReports.at(-1).variant);
});

test('0.44 七年后地方修缮自愿支付六十万和一时辰，三个月限额及失败原子性',()=>{
 const early=ready(),beforeEarly=JSON.stringify(early);assert.throws(()=>E.publicWorks(early,'河南'));assert.equal(JSON.stringify(early),beforeEarly);
 const s=ready();s.year=7;s.month=2;s.vol=3;const cash=s.stats.treasury,ap=s.ap,province={...s.provinces.河南};E.publicWorks(s,'河南');assert.equal(s.stats.treasury,cash-60);assert.equal(s.ap,ap-1);assert.equal(s.provinces.河南.livelihood,province.livelihood+4);assert.equal(s.provinces.河南.integrity,province.integrity+2);
 const before=JSON.stringify(s);assert.throws(()=>E.publicWorks(s,'山东'));assert.equal(JSON.stringify(s),before);s.month+=3;assert.equal(Fiscal.publicWorksInfo(s).reason,'');
 s.stats.treasury=59;const insufficient=JSON.stringify(s);assert.throws(()=>E.publicWorks(s,'河南'));assert.equal(JSON.stringify(s),insufficient);
});

test('0.44 元年到三十年逐月完整走通，多种子剧情无重复、资金守恒，之后仍能继续',()=>{
 for(const seed of [44000,44097,44194]){
  const {s,metrics:m}=runLongJourney(seed);assert.equal(m.months,360);assert.equal(s.year,30);assert.equal(s.month,12);assert.equal(s.ended,true);assert.ok(E.canContinueCampaign(s));assert.equal(m.accountingError,0);assert.equal(m.arrearsMonths,0);assert.ok(m.minimum>0);assert.ok(m.works>0);assert.ok(m.minHealth>0);assert.ok(m.minPalace>0,'真实长程路线不会被持续的后宫底损耗尽');assert.equal(Object.keys(m.stories).length,48,JSON.stringify(m.stories));for(const n of Object.values(m.stories))assert.equal(n,1);assert.deepEqual(m.checkpoints.map(x=>x.year),CHECKPOINTS);
  E.continueFamily(s);assert.equal(s.year,31);assert.equal(s.month,1);assert.equal(s.vol,3);assert.equal(s.ended,false);assert.equal(E.campaignInfo(s).continuing,true);assert.ok(Fiscal.forecast(s).base>0);
 }
});

test('0.44 相同种子三十年可复现；跨年未完事项保留，三十一、三十二、四十年继续正常月结',() => {
  const a = runLongJourney(44291),
    b = runLongJourney(44291);
  assert.deepEqual(a.metrics, b.metrics);
  assert.deepEqual(a.s.stats, b.s.stats);
  const { s, metrics: m } = runLongJourney(44388, { months: 480 });
  assert.equal(m.months, 480);
  assert.equal(s.year, 41);
  assert.equal(s.month, 1);
  assert.equal(s.ended, false);
  assert.equal(m.accountingError, 0);
  assert.equal(m.arrearsMonths, 0);
  assert.ok(m.minPalace > 0, '批折、经营和休养的四十年真实路线后宫仍有余地');
  for (const year of [31, 32, 40])
    assert.ok(m.yearly.some((x) => x.year === year && Number.isFinite(x.treasury)));
  assert.ok(s.majorEvent || s.majorEventReports.length);
  assert.equal(E.campaignInfo(s).continuing, true);
  // 把三十一年后半段暂缓到跨年：经过真正的月末、年节和存读档，不能因切年丢掉原卡。
  let pending = a.s;
  E.continueFamily(pending);
  let sawOldReport = false,
    reloaded = false,
    deferred = 0;
  for (let n = 0; n < 20; n++) {
    E.bind(pending);
    if (pending.agenda[0] === 'O31B') {
      if (pending.year === 31) {
        assert.ok(E.canDeferScene(pending, 'O31B'));
        E.deferScene(pending, 'O31B');
        deferred++;
      } else {
        assert.ok(pending.year >= 32);
        assert.equal(pending.done.O31B, undefined);
        assert.ok(pending.done.O31A);
        assert.ok(E.scene(pending, 'O31B'));
        assert.match(E.scene(pending, 'O31B').body, /前次|回报|凭据/);
        sawOldReport = true;
        E.choose(pending, 'O31B', E.optionsFor(pending, E.scene(pending, 'O31B'))[0].id);
        break;
      }
    }
    settleLongAgenda(pending);
    reviewPending(pending);
    E.spendNight(pending, null);
    E.endMonth(pending);
    if (pending.year === 32 && !reloaded) {
      pending = E.load(storageOf(pending));
      assert.ok(pending.campaign.openYears.includes(31));
      assert.equal(pending.done.O31B, undefined);
      reloaded = true;
    }
  }
  assert.ok(deferred > 0);
  assert.ok(reloaded);
  assert.ok(sawOldReport, '三十二年仍呈上未办结的O31B');
  assert.ok(pending.done.O31B);
});
