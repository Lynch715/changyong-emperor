import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as E from '../src/engine.js';import{parseImport,exportSave}from'../src/storage.js';import{weekNodeStatus,weekResumptions,weekLastDay,usedSlots,heldSlots}from'../src/week.js';import{buildAIContext}from'../src/input.js';import{renderWeekContinuations}from'../src/week-continuation-ui.js';import{ordinal,addDays}from'../src/calendar.js';
import{before,dir,act,choose,reach,settle,runEightWeeks}from'../scripts/check-s08-06.mjs';
const __evidence=f=>{try{return f()}catch(e){if(e&&e.code==='ENOENT')return null;throw e}};

const saved=n=>__evidence(()=>parseImport(fs.readFileSync(dir+n+'.json','utf8')));
const runs=[runEightWeeks(),runEightWeeks({tone:'distance',life:'banquet'})];
for(let i=0;i<8;i++)test(`W0${i+1}实际主线包、关系节点与两格个人生活均能容纳`,()=>{
 for(const r of runs){const w=r.rows[i];assert.ok(w.mainPackages.length>=1&&w.mainPackages.length<=2);assert.ok(w.coreSlots<=2);assert.ok(w.freeBeforePersonal>=4);assert.equal(w.personalSlots,2);assert.equal(w.held,0);assert.equal(w.used,w.coreSlots+2);assert.ok(w.freeAfterPersonal>=2);assert.ok(w.review.length>0);}
});
test('两套八周连续路径保留12主线、14关系、四类项目和24月账，保持原七线承载，扩展节点另行实走',()=>{
 for(const r of runs){assert.equal(r.s.sealed,true);assert.deepEqual(r.s.ending.counts,{main:12,relation:14,government:12,side:4,extension:0});assert.equal(r.s.weekly.monthly.length,24);assert.equal(r.rows.reduce((n,w)=>n+w.coreSlots,0),15);assert.equal(r.rows.reduce((n,w)=>n+w.freeBeforePersonal,0),33);assert.equal(r.s.weekly.weeks.length,8);assert.deepEqual(new Set(r.notImplemented),new Set([]));assert.ok(Object.values(r.s.relations).every(x=>!['倾心','共担','相守'].includes(x.stage)));assert.equal(Object.keys(r.s.relations).length,7);assert.deepEqual(parseImport(exportSave(r.s)),r.s);}
});
test('四类回访在常规时段完成，保持7／7／7／21日，不挤占下一周也不提前领奖',()=>{
 for(const r of runs)for(const [execute,report,days]of [['WG-C02','WG-C03',7],['G02','G03',7],['WG-P02','WG-P03',7],['G05','G06',21]]){const a=r.s.events[execute],b=r.s.events[report];assert.equal(ordinal(b.date)-ordinal(a.date),days);assert.equal(r.s.transactions.find(t=>t.id===b.transactionId).results[0].actionCost,0);assert.ok(!r.rows.some(w=>w.workAndSide.includes(report)));}
});

