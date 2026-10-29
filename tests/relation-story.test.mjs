import {incenseSceneReply} from '../src/incense.js';
import {WORLD_STORY} from '../src/world-story.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RELATION_STORY,relationSceneEcho,routeActivityEcho,knownRouteMoment} from '../src/relation-story.js';
import {STORY,STORY_VERSION,sceneText,memoryEcho} from '../src/story.js';
import {EVENTS} from '../src/content.js';
import {preview,commit,validateSave,clone,hash,setBoundary,visibleContext,getEvent,savePreference} from '../src/engine.js';
import {parseImport,exportSave} from '../src/storage.js';
import {ordinal,addDays} from '../src/calendar.js';
import {routeActors,routeIds,relationPath,routeFollowup,reachRoute} from '../scripts/s08-relation-scenarios.mjs';
import {ruleProjection} from '../scripts/s08-main-scenarios.mjs';
const dir=new URL('../docs/施工/证据/2026-10-24-S08-02/',import.meta.url),json=n=>JSON.parse(fs.readFileSync(new URL(n,dir),'utf8')),prior=json('施工前剧情与规则基线.json'),baseline=json('施工前84分支规则与起点.json');
const step=(s,a)=>commit(s,preview(s,[a])).state,choose=(s,id,choiceId)=>step(s,{type:'event',eventId:id,choiceId});
const paths={};const path=tone=>paths[tone]||=(relationPath({tone}));
for(const id of routeIds)test(`${id}三种选择在周制及原季度按原成本意愿结算，新回应保存原文`,()=>{
 assert.notEqual(RELATION_STORY[id].body,prior.story[id].body);
 for(const world of ['weekly','quarter'])for(const choice of ['warm','work','distance']){const source=baseline[world][id].state,h=hash(source),n=choose(source,id,choice);validateSave(n);assert.equal(hash(source),h);assert.deepEqual(ruleProjection(n,id),baseline[world][id].results[choice]);assert.equal(n.transcripts[id].dialogue,incenseSceneReply(source,getEvent(source,id),RELATION_STORY[id].replies[choice]));assert.notEqual(n.transcripts[id].dialogue,prior.story[id].replies[choice]);assert.equal(n.transcripts[id].body,sceneText(source,getEvent(source,id)));assert.equal(n.transcripts[id].storyVersion,STORY_VERSION);assert.deepEqual(parseImport(exportSave(n)),n);assert.throws(()=>choose(n,id,choice));}
});
test('七线14幕与42结果各自完整，原规则及其余正文保持，M06与M11另验',()=>{
 assert.equal(routeIds.length,14);const replies=routeIds.flatMap(id=>Object.values(RELATION_STORY[id].replies));assert.equal(replies.length,42);assert.equal(new Set(replies).size,42);for(const tone of ['warm','work','distance'])assert.equal(path(tone).final.weekly.monthly.length,24);assert.ok(replies.every(t=>t.length>=120));
 for(const [id,s] of Object.entries(prior.story))if(!routeIds.includes(id)&&!['M03','M06','M11'].includes(id))assert.deepEqual(STORY[id],s);
 for(const [id,e] of Object.entries(prior.events)){const n=clone(EVENTS[id]),old=clone(e);if(routeIds.includes(id)||WORLD_STORY[id]||['M06','M11'].includes(id)){delete n.body;delete n.sceneVisible;delete old.body;delete old.sceneVisible;}if(id==='M11')n.options=n.options.filter(o=>old.options.some(p=>p.id===o.id));if(id==='M06')old.options.find(o=>o.id==='brief').label=n.options.find(o=>o.id==='brief').label;assert.deepEqual(n,old,id);}
});
for(const cid of routeActors)test(`${cid}后幕接三种真实首选，后来双方保持距离不篡改从前选择`,()=>{
 const second='R'+cid.slice(1)+'-02',first=second.replace(/02$/,'01'),echoes=[];
 for(const tone of ['warm','work','distance']){const s=path(tone).checkpoints[second],old=clone(s.events[first]),h=hash(s),text=relationSceneEcho(s,EVENTS[second]);assert.ok(text.includes(RELATION_STORY[second].echo[tone]));echoes.push(text);assert.equal(hash(s),h);
  for(const party of ['playerIntent','npcIntent']){let b=clone(s);b.relations[cid][party]='仅合作';const before=hash(b),echo=relationSceneEcho(b,EVENTS[second]);assert.ok(echo);assert.deepEqual(b.events[first],old);assert.equal(hash(b),before);if(tone==='warm')assert.ok(!echo.includes(RELATION_STORY[second].echo.distance));assert.throws(()=>choose(b,second,'warm'));assert.doesNotThrow(()=>choose(b,second,'work'));}
 }
 assert.equal(new Set(echoes).size,3);let s=clone(path('warm').checkpoints[second]);delete s.events[first];assert.equal(relationSceneEcho(s,EVENTS[second]),'');s.events[first]={completed:true,outcomeId:'unknown-legacy'};assert.equal(relationSceneEcho(s,EVENTS[second]),'');
});
for(const cid of routeActors)test(`${cid}后续活动或通信接本线第二节点三种结果，原历史不改写`,()=>{
 const id='R'+cid.slice(1)+'-02',texts=[];
 for(const choice of ['warm','work','distance']){const n=choose(baseline.weekly[id].state,id,choice),old=clone(n.transcripts),echo=routeActivityEcho(n,cid),follow=routeFollowup(n,cid);assert.ok(echo||cid==='C03');for(const [key,t] of Object.entries(old))assert.deepEqual(follow.final.transcripts[key],t);assert.equal(follow.final.weekly.plans.find(p=>p.id===follow.planId).slots,1);assert.equal(follow.final.relations[cid].stage,n.relations[cid].stage);assert.ok(follow.text.includes(n.transcripts[id].choice));assert.ok(follow.text.includes(routeActivityEcho(follow.final,cid).text));texts.push(follow.text);if(cid==='C03'){const sh=follow.final.weekly.activities.shipments.find(x=>x.planId===follow.planId);assert.equal(ordinal(sh.deliveryAt)-ordinal(sh.sentAt),7);assert.equal(ordinal(sh.answeredAt)-ordinal(sh.deliveryAt),7);}}
 assert.equal(new Set(texts).size,3);
});
test('延期边书首谈三选各有写出结果，未送达和未读答复不提前替年羹尧表态',()=>{
 let s=path('warm').checkpoints['R03-01'];s=step(s,{type:'defer',eventId:'R03-01'});s=reachRoute(s,{year:2,month:7,day:3});const out=[];assert.equal(memoryEcho(s,getEvent(s,'R03-01')),'');assert.equal(relationSceneEcho(s,getEvent(s,'R03-01')),'');
 for(const choice of ['warm','work','distance']){const before=clone(s.relations.C03),n=choose(s,'R03-01',choice);assert.equal(n.events['R03-01'].channel,'letter');assert.equal(n.relations.C03.trust,before.trust);assert.equal(n.relations.C03.npcIntent,before.npcIntent);assert.match(n.transcripts['R03-01'].dialogue,/封好交驿/);assert.match(n.transcripts['R03-01'].dialogue,/尚未读到/);assert.ok(!visibleContext(n,'C03').facts.some(f=>f.id==='FACT_R03-01'));out.push(n.transcripts['R03-01'].dialogue);}
 assert.equal(new Set(out).size,3);
});
test('未送达的边书不作为共同经历回响，实际送达后才可提起',()=>{
 const source=baseline.weekly['R03-02'].state,tea=savePreference(source,'C03','朕夜里不爱浓茶','route-tea');assert.ok(!/添茶|端来|温水/.test(memoryEcho(tea,EVENTS['R03-02'])));const n=choose(source,'R03-02','warm');assert.equal(knownRouteMoment(n,'C03').eventId,'R03-01');assert.ok(!routeActivityEcho(n,'C03').source.includes('R03-02'));const notice=n.weekly.notices.find(x=>x.source==='R03-02'&&x.type==='delivery'),received=reachRoute(n,notice.date);assert.equal(knownRouteMoment(received,'C03').eventId,'R03-02');assert.equal(routeActivityEcho(received,'C03').source,'R03-02');
});
test('活动回响尊重后来双方意愿，当前保持距离仍保留实际暖选项的历史',()=>{
 for(const cid of routeActors){const id='R'+cid.slice(1)+'-02';let n=choose(baseline.quarter[id].state,id,'warm');const t=clone(n.transcripts[id]);n=setBoundary(n,cid,'仅合作','later-'+cid);const h=hash(n),echo=routeActivityEcho(n,cid);assert.ok(echo);assert.deepEqual(n.transcripts[id],t);assert.equal(n.events[id].outcomeId,'warm');assert.equal(hash(n),h);assert.ok(!echo.text.includes('上回已拒绝'));}
});
test('一段更早活动不永久遮住后来正式节点，后续对话可接最近的实际选择',()=>{
 const id='R02-02';let s=choose(baseline.weekly['R02-01'].state,'R02-01','work');const earlier=routeFollowup(s,'C02');s=reachRoute(earlier.final,{year:1,month:1,day:8});s=choose(s,id,'work');assert.ok(s.weekly.activities.entries.length>0);const follow=routeFollowup(s,'C02');assert.ok(follow.text.includes(s.transcripts[id].choice));assert.ok(follow.text.includes(routeActivityEcho(s,'C02').text));
});
test('旧S08-01档只读保持历史文字，继续第二节点才写入新版本与真实回响',()=>{
 const raw=fs.readFileSync(new URL('../docs/施工/证据/2026-10-24-S08-01/M12_暂缓后_浏览器存档.json',import.meta.url),'utf8'),s=parseImport(raw),h=hash(s);assert.deepEqual(parseImport(exportSave(s)),s);for(const cid of routeActors)routeActivityEcho(s,cid);assert.equal(hash(s),h);assert.equal(s.transcripts['R05-01'].storyVersion,3);
 const old=clone(baseline.weekly['R05-02'].state),texts=clone(old.transcripts),n=choose(old,'R05-02','work');for(const [id,t] of Object.entries(texts))assert.deepEqual(n.transcripts[id],t);assert.equal(n.transcripts['R05-02'].storyVersion,STORY_VERSION);assert.ok(n.transcripts['R05-02'].body.includes(RELATION_STORY['R05-02'].echo.warm));
});
