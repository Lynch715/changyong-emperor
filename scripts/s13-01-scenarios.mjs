// A continuous fresh-game route. No imported checkpoints or direct state edits.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as E from '../src/engine.js';
import {ordinal,stamp} from '../src/calendar.js';
import {usedSlots,heldSlots} from '../src/week.js';
import {exportSave,parseImport} from '../src/storage.js';
const __evidence=f=>{try{return f()}catch(e){if(e&&e.code==='ENOENT')return null;throw e}};


const schedule=(()=>{try{return __evidence(()=>JSON.parse(fs.readFileSync(new URL('../design/S01/周排程.json',import.meta.url),'utf8')))}catch(e){if(e.code==='ENOENT')return null;throw e}})();
export const dailyJobs=[['D01',1,1,3,'day'],['D02',2,1,5,'day'],['D03',2,4,3,'day'],['D04',2,4,4,'evening'],['D05',1,7,4,'day'],['D06',2,7,6,'day'],['D07',1,10,7,'day'],['D08',2,10,4,'day']].map(([eventId,year,month,day,period])=>({eventId,date:{year,month,day},period}));
export const activityJobs=schedule.weeks.map((w,i)=>({activity:[['study','C01'],['rest','C01'],['walk','C06'],['chat','C09'],['chat','C10'],['study','C01'],['walk','C09'],['rest','C01']][i],date:{year:w.start[0],month:w.start[1],day:i===3?7:6},period:'evening'}));
export const combinedJobs=[...schedule.coverageSchedule.filter(j=>j.eventId!=='F00').map(j=>({...j,date:{year:j.date[0],month:j.date[1],day:j.date[2]},period:j.slot==='report'?'day':j.slot})),...dailyJobs,...activityJobs].sort((a,b)=>stamp(a.date,a.period)-stamp(b.date,b.period));
export const requiredIds=[...new Set([...schedule.coverageSchedule.map(j=>j.eventId),...dailyJobs.map(j=>j.eventId)])];

