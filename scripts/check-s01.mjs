import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {EVENTS,ALL_ROSTER,FIRST_ROSTER} from '../src/content.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'design/S01',name),'utf8'));
const baseline=read('执行基线.json'),registry=read('事件总表.json').events,cards=read('首版事件卡.json').cards,library=read('人物与活动库.json'),schedule=read('周排程.json');
const ord=d=>(d[0]-1)*360+(d[1]-1)*30+d[2];
const byId=new Map(cards.map(c=>[c.id,c]));
const unique=(items,key)=>assert.equal(new Set(items.map(x=>x[key])).size,items.length,`重复${key}`);
const results=[];
function check(name,fn){fn();results.push({name,result:'通过'});}
check('182个唯一ID，首版55，完整版181，F00只计首版',()=>{
 unique(registry,'id');assert.equal(registry.length,baseline.scope.uniqueRegistryIncludingF00);
 assert.equal(registry.filter(r=>r.first).length,baseline.scope.first);assert.equal(registry.filter(r=>r.full).length,baseline.scope.full);
 assert.equal(registry.find(r=>r.id==='F00').full,false);
 for(const id of Object.keys(EVENTS))assert.ok(registry.some(r=>r.id===id),`遗漏现有${id}`);
 for(const [prefix,n] of [['M',48],['G',24],['P',12],['D',24],['E',7]])for(let i=1;i<=n;i++)assert.ok(registry.some(r=>r.id===prefix+String(i).padStart(2,'0')));
 for(let cid=2;cid<=8;cid++)for(let i=1;i<=6;i++)assert.ok(registry.some(r=>r.id===`R${String(cid).padStart(2,'0')}-${String(i).padStart(2,'0')}`));
});
check('35人物不膨胀，七核心和扩展二线各自齐全',()=>{
 assert.equal(ALL_ROSTER.length,35);assert.equal(ALL_ROSTER.find(r=>r[0]==='C05')[1],'允礼');
 assert.deepEqual(library.profiles.filter(p=>p.scope==='核心').map(p=>p.id),['C02','C03','C04','C05','C06','C07','C08']);
 assert.deepEqual(library.profiles.filter(p=>p.scope==='扩展').map(p=>p.id),['C09','C10']);
 assert.equal(registry.filter(r=>r.kind==='relation').length,42);assert.equal(registry.filter(r=>r.kind==='extra-relation').length,12);
 assert.equal(registry.filter(r=>r.kind==='relation'&&r.first).length,14);assert.equal(registry.filter(r=>r.kind==='extra-relation'&&r.first).length,4);
 for(const c of cards)for(const id of [c.actor,...c.participants,...(c.remoteParticipants||[])])assert.ok(FIRST_ROSTER.includes(id),`${c.id}引入首版清单外的${id}`);
});
check('55张卡片具备前置、成本、结果、回响与异常处理',()=>{
 unique(cards,'id');assert.equal(cards.length,55);const ids=new Set(registry.map(r=>r.id));
 for(const c of cards){assert.ok(ids.has(c.id));assert.ok(c.outline.length>=100&&c.outline.length<=200,`${c.id}大纲字数${c.outline.length}`);
  for(const field of ['sceneId','costGroup','visibility','immediate','echo','nextExpectation','failure','replay','rewardKey','window','conflictPriority','reschedule','echoPlan','memorialSource'])assert.ok(c[field],`${c.id}缺${field}`);
  assert.equal(c.memorialSource.sourceEvent,c.id);assert.equal(c.echoPlan.sourceEvent,c.id);
  if(c.echoPlan.targetEvent)assert.ok(ids.has(c.echoPlan.targetEvent),`${c.id}回响目标缺失`);
  assert.ok(c.options.length>=2||c.id.startsWith('D')||['G03','G06'].includes(c.id));
  for(const id of c.requires)assert.ok(ids.has(id),`${c.id}前置不存在${id}`);
 }
});
function validateSchedule(rows,characterRules=schedule.characterRules){
 const seen=new Map(),daySlots=new Map(),weekSlots=new Map(),mainPackages=new Map(),decisions=new Map();
 const ordered=[...rows].sort((a,b)=>ord(a.date)-ord(b.date)||rows.indexOf(a)-rows.indexOf(b));
 for(const r of ordered){
  const c=byId.get(r.eventId);assert.ok(c,`未登记${r.eventId}`);assert.ok(!seen.has(c.id),`重复排程${c.id}`);
  assert.ok(r.date.length===3&&r.date.every(Number.isInteger)&&r.date[0]>=1&&r.date[1]>=1&&r.date[1]<=12&&r.date[2]>=1&&r.date[2]<=30,`${c.id}日期无效`);
  for(const dep of c.requires){assert.ok(seen.has(dep),`${c.id}早于${dep}`);assert.ok(ord(seen.get(dep).date)<=ord(r.date));}
  if(c.window.earliest)assert.ok(ord(r.date)>=ord(c.window.earliest),`${c.id}早于窗口`);
  if(c.window.latest)assert.ok(ord(r.date)<=ord(c.window.latest),`${c.id}晚于窗口`);
  if(c.minimumDaysAfterPrevious){const dep=c.requires[0];assert.ok(ord(r.date)-ord(seen.get(dep).date)>=c.minimumDaysAfterPrevious,`${c.id}没有相处间隔`);}
  if(c.window.sameDateAs)assert.deepEqual(r.date,seen.get(c.window.sameDateAs).date,`${c.id}并非同场日期`);
  if(r.weekId){const w=schedule.weeks.find(w=>w.id===r.weekId);assert.ok(w);assert.ok(ord(r.date)>=ord(w.start)&&ord(r.date)<=ord(w.end));
   const dk=r.date.join('-'),groups=daySlots.get(dk)||new Map();const prior=groups.get(c.costGroup)||0;groups.set(c.costGroup,Math.max(prior,r.cost));daySlots.set(dk,groups);
   if(r.cost>0){assert.ok(['day','evening'].includes(r.slot));for(const old of seen.values())if(old.cost>0&&old.weekId===r.weekId&&ord(old.date)===ord(r.date)&&old.slot===r.slot)assert.equal(byId.get(old.eventId).costGroup,c.costGroup,`${r.eventId}同一时段冲突`);}
   weekSlots.set(r.weekId,(weekSlots.get(r.weekId)||0)+Math.max(0,r.cost-prior));
   if(c.kind==='main'){const packs=mainPackages.get(r.weekId)||new Set();packs.add(c.sceneId);mainPackages.set(r.weekId,packs);}
   if(c.projectDecision)decisions.set(r.weekId,(decisions.get(r.weekId)||0)+1);
  }else{assert.equal(r.cost,0,'常规时段不得偷办有格活动');assert.notEqual(c.kind,'main','主线不得在未建立的可操作周中自动完成');}
  for(const actor of c.participants){const rules=characterRules[actor];if(rules?.unlock&&c.id!=='M06')assert.ok(ord(r.date)>=ord(rules.unlock),`${c.id}人物未出场`);
   if(actor==='C03'&&r.mode==='in-person')assert.ok(rules.inPersonWindows.some(([a,b])=>ord(r.date)>=ord(a)&&ord(r.date)<=ord(b)),`${c.id}将军瞬移`);
   if(actor==='C05'&&r.mode==='in-person')assert.ok(rules.authorizedVisits.some(d=>ord(d)===ord(r.date)),`${c.id}无入宫安排`);
  }
  seen.set(c.id,r);
 }
 for(const [d,slots] of daySlots)assert.ok([...slots.values()].reduce((a,b)=>a+b,0)<=2,`${d}超过两格`);
 for(const w of schedule.weeks){assert.ok((weekSlots.get(w.id)||0)<=6,`${w.id}超过六格`);assert.ok((mainPackages.get(w.id)?.size||0)<=2,`${w.id}超过两主线包`);assert.ok((decisions.get(w.id)||0)<=2,`${w.id}超过两项目决策`);}
 for(const pr of schedule.projects){assert.ok(ord(seen.get(pr.reportEvent).date)-ord(seen.get(pr.executionEvent).date)>=pr.minimumDays,`${pr.id}过早回访`);}
 const active=new Set();let peak=0;
 for(const r of ordered){for(const pr of schedule.projects){if(r.eventId===pr.startEvent)active.add(pr.id);if(r.eventId===pr.reportEvent)active.delete(pr.id);}peak=Math.max(peak,active.size);assert.ok(active.size<=2,'同时项目超两项');}
 return {slots:Object.fromEntries(weekSlots),mainPackages:Object.fromEntries([...mainPackages].map(([k,v])=>[k,v.size])),projectDecisions:Object.fromEntries(decisions),peakProjects:peak,coverage:seen.size};
}
let metrics;
check('47项全内容样例满足日期、前置、同场、六格与人物日程',()=>{metrics=validateSchedule(schedule.coverageSchedule);assert.equal(metrics.coverage,47);assert.equal(cards.filter(c=>!c.optionalTemplate).length,47);});
check('8个日常是可选库，4个项目实际工期与读回报日期正确',()=>{for(const id of schedule.optionalTemplates)assert.ok(byId.get(id).optionalTemplate);assert.deepEqual(schedule.projects.map(p=>p.minimumDays),[7,7,7,21]);});
check('生活优先、政务优先、全合作容量可容纳',()=>{
 for(const scenario of schedule.scenarios)for(const w of schedule.weeks){assert.ok((metrics.slots[w.id]||0)+scenario.extraPerWeek<=6);let decisionCount=metrics.projectDecisions[w.id]||0;if(scenario.projectDecisionExtra)decisionCount+=Math.min(1,2-decisionCount);assert.ok(decisionCount<=2);}
});
check('113活动变体、54基础相处、18主动、18伴侣和12礼物齐全',()=>{
 unique(library.activities,'id');unique(library.gifts,'id');assert.equal(library.activities.length,113);assert.equal(library.gifts.length,12);
 for(const pr of library.profiles){for(const code of ['T','W','G'])for(const n of [1,2])assert.ok(library.activities.some(a=>a.id===`AC-${pr.id}-${code}${n}`));for(const n of [1,2])for(const prefix of ['IN','CP'])assert.ok(library.activities.some(a=>a.id===`${prefix}-${pr.id}-${n}`));for(const gid of pr.giftPreferences)assert.ok(library.gifts.some(g=>g.id===gid));}
 for(const a of library.activities){for(const id of a.relatedTemplateIds)assert.ok(registry.some(r=>r.id===id&&r.kind==='daily'));assert.equal(a.logicalEventId,null);if(a.echoCondition)assert.ok(library.activities.some(b=>b.id===a.echoCondition.sourceId));if(a.type==='送礼'){assert.equal(a.costModes.samePaidMeeting.extraSlots,0);assert.equal(a.costModes.delivery.slots,0);}if(a.type==='伴侣独处')assert.ok(a.romanceGate.length&&a.friendshipFallback);}
});
check('军需押运条件费、扩展计量与F00日期没有隐性重复',()=>{
 const rules=byId.get('G05').costRules;assert.equal(rules.find(r=>r.choiceId==='escort'&&r.when?.['militaryRecord.escort']).moneyCost,0);
 for(const id of ['G04','G05','G06'])assert.ok(byId.get(id).visibilitySelector.private.includes('$militaryRecord.officer'));
 assert.equal(byId.get('G06').participantSelector.source,'militaryRecord.officer');assert.equal(byId.get('G06').participantSelector.requiresInPerson,false);
 assert.deepEqual(schedule.coverageSchedule.find(r=>r.eventId==='F00').date,[2,12,30]);assert.equal(baseline.scope.firstAssets,26);assert.equal(baseline.scope.fullAssets,44);
});
check('故意破坏工期、日期或时段时能够检出',()=>{
 const early=structuredClone(schedule.coverageSchedule);early.find(r=>r.eventId==='G06').date=[2,4,9];assert.throws(()=>validateSchedule(early));
 const badCalendar=structuredClone(schedule.characterRules);badCalendar.C03.inPersonWindows=[[[2,7,1],[2,7,9]]];assert.throws(()=>validateSchedule(schedule.coverageSchedule,badCalendar),/将军瞬移/);
 const collision=structuredClone(schedule.coverageSchedule);collision.find(r=>r.eventId==='R02-02').slot='day';assert.throws(()=>validateSchedule(collision));
});
const output={date:'2026-10-24',scope:'静态策划数据校验与容量证明；不是已实现周玩法验收',checks:results,metrics,freeSlots:48-Object.values(metrics.slots).reduce((a,b)=>a+b,0),monthlySettlementCountToF00:24,limits:['未执行周引擎','未证明数值平衡','未验证真实模型','未以全覆盖样例强制所有玩家']};
const at=process.argv.indexOf('--report');if(at!==-1)fs.writeFileSync(path.resolve(process.argv[at+1]),JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
