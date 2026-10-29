import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import * as E from'../src/engine.js';import * as C from'../src/continuation.js';import{parseImport,exportSave,storageForWorld}from'../src/storage.js';import{encodeSlot,decodeSlot}from'../src/storage-codec.js';import{factorJSON,unfactorJSON}from'../src/continuation-codec.js';import{V7_IDS,V7_EVENTS,V7_STORY,V7_RULES,V7_WEEKS}from'../src/volume7-content.js';import{isSeventh,adultStatus,seventhChoice,canOfferLate}from'../src/volume7.js';import{extensionRelation}from'../src/extension-routes.js';import{horizonDay,horizonMonths}from'../src/longform.js';import{ordinal,stamp}from'../src/calendar.js';import{personPresence}from'../src/relationship-schedule.js';import{seventhOpening,sixthRaw,reachSeventh,settleSeventh,act,Store,d}from'../scripts/s14-02-v07-scenarios.mjs';
const __evidence=f=>{try{return f()}catch(e){if(e&&e.code==='ENOENT')return null;throw e}};

const dir=new URL('../docs/施工/证据/2026-10-27-S14-02-V07/',import.meta.url),read=name=>__evidence(()=>parseImport(fs.readFileSync(new URL(name+'.json',dir),'utf8'))),end=(mode='cooperate')=>read(mode+'-第七卷封卷'),point=(label,mode='cooperate')=>read(mode+'-checkpoint-'+label),choose=(s,id,c,params)=>act(s,{type:'event',eventId:id,choiceId:c,...(params?{params}:{})});
function before(s,date){for(let i=0;i<600;i++){if(s.weekly.clock>=stamp(date))return s;s=settleSeventh(s);if(s.weekly.clock>=stamp(date))return s;s=act(s,{type:'week-advance',date});}throw Error('before limit');}
test('V07冻结21单元、12重点周、日期人物及主线实质分支',()=>{const map=__evidence(()=>JSON.parse(fs.readFileSync(new URL('../design/S14/后期事件映射.json',import.meta.url)))).events;assert.equal(V7_IDS.length,21);assert.equal(V7_WEEKS.length,12);for(const id of V7_IDS){const e=V7_EVENTS[id],m=map.find(x=>x.id===id);assert.equal(e.actor,m.actor);assert.equal(e.title,m.title);assert.deepEqual(V7_RULES[id].window.recommended,m.recommended);assert.equal(V7_RULES[id].period,m.period);if(e.kind==='main'){assert.ok(e.body.length>300,id);assert.ok(new Set(Object.values(V7_STORY[id].replies)).size>=3);}}});








test('V07新项目每周两次、两项重点在办，免费基础教育不绕过',()=>{const s=point('21-A');for(const args of[{active:['one','two'],decisions:0},{active:[],decisions:2}]){const x=structuredClone(s);assert.throws(()=>seventhChoice(x,V7_EVENTS.G23,V7_EVENTS.G23.options[0],'test',args));assert.deepEqual(x,s);}});
























test('V07结构传送保持用户引用键、非规范空白与UTF16原码单元',()=>{const raw=JSON.stringify({text:'引号"\\\ud800',nested:{$ref:3,r:1},rows:Array.from({length:20},()=>({value:'中文'.repeat(100)}))}),p=factorJSON(raw);assert.equal(unfactorJSON(p,raw.length),raw);const o=JSON.parse(p);o.dict[0]=[2,0];assert.throws(()=>unfactorJSON(JSON.stringify(o),raw.length));assert.throws(()=>unfactorJSON(p,raw.length-1));assert.equal(decodeSlot(encodeSlot(' \n'+raw+'\t')),' \n'+raw+'\t');});



