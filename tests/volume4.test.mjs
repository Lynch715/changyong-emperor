import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import * as E from'../src/engine.js';import * as C from'../src/continuation.js';import{storageForWorld,parseImport,exportSave}from'../src/storage.js';import{encodeSlot,decodeSlot,readSlot}from'../src/storage-codec.js';import{fourthOpening,thirdRaw,date as d,act,reachFourth,settleFourth,Store}from'../scripts/s14-02-v04-scenarios.mjs';import{horizonDay,activeVolume}from'../src/longform.js';import{familyStatus}from'../src/volume4.js';import{V4_EVENTS,V4_IDS,V4_RULES,V4_STORY}from'../src/volume4-content.js';import{personPresence}from'../src/relationship-schedule.js';import{portraitAsset}from'../src/art.js';import{ordinal,stamp}from'../src/calendar.js';
const __evidence=f=>{try{return f()}catch(e){if(e&&e.code==='ENOENT')return null;throw e}};

const dir=new URL('../docs/施工/证据/2026-10-27-S14-02-V04/',import.meta.url),read=n=>__evidence(()=>parseImport(fs.readFileSync(new URL(n,dir),'utf8'))),warm=()=>fs.readFileSync(new URL('相守第三卷_新生成输入.json',dir),'utf8'),choice=(s,id,c)=>act(s,{type:'event',eventId:id,choiceId:c}),source=()=>parseImport(thirdRaw());
async function cared(){const o=await fourthOpening(warm());let s=reachFourth(o.s,d(5,1,2));s=act(s,{type:'family-discuss',choice:'consider'});s=reachFourth(s,d(5,1,3));for(const day of[4,5,6])s=act(s,{type:'family-care',date:d(5,1,day)});return{...o,s};}
async function conceived(){const o=await cared();let s=reachFourth(o.s,d(5,4,6));s=act(s,{type:'family-start'});return{...o,s};}










test('V04六M、七R及政务群像扩展日常22单元与冻结映射一致',()=>{const mapping=__evidence(()=>JSON.parse(fs.readFileSync(new URL('../design/S14/后期事件映射.json',import.meta.url),'utf8'))).events;assert.equal(V4_IDS.length,22);for(const id of V4_IDS){const e=V4_EVENTS[id],m=mapping.find(m=>m.id===id);assert.equal(e.title,m.title);assert.equal(e.actor,m.actor);assert.deepEqual(V4_RULES[id].window.recommended,m.recommended);assert.equal(V4_RULES[id].period,m.period);if(e.kind==='main'){assert.ok(V4_STORY[id].body.length>300);assert.equal(new Set(Object.values(V4_STORY[id].replies)).size,3);}}});












