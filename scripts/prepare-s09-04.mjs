// Local acceptance saves only. No game debug route, provider call or real save write.
import fs from'node:fs';import{fileURLToPath}from'node:url';import*as E from'../src/engine.js';import{exportSave}from'../src/storage.js';import{buildAIContext}from'../src/input.js';
const dir=fileURLToPath(new URL('../docs/施工/证据/2026-10-25-S09-04/',import.meta.url));
const act=(s,a)=>E.commit(s,E.preview(s,[a])).state;
let s=act(E.createWeeklyGame(),{type:'event',eventId:'M01',choiceId:'steady'});
s=act(s,{type:'week-plan',kind:'chat',actor:'C02',date:{year:1,month:1,day:3},period:'day'});s=act(s,{type:'week-fulfill',planId:s.weekly.plans.at(-1).id});
s=E.recordMessage(s,'C02','player','朕夜里不爱浓茶');s=E.savePreference(s,'C02','朕夜里不爱浓茶',s.messages.at(-1).id);
s=E.recordMessage(s,'C02','player','我不同意把没答应的散步当成约好，回信的日子还没有说定。');s=E.recordMessage(s,'C02','npc','这件事先留着，不能把分歧说成已经和好。');
for(let i=0;i<40;i++)s=E.recordMessage(s,'C02',i%2?'npc':'player','今日廊下第'+(i+1)+'片叶子落下了，先听一听窗外的风。');
s=E.recordMessage(s,'C06','player','仅宜修听过的私下核对，苏培盛尚不知情。');
s=act(s,{type:'week-plan',kind:'walk',actor:'C02',date:{year:1,month:1,day:4},period:'day'});
E.validateSave(s);fs.writeFileSync(dir+'长谈与未赴约_验收起点.json',exportSave(s));fs.writeFileSync(dir+'三层记忆_起点上下文.json',JSON.stringify(buildAIContext(s,'C02',null),null,2));
console.log(JSON.stringify({messages:s.messages.length,remaining:s.remaining,treasury:s.stats.treasury,plans:s.weekly.plans.map(p=>({kind:p.kind,status:p.status})),summaryCount:E.memoryBook(s,'C02').summaries.length}));
