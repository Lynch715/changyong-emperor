import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import * as E from'../src/engine.js';import * as C from'../src/continuation.js';import{parseImport,exportSave,storageForWorld}from'../src/storage.js';import{encodeSlot,decodeSlot}from'../src/storage-codec.js';import{V5_IDS,V5_EVENTS,V5_STORY,V5_RULES,V5_WEEKS}from'../src/volume5-content.js';import{isFifth,fifthEventDate,fifthEventView,birthdayItems,fifthStageDone}from'../src/volume5.js';import{horizonDay,horizonMonths}from'../src/longform.js';import{ordinal,stamp}from'../src/calendar.js';import{personPresence}from'../src/relationship-schedule.js';import{extensionWork,extensionRelation}from'../src/extension-routes.js';import{fifthOpening,fourthRaw,reachFifth,settleFifth,act,Store,d}from'../scripts/s14-02-v05-scenarios.mjs';
import{fourthOpening,reachFourth}from'../scripts/s14-02-v04-scenarios.mjs';
const __evidence=f=>{try{return f()}catch(e){if(e&&e.code==='ENOENT')return null;throw e}};

const dir=new URL('../docs/施工/证据/2026-10-27-S14-02-V05/',import.meta.url),read=mode=>__evidence(()=>parseImport(fs.readFileSync(new URL(mode+'-第五卷封卷.json',dir),'utf8'))),choose=(s,id,c)=>act(s,{type:'event',eventId:id,choiceId:c});
function before(s,date,choices={}){for(let i=0;i<650;i++){if(s.weekly.clock>=stamp(date))return s;s=settleFifth(s,choices);if(s.weekly.clock>=stamp(date))return s;s=act(s,{type:'week-advance',date});}throw Error('before limit');}
test('V05冻结22单元、人物、日期、占格与六幕三种正文保持合同',()=>{const m=__evidence(()=>JSON.parse(fs.readFileSync(new URL('../design/S14/后期事件映射.json',import.meta.url)))).events;assert.equal(V5_IDS.length,22);assert.equal(V5_WEEKS.length,12);for(const id of V5_IDS){const a=m.find(x=>x.id===id),e=V5_EVENTS[id];assert.equal(e.actor,a.actor);assert.equal(e.title,a.title);assert.deepEqual(V5_RULES[id].window.recommended,a.recommended);assert.equal(V5_RULES[id].period,a.period);if(e.kind==='main'){assert.ok(e.body.length>300,id);assert.equal(new Set(Object.values(V5_STORY[id].replies)).size,3);}}assert.equal(V5_EVENTS.M28.actor,'C21');assert.match(V5_EVENTS.M28.body,/太后/);assert.match(V5_EVENTS.M30.body,/内务府/);});



























