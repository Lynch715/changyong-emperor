import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import * as engine from '../src/engine.js';
import {WORLD_STORY} from '../src/world-story.js';
import {PROJECTS} from '../src/project-content.js';
import {ACTIVITY_VOICES,GIFTS} from '../src/activity-content.js';
import {RELATION_PROFILES} from '../src/relationship-content.js';
import {initiativeStory,giftStory,banquetExchange} from '../src/social-story.js';
import {ordinal,stamp,addDays} from '../src/calendar.js';
import {worldPath,worldIds,mechanical} from './s08-world-scenarios.mjs';
import {reachRoute} from './s08-relation-scenarios.mjs';
const dir=new URL('../docs/施工/证据/2026-10-24-S08-03/',import.meta.url);
export const baseline=JSON.parse(fs.readFileSync(new URL('施工前事件规则与起点.json',dir),'utf8'));
export const action=(s,a)=>{const n=engine.commit(s,engine.preview(s,[a])).state;engine.validateSave(n);return n;};
export const choose=(s,id,choiceId=null,extra={})=>action(s,{type:'event',eventId:id,choiceId:choiceId||engine.getEvent(s,id).options[0].id,...extra});
export function stopAt(s,date,predicate=()=>false){
 for(let i=0;i<250;i++){
  const n=s.weekly.notices.find(n=>n.status==='pending'&&!n.suspended&&ordinal(n.date)<=ordinal(s.date));
  if(n){if(predicate(n))return s;s=action(s,{type:'week-resolve',noticeId:n.id,choice:n.choices?.[0]});continue;}
  const e=engine.requiredEvents(s)[0];if(e){s=choose(s,e.id,e.id==='G04'?'custom':null,e.id==='G04'?{params:{amount:6,officer:'C26',visibility:'private',escort:true}}:{});continue;}
  if(s.weekly.clock>=stamp(date,'day'))return s;s=action(s,{type:'week-advance',date});
 }throw Error('验收到期点未收束');
}
export function socialOpening({theme='tea',seats=['C06','C02','C07']}={}){
 let s=choose(engine.createWeeklyGame(),'M01','call');s=choose(s,'WG-C01','listen');
 s=action(s,{type:'week-plan',kind:'banquet',guests:seats,date:{year:1,month:1,day:3},period:'day',theme,seats});
 const beforeBanquet=structuredClone(s),pid=s.weekly.plans.at(-1).id;s=stopAt(s,s.weekly.plans.at(-1).date);s=action(s,{type:'week-fulfill',planId:pid});const afterBanquet=structuredClone(s);
 s=action(s,{type:'activity-buy',giftId:'GF02'});const beforeGift=structuredClone(s);
 s=action(s,{type:'activity-gift-same',actor:'C02',planId:pid,itemId:s.weekly.activities.inventory.at(-1).id});const afterGift=structuredClone(s);
 s=action(s,{type:'activity-buy',giftId:'GF03'});const beforeRefusal=structuredClone(s);
 s=action(s,{type:'activity-gift-same',actor:'C02',planId:pid,itemId:s.weekly.activities.inventory.at(-1).id});
 const afterRefusal=structuredClone(s);s=stopAt(s,{year:1,month:1,day:9});return {beforeBanquet,afterBanquet,beforeGift,afterGift,beforeRefusal,afterRefusal,final:s};
}
export function auditWorld({fixtures=false}={}){
 const save=(name,state)=>{if(fixtures)fs.writeFileSync(new URL(name,dir),JSON.stringify({format:'changyong-save',qaOnly:true,note:'正常规则行动起点，仅独立5188验收使用',state},null,2));};
 let branches=0;for(const [world,rows]of Object.entries(baseline))for(const [id,row]of Object.entries(rows))for(const choice of Object.keys(row.results)){
  const n=choose(row.state,id,choice);assert.deepEqual(mechanical(n),row.results[choice],world+' '+id+' '+choice);branches++;
 }
 const normal=worldPath(),partial=worldPath({choices:{'WG-C02':'plan-2','WG-P02':'plan-3',G02:'strict',G04:'pause'}});
 for(const p of [normal,partial]){assert.equal(p.final.weekly.monthly.length,24);assert.ok(worldIds.every(id=>Object.values(p.final.events).some(e=>e.id===id&&e.completed)));}
 for(const id of worldIds)save(id+'_选择前.json',normal.checkpoints[id]);save('完整正文两年_规则路径.json',normal.final);save('部分改善两年_规则路径.json',partial.final);
 const progress=[];
 for(const cfg of Object.values(PROJECTS)){
  const id=cfg.nodes[1],source=baseline.weekly[id].state,n=choose(source,id),notice=n.weekly.notices.find(x=>x.projectId===cfg.id&&x.type==='project-progress');
  const before=stopAt(n,notice.date,x=>x.id===notice.id),after=action(before,{type:'week-resolve',noticeId:notice.id});
  const f=after.facts.find(f=>f.id==='PROJECT_PROGRESS_'+notice.id);assert.ok(f.text.length>100,cfg.id+':'+f.text.length);assert.equal(after.weekly.projects.items[cfg.id].reports.length,0);
  save(cfg.id+'_中途报告前.json',before);progress.push({project:cfg.id,text:f.text,date:f.date});
 }
 const messages=[];let read=structuredClone(normal.final);
 for(const cid of Object.keys(RELATION_PROFILES))for(const num of [1,2]){
  const id=`IN-${cid}-${num}`,m=read.weekly.relationships.messages.find(m=>m.id===id);assert.ok(m);const before=structuredClone(read);
  read=action(read,{type:'relationship-message',actor:cid,messageId:id});const got=read.weekly.relationships.messages.find(m=>m.id===id);assert.ok(got.text.length>=60);messages.push({id,text:got.text,source:got.source});save(id+'_读取前.json',before);
 }save('十四主动消息_读后.json',read);
 const gifts=[];for(const g of GIFTS)for(const cid of g.likedBy.filter(cid=>ACTIVITY_VOICES[cid]))gifts.push({gift:g.id,actor:cid,text:giftStory(normal.final,cid,g,{accept:true,repeat:false,willing:true})});
 const pairs=[];const actors=Object.keys(ACTIVITY_VOICES);for(let i=0;i<actors.length;i++)for(let j=i+1;j<actors.length;j++)for(const theme of ['tea','music','season'])pairs.push({actors:[actors[i],actors[j]],theme,text:banquetExchange([actors[i],actors[j]],theme)});
 const social=socialOpening();for(const k of ['beforeBanquet','afterBanquet','beforeGift','afterGift','beforeRefusal','afterRefusal','final'])save('小宴赠礼_'+k+'.json',social[k]);
 for(const theme of ['music','season']){const sample=socialOpening({theme,seats:theme==='music'?['C07','C02','C06']:['C06','C02']});save('小宴_'+theme+'_赴宴前.json',sample.beforeBanquet);save('小宴_'+theme+'_赴宴后.json',sample.afterBanquet);}
 const review=social.final.weekly.reports.find(r=>r.weekId==='W01').review;assert.ok(review.sources.some(x=>x.kind==='activity'));assert.ok(review.passages.join(' ').includes('新炉'));
 save('旧S08-02_只读起点.json',JSON.parse(fs.readFileSync(new URL('../docs/施工/证据/2026-10-24-S08-02/允礼_后续散步后_浏览器存档.json',import.meta.url),'utf8')).state);
 return {version:'0.8.3',storyVersion:5,logicalScenes:24,projectNodes:12,sideScenes:4,dailyTemplates:8,choiceResults:Object.values(WORLD_STORY).reduce((n,s)=>n+Object.keys(s.replies).length,0),customMilitaryResult:true,unchangedBranches:branches,paths:[normal,partial].map((p,i)=>({kind:i?'部分改善':'正常',months:p.final.weekly.monthly.length,projects:Object.fromEntries(Object.entries(p.final.weekly.projects.items).map(([id,p])=>[id,p.status]))})),progress,messages,gifts,pairs,socialReview:review,limits:['82为冻结起点的事件分支对照，不含全部活动组合','63为小宴组合文本检查，不等于63次可用日程均已赴宴','规则路径与分段浏览器分别记录，未计手机或真实AI','113条活动大纲不在本项宣称全量交付']};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(auditWorld({fixtures:process.argv.includes('--fixtures')}),null,2));
