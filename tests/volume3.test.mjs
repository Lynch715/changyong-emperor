import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as E from '../src/engine.js';import{Store,nativeRaw,opening,act,reach,settle,runVolume}from'../scripts/s14-02-v03-scenarios.mjs';import * as C from '../src/continuation.js';import{storageForWorld,exportSave,parseImport}from'../src/storage.js';import{prepareMigration}from'../src/migration.js';import{horizonDay,horizonDate}from'../src/longform.js';import{V3_IDS,V3_EVENTS,V3_STORY,V3_WEEKS}from'../src/volume3-content.js';import{ordinal,stamp}from'../src/calendar.js';import{nextPersonalWindows,personPresence}from'../src/relationship-schedule.js';import{focusProjects}from'../src/governance.js';
const __evidence=f=>{try{return f()}catch(e){if(e&&e.code==='ENOENT')return null;throw e}};

const d=(year,month,day)=>({year,month,day});const clone=structuredClone;
const src=()=>parseImport(nativeRaw());const choice=(s,id,c)=>act(s,{type:'event',eventId:id,choiceId:c});












test('S14-02六主线每幕有独立正文及三种实质结果，15唯一单元',()=>{assert.equal(V3_IDS.length,15);const mapping=__evidence(()=>JSON.parse(fs.readFileSync(new URL('../design/S14/后期事件映射.json',import.meta.url),'utf8'))).events;for(const id of V3_IDS)assert.equal(V3_EVENTS[id].actor,mapping.find(e=>e.id===id).actor);for(const id of['M13','M14','M15','M16','M17','M18']){assert.ok(V3_STORY[id].body.length>300);assert.equal(new Set(Object.values(V3_STORY[id].replies)).size,3);assert.ok(Object.values(V3_STORY[id].replies).every(t=>t.length>60));}assert.equal(V3_WEEKS.length,8);});











