import fs from 'node:fs';import assert from 'node:assert/strict';import{fileURLToPath}from'node:url';
import * as E from '../src/engine.js';import{combinedJobs,requiredIds}from'./s13-01-scenarios.mjs';
import{ordinal,stamp}from'../src/calendar.js';import{reservedMoney,spendableMoney}from'../src/week.js';
import{activityInbox}from'../src/activities.js';import{exportSave,parseImport}from'../src/storage.js';import{reconcile}from'./s13-03-accounting.mjs';
const d=(year,month,day)=>({year,month,day});
export function runAccountingRoute(mode='regular'){
 assert.ok(['regular','low'].includes(mode));let s=E.createWeeklyGame();const journal=[],checks=[],snapshots={},frozen={};let replayChecks=0,minSpendable=60;
 const act=a=>{
  const before=s,raw=JSON.stringify(s),p=E.preview(s,[a]);assert.equal(JSON.stringify(s),raw);
  s=E.validateSave(E.commit(s,p).state);reconcile(s);
  for(const[id,t]of Object.entries(frozen))assert.equal(JSON.stringify(s.transcripts[id]),t,`historical prose changed ${id}`);for(const[id,t]of Object.entries(s.transcripts))frozen[id]??=JSON.stringify(t);
  for(const key of ['ledger','transactions'])assert.deepEqual(s[key].slice(0,before[key].length),before[key]);
  const restored=parseImport(exportSave(s));assert.deepEqual(restored,s);const dup=E.commit(restored,p);assert.equal(dup.duplicate,true);assert.deepEqual(dup.state,s);replayChecks++;
  assert.ok(s.weekly.clock>=before.weekly.clock);minSpendable=Math.min(minSpendable,spendableMoney(s));
  journal.push({transactionId:p.id,date:s.date,action:a,treasuryBefore:before.stats.treasury,treasuryAfter:s.stats.treasury,heldBefore:reservedMoney(before),heldAfter:reservedMoney(s),spendable:spendableMoney(s),ledgerAdded:s.ledger.slice(before.ledger.length),actionCost:p.actionCost,remaining:s.remaining});return s;
 };
 const reject=(a,label)=>{const raw=JSON.stringify(s);assert.throws(()=>E.preview(s,[a]));assert.equal(JSON.stringify(s),raw);checks.push({label,action:a,date:s.date,treasury:s.stats.treasury,reserved:reservedMoney(s)});};
 const choose=id=>{const e=E.getEvent(s,id);act({type:'event',eventId:id,choiceId:id==='M06'?'fair':id==='M11'?'clear':id==='G04'?'custom':id==='G05'?'escort':id==='WG-P02'?(mode==='regular'?'plan-2':'plan-3'):e.kind==='relation'?'work':e.kind==='extension'?'cooperate':e.options[0].id,...(id==='G04'?{params:{amount:6,officer:'C26',visibility:'private',escort:true}}:id==='M06'?{params:{attitudes:{C09:'none',C10:'none'}}}:{})});};
 const settle=except=>{for(let g=0;g<100;g++){
  const n=s.weekly.notices.find(n=>n.status==='pending'&&!n.suspended&&ordinal(n.date)<=ordinal(s.date));if(n){act({type:'week-resolve',noticeId:n.id,...(n.choices?{choice:n.choices[0]}:{})});continue;}
  const sh=activityInbox(s)[0];if(sh){act({type:'activity-receive',shipmentId:sh.id});continue;}
  const q=s.weekly.relationships.requests.find(q=>q.status==='pending'&&!q.awaitDelivery&&ordinal(q.dueDate)<=ordinal(s.date));if(q){act({type:'relationship-answer',actor:q.actor,requestId:q.id});continue;}
  const e=E.requiredEvents(s)[0];if(!e||e.id===except)return;choose(e.id);
 }throw Error('settle limit');};
 const reach=(date,period='day')=>{for(let g=0;g<600;g++){if(s.weekly.clock>=stamp(date,period))return;settle();act({type:'week-advance',date,period});}throw Error('reach limit');};
 const buy=giftId=>{act({type:'activity-buy',giftId});return s.weekly.activities.inventory.at(-1).id;};
 const perform=(kind,actor='C01',extra={})=>{act({type:'week-plan',kind,actor,date:s.date,period:s.weekly.clock%2?'evening':'day',...extra});const id=s.weekly.plans.at(-1).id;act({type:'week-fulfill',planId:id});return id;};
 const jobs=combinedJobs.filter(j=>!j.activity).map(j=>structuredClone(j));const add=(y,m,day,period,label,run)=>jobs.push({date:d(y,m,day),period,label,run});let banquetId,giftId;
 if(mode==='regular'){
  add(1,1,4,'day','同场收拒与重复礼',()=>{const good=buy('GF01'),wrong=buy('GF03'),planId=perform('chat','C02');for(const itemId of [good,wrong,buy('GF01')])act({type:'activity-gift-same',actor:'C02',planId,itemId});act({type:'activity-followup',actor:'C02',planId});reject({type:'activity-followup',actor:'C02',planId},'同场追问不重复领取');});
  add(1,1,4,'evening','宴约预留改期取消',()=>{
   act({type:'week-plan',kind:'banquet',actor:'C01',guests:['C02','C06'],theme:'season',date:d(1,1,5),period:'day'});snapshots.宴约预留=structuredClone(s);
   act({type:'week-edit',planId:s.weekly.plans.at(-1).id,date:d(1,1,6),period:'day'});act({type:'week-cancel',planId:s.weekly.plans.at(-1).id});
   act({type:'week-plan',kind:'banquet',actor:'C01',guests:['C02','C06'],theme:'music',date:d(1,1,6),period:'day'});banquetId=s.weekly.plans.at(-1).id;snapshots.小宴开始前=structuredClone(s);
  });
  add(1,1,6,'day','小宴分段结算',()=>{act({type:'week-start',planId:banquetId});snapshots.小宴已付款=structuredClone(s);act({type:'week-complete',planId:banquetId});reject({type:'week-complete',planId:banquetId},'小宴完成不能再次扣费');});
  add(1,1,9,'day','登门礼物预约',()=>{act({type:'week-extend',date:s.date});giftId=buy('GF02');act({type:'week-plan',kind:'gift',actor:'C02',itemId:giftId,date:d(1,1,10),period:'evening'});reject({type:'activity-gift-send',actor:'C02',itemId:giftId},'已留给约定的实物不能另寄');});
  add(1,1,10,'evening','登门递礼',()=>{act({type:'week-fulfill',planId:s.weekly.plans.at(-1).id});reject({type:'activity-gift-send',actor:'C02',itemId:giftId},'已送实物不能再寄');});
  add(1,1,11,'evening','备制与代送',()=>{perform('craft','C01',{giftId:'GF09'});const itemId=s.weekly.activities.inventory.at(-1).id;act({type:'activity-gift-send',actor:'C06',itemId});const sh=s.weekly.activities.shipments.at(-1);reject({type:'activity-receive',shipmentId:sh.id},'礼物尚在递送不能提前收执');});
  add(1,1,12,'evening','真实失约',()=>{act({type:'week-plan',kind:'meet',actor:'C02',date:s.date,period:'evening'});act({type:'week-breach',planId:s.weekly.plans.at(-1).id});});
  add(1,1,13,'evening','原约补谈',()=>{act({type:'relationship-repair',actor:'C02',issueId:s.weekly.relationships.issues.find(i=>i.status==='open').id});});
  for(const w of s.weekly.weeks.filter(w=>w.id!=='W01'&&w.id!=='W04'))add(w.start.year,w.start.month,w.id==='W07'?7:6,'day','全年小宴',()=>perform('banquet','C01',{guests:['C02','C06'],theme:w.id==='W03'?'season':'tea'}));
  add(1,10,7,'evening','扩展同场礼',()=>{const itemId=buy('GF10'),planId=perform('chat','C09');act({type:'activity-gift-same',actor:'C09',planId,itemId});});
  add(1,10,9,'day','第四季延展',()=>act({type:'week-extend',date:s.date}));
  add(1,10,12,'day','第四季小宴',()=>perform('banquet','C01',{guests:['C02','C06'],theme:'tea'}));
  add(2,4,8,'evening','边关代送',()=>{const itemId=s.weekly.activities.inventory.find(i=>i.giftId==='GF03'&&i.status==='held').id;act({type:'activity-gift-send',actor:'C03',itemId});});
 }else{
  add(1,1,3,'evening','预留预算至可用零',()=>{
   act({type:'week-plan',kind:'banquet',actor:'C01',guests:['C02','C06'],theme:'season',date:d(1,1,5),period:'day'});while(spendableMoney(s)>=2)buy('GF03');assert.equal(spendableMoney(s),0);snapshots.低资源预留=structuredClone(s);
   reject({type:'activity-buy',giftId:'GF01'},'预留后的余额不足不能采买');reject({type:'activity-gift-send',actor:'C02',itemId:s.weekly.activities.inventory[0].id},'预留后的余额不足不能代送');
  });
  add(1,1,4,'day','取消释放与基本活动',()=>{act({type:'week-cancel',planId:s.weekly.plans.at(-1).id});const itemId=buy('GF01');perform('gift','C02',{itemId});});
  add(1,2,1,'day','月结后恢复生活',()=>{act({type:'week-extend',date:s.date});perform('banquet','C01',{guests:['C02','C06'],theme:'tea'});});
  add(1,10,9,'day','低资源后期留周',()=>act({type:'week-extend',date:s.date}));
  add(2,4,8,'evening','低资源边关代送',()=>act({type:'activity-gift-send',actor:'C03',itemId:s.weekly.activities.inventory.find(i=>i.status==='held').id}));
 }
 // Both choices retain their original incomplete report before actual paid repair.
 add(1,10,11,'day','民生另款补工',()=>{snapshots.项目补工前=structuredClone(s);if(mode==='low'){while(spendableMoney(s)>=2)buy('GF03');snapshots.低资源补工受阻=structuredClone(s);reject({type:'project-repair',projectId:'PR-WATER'},'补工余款不足时整笔不提交');}else{act({type:'project-repair',projectId:'PR-WATER'});reject({type:'project-repair',projectId:'PR-WATER'},'补工不能重复拨款');}});
 if(mode==='low')add(2,1,2,'evening','月账后另留格补工',()=>{snapshots.低资源恢复补工前=structuredClone(s);act({type:'project-repair',projectId:'PR-WATER'});reject({type:'project-repair',projectId:'PR-WATER'},'补工不能重复拨款');});
 jobs.sort((a,b)=>stamp(a.date,a.period)-stamp(b.date,b.period));
 for(const j of jobs){if(j.eventId&&E.eventDone(s,j.eventId))continue;try{reach(j.date,j.period);assert.equal(s.weekly.clock,stamp(j.date,j.period));settle(j.eventId);if(j.run)j.run();else choose(j.eventId);}catch(e){throw new Error(`${mode} ${j.label||j.eventId} ${JSON.stringify(j.date)} ${j.period}: ${e.message}`,{cause:e});}}
 reach(d(2,12,30),'evening');settle();snapshots.封卷前=structuredClone(s);act({type:'seal'});for(const id of requiredIds.filter(id=>id!=='F00'))assert.ok(Object.values(s.events).some(e=>e.id===id&&e.completed),id);assert.equal(s.weekly.monthly.length,24);
 return {s,journal,checks,snapshots,summary:{mode,...reconcile(s),minSpendable,replayChecks,checks:checks.length}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const dir=new URL('../docs/施工/证据/2026-10-27-S13-03/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
 for(const mode of (process.argv.slice(2).length?process.argv.slice(2):['regular','low'])){const r=runAccountingRoute(mode);fs.writeFileSync(new URL(mode+'-封卷.json',dir),exportSave(r.s));fs.writeFileSync(new URL(mode+'-逐笔核账.json',dir),JSON.stringify({summary:r.summary,journal:r.journal,checks:r.checks},null,2));for(const[name,s]of Object.entries(r.snapshots))fs.writeFileSync(new URL(mode+'-'+name+'.json',dir),exportSave(s));console.log(JSON.stringify(r.summary));}
}
