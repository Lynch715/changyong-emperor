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
const __evidence=f=>{try{return f()}catch(e){if(e&&e.code==='ENOENT')return null;throw e}};

const dir=new URL('../docs/施工/证据/2026-10-24-S08-02/',import.meta.url),json=n=>__evidence(()=>JSON.parse(fs.readFileSync(new URL(n,dir),'utf8'))),prior=json('施工前剧情与规则基线.json'),baseline=json('施工前84分支规则与起点.json');
const step=(s,a)=>commit(s,preview(s,[a])).state,choose=(s,id,choiceId)=>step(s,{type:'event',eventId:id,choiceId});
const paths={};const path=tone=>paths[tone]||=(relationPath({tone}));


for(const cid of routeActors)test(`${cid}后幕接三种真实首选，后来双方保持距离不篡改从前选择`,()=>{
 const second='R'+cid.slice(1)+'-02',first=second.replace(/02$/,'01'),echoes=[];
 for(const tone of ['warm','work','distance']){const s=path(tone).checkpoints[second],old=clone(s.events[first]),h=hash(s),text=relationSceneEcho(s,EVENTS[second]);assert.ok(text.includes(RELATION_STORY[second].echo[tone]));echoes.push(text);assert.equal(hash(s),h);
  for(const party of ['playerIntent','npcIntent']){let b=clone(s);b.relations[cid][party]='仅合作';const before=hash(b),echo=relationSceneEcho(b,EVENTS[second]);assert.ok(echo);assert.deepEqual(b.events[first],old);assert.equal(hash(b),before);if(tone==='warm')assert.ok(!echo.includes(RELATION_STORY[second].echo.distance));assert.throws(()=>choose(b,second,'warm'));assert.doesNotThrow(()=>choose(b,second,'work'));}
 }
 assert.equal(new Set(echoes).size,3);let s=clone(path('warm').checkpoints[second]);delete s.events[first];assert.equal(relationSceneEcho(s,EVENTS[second]),'');s.events[first]={completed:true,outcomeId:'unknown-legacy'};assert.equal(relationSceneEcho(s,EVENTS[second]),'');
});

test('延期边书首谈三选各有写出结果，未送达和未读答复不提前替年羹尧表态',()=>{
 let s=path('warm').checkpoints['R03-01'];s=step(s,{type:'defer',eventId:'R03-01'});s=reachRoute(s,{year:2,month:7,day:3});const out=[];assert.equal(memoryEcho(s,getEvent(s,'R03-01')),'');assert.equal(relationSceneEcho(s,getEvent(s,'R03-01')),'');
 for(const choice of ['warm','work','distance']){const before=clone(s.relations.C03),n=choose(s,'R03-01',choice);assert.equal(n.events['R03-01'].channel,'letter');assert.equal(n.relations.C03.trust,before.trust);assert.equal(n.relations.C03.npcIntent,before.npcIntent);assert.match(n.transcripts['R03-01'].dialogue,/封好交驿/);assert.match(n.transcripts['R03-01'].dialogue,/尚未读到/);assert.ok(!visibleContext(n,'C03').facts.some(f=>f.id==='FACT_R03-01'));out.push(n.transcripts['R03-01'].dialogue);}
 assert.equal(new Set(out).size,3);
});




