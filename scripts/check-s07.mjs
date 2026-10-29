import fs from 'node:fs';
import assert from 'node:assert/strict';
import {opening,summer} from './s07-scenarios.mjs';
import {ordinal} from '../src/calendar.js';
const dir=new URL('../docs/施工/证据/2026-10-24-S07/',import.meta.url),fixtures=process.argv.includes('--fixtures');
const save=(name,s,metadata={})=>{if(fixtures)fs.writeFileSync(new URL(name,dir),JSON.stringify({format:'changyong-save',qaOnly:true,...metadata,state:s},null,2));};
const proofs=[];for(const phase of ['opening','summer'])for(const style of ['court','life']){const result=(phase==='opening'?opening:summer)(style),x=result.summary;assert.equal(x.slots,6);assert.ok(x.review.sources.length);if(phase==='opening'){assert.equal(x.courtStatus,'completed');assert.equal(ordinal(result.final.date)-ordinal(result.final.events['WG-C02'].date),7);}else{assert.equal(x.before,60);assert.equal(x.afterFunds,52);assert.equal(x.afterExecution,52);assert.equal(x.militaryExpenses,8);assert.equal(ordinal(x.due)-ordinal(result.final.events.G05.date),21);assert.ok(x.invitation);assert.match(x.generalReply,/前营签领的抄报到了/);}
 const label=(phase==='opening'?'开局':'二年初夏')+'_'+(style==='court'?'偏政务':'偏生活');for(const [key,s] of Object.entries(result))if(s?.worldVersion)save(label+'_'+key+'.json',s,phase==='summer'?{fixture:result.metadata}:{});proofs.push({phase,style,...x});}
const native=summer('court',{normalized:false});assert.equal(native.summary.before-native.summary.afterFunds,8);assert.equal(native.summary.afterFunds,native.summary.afterExecution);
console.log(JSON.stringify({version:'0.8.0',scope:'四条六格路径；开局为原生起点，初夏60点为单独QA预算基线，另证连续原生费用',proofs,nativeSummer:{before:native.summary.before,afterFunds:native.summary.afterFunds,afterExecution:native.summary.afterExecution,militaryExpenses:native.summary.militaryExpenses},limits:['每周结束不等于项目完工；开局回访至15日，军事21日后验收，抄报7日送达后再通信','独立60点预算行不是正式游戏动作，正式入口无跳年或赠款','桌面、真实模型、手机与长期平衡分别验收']},null,2));
