import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {preview,commit,validateSave,hash,clone,createWeeklyGame,eventKey,setBoundary,visibleContext,getEvent} from '../src/engine.js';
import {STORY_VERSION} from '../src/story.js';
import {WORLD_STORY,worldSceneReply} from '../src/world-story.js';
import {EVENTS} from '../src/content.js';
import {PROJECT_EVENTS,PROJECTS} from '../src/project-content.js';
import {projectOutcome,projectProgress} from '../src/projects.js';
import {initiativeStory,giftStory,banquetExchange} from '../src/social-story.js';
import {GIFTS,ACTIVITY_VOICES} from '../src/activity-content.js';
import {RELATION_PROFILES} from '../src/relationship-content.js';
import {makeWeekReview} from '../src/week-experience.js';
import {parseImport,exportSave} from '../src/storage.js';
import {worldIds,worldPath,mechanical} from '../scripts/s08-world-scenarios.mjs';
import {baseline,action,choose,stopAt,socialOpening} from '../scripts/check-s08-03.mjs';
import {addDays} from '../src/calendar.js';
const dir=new URL('../docs/施工/证据/2026-10-24-S08-03/',import.meta.url),prior=JSON.parse(fs.readFileSync(new URL('施工前内容配置.json',dir),'utf8'));
for(const id of worldIds)test(`${id}各选项保存独立结果，原日期费用工期意愿与知情配置保持`,()=>{
 const original=prior.EVENTS[id]||prior.PROJECT_EVENTS[id],now=EVENTS[id]||PROJECT_EVENTS[id];assert.notEqual(now.body,original.body);
 const clean=e=>{const n=clone(e);delete n.body;delete n.sceneVisible;return n;};assert.deepEqual(clean(now),clean(original));
 for(const world of ['weekly','quarter']){const row=baseline[world][id];if(!row)continue;const replies=[];
  for(const choice of Object.keys(row.results)){const h=hash(row.state),n=choose(row.state,id,choice);assert.equal(hash(row.state),h);validateSave(n);assert.deepEqual(mechanical(n),row.results[choice]);const t=n.transcripts[eventKey(n,id)];assert.equal(t.storyVersion,STORY_VERSION);assert.ok(t.dialogue.includes(WORLD_STORY[id].replies[choice]));replies.push(t.dialogue);assert.deepEqual(parseImport(exportSave(n)),n);assert.throws(()=>choose(n,id,choice));}
  assert.equal(new Set(replies).size,replies.length);
 }
});
test('24节点与48选项结果各自完整，其余配置保持，M06与M11另验',()=>{
 assert.equal(Object.keys(WORLD_STORY).length,24);const texts=Object.values(WORLD_STORY).flatMap(x=>Object.values(x.replies));assert.equal(texts.length,48);assert.equal(new Set(texts).size,48);
 for(const [id,e]of Object.entries(prior.EVENTS))if(!WORLD_STORY[id]&&!['M06','M11'].includes(id))assert.deepEqual(EVENTS[id],e);
});
test('改派承办后，未来财政与民生正文和实际说话人一致，不改旧现场记录',()=>{
 for(const [id,project,officer,name,oldName]of [['G02','PR-FISCAL','C26','允祥','张廷玉'],['WG-P02','PR-WATER','C28','张廷玉','允祥']]){
  const before=baseline.weekly[id].state,old=clone(before.transcripts),s=action(before,{type:'project-assign',projectId:project,officer}),e=getEvent(s,id);assert.equal(e.actor,officer);assert.ok(e.body.includes(name));assert.ok(!e.body.includes(oldName));const n=choose(s,id);assert.deepEqual(Object.fromEntries(Object.keys(old).map(k=>[k,n.transcripts[k]])),old);
 }
});
for(const project of Object.keys(PROJECTS))test(`${project}中报、实际回访和补做区分结果，不提前完成或借恋爱改国政收益`,()=>{
 const cfg=PROJECTS[project],id=cfg.nodes[1],row=baseline.weekly[id];
 const variants=id==='G05'?['escort','ledger','local']:Object.keys(row.results);
 for(const choice of variants){let s=choose(row.state,id,choice),p=s.weekly.projects.items[project],notice=s.weekly.notices.find(n=>n.projectId===project&&n.type==='project-progress');
  const before=stopAt(s,notice.date,n=>n.id===notice.id),stats=clone(before.stats);s=action(before,{type:'week-resolve',noticeId:notice.id});assert.deepEqual(s.stats,stats);assert.equal(s.weekly.projects.items[project].reports.length,0);
  const end=stopAt(s,p.runs.at(-1).dueDate),report=end.weekly.projects.items[project].reports.at(-1);assert.ok(report);assert.ok(report.text.length>150);assert.ok(end.transcripts[cfg.nodes[2]].dialogue.length>150);
  let work=clone(before);work.relations.C02.playerIntent='仅合作';work.relations.C03.playerIntent='仅合作';work=action(work,{type:'week-resolve',noticeId:notice.id});assert.deepEqual(work.stats,s.stats);
 }
});
test('军需零拨款与免审保留缺口，补做不把早先等待删掉，承办名准确',()=>{
 for(const choice of ['pause','full']){let s=choose(baseline.weekly.G04.state,'G04',choice);s=stopAt(s,{year:2,month:4,day:8});s=choose(s,'G05','local');const p=s.weekly.projects.items['PR-MILITARY'];s=stopAt(s,p.runs.at(-1).dueDate);assert.equal(s.weekly.projects.items['PR-MILITARY'].status,'needs-repair');assert.match(s.weekly.projects.items['PR-MILITARY'].reports.at(-1).text,choice==='pause'?/缺粮|等待/:/免审|未审/);assert.match(projectOutcome(s,'PR-MILITARY',{repair:true}).text,/前账|损失/);}
 const s=choose(baseline.weekly.G04.state,'G04','custom',{params:{amount:6,officer:'C32',visibility:'private',escort:true}});assert.match(s.transcripts.G04.dialogue,/岳钟琪/);assert.ok(!s.transcripts.G04.dialogue.includes('鄂尔泰'));
});
let full;
const path=()=>full||=(worldPath());
for(const cid of Object.keys(RELATION_PROFILES))test(`${cid}主动短笺与邀约接真实来源，合作版本保留分寸，已读原文不重写`,()=>{
 let s=clone(path().final);for(const num of [1,2]){const m=s.weekly.relationships.messages.find(x=>x.id===`IN-${cid}-${num}`);assert.ok(m);const before=clone(s.relations[cid]),rem=s.remaining;s=action(s,{type:'relationship-message',actor:cid,messageId:m.id});const got=s.weekly.relationships.messages.find(x=>x.id===m.id);assert.ok(got.text.length>60);assert.deepEqual(s.relations[cid],before);assert.equal(s.remaining,rem);const text=got.text;s=setBoundary(s,cid,'仅合作','boundary-'+num);assert.equal(s.weekly.relationships.messages.find(x=>x.id===m.id).text,text);if(num===1)s=clone(path().final);}
 const b=clone(path().final);b.relations[cid].npcIntent='仅合作';const note=b.weekly.relationships.messages.find(m=>m.actor===cid);assert.match(initiativeStory(b,note,RELATION_PROFILES[cid]),/分寸/);
});
for(const cid of Object.keys(ACTIVITY_VOICES))test(`${cid}合用礼、重复礼、婉拒和终止有具体文本，收礼不代替答应`,()=>{
 const s=clone(path().final),accepted=[];for(const g of GIFTS.filter(g=>g.likedBy.includes(cid))){const text=giftStory(s,cid,g,{accept:true,repeat:false,willing:true});assert.ok(text.length>65);accepted.push(text);assert.match(giftStory(s,cid,g,{accept:false,repeat:true,willing:true}),/上回那件还在用/);}
 assert.equal(new Set(accepted).size,accepted.length);s.relations[cid].playerIntent='仅合作';assert.match(giftStory(s,cid,GIFTS.find(g=>g.likedBy.includes(cid)),{accept:true,repeat:false,willing:true}),/不以收礼另许私情/);assert.match(giftStory(s,cid,GIFTS[0],{accept:false,repeat:false,willing:false}),/没有用新礼催人改变/);
});
test('三主题21对小宴接话完整，实际三宾赴宴收礼与婉拒保持费用和私语范围',()=>{
 const actors=Object.keys(ACTIVITY_VOICES);let pairs=0;for(let i=0;i<actors.length;i++)for(let j=i+1;j<actors.length;j++)for(const theme of ['tea','music','season']){assert.ok(banquetExchange([actors[i],actors[j]],theme).length>60);pairs++;}assert.equal(pairs,63);
 const r=socialOpening(),p=r.afterBanquet.weekly.plans.at(-1);assert.equal(p.slots,2);assert.equal(p.money,2);assert.match(p.dialogue,/两句话来回|先听完/);assert.equal(r.afterGift.remaining,r.beforeGift.remaining);assert.equal(r.afterGift.weekly.activities.inventory.at(-1).status,'given');assert.equal(r.afterRefusal.weekly.activities.inventory.at(-1).status,'held');assert.deepEqual(r.afterRefusal.relations,r.beforeRefusal.relations);
});
test('一周回顾包含真实群像日常、中报、主动话与收礼回音，源可核且旧回顾不重写',()=>{
 const r=socialOpening(),review=r.final.weekly.reports[0].review;assert.ok(review.sources.some(x=>x.kind==='activity'));assert.match(review.passages.join(' '),/新炉|手炉/);const s=path().final;assert.ok(s.weekly.reports.some(r=>r.review.sources.some(x=>x.kind==='transcript'&&/^P/.test(x.id))));assert.ok(s.weekly.reports.some(r=>r.review.sources.some(x=>x.kind==='transcript'&&/^D/.test(x.id))));
 let base=clone(r.final);const old=clone(base.weekly.reports);base=stopAt(base,{year:1,month:4,day:9});assert.deepEqual(base.weekly.reports.slice(0,old.length),old);
 const pending=clone(path().checkpoints.G05),cfg=pending.weekly.weeks.find(w=>w.id==='W06'),rec=makeWeekReview(pending,cfg);assert.ok(!rec.passages.join(' ').includes('领粮册上有个名字写歪'));
});
test('回顾新增活动和消息来源拒绝跨周或伪造，旧S08-02读入保持原文字段',()=>{
 const s=socialOpening().final;for(const kind of ['activity','initiative','fact']){const bad=clone(s);bad.weekly.reports[0].review.sources.push({kind,id:'fake'});assert.throws(()=>validateSave(bad));}
 const old=parseImport(fs.readFileSync(new URL('../docs/施工/证据/2026-10-24-S08-02/允礼_后续散步后_浏览器存档.json',import.meta.url),'utf8')),h=hash(old);makeWeekReview(old,old.weekly.weeks.find(w=>w.id==='W06'));assert.equal(hash(old),h);assert.deepEqual(parseImport(exportSave(old)),old);
});
