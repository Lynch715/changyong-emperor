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
const __evidence=f=>{try{return f()}catch(e){if(e&&e.code==='ENOENT')return null;throw e}};

const evidence=new URL('../docs/施工/证据/2026-10-24-S08-01/',import.meta.url),read=n=>__evidence(()=>JSON.parse(fs.readFileSync(new URL(n,evidence),'utf8')));
const before=read('施工前剧情与规则基线.json'),rules=read('施工前分支规则结果.json');
const checkpoints={weekly:mainCheckpoints().checkpoints,quarter:mainCheckpoints({weekly:false}).checkpoints};
const choose=(s,id,choiceId)=>commit(s,preview(s,[{type:'event',eventId:id,choiceId}])).state;


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

