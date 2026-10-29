import fs from 'node:fs';import path from 'node:path';import {fileURLToPath}from'node:url';
import * as E from '../src/engine.js';import{PROJECT_EVENTS}from'../src/project-content.js';import{exportSave,parseImport}from'../src/storage.js';import{ordinal,stamp,addDays}from'../src/calendar.js';import{weekNodeStatus,usedSlots,heldSlots}from'../src/week.js';
export const root=fileURLToPath(new URL('../',import.meta.url)),dir=path.join(root,'docs/施工/证据/2026-10-25-S08-06/');
const schedule=JSON.parse(fs.readFileSync(path.join(root,'design/S01/周排程.json'),'utf8'));
export const before=JSON.parse(fs.readFileSync(dir+'施工前剧情与规则基线.json','utf8'));
export const act=(s,a)=>{const n=E.commit(s,E.preview(s,Array.isArray(a)?a:[a])).state;E.validateSave(n);return n;};
export const choose=(s,id,tone='work')=>act(s,{type:'event',eventId:id,choiceId:E.getEvent(s,id).kind==='relation'?tone:E.getEvent(s,id).options[0].id});
export function settle(s,except=null,tone='work'){
 for(let i=0;i<60;i++){
  const n=s.weekly.notices.find(n=>n.status==='pending'&&!n.suspended&&ordinal(n.date)<=ordinal(s.date));if(n){s=act(s,{type:'week-resolve',noticeId:n.id,...(n.choices?{choice:n.choices[0]}:{})});continue;}
  const e=E.requiredEvents(s)[0];if(!e||e.id===except)return s;s=choose(s,e.id,tone);
 }throw Error('当日事项未收束');
}
export function reach(s,date,period='day',tone='work'){
 for(let i=0;i<500;i++){if(stamp(s.date,s.weekly.clock%2?'evening':'day')>=stamp(date,period))return s;s=settle(s,null,tone);s=act(s,{type:'week-advance',date,period});}throw Error('未抵达实际时段');
}
export function runEightWeeks({tone='work',life='solo'}={}){
 const jobs=schedule.coverageSchedule.filter(x=>!x.eventId.startsWith('XR')&&(E.getEvent(E.createWeeklyGame(),x.eventId)||PROJECT_EVENTS[x.eventId])).map(x=>({...x,date:{year:x.date[0],month:x.date[1],day:x.date[2]},period:x.slot==='report'?'day':x.slot}));
 for(const w of schedule.weeks){const d={year:w.start[0],month:w.start[1],day:w.start[2]};if(life==='solo')for(const [n,kind]of [[w.id==='W05'?2:1,'study'],[4,'rest']])jobs.push({activity:kind,weekId:w.id,date:addDays(d,n),period:'evening'});else jobs.push({activity:'banquet',weekId:w.id,date:addDays(d,({W06:1,W04:3,W07:4}[w.id]??2)),period:'day'});}
 jobs.sort((a,b)=>stamp(a.date,a.period)-stamp(b.date,b.period)||(a.activity?1:-1));
 let s=E.createWeeklyGame();const checkpoints={};
 for(const job of jobs){s=reach(s,job.date,job.period,tone);s=settle(s,job.eventId,tone);if(job.eventId){if(!s.events[job.eventId]?.completed){checkpoints[job.eventId]=structuredClone(s);s=choose(s,job.eventId,tone);}}else{const a={type:'week-plan',kind:job.activity,actor:'C01',date:job.date,period:job.period,...(job.activity==='banquet'?{guests:['C02','C06'],theme:'tea'}:{})};try{s=act(s,a);}catch(e){throw new Error(JSON.stringify(job)+' '+e.message);}s=act(s,{type:'week-fulfill',planId:s.weekly.plans.at(-1).id});}}
 s=reach(s,{year:2,month:12,day:30},'evening',tone);s=settle(s,null,tone);s=act(s,{type:'seal'});
 const rows=schedule.weeks.map(w=>{const scenes=Object.values(s.transcripts).filter(t=>t.date&&s.weekly.weeks.some(x=>x.id===w.id&&ordinal(t.date)>=ordinal(x.start)&&ordinal(t.date)<=ordinal(x.end)));const lifeSlots=s.weekly.plans.filter(p=>p.weekId===w.id&&p.status==='completed'&&!p.eventId).reduce((n,p)=>n+p.slots,0),used=usedSlots(s,w.id),core=used-lifeSlots;return {id:w.id,start:w.start,end:w.end,mainPackages:scenes.filter(t=>/^M\d/.test(t.eventId)).map(t=>t.eventId),relationNodes:scenes.filter(t=>/^R/.test(t.eventId)).map(t=>t.eventId),workAndSide:scenes.filter(t=>/^(WG|G|P)/.test(t.eventId)).map(t=>t.eventId),coreSlots:core,freeBeforePersonal:6-core,personalSlots:lifeSlots,used,held:heldSlots(s,w.id),freeAfterPersonal:6-used,review:s.weekly.reports.find(r=>r.weekId===w.id)?.review.sources};});
 return {s,rows,checkpoints,notImplemented:schedule.coverageSchedule.filter(x=>x.eventId!=='F00'&&!PROJECT_EVENTS[x.eventId]&&!E.getEvent(s,x.eventId)).map(x=>x.eventId)};
}
export const save=(name,s)=>{E.validateSave(s);fs.writeFileSync(dir+name+'.json',exportSave(s));};
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const runs=[];for(const cfg of [{tone:'work',life:'solo'},{tone:'distance',life:'banquet'}]){const r=runEightWeeks(cfg);runs.push({config:cfg,rows:r.rows,notImplemented:r.notImplemented,counts:r.s.ending.counts,monthly:r.s.weekly.monthly.length,coreSlots:r.rows.reduce((n,w)=>n+w.coreSlots,0)});save('八周_'+cfg.tone+'_封卷',r.s);for(const [id,s]of Object.entries(r.checkpoints))if(/^M/.test(id))save('八周_'+cfg.tone+'_'+id+'前',s);}
 let sick=parseImport(fs.readFileSync(dir+'旧周制副本_病休首谈未延期.json','utf8'));sick=act(sick,{type:'defer',eventId:'R04-01'});save('病休首谈_延期后',sick);
 const prince=choose(before.weekly.checkpoints.M09,'M09');save('允礼_首谈可延期起点',prince);
 fs.writeFileSync(dir+'八周实际容量.json',JSON.stringify(runs,null,2));console.log(JSON.stringify(runs.map(r=>({config:r.config,coreSlots:r.coreSlots,rows:r.rows.map(w=>({id:w.id,main:w.mainPackages,relation:w.relationNodes,core:w.coreSlots,free:w.freeBeforePersonal,personal:w.personalSlots})),notImplemented:r.notImplemented,counts:r.counts,monthly:r.monthly})),null,2));
}
