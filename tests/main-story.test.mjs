import {WORLD_STORY} from '../src/world-story.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MAIN_STORY,mainSceneEcho} from '../src/main-story.js';
import {STORY,STORY_VERSION,sceneText} from '../src/story.js';
import {EVENTS} from '../src/content.js';
import {preview,commit,validateSave,clone,hash,requiredEvents,actorUnlocked} from '../src/engine.js';
import {buildAIContext,buildReactionContext} from '../src/input.js';
import {parseImport,exportSave} from '../src/storage.js';
import {ordinal} from '../src/calendar.js';
import {mainCheckpoints,mainIds,ruleProjection} from '../scripts/s08-main-scenarios.mjs';
const evidence=new URL('../docs/施工/证据/2026-10-24-S08-01/',import.meta.url),read=n=>JSON.parse(fs.readFileSync(new URL(n,evidence),'utf8'));
const before=read('施工前剧情与规则基线.json'),rules=read('施工前分支规则结果.json');
const checkpoints={weekly:mainCheckpoints().checkpoints,quarter:mainCheckpoints({weekly:false}).checkpoints};
const choose=(s,id,choiceId)=>commit(s,preview(s,[{type:'event',eventId:id,choiceId}])).state;
for(const id of mainIds)test(`${id}三选在周制与原季度的规则结果保持，正文与回应实际落档`,()=>{
 assert.ok(MAIN_STORY[id]);assert.notEqual(MAIN_STORY[id].body,before.story[id].body);assert.equal(Object.keys(MAIN_STORY[id].replies).length,id==='M11'?5:3);
 for(const world of ['weekly','quarter'])for(const o of EVENTS[id].options.filter(o=>rules.weekly[id][o.id])){const s=checkpoints[world][id],h=hash(s),n=choose(s,id,o.id),t=n.transcripts[id];assert.equal(hash(s),h);validateSave(n);const expected=clone(rules[world][id][o.id]);if(id==='M06'&&o.id==='brief'){const old='依礼接见，暂不私谈';expected.transcript.choice=o.label;expected.transcript.result=expected.transcript.result.replace(old,o.label);for(const f of expected.facts)f.text=f.text.replace(old,o.label);}assert.deepEqual(ruleProjection(n,id),expected);assert.equal(t.body,sceneText(s,EVENTS[id]));assert.equal(t.dialogue,MAIN_STORY[id].replies[o.id]);assert.notEqual(t.dialogue,before.story[id].replies[o.id]);assert.equal(t.storyVersion,STORY_VERSION);assert.deepEqual(parseImport(exportSave(n)),n);assert.throws(()=>choose(n,id,o.id));}
});
test('38个主线结果不复用，主线正文与原费用前置配置逐项保留',()=>{
 const replies=mainIds.flatMap(id=>Object.values(MAIN_STORY[id].replies));assert.equal(replies.length,38);assert.equal(new Set(replies).size,38);
 for(const [id,old] of Object.entries(before.story))if(!mainIds.includes(id)&&!/^R/.test(id))assert.deepEqual(STORY[id],old);
 for(const [id,old] of Object.entries(before.events)){const now=clone(EVENTS[id]);if(mainIds.includes(id)||/^R/.test(id)||WORLD_STORY[id]){delete now.body;delete now.sceneVisible;const prior=clone(old);if(id==='M11')now.options=now.options.filter(o=>prior.options.some(p=>p.id===o.id));delete prior.body;delete prior.sceneVisible;if(id==='M06')prior.options.find(o=>o.id==='brief').label=now.options.find(o=>o.id==='brief').label;assert.deepEqual(now,prior,id);}else assert.deepEqual(now,old,id);}
});
for(const [id,source] of [['M02','M01'],['M07','M06'],['M10','M04'],['M12','M05']])test(`${id}只接${source}实际选择，缺少前事或未知旧选项不编造`,()=>{
 const seen=[];for(const o of EVENTS[source].options){const {checkpoints:p}=mainCheckpoints({choices:{[source]:o.id}}),s=p[id],text=mainSceneEcho(s,EVENTS[id]);assert.ok(text);seen.push(text);assert.ok(sceneText(s,EVENTS[id]).includes(text));const n=choose(s,id,EVENTS[id].options[0].id);assert.ok(n.transcripts[id].body.includes(text));}
 assert.equal(new Set(seen).size,3);const s=clone(checkpoints.weekly[id]);delete s.events[source];assert.equal(mainSceneEcho(s,EVENTS[id]),'');s.events[source]={completed:true,outcomeId:'legacy-unknown'};assert.equal(mainSceneEcho(s,EVENTS[id]),'');
});
test('主线可见场景不把皇帝内心与前世记忆发送给人物，暗停香仍不能生成知情接话',()=>{
 for(const id of mainIds){const source=checkpoints.weekly[id],actor=EVENTS[id].actor;if(!actorUnlocked(source,actor))assert.throws(()=>buildAIContext(source,actor,id));const s=choose(source,id,EVENTS[id].options[0].id),ctx=buildAIContext(s,actor,id);assert.ok(ctx.event.visibleScene);assert.ok(!/上一世|你记得|旧梦|重生|你想起/.test(ctx.event.visibleScene),id);}
 const n=choose(checkpoints.weekly.M03,'M03','quiet');assert.throws(()=>buildReactionContext(n,'C07','M03'));assert.equal(n.flags.incenseExplanationDue,true);
});
test('未赴约、未送礼和未执行的主线意向不变成实际人物活动或完成项目',()=>{
 const visit=choose(checkpoints.weekly.M05,'M05','visit');assert.equal(visit.flags.visitDiscussed,true);assert.ok(!visit.weekly.plans.some(p=>p.actor==='C06'));assert.ok(!visit.promises.some(p=>p.actor==='C06'));
 const music=choose(checkpoints.weekly.M09,'M09','music');assert.ok(!music.weekly.activities?.inventory.some(i=>/旧谱/.test(i.name)));assert.ok(!music.weekly.plans.some(p=>p.actor==='C05'));
 for(const id of ['M04','M10','M12']){const n=choose(checkpoints.weekly[id],id,EVENTS[id].options[0].id);assert.ok(!Object.values(n.weekly.projects?.items||{}).some(p=>p.status==='completed'));}
});
test('已有S07正文与一周回顾只读和续写均保留，新主线才采用当前正文版本',()=>{
 const raw=fs.readFileSync(new URL('../docs/施工/证据/2026-10-24-S07/开局偏政务_回访后_浏览器存档.json',import.meta.url),'utf8'),old=parseImport(raw),h=hash(old),texts=clone(old.transcripts),reports=clone(old.weekly.reports);
 assert.equal(old.transcripts.M01.storyVersion,2);for(const id of Object.keys(texts))buildAIContext(old,texts[id].actor,texts[id].eventId);assert.equal(hash(old),h);assert.deepEqual(parseImport(exportSave(old)),old);
 let s=old;for(let guard=0;!s.events.M03?.completed&&guard<60;guard++){const n=s.weekly.notices.find(n=>n.status==='pending'&&!n.suspended&&ordinal(n.date)<=ordinal(s.date));const e=requiredEvents(s)[0];s=commit(s,preview(s,[n?{type:'week-resolve',noticeId:n.id,choice:n.choices?.[0]}:e?{type:'event',eventId:e.id,choiceId:e.options[0].id}:{type:'week-advance'}])).state;}
 assert.ok(s.events.M03?.completed);for(const [id,t] of Object.entries(texts))assert.deepEqual(s.transcripts[id],t);assert.deepEqual(s.weekly.reports.slice(0,reports.length),reports);assert.equal(s.transcripts.M03.storyVersion,STORY_VERSION);
});
