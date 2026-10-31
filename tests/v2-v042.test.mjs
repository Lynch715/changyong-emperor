import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/v2/engine.js';
import {MAJOR_VARIANTS,MAJOR_BY_ID} from '../src/v2/major-event-data.js';

function prepared(seed=4200){const s=E.newGame(seed);s.agenda=[];s.majorEvent=null;s.majorEventSerial=0;s.majorEventUsed=[];s.majorEventReports=[];s.majorEventAt=0;s.stats.treasury=1000;E.bind(s);return s;}
function forceEvent(s,v,n=1,step=0){const type=MAJOR_BY_ID[v.type];s.majorEvent={n,variant:v.id,type:v.type,province:type.provinces[0],step,stages:v.stages,startedAt:(s.year-1)*12+s.month,nextAt:null,inspected:false,action:null,adjustment:null,delay:false,authorId:null,treasurySpent:0};s.majorEventSerial=n;s.agenda=[`ME${n}_${step}`];E.bind(s);}
function nextMonth(s){s.agenda=[];s.month++;if(s.month>12){s.month=1;s.year++;}E.startMonth(s);}
function chooseMajor(s,choice){const id=s.agenda[0],sc=E.scene(id);assert.ok(sc,`缺少场景 ${id}`);assert.equal(sc.kind,'majorEvent');return E.choose(s,id,choice);}

test('24种大型事件变体全部走完对应的4或5阶段，并各留下一条回奏',()=>{
 for(let i=0;i<MAJOR_VARIANTS.length;i++){
  const v=MAJOR_VARIANTS[i],s=prepared(4200+i);forceEvent(s,v,i+1);
  chooseMajor(s,'survey');nextMonth(s);
  const action=MAJOR_BY_ID[v.type].actions.find(a=>a[0]===v.focus);assert.ok(action,`${v.id} 的focus没有对应处置`);
  chooseMajor(s,action[0]);nextMonth(s);
  if(v.stages===5){chooseMajor(s,'correct');nextMonth(s);}
  chooseMajor(s,'verify');nextMonth(s);
  assert.equal(s.agenda[0],`ME${i+1}_${v.stages-1}`,`${v.id} 未进入最终回奏`);
  chooseMajor(s,'praise');
  assert.equal(s.majorEvent,null);assert.equal(s.majorEventReports.at(-1).variant,v.id);assert.equal(s.majorEventReports.at(-1).success,true);assert.ok(Number.isFinite(s.stats.treasury));
 }
});

test('进行中事件存档读回后保留进度，旧存档不会被补成半截事件',()=>{
 const s=prepared(),v=MAJOR_VARIANTS.find(x=>x.id==='dysentery-0');forceEvent(s,v);chooseMajor(s,'survey');
 const saved=JSON.stringify(s),loaded=E.load({getItem:()=>saved,setItem:()=>assert.fail('读取存档不能写回')});
 assert.ok(loaded);assert.equal(loaded.majorEvent.variant,v.id);assert.equal(loaded.majorEvent.step,0);assert.equal(loaded.majorEvent.nextAt,(loaded.year-1)*12+loaded.month+1);assert.equal(loaded.stats.treasury,s.stats.treasury);
 loaded.month++;E.startMonth(loaded);assert.equal(loaded.agenda[0],'ME1_1');assert.equal(E.scene(loaded.agenda[0]).kind,'majorEvent');
 const old=prepared(4201);for(const k of ['majorEvent','majorEventSerial','majorEventUsed','majorEventReports','majorEventAt'])delete old[k];const raw=JSON.stringify(old),legacy=E.load({getItem:()=>raw});assert.ok(legacy);assert.equal(legacy.majorEvent,null);assert.equal(legacy.majorEventSerial,0);assert.deepEqual(legacy.majorEventUsed,[]);assert.deepEqual(legacy.majorEventReports,[]);assert.equal(raw,JSON.stringify(old));
});

test('地方官空缺或已罢免时结算有限值，国库不足的结案操作不产生半次结算',()=>{
 const v=MAJOR_VARIANTS.find(x=>x.id==='flood-0'),s=prepared();forceEvent(s,v,1,v.stages-1);Object.assign(s.majorEvent,{inspected:true,action:v.focus,adjustment:'verify'});s.majorEvent.authorId=null;s.appointments={};
 chooseMajor(s,'praise');assert.ok(Object.values(s.stats).every(Number.isFinite));assert.ok(s.provinces[s.majorEventReports[0].province].livelihood>0);
 const t=prepared(4202);forceEvent(t,v,1,v.stages-1);Object.assign(t.majorEvent,{inspected:true,action:v.focus,adjustment:'verify'});t.stats.treasury=1;const before=JSON.stringify(t);assert.throws(()=>chooseMajor(t,'investigate'),/国库不足/);assert.equal(JSON.stringify(t),before);
});

test('大型事件不并发开启，事件阶段间隔由nextAt推进',()=>{
 const s=prepared(),first=MAJOR_VARIANTS[0];forceEvent(s,first);s.majorEvent.nextAt=(s.year-1)*12+s.month+2;
 const startSerial=s.majorEventSerial;assert.equal(E.pendingScene(s),'ME1_0');
 s.month++;E.startMonth(s);assert.equal(s.majorEventSerial,startSerial);assert.notEqual(s.agenda[0],'ME1_1');
 s.agenda=[];s.month++;E.startMonth(s);assert.equal(s.agenda[0],'ME1_1');assert.equal(s.majorEventSerial,startSerial);
});

test('雍正三、四年固定朝局损耗改为每季一点，非季度月份不扣',()=>{
 const s=prepared(4203);s.year=3;s.month=1;s.vol=2;s.stats.court=50;s.appointments={};for(const p of Object.values(s.provinces))p.integrity=50;
 for(let n=0;n<6;n++){
  const year=s.year,month=s.month,before=s.stats.court;s.agenda=[];s.memorials=[];s.followups=[];s.majorEvent=null;s.govNotes=[];
  E.endMonth(s);assert.equal(s.stats.court,before-(month%3===0?1:0),`${year}年${month}月`);
  s.agenda=[];s.memorials=[];s.followups=[];s.majorEvent=null;s.govNotes=[];
 }
 assert.equal(s.stats.court,48);
});
