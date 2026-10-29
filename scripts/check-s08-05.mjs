import fs from 'node:fs';import path from 'node:path';import{fileURLToPath}from'node:url';
import * as E from '../src/engine.js';import{parseImport,exportSave}from'../src/storage.js';import{ordinal,addDays}from'../src/calendar.js';
import{buildAIContext,buildReactionContext}from'../src/input.js';import{ruleProjection}from'./s08-main-scenarios.mjs';
export const dir=fileURLToPath(new URL('../docs/施工/证据/2026-10-25-S08-05/',import.meta.url));
export const before=JSON.parse(fs.readFileSync(path.join(dir,'施工前剧情与规则基线.json'),'utf8'));
export const act=(s,a)=>E.commit(s,E.preview(s,[a])).state;
export const choose=(s,id,choiceId)=>act(s,{type:'event',eventId:id,choiceId:choiceId||E.getEvent(s,id).options[0].id});
export function opened(world='weekly',p='sample',tone='work'){
 let s=choose(before[world].checkpoints.M03,'M03',p);const afterM03=s;s=choose(s,'R07-01',tone);return {afterM03,afterTalk:s};
}
export function reach(s,d){
 if(!s.weekly){for(let i=0;ordinal(s.date)<ordinal(d)&&i<20;i++){const e=E.requiredEvents(s)[0];if(e)s=choose(s,e.id);else if(!s.events['R07-02']?.completed&&E.availableEvents(s).some(e=>e.id==='R07-02'))s=choose(s,'R07-02','work');else s=act(s,{type:'advance'});}return s;}
 for(let i=0;i<200;i++){
  const n=s.weekly.notices.find(n=>n.status==='pending'&&!n.suspended&&ordinal(n.date)<=ordinal(s.date));
  if(n){s=act(s,{type:'week-resolve',noticeId:n.id,choice:n.choices?.[0]});continue;}
  const e=E.requiredEvents(s)[0];if(e){s=choose(s,e.id);continue;}
  if(ordinal(s.date)>=ordinal(d))return s;
  s=act(s,{type:'week-advance',date:d});
 }throw Error('未到核对日期');
}
export function readReport(s){s=reach(s,s.incenseCase.request.dueDate);return act(s,{type:'incense-review'});}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const save=(n,s)=>{E.validateSave(s);fs.writeFileSync(path.join(dir,n+'.json'),exportSave(s));};
 const rows=[];for(const world of ['weekly','quarter'])for(const p of ['sample','explain','quiet']){
  const r=opened(world,p);save(world+'_'+p+'_停香前',before[world].checkpoints.M03);save(world+'_'+p+'_停香后',r.afterM03);save(world+'_'+p+'_说明前',r.afterM03);save(world+'_'+p+'_说明后',r.afterTalk);
  const q=readReport(r.afterTalk);save(world+'_'+p+'_回单已读',q);rows.push({world,path:p,first:ruleProjection(r.afterM03,'M03'),afterTalk:ruleProjection(r.afterTalk,'R07-01'),report:q.incenseCase.review.text});
 }
 let s=readReport(opened('weekly','quiet').afterTalk);s=act(s,{type:'week-extend',date:s.date});save('暗停_副单另往前',s);s=act(s,{type:'incense-share'});save('暗停_副单另往后',s);
 let auto=readReport(opened('weekly','sample').afterTalk);auto=act(auto,{type:'week-extend',date:auto.date});save('已阅回单_相谈前',auto);
 const sample=opened('weekly','sample').afterTalk;let same=reach(sample,sample.incenseCase.request.dueDate);same=act(same,{type:'week-extend',date:same.date});same=choose(same,'R07-02','work');save('同场补看回单前',same);same=act(same,{type:'incense-review'});save('同场副单分享前',same);same=act(same,{type:'incense-share'});save('同场副单分享后',same);
 const oldPath=path.join(dir,'旧暗停_只读起点.json');if(fs.existsSync(oldPath)){const old=parseImport(fs.readFileSync(oldPath,'utf8'));save('旧暗停_接续交办后',act(old,{type:'incense-request'}));}
 let reviewed=readReport(opened('weekly','quiet').afterTalk);reviewed=act(reviewed,{type:'week-extend',date:reviewed.date});reviewed=act(reviewed,{type:'incense-share'});for(let i=0;i<20&&!reviewed.weekly.reports.some(r=>r.weekId==='X2');i++)reviewed=act(reviewed,{type:'week-end'});save('案卷_收周后',reviewed);
 fs.writeFileSync(path.join(dir,'三路径规则与回单.json'),JSON.stringify(rows,null,2));fs.writeFileSync(path.join(dir,'知情上下文.json'),JSON.stringify(Object.fromEntries(['C07','C19','C22','C04','C06'].map(cid=>[cid,E.actorUnlocked(s,cid)?buildAIContext(s,cid,null):{blocked:'尚未登场，不发送上下文'}])),null,2));
 console.log(JSON.stringify({version:'0.8.5',paths:rows.length,shareCost:s.transactions.at(-1).results[0].actionCost,sameSceneCost:same.transactions.at(-1).results[0].actionCost}));
}
