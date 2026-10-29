import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import * as E from '../src/engine.js';
import {combinedJobs,requiredIds} from './s13-01-scenarios.mjs';
import {ordinal,stamp,addDays,unstamp} from '../src/calendar.js';
import {usedSlots,heldSlots,currentWeek} from '../src/week.js';
import {RELATION_PROFILES} from '../src/relationship-content.js';
import {relationshipRequirements,relationshipRecord,effectiveNode} from '../src/relationships.js';
import {personPresence} from '../src/relationship-schedule.js';
import {exportSave,parseImport} from '../src/storage.js';
export const configurations={politics:'政务优先',life:'个人生活优先',parallel:'七线并行',cooperation:'全合作',repair:'拒绝后修复',letters:'偏通信'};
const d=(year,month,day)=>({year,month,day}),coreIds=Object.keys(RELATION_PROFILES);
export function runPlaystyle(mode,{roundtrip=true}={}){
 assert.ok(configurations[mode]);let s=E.createWeeklyGame();const journal=[],frozen={},snapshots={},checks=[];
 const verify=before=>{
  E.validateSave(s);for(const [id,raw]of Object.entries(frozen))assert.equal(JSON.stringify(s.transcripts[id]),raw,`changed prose ${id}`);
  for(const [id,t]of Object.entries(s.transcripts))frozen[id]??=JSON.stringify(t);
  assert.ok(s.weekly.clock>=before.weekly.clock);for(const w of s.weekly.weeks)assert.ok(usedSlots(s,w.id)+heldSlots(s,w.id)<=6,w.id);
  if(roundtrip){const raw=exportSave(s);s=parseImport(raw);assert.deepEqual(s,JSON.parse(raw).state);}
 };
 const act=a=>{const before=s,raw=JSON.stringify(s),p=E.preview(s,[a]);assert.equal(JSON.stringify(s),raw);s=E.commit(s,p).state;verify(before);journal.push({date:s.date,clock:s.weekly.clock,action:a,transactionId:s.transactions.at(-1).id,remaining:s.remaining,treasury:s.stats.treasury});return s;};
 const reject=(a,label)=>{const raw=JSON.stringify(s);assert.throws(()=>E.preview(s,[a]));assert.equal(JSON.stringify(s),raw);checks.push({label,date:s.date,action:a});};
 const coreChoice=id=>mode==='parallel'?'warm':mode==='cooperation'?'distance':mode==='repair'&&id==='R02-01'?'distance':mode==='repair'&&id==='R02-02'?'work':'work';
 const choose=id=>{
  const e=E.getEvent(s,id),extension=['parallel','repair'].includes(mode)?'develop':'cooperate';
  if(mode==='letters'&&id==='R03-01'&&!s.deferred.includes(id)){act({type:'defer',eventId:id});return;}
  act({type:'event',eventId:id,choiceId:id==='M06'?'fair':id==='M11'?(mode==='repair'?'vague':extension==='develop'?'open':'clear'):e.kind==='relation'?coreChoice(id):e.kind==='extension'?extension:e.options[0].id,...(id==='M06'?{params:{attitudes:{C09:extension==='develop'?'open':'none',C10:extension==='develop'?'open':'none'}}}:{})});
 };
 const settle=except=>{for(let guard=0;guard<100;guard++){
  const n=s.weekly.notices.find(n=>n.status==='pending'&&!n.suspended&&ordinal(n.date)<=ordinal(s.date));if(n){act({type:'week-resolve',noticeId:n.id,...(n.choices?{choice:n.choices[0]}:{})});continue;}
  if(mode==='letters'){const sh=s.weekly.activities?.shipments.find(sh=>sh.kind==='letter'&&sh.status==='delivered'&&ordinal(sh.dueDate)<=ordinal(s.date));if(sh){act({type:'activity-receive',shipmentId:sh.id});continue;}}
  const q=s.weekly.relationships.requests.find(q=>q.status==='pending'&&!q.awaitDelivery&&ordinal(q.dueDate)<=ordinal(s.date));if(q){snapshots['答复前_'+q.actor+'_'+q.kind]=structuredClone(s);act({type:'relationship-answer',actor:q.actor,requestId:q.id});continue;}
  const e=E.requiredEvents(s)[0];if(!e||e.id===except)return;choose(e.id);
 }throw Error('settle loop');};
 const reach=(date,period='day')=>{for(let guard=0;guard<600;guard++){if(s.weekly.clock>=stamp(date,period))return;settle();act({type:'week-advance',date,period});}throw Error('reach loop');};
 const activity=(kind,actor='C01',extra={})=>{act({type:'week-plan',kind,actor,date:s.date,period:s.weekly.clock%2?'evening':'day',...extra});act({type:'week-fulfill',planId:s.weekly.plans.at(-1).id});};
 const jobs=combinedJobs.filter(j=>!j.activity).map(j=>structuredClone(j));
 const extra=(year,month,day,period,run,label)=>jobs.push({date:d(year,month,day),period,run,label});
 if(mode==='politics'){
  for(const [y,m,day,id]of [[1,1,3,'PR-COURT'],[1,4,7,'PR-FISCAL'],[1,10,3,'PR-WATER'],[2,4,7,'PR-MILITARY']])extra(y,m,day,'evening',()=>act({type:'project-inspect',projectId:id}),'亲核'+id);
  for(const [i,w]of s.weekly.weeks.entries())extra(w.start.year,w.start.month,w.id==='W04'?10:6,'evening',()=>{if(w.id==='W04')act({type:'week-extend',date:s.date});activity('study');},'读书'+i);
  for(const [y,m]of [[1,7],[2,1],[2,7],[2,10]])extra(y,m,7,'evening',()=>activity('rest'),'休养');
 }else if(mode==='life'){
  for(const w of s.weekly.weeks)extra(w.start.year,w.start.month,w.id==='W04'?10:w.id==='W07'?7:6,'day',()=>{if(w.id==='W04')act({type:'week-extend',date:d(1,10,10)});activity('banquet','C01',{guests:['C02','C06'],theme:'tea'});},'小宴');
 }else if(mode==='letters'){
  const first=jobs.find(j=>j.eventId==='R03-01');first.date=d(2,7,2);first.period='evening';
  jobs.find(j=>j.eventId==='R03-02').date=d(2,7,17);
  extra(2,7,17,'day',()=>act({type:'week-extend',date:s.date}),'通信延展周');
  // Insert extension creation before the second node on the same date.
  const j=jobs.pop();jobs.unshift(j);
  for(const [y,m,day,cid]of [[1,1,4,'C02'],[1,7,6,'C06'],[2,1,8,'C04'],[2,4,3,'C05'],[2,4,9,'C03'],[2,7,18,'C03']])extra(y,m,day,'evening',()=>{if(!currentWeek(s))act({type:'week-extend',date:s.date});activity('letter',cid);},'实际书信'+cid);
  extra(2,7,9,'evening',()=>{const q=s.weekly.relationships.requests.find(q=>q.sourceNode==='R03-01');reject({type:'relationship-answer',actor:'C03',requestId:q.id},'首封仅送达，答复不得提前');},'核对两程');
 }else if(mode==='repair'){
  extra(1,1,9,'day',()=>{act({type:'week-extend',date:s.date});act({type:'resume',actor:'C02'});const q=s.weekly.relationships.requests.at(-1);reject({type:'relationship-answer',actor:'C02',requestId:q.id},'恢复须等本人次日答复');},'恢复请求');
  extra(1,1,11,'evening',()=>{act({type:'week-plan',kind:'meet',actor:'C02',date:s.date,period:'evening'});act({type:'week-breach',planId:s.weekly.plans.at(-1).id});},'真实失约');
  extra(1,1,12,'evening',()=>{snapshots.核心补谈前=structuredClone(s);act({type:'relationship-repair',actor:'C02',issueId:s.weekly.relationships.issues.find(i=>i.status==='open').id});},'另格补谈');
  extra(1,1,13,'evening',()=>{activity('chat','C02');act({type:'relationship-advance',actor:'C02'});},'后来实际相处');
  extra(2,7,3,'evening',()=>{snapshots.旧影补谈前=structuredClone(s);act({type:'extension-talk',actor:'C09',kind:'repair'});reject({type:'extension-talk',actor:'C09',kind:'resume'},'补谈不立即恢复');},'旧影补谈');
  extra(2,7,4,'evening',()=>act({type:'extension-talk',actor:'C09',kind:'keep-word'}),'另日兑现');
  extra(2,7,10,'evening',()=>{act({type:'week-extend',date:s.date});snapshots.扩展恢复前=structuredClone(s);act({type:'extension-talk',actor:'C09',kind:'resume'});},'本人后来恢复');
 }
 if(mode==='parallel'){
  extra(2,4,8,'evening',()=>activity('meet','C03'),'短驻时实际相处');
  extra(2,10,2,'evening',()=>activity('letter','C03'),'倾心后实际通信');
  extra(2,10,3,'evening',()=>act({type:'relationship-advance',actor:'C03',mode:'letter',agreement:'parallel',visibility:'private'}),'共担心意信');
  extra(2,10,4,'evening',()=>{activity('letter','C03');act({type:'week-plan',kind:'meet',actor:'C05',date:d(2,10,5),period:'evening'});},'再通信与提前约定');
  extra(2,10,5,'evening',()=>{act({type:'week-fulfill',planId:s.weekly.plans.find(p=>p.actor==='C05'&&p.status==='accepted').id});act({type:'relationship-advance',actor:'C05',agreement:'parallel',visibility:'private'});},'允礼实际赴约共担');
 }
 if(mode==='parallel')for(const w of s.weekly.weeks)extra(w.start.year,w.start.month,w.id==='W07'?19:w.id==='W08'?24:9,'day',()=>{
  act({type:'week-extend',date:s.date});
  for(let tick=0;tick<100;tick++){
   settle();const week=currentWeek(s);if(!week||s.remaining<1)break;let handled=false;
   // Fair round-robin: a lower stage goes first; each actor still has independent conditions.
   const actors=coreIds.slice().sort((a,b)=>['相识','信任','倾心','共担','相守'].indexOf(s.relations[a].stage)-['相识','信任','倾心','共担','相守'].indexOf(s.relations[b].stage));
   for(const cid of actors){if(s.relations[cid].stage==='相守'||!effectiveNode(s,RELATION_PROFILES[cid].nodes[0]))continue;const rec=relationshipRecord(s,cid);const pendingRequest=rec.requests.some(q=>q.status==='pending');
    const g=relationshipRequirements(s,cid),remote=cid==='C03'&&!personPresence(s,cid).available||cid==='C05'&&!personPresence(s,cid).available;
    if(!pendingRequest&&(g.ready||g.remoteReady)){try{act({type:'relationship-advance',actor:cid,mode:remote||!g.ready?'letter':'meet',agreement:'parallel',visibility:'private'});handled=true;break;}catch(e){if(e.name!=='Error'&&e.name!=='RuleError')throw e;}}
    const heart=rec.history.find(h=>h.kind==='stage'&&h.to==='倾心'),shared=heart?rec.encounters.filter(e=>ordinal(e.date)>ordinal(heart.date)):[];
    if(s.weekly.plans.some(p=>p.actor===cid&&p.weekId===week.id&&p.kind==='letter'&&p.status==='completed'&&!p.deliveredAt))continue;
    if(s.weekly.relationships.rewarded[`${cid}@${week.id}`]&&(!heart||new Set(shared.map(x=>ordinal(x.date))).size>=2))continue;
    for(let at=s.weekly.clock;at<=stamp(week.end,'evening');at++){
     const m=unstamp(at),letter=cid==='C03'&&!personPresence(s,cid,m.date,m.period).available;
     if(!letter&&!personPresence(s,cid,m.date,m.period,{promised:cid==='C05'&&ordinal(m.date)>ordinal(s.date)}).available)continue;
     try{E.preview(s,[{type:'week-plan',kind:letter?'letter':'meet',actor:cid,date:m.date,period:m.period}]);}catch{continue;}
     act({type:'week-plan',kind:letter?'letter':'meet',actor:cid,date:m.date,period:m.period});const p=s.weekly.plans.at(-1);reach(p.date,p.period);act({type:'week-fulfill',planId:p.id});handled=true;break;
    }if(handled)break;
   }
   if(handled)continue;
   if(ordinal(s.date)<ordinal(week.end)){reach(addDays(s.date,1));continue;}break;
  }
 },'并行相处');
 jobs.sort((a,b)=>stamp(a.date,a.period)-stamp(b.date,b.period));
 for(const job of jobs){if(job.eventId&&E.eventDone(s,job.eventId))continue;try{reach(job.date,job.period);assert.equal(s.weekly.clock,stamp(job.date,job.period));settle(job.eventId);if(job.run)job.run();else if(!E.eventDone(s,job.eventId)){snapshots['节点前_'+job.eventId]=structuredClone(s);choose(job.eventId);}}catch(e){throw new Error(`${mode} ${job.eventId||job.label} ${JSON.stringify(job.date)} ${job.period}: ${e.message}`,{cause:e});}}
 reach(d(2,12,30),'evening');settle();snapshots.封卷前=structuredClone(s);act({type:'seal'});
 for(const id of requiredIds.filter(id=>id!=='F00'))assert.ok(Object.values(s.events).some(e=>e.id===id&&e.completed),id);
 assert.equal(s.weekly.monthly.length,24);assert.ok(s.weekly.weeks.filter(w=>w.type==='extension').length<=8);
 const rows=s.weekly.weeks.map(w=>({id:w.id,type:w.type,start:w.start,end:w.end,used:usedSlots(s,w.id),held:heldSlots(s,w.id),free:6-usedSlots(s,w.id)-heldSlots(s,w.id)}));
 return {s,journal,snapshots,checks,rows,mode,label:configurations[mode]};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const dir=new URL('../docs/施工/证据/2026-10-27-S13-02/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
 for(const mode of (process.argv.slice(2).length?process.argv.slice(2):Object.keys(configurations))){const r=runPlaystyle(mode);fs.writeFileSync(new URL(mode+'-封卷.json',dir),exportSave(r.s));fs.writeFileSync(new URL(mode+'-路径.json',dir),JSON.stringify({journal:r.journal,checks:r.checks,rows:r.rows},null,2));for(const [name,s]of Object.entries(r.snapshots))if(['封卷前','核心补谈前','旧影补谈前','扩展恢复前','答复前_C03_node-reply'].includes(name))fs.writeFileSync(new URL(mode+'-'+name+'.json',dir),exportSave(s));console.log(JSON.stringify({mode,label:r.label,transactions:r.journal.length,used:r.rows.reduce((n,w)=>n+w.used,0),weeks:r.rows.length,money:r.s.stats.treasury,stages:Object.fromEntries(coreIds.map(cid=>[cid,r.s.relations[cid].stage])),counts:r.s.ending.counts,checks:r.checks.length}));}
}
