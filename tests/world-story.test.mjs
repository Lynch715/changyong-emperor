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
const __evidence=f=>{try{return f()}catch(e){if(e&&e.code==='ENOENT')return null;throw e}};

const dir=new URL('../docs/施工/证据/2026-10-24-S08-03/',import.meta.url),prior=__evidence(()=>JSON.parse(fs.readFileSync(new URL('施工前内容配置.json',dir),'utf8')));





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

