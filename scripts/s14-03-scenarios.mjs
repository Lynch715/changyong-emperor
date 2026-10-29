import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as E from '../src/engine.js';
import {parseImport,exportSave} from '../src/storage.js';
import {ordinal,stamp} from '../src/calendar.js';
import {act,Store} from './s14-02-v03-scenarios.mjs';
import {reachSeventh} from './s14-02-v07-scenarios.mjs';
import {runEighth} from './s14-02-v08-scenarios.mjs';
import {lifeRecords,volumeLifeView} from '../src/volume-life.js';
export {act,Store};
export const dir=new URL('../docs/施工/证据/2026-10-28-S14-03/',import.meta.url);
export const read=p=>parseImport(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
export function oldUnsealed(volume){
 if(volume===7)return read('docs/施工/证据/2026-10-27-S14-02-V07/warm-checkpoint-26-B.json');
 if(volume===8)return read('docs/施工/证据/2026-10-28-S14-02-V08/warm-checkpoint-before-seal.json');
 const path=`docs/施工/证据/2026-10-27-S14-02-V0${volume}/`,name=fs.readdirSync(new URL('../'+path,import.meta.url)).find(n=>n.includes('封卷前')&&n.endsWith('.json'));
 const bundle=JSON.parse(fs.readFileSync(new URL('../'+path+name,import.meta.url)));
 return parseImport(bundle.records.find(r=>r.key.endsWith('-auto')).raw);
}
export function settleRoot(s){for(let i=0;i<80;i++){
 const n=s.weekly.notices.find(n=>n.status==='pending'&&!n.suspended&&ordinal(n.date)<=ordinal(s.date));
 if(n){s=act(s,{type:'week-resolve',noticeId:n.id,...(n.choices?{choice:n.choices[0]}:{})});continue;}
 const e=E.requiredEvents(s)[0];if(!e)return s;
 s=act(s,{type:'event',eventId:e.id,choiceId:e.kind==='relation'?'work':e.kind==='extension'?'cooperate':e.options[0].id,...(e.id==='M06'?{params:{attitudes:{C09:'none',C10:'none'}}}:{})});
 }throw Error('root settle');}
export function reachRoot(s,date,period='day'){for(let i=0;i<400;i++){s=settleRoot(s);if(s.weekly.clock>=stamp(date,period))return s;s=act(s,{type:'week-advance',date,period});}throw Error('root reach');}
export function rootLife(volume){let s=read(`docs/施工/证据/2026-10-28-S14-03/新局_${volume===1?'M04':'M08'}前.json`);s=act(s,{type:'life-enable'});const year=volume,month=volume===1?7:4;
 for(const [i,exercise]of ['read','compare','compose'].entries()){s=reachRoot(s,{year,month,day:2+i},'evening');s=act(s,{type:'week-plan',kind:'study',actor:'C01',date:s.date,period:'evening',exercise});s=act(s,{type:'week-fulfill',planId:s.weekly.plans.at(-1).id});}
 s=act(s,{type:'life-personal',direction:'study'});if(volume===2){s=reachRoot(s,{year:2,month:4,day:8});s=act(s,{type:'event',eventId:'G05',choiceId:'escort'});}return reachRoot(s,{year,month:12,day:30},'evening');}
export function matrixLife(volume){let s=volume<=2?rootLife(volume):act(oldUnsealed(volume),{type:'life-enable'});if(volume>2)s=act(s,{type:'life-personal',direction:volume===3?'study':'training'});if(volume===7)s=reachSeventh(s,{year:26,month:12,day:30},{},'evening');const v=volumeLifeView(s,volume);assert.ok(v.government.some(x=>['review','project-report'].includes(x.kind)||x.id==='G24')&&v.relationship.length&&v.works.length);E.validateSave(s);return{s,matrix:{volume,title:v.title,years:[v.start,v.end],completedGovernment:v.government.filter(x=>['review','project-report'].includes(x.kind)||x.id==='G24').map(x=>({id:x.id,title:x.title,date:x.date})),government:v.government.map(x=>({id:x.id,title:x.title,date:x.date,transactionId:x.transactionId})),relationship:v.relationship.map(x=>({id:x.id,title:x.title,date:x.date,transactionId:x.transactionId})),personal:v.works.map(x=>({id:x.id,sources:x.sources,date:x.date})),annual:v.years.map(x=>({id:x.id,sourceCount:x.sources.length,pending:x.pending,textLength:x.text.length})),cooperationAllowed:true}};}
export async function lateLife(mode='cooperate'){
 let s=read(`docs/施工/证据/2026-10-27-S14-02-V07/${mode}-checkpoint-26-B.json`);const old=structuredClone(s);s=act(s,{type:'life-enable'});s=act(s,{type:'life-personal',direction:'training'});s=reachSeventh(s,{year:26,month:12,day:30},{},'evening');s=act(s,{type:'seal'});fs.writeFileSync(new URL(`${mode}_第七卷新手记封卷.json`,dir),exportSave(s));
 const prefix=structuredClone(lifeRecords(s));const r=await runEighth(mode,exportSave(s));s=r.s;assert.deepEqual(lifeRecords(s).slice(0,prefix.length),prefix);for(const[k,v]of Object.entries(old.transcripts))assert.deepEqual(s.transcripts[k],v);assert.deepEqual(s.ending,old.ending);E.validateSave(s);fs.writeFileSync(new URL(`${mode}_第八卷含跨年回望.json`,dir),exportSave(s));return s;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 fs.mkdirSync(dir,{recursive:true});
 if(process.argv[2]==='late'){for(const mode of ['cooperate','warm']){const s=await lateLife(mode);console.log(JSON.stringify({mode,years:lifeRecords(s).filter(x=>x.kind==='year').map(x=>({year:x.year,sources:x.sources.length,pending:x.pending.length})),final:s.weekly.continuation.chronicles[0].id}));}}
 else {const matrix=[];for(let volume=1;volume<=8;volume++){const r=matrixLife(volume);matrix.push(r.matrix);fs.writeFileSync(new URL(`第${volume}卷_逐卷手记规则验收.json`,dir),exportSave(r.s));console.log(JSON.stringify({volume,government:r.matrix.government.length,relationship:r.matrix.relationship.length,personal:r.matrix.personal.length,annual:r.matrix.annual}));}fs.writeFileSync(new URL('八卷来源矩阵.json',dir),JSON.stringify(matrix,null,2));}
}
