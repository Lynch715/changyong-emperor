// Continuous runs start at createWeeklyGame in runPlaystyle. Every next volume
// consumes the state just produced; no historical checkpoint is imported.
import fs from 'node:fs';import zlib from 'node:zlib';import assert from 'node:assert/strict';
import {runPlaystyle} from './s13-02-scenarios.mjs';import {runVolume} from './s14-02-v03-scenarios.mjs';
import {runFourth} from './s14-02-v04-scenarios.mjs';import {runFifth} from './s14-02-v05-scenarios.mjs';import {runSixth} from './s14-02-v06-scenarios.mjs';import {runSeventh} from './s14-02-v07-scenarios.mjs';import {runEighth} from './s14-02-v08-scenarios.mjs';
import * as E from '../src/engine.js';import {exportSave,saveEnvelope,STORAGE_KEY} from '../src/storage.js';import {Store} from './s14-02-v03-scenarios.mjs';import {compactContinuationBundle,continuationPrefix} from '../src/continuation.js';import {usedSlots} from '../src/week.js';
const runLabel=process.env.FINAL_QA_RUN;if(runLabel&&!/^[a-z0-9-]+$/.test(runLabel))throw Error('invalid run label');
const mode=process.argv[2]||'cooperation',warm=mode==='parallel',dir=new URL(runLabel?'../docs/施工/证据/2026-10-28-界面节奏数值审计/'+runLabel+'/':'../docs/施工/证据/2026-10-28-最终验收/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
const volumes=[];let s,sourceRaw,beforeSeal;
function capture(volume,state){E.validateSave(state);if(s){for(const[k,t]of Object.entries(s.transcripts))assert.deepEqual(state.transcripts[k],t);assert.deepEqual(state.ending,s.ending);}const item={volume,date:state.date,gameId:state.gameId,transactions:state.transactions.length,months:state.weekly.monthly.length,main:Object.keys(state.events).filter(id=>/^M\d\d$/.test(id)&&state.events[id].completed).length,transcripts:Object.keys(state.transcripts).length,treasury:state.stats.treasury,weeks:state.weekly.weeks.length,slots:state.weekly.weeks.reduce((n,w)=>n+usedSlots(state,w.id),0),family:state.weekly.continuation?.family?.child?.date||null};volumes.push(item);fs.writeFileSync(new URL(`${mode}-卷${volume}.json.gz`,dir),zlib.gzipSync(JSON.stringify(state)));s=state;console.log(JSON.stringify(item));}
try{
 capture(2,runPlaystyle(mode,{roundtrip:false}).s);
 capture(3,(await runVolume(warm?'warm':'cooperate',exportSave(s))).s);
 capture(4,(await runFourth(warm?'pregnancy':'cooperate',exportSave(s))).s);
 capture(5,(await runFifth(warm?'warm':'cooperate',exportSave(s))).s);
 capture(6,(await runSixth(warm?'warm':'cooperate',exportSave(s))).s);
 capture(7,(await runSeventh(warm?'warm':'cooperate',exportSave(s))).s);
 sourceRaw=exportSave(s);const final=await runEighth(warm?'warm':'cooperate',sourceRaw,(state,label)=>{if(label==='before-seal')beforeSeal=structuredClone(state);});capture(8,final.s);
 assert.equal(volumes.at(-1).main,48);assert.equal(s.weekly.monthly.length,360);assert.equal(s.weekly.monthly.reduce((n,m)=>n+m.income-m.expense,0),s.weekly.economy?.version===2?156:1080);
 let balance=60;for(const l of s.ledger){balance+=l.amount;assert.equal(l.balance,balance);}assert.equal(balance,s.stats.treasury);
 for(const w of s.weekly.weeks)assert.ok(usedSlots(s,w.id)<=6,w.id);
 const ids=Object.keys(s.events),missing=[];for(const prefix of ['M','G','P'])for(let i=1;i<=({M:48,G:24,P:12})[prefix];i++){const id=prefix+String(i).padStart(2,'0');if(!s.events[id]?.completed)missing.push(id);}const relations=ids.filter(id=>/^R0[2-8]-0[1-6]$/.test(id)),extensions=ids.filter(id=>/^XR(?:09|10)-0[1-6]$/.test(id));assert.equal(relations.length,42);assert.equal(extensions.length,12);
 const result={mode,fromFreshGame:true,checkpointImports:0,volumes,main:48,government:ids.filter(id=>/^G\d\d$/.test(id)).length,side:ids.filter(id=>/^P\d\d$/.test(id)).length,relations:42,extensions:12,missing,monthly:360,ledger:s.ledger.length,final:s.weekly.continuation.chronicles[0],family:s.weekly.continuation.family,treasury:s.stats.treasury};
 fs.writeFileSync(new URL(mode+'-三十年汇总.json',dir),JSON.stringify(result,null,2));
 const st=new Store();saveEnvelope(beforeSeal,null,st);const id=beforeSeal.weekly.continuation.copyId,prefix=continuationPrefix(id),suffix=['-auto','-previous','-import-backup',...Array.from({length:5},(_,i)=>'-manual-'+i)];const bundle={format:'changyong-continuation-bundle',bundleVersion:1,copyId:id,sourceRaw,records:suffix.map((suffix,i)=>({key:prefix+suffix,raw:i===0?st.getItem(STORAGE_KEY):null}))};fs.writeFileSync(new URL(mode+'-真实新档三十年封卷前紧凑包.json',dir),await compactContinuationBundle(JSON.stringify(bundle)));
 console.log(JSON.stringify({mode,complete:true,missing,final:result.final.id}));
}catch(e){fs.writeFileSync(new URL(mode+'-失败.json',dir),JSON.stringify({mode,volumes,message:e.message,stack:e.stack},null,2));throw e;}
