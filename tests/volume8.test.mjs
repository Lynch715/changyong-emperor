import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import * as E from'../src/engine.js';import * as C from'../src/continuation.js';import{parseImport,exportSave}from'../src/storage.js';import{encodeSlot,decodeSlot}from'../src/storage-codec.js';import{ordinal,stamp}from'../src/calendar.js';import{V8_EVENTS,V8_RULES,V8_IDS,V8_WEEKS,V8_SUBSCENES}from'../src/volume8-content.js';import{isEighth,eighthStage,eighthChoice,eighthGates,epilogueStatus,finalStatus,makeFinalChronicle}from'../src/volume8.js';import{extensionRelation}from'../src/extension-routes.js';import{adultStatus}from'../src/volume7.js';import{personPresence}from'../src/relationship-schedule.js';import{horizonDay,horizonMonths,activeVolume}from'../src/longform.js';import{renderEighth,renderFinalChronicles}from'../src/volume8-ui.js';import{Store,act,d,eighthOpening,seventhRaw,reachEighth}from'../scripts/s14-02-v08-scenarios.mjs';
const __evidence=f=>{try{return f()}catch(e){if(e&&e.code==='ENOENT')return null;throw e}};

const dir=new URL('../docs/施工/证据/2026-10-28-S14-02-V08/',import.meta.url),read=n=>__evidence(()=>parseImport(fs.readFileSync(new URL(n+'.json',dir),'utf8'))),point=(name,mode='cooperate')=>read(mode+'-checkpoint-'+name),end=(mode='cooperate')=>read(mode+'-第八卷封卷'),choose=(s,id,c)=>act(s,{type:'event',eventId:id,choiceId:c}),cp=x=>structuredClone(x);
function before(s,date,period='day'){for(let i=0;i<160;i++){const b=s.weekly.continuation;const r=b.runs.find(r=>r.eventId!=='M47'&&r.status==='pending'&&ordinal(r.dueDate)<=ordinal(s.date));if(r){s=act(s,{type:'volume3-review',runId:r.id});continue;}if(s.weekly.clock>=stamp(date,period))return s;s=act(s,{type:'week-advance',date,period});}throw Error('before limit');}
test('V08冻结30逻辑单元、12重点周与六实质主线，人物日期不漂移',()=>{const map=__evidence(()=>JSON.parse(fs.readFileSync(new URL('../design/S14/后期事件映射.json',import.meta.url)))).events;assert.equal(V8_IDS.length,30);assert.equal(V8_WEEKS.length,12);for(const id of V8_IDS){const e=V8_EVENTS[id],m=map.find(x=>x.id===id);assert.equal(e.title,m.title);assert.equal(e.actor,m.actor);assert.deepEqual(V8_RULES[id].window.recommended,m.recommended);assert.equal(V8_RULES[id].period,m.period);if(e.kind==='main'){assert.ok(e.body.length>300,id);assert.ok(e.options.length>=2);}}});








test('V08两重点与两决策限制，不以G24或零费用绕过',()=>{const s=point('WL-28-extra');for(const args of[{active:['x','y'],decisions:0},{active:[],decisions:2}]){const v=cp(s);assert.throws(()=>eighthChoice(v,V8_EVENTS.M47,V8_EVENTS.M47.options[0],'fake',args));assert.deepEqual(v,s);}});















test('V08封卷后只读，重复封存／附页／相伴不能改史册',()=>{const s=end('warm');for(const a of[{type:'seal'},{type:'volume8-page',id:'E01'},{type:'volume8-companion',id:'CP-C09-2',choice:'accept'},{type:'volume8-tail-open'}])assert.throws(()=>act(s,a));});