test('七条内嵌首谈延期均免费、无奖励或意愿变化，不能跳过首谈直接做次幕',()=>{
 for(const [m,id]of [['M02','R02-01'],['M03','R07-01'],['M05','R06-01'],['M07','R08-01'],['M08','R04-01'],['M09','R05-01'],['M10','R03-01']]){const s=choose(before.weekly.checkpoints[m],m),n=act(s,{type:'defer',eventId:id});assert.deepEqual(n.relations,s.relations);assert.deepEqual(n.stats,s.stats);assert.deepEqual(n.transcripts,s.transcripts);assert.equal(n.remaining,s.remaining);assert.equal(n.transactions.at(-1).results[0].actionCost,0);assert.ok(n.transactions.at(-1).results[0].dialogue);assert.throws(()=>act(n,{type:'defer',eventId:id}));assert.throws(()=>choose(n,id.replace(/01$/,'02')));}
});
test('允礼错过自然入宫日须另约，不常驻御园；未来原约能实际核销且不重复占格',()=>{
 let s=choose(before.weekly.checkpoints.M09,'M09');s=act(s,{type:'defer',eventId:'R05-01'});s=reach(s,{year:2,month:4,day:5});const x=weekNodeStatus(s,E.getEvent(s,'R05-01'));assert.equal(x.ready,false);assert.equal(x.next.appointment,true);assert.deepEqual(x.next.date,{year:2,month:4,day:6});assert.throws(()=>choose(s,'R05-01'),/入宫|到场/);s=act(s,{type:'week-plan',kind:'scene',actor:'C05',eventId:'R05-01',date:x.next.date,period:x.next.period});const old=s.remaining;s=choose(s,'R05-01');assert.equal(s.remaining,old);assert.equal(s.weekly.plans.at(-1).status,'completed');assert.match(s.transcripts['R05-01'].body,/回府时辰/);assert.equal(s.transactions.at(-1).results[0].actionCost,1);assert.throws(()=>choose(s,'R05-01'));
});
test('已接受的相谈不能用延期旁路解除预占；原约改期按新日期演出',()=>{
 let s=choose(before.weekly.checkpoints.M09,'M09');s=act(s,{type:'defer',eventId:'R05-01'});s=act(s,{type:'week-plan',kind:'scene',actor:'C05',eventId:'R05-01',date:{year:2,month:4,day:4}});const p=s.weekly.plans.at(-1),h=E.hash(s);assert.throws(()=>act(s,{type:'defer',eventId:'R05-01'}));assert.equal(E.hash(s),h);s=act(s,{type:'week-edit',planId:p.id,date:{year:2,month:4,day:5}});assert.deepEqual(E.eventDate(s,E.getEvent(s,'R05-01')),{year:2,month:4,day:5});s=choose(s,'R05-01');assert.equal(s.events['R05-01'].date.day,5);assert.equal(s.weekly.plans[0].status,'rescheduled');assert.equal(s.weekly.plans[1].status,'completed');
});
test('排满的一周不自动补节点；建议下一窗口不创建延展周或预约',()=>{
 let s=choose(before.weekly.checkpoints.M09,'M09');s=act(s,{type:'defer',eventId:'R05-01'});for(const day of [2,3,4])for(const period of ['day','evening'])s=act(s,{type:'week-plan',kind:'study',actor:'C01',date:{year:2,month:4,day},period});assert.equal(s.remaining,0);const h=E.hash(s),x=weekNodeStatus(s,E.getEvent(s,'R05-01'));assert.equal(x.ready,false);assert.deepEqual(x.next.extensionStart,{year:2,month:4,day:9});renderWeekContinuations(s);weekResumptions(s);assert.equal(E.hash(s),h);assert.equal(s.weekly.weeks.length,8);assert.equal(s.weekly.plans.length,6);assert.ok(!s.events['R05-01']);assert.equal(heldSlots(s,'W06'),6);
});
test('唯一延展周用完后建议下一重点周，不能再补出第二个延展周',()=>{
 let s=choose(before.weekly.checkpoints.M09,'M09');s=act(s,{type:'defer',eventId:'R05-01'});s=act(s,{type:'week-extend',date:{year:2,month:4,day:9}});s=reach(s,{year:2,month:4,day:16});s=settle(s);const x=weekNodeStatus(s,E.getEvent(s,'R05-01'));assert.equal(x.next.weekId,'W07');assert.equal(x.next.extensionStart,null);assert.throws(()=>act(s,{type:'week-extend'}),/唯一/);
});

test('跨季县库和群像材料仍有入口，首办正文记今日，不重发旧奖励',()=>{
 let s=settle(before.weekly.checkpoints.M07);for(const id of ['G02','P01','P09']){if(id==='P09')s=reach(s,{year:2,month:1,day:3});assert.ok(E.availableEvents(s).some(e=>e.id===id),id);s=choose(s,id);assert.match(s.transcripts[id].body,/经手人将新取的凭单附在后面/);assert.equal(s.events[id].date.year,2);assert.throws(()=>choose(s,id));}
});
test('延期收周有真实事务来源，之后补谈不回写旧回顾；伪造来源被拒绝',()=>{
 let s=choose(before.weekly.checkpoints.M09,'M09');s=act(s,{type:'defer',eventId:'R05-01'});s=reach(s,{year:2,month:4,day:9});const r=s.weekly.reports.find(r=>r.weekId==='W06');assert.ok(r.review.sources.some(x=>x.kind==='defer'&&x.eventId==='R05-01'));const original=structuredClone(r);s=act(s,{type:'week-extend',date:s.date});s=act(s,{type:'week-plan',kind:'scene',actor:'C05',eventId:'R05-01',date:addDays(s.date,1)});s=choose(s,'R05-01');assert.deepEqual(s.weekly.reports.find(r=>r.weekId==='W06'),original);const bad=structuredClone(s);bad.weekly.reports.find(r=>r.weekId==='W06').review.sources.find(x=>x.kind==='defer').id='fake';assert.throws(()=>E.validateSave(bad));
});

test('旧季度的延期与既定分支费用保持，周制延期拒绝注入奖励和听者',()=>{
 const old=before.quarter.checkpoints.M09,s=choose(old,'M09'),n=act(s,{type:'defer',eventId:'R05-01'});assert.equal(n.remaining,s.remaining);assert.deepEqual(n.relations,s.relations);assert.equal(n.transactions.at(-1).results[0].dialogue,undefined);const w=choose(before.weekly.checkpoints.M09,'M09'),h=E.hash(w);assert.throws(()=>act(w,{type:'defer',eventId:'R05-01',reward:80,actor:'C06'}));assert.equal(E.hash(w),h);
});
