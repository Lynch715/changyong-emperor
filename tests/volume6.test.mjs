import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import * as E from'../src/engine.js';import * as C from'../src/continuation.js';import{parseImport,exportSave,storageForWorld}from'../src/storage.js';import{encodeSlot,decodeSlot}from'../src/storage-codec.js';import{V6_IDS,V6_EVENTS,V6_STORY,V6_RULES,V6_WEEKS}from'../src/volume6-content.js';import{isSixth,sixthStageDone,sixthChoice,sixthEventView}from'../src/volume6.js';import{horizonDay,horizonMonths}from'../src/longform.js';import{ordinal,stamp}from'../src/calendar.js';import{personPresence}from'../src/relationship-schedule.js';import{sixthOpening,fifthRaw,reachSixth,settleSixth,act,Store,d}from'../scripts/s14-02-v06-scenarios.mjs';
const __evidence=f=>{try{return f()}catch(e){if(e&&e.code==='ENOENT')return null;throw e}};

const dir=new URL('../docs/施工/证据/2026-10-27-S14-02-V06/',import.meta.url),read=mode=>__evidence(()=>parseImport(fs.readFileSync(new URL(mode+'-第六卷封卷.json',dir),'utf8'))),checkpoint=y=>__evidence(()=>parseImport(fs.readFileSync(new URL('checkpoint-'+y+'-A.json',dir),'utf8'))),choose=(s,id,c,params)=>act(s,{type:'event',eventId:id,choiceId:c,...(params?{params}:{})});
function before(s,date){for(let i=0;i<600;i++){if(s.weekly.clock>=stamp(date))return s;s=settleSixth(s);if(s.weekly.clock>=stamp(date))return s;s=act(s,{type:'week-advance',date});}throw Error('before limit');}let preSecret;const secretBase=()=>preSecret??=before(checkpoint(19),d(20,4,2));
test('V06冻结17单元、16重点周、日期人物与六主线三种实质分支',()=>{const m=__evidence(()=>JSON.parse(fs.readFileSync(new URL('../design/S14/后期事件映射.json',import.meta.url)))).events;assert.equal(V6_IDS.length,17);assert.equal(V6_WEEKS.length,16);for(const id of V6_IDS){const a=m.find(x=>x.id===id),e=V6_EVENTS[id];assert.equal(e.actor,a.actor);assert.equal(e.title,a.title);assert.deepEqual(V6_RULES[id].window.recommended,a.recommended);assert.equal(V6_RULES[id].period,a.period);if(e.kind==='main'){assert.ok(e.body.length>300,id);assert.equal(new Set(Object.values(V6_STORY[id].replies)).size,3);}}});











test('V06两项在办与每周两次新项目决定限制不能由免费文书绕过',()=>{const s=checkpoint(13);for(const args of[{active:['one','two'],decisions:0},{active:[],decisions:2}]){const x=structuredClone(s);assert.throws(()=>sixthChoice(x,V6_EVENTS.M32,V6_EVENTS.M32.options[0],'test',args));assert.deepEqual(x,s);}});














test('V06非规范空白、引号、反斜线、代理项与用户自有引用键原样保持',()=>{const a={text:'引号"反斜线\\与~2;\ud800',nested:{'$ref':3,r:1},array:Array.from({length:300},()=>({value:'甲乙丙'.repeat(100),key:'same'}))};for(const raw of[JSON.stringify(a),' \n'+JSON.stringify(a,null,2)+'\n\t'])assert.equal(decodeSlot(encodeSlot(raw)),raw);});