export function runCombined({core='work',extension='cooperate',roundtrip=false}={}){
 let s=E.createWeeklyGame();const journal=[],checkpoints={},frozen={};
 const commit=a=>{
  const before=s,actions=Array.isArray(a)?a:[a],raw=JSON.stringify(s),p=E.preview(s,actions);
  assert.equal(JSON.stringify(s),raw,'preview mutated its input');
  s=E.validateSave(E.commit(s,p).state);
  for(const [id,t]of Object.entries(frozen))assert.equal(JSON.stringify(s.transcripts[id]),t,`historical prose changed: ${id}`);
  for(const [id,t]of Object.entries(s.transcripts))frozen[id]??=JSON.stringify(t);
  assert.ok(s.weekly.clock>=before.weekly.clock,'clock moved backwards');
  for(const w of s.weekly.weeks)assert.ok(usedSlots(s,w.id)+heldSlots(s,w.id)<=6,`${w.id} overbooked`);
  journal.push({transactionId:s.transactions.at(-1).id,date:s.date,clock:s.weekly.clock,actions,treasuryBefore:before.stats.treasury,treasuryAfter:s.stats.treasury,remaining:s.remaining});
  if(roundtrip){const saved=exportSave(s);s=parseImport(saved);assert.deepEqual(s,JSON.parse(saved).state,'save roundtrip changed state');}
 };
 const choose=id=>{
  const e=E.getEvent(s,id);assert.ok(e,`missing runtime event ${id}`);
  commit({type:'event',eventId:id,choiceId:id==='M06'?'fair':id==='M11'?(extension==='develop'?'open':'clear'):e.kind==='relation'?core:e.kind==='extension'?extension:e.options[0].id,...(id==='M06'?{params:{attitudes:{C09:extension==='develop'?'open':'none',C10:extension==='develop'?'open':'none'}}}:{})});
 };
 const settle=except=>{for(let i=0;i<80;i++){
  const n=s.weekly.notices.find(n=>n.status==='pending'&&!n.suspended&&ordinal(n.date)<=ordinal(s.date));
  if(n){commit({type:'week-resolve',noticeId:n.id,...(n.choices?{choice:n.choices[0]}:{})});continue;}
  const e=E.requiredEvents(s)[0];if(!e||e.id===except)return;choose(e.id);
 }throw Error('unsettled required events');};
 const reach=(date,period)=>{for(let i=0;i<500;i++){
  if(s.weekly.clock>=stamp(date,period))return;
  settle();commit({type:'week-advance',date,period});
 }throw Error('did not reach target');};
 for(const job of combinedJobs){
  try{
   reach(job.date,job.period);assert.equal(s.weekly.clock,stamp(job.date,job.period),'job date was passed');settle(job.eventId);
   if(job.eventId){if(!s.events[job.eventId]?.completed){checkpoints[job.eventId]=structuredClone(s);choose(job.eventId);}}
   else {commit({type:'week-plan',kind:job.activity[0],actor:job.activity[1],date:job.date,period:job.period,topic:'shared',choice:'listen'});commit({type:'week-fulfill',planId:s.weekly.plans.at(-1).id});}
  }catch(e){throw new Error(`${JSON.stringify(job)}: ${e.message}`,{cause:e});}
 }
 reach({year:2,month:12,day:30},'evening');settle();const beforeSeal=structuredClone(s);commit({type:'seal'});
 assert.equal(requiredIds.length,55);
 for(const id of requiredIds.filter(id=>id!=='F00'))assert.ok(Object.values(s.events).some(e=>e.id===id&&e.completed),`${id} missing`);
 assert.ok(s.ending);assert.equal(s.weekly.monthly.length,24);assert.equal(s.weekly.weeks.length,8);
 const rows=s.weekly.weeks.map(w=>({id:w.id,start:w.start,end:w.end,capacity:6,used:usedSlots(s,w.id),held:heldSlots(s,w.id),free:6-usedSlots(s,w.id)-heldSlots(s,w.id),events:Object.values(s.transcripts).filter(t=>t.date&&ordinal(t.date)>=ordinal(w.start)&&ordinal(t.date)<=ordinal(w.end)).map(t=>t.eventId),activities:s.weekly.plans.filter(p=>p.weekId===w.id&&p.status==='completed'&&!p.eventId).map(p=>({kind:p.kind,actor:p.actor,date:p.date,period:p.period,slots:p.slots}))}));
 return {s,beforeSeal,checkpoints,journal,rows,requiredIds,config:{core,extension,roundtrip}};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const dir=new URL('../docs/施工/证据/2026-10-26-S13-01/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
 for(const extension of ['cooperate','develop']){
  const r=runCombined({extension,roundtrip:true}),name=extension==='cooperate'?'合作':'发展';
  fs.writeFileSync(new URL(`${name}_封卷.json`,dir),exportSave(r.s));fs.writeFileSync(new URL(`${name}_封卷前.json`,dir),exportSave(r.beforeSeal));
  fs.writeFileSync(new URL(`${name}_逐笔路径.json`,dir),JSON.stringify(r.journal,null,2));
  fs.writeFileSync(new URL(`${name}_排程与覆盖.json`,dir),JSON.stringify({config:r.config,rows:r.rows,requiredIds:r.requiredIds,monthly:r.s.weekly.monthly,projects:r.s.weekly.projects,counts:r.s.ending.counts},null,2));
  for(const id of ['M06','XR10-02','XR09-02'])fs.writeFileSync(new URL(`${name}_${id}前.json`,dir),exportSave(r.checkpoints[id]));
  console.log(name,JSON.stringify({transactions:r.journal.length,weeks:r.rows.map(w=>({id:w.id,used:w.used,free:w.free})),covered:r.requiredIds.length,monthly:r.s.weekly.monthly.length,treasury:r.s.stats.treasury}));
 }
}
