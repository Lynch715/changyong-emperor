// Runs only against memory stores and new evidence files; never reads browser storage.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as E from '../src/engine.js';
import {storageForWorld,exportSave,parseImport} from '../src/storage.js';
import {prepareMigration,commitMigration,exportMigrationBundle,importMigrationBundle,readMigrationOriginal} from '../src/migration.js';
const dir=new URL('../docs/施工/证据/2026-10-27-S13-06/',import.meta.url);
const load=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const sha=x=>createHash('sha256').update(x).digest('hex');
class Store{map=new Map();get length(){return this.map.size;}key(i){return [...this.map.keys()][i]??null;}getItem(k){return this.map.get(k)??null;}setItem(k,v){this.map.set(k,String(v));}removeItem(k){this.map.delete(k);}}
const quarter=load('../docs/施工/证据/2026-10-24-S02/原5173季度档_只读复核.json');
const weekly=load('../docs/施工/证据/2026-10-27-S13-05/浏览器_封卷前八槽.json');
const base=new Store();for(const a of [quarter,weekly])for(const r of a.records)if(r.raw!==null)base.setItem(r.key,r.raw);
const rows=[];let valid=0;
for(const [world,a,other] of [['quarter',quarter,weekly],['weekly',weekly,quarter]]){
 const store=new Store();store.map=new Map(base.map);const api=storageForWorld(world,store),original=new Map(store.map);
 const current=api.readEnvelope();assert.ok(current);const candidates=api.manualSlots().map((s,i)=>s&&!s.error?i:null).filter(x=>x!==null);assert.ok(candidates.length);
 const index=candidates.at(-1),restored=api.loadManual(index),rawBefore=store.getItem(api.STORAGE_KEY);
 assert.deepEqual(store.map,original);api.backupBeforeRestore();api.saveEnvelope(restored,current.writeId);
 assert.deepEqual(api.readEnvelope().state,restored);assert.equal(store.getItem(api.STORAGE_KEY.replace(/-auto$/,'-import-backup')),rawBefore);
 for(const r of a.records.filter(r=>r.key.includes('-manual-')))assert.equal(store.getItem(r.key),r.raw);
 for(const r of other.records)assert.equal(store.getItem(r.key),r.raw);
 assert.deepEqual(api.importBackup(),current.state);assert.deepEqual(api.loadManual(index).transcripts,restored.transcripts);
 const after=new Map(store.map);assert.throws(()=>api.parseImport('{broken'));assert.throws(()=>api.saveEnvelope(restored,'stale-token'));assert.deepEqual(store.map,after);
 assert.throws(()=>api.parseImport(exportSave(E.createGame().worldVersion===restored.worldVersion?E.createWeeklyGame():E.createGame())));assert.deepEqual(store.map,after);
 for(const r of a.records)if(r.raw){parseImport(r.raw);valid++;}
 rows.push({world,manualSlot:index+1,otherWorldSlotsUnchanged:8,manualRawUnchanged:5,restoreBackupRawExact:true,historyRestored:true,badImportAtomic:true,staleTokenAtomic:true});
}
// A fresh synthetic quarter original, migrated through the public migration API.
let source=E.createGame();source=E.commit(source,E.preview(source,[{type:'event',eventId:'M01',choiceId:E.getEvent(source,'M01').options[0].id}])).state;
const sourceRaw=exportSave(source),store=new Store();store.map=new Map(base.map);const baseline=new Map(store.map);
const plan=await prepareMigration(sourceRaw,{storage:store,label:'S13-06隔离演练'});assert.deepEqual(store.map,baseline);
await commitMigration(plan,store);const api=storageForWorld('weekly',store,plan.copyId);let env=api.readEnvelope();
for(let i=0;i<5;i++)api.saveManual(env.state,i);api.backupBeforeRestore();
let progressed=env.state;
for(let i=0;![...E.requiredEvents(progressed),...E.availableEvents(progressed)].some(e=>e.id==='M02');i++){
 assert.ok(i<20,'M02 did not become available');
 const e=E.requiredEvents(progressed)[0];
 const action=e?{type:'event',eventId:e.id,choiceId:e.options[0].id}:{type:'week-advance'};
 progressed=E.commit(progressed,E.preview(progressed,[action])).state;
}
const played=E.commit(progressed,E.preview(progressed,[{type:'event',eventId:'M02',choiceId:E.getEvent(progressed,'M02').options[0].id}])).state;api.saveEnvelope(played,env.writeId);
const bundle=exportMigrationBundle(plan.copyId,store),copyArchive=JSON.parse(api.exportArchive());
const blank=new Store();blank.map=new Map(base.map);await importMigrationBundle(bundle,blank);
for(const r of JSON.parse(bundle).records)assert.equal(blank.getItem(r.key),r.raw);
assert.equal(readMigrationOriginal(plan.copyId,blank),sourceRaw);for(const [k,v] of baseline)assert.equal(blank.getItem(k),v);
const freshAPI=storageForWorld('weekly',blank,plan.copyId);assert.deepEqual(freshAPI.readEnvelope().state.transcripts,played.transcripts);
env=freshAPI.readEnvelope();const next=E.commit(env.state,E.preview(env.state,[{type:'event',eventId:'R02-01',choiceId:'work'}])).state;freshAPI.saveEnvelope(next,env.writeId);
const newer=new Map(blank.map),again=await importMigrationBundle(bundle,blank);assert.equal(again.duplicate,true);assert.deepEqual(blank.map,newer);
const corrupt=JSON.parse(bundle);corrupt.sourceRaw+=' ';await assert.rejects(()=>importMigrationBundle(JSON.stringify(corrupt),blank));assert.deepEqual(blank.map,newer);
for(const r of JSON.parse(bundle).records)if(r.raw){parseImport(r.raw);valid++;}
const result={date:'2026-10-27',stores:'仅内存隔离，不读写实际浏览器来源',ordinaryWorlds:rows,validatedNonemptyStates:valid,migration:{copyId:plan.copyId,sourceRawSHA256:sha(sourceRaw),eightSlotRawExact:true,originalRawExact:true,otherSixteenSlotsUnchanged:true,duplicateDoesNotRewind:true,corruptBundleAtomic:true,historyPrefixPreserved:true},browserFixtures:'仅本轮合成季度/迁移包与既有验收周档，不含玩家当前进度'};
fs.writeFileSync(new URL('隔离恢复演练.json',dir),JSON.stringify(result,null,2));
fs.writeFileSync(new URL('演练_完整迁移包.json',dir),bundle);
fs.writeFileSync(new URL('演练_副本八槽.json',dir),JSON.stringify(copyArchive,null,2));
fs.writeFileSync(new URL('演练_季度单档.json',dir),sourceRaw);
fs.writeFileSync(new URL('演练_普通周单档.json',dir),exportSave(parseImport(weekly.records[0].raw)));
fs.writeFileSync(new URL('演练_坏JSON.json',dir),'{broken');
console.log(JSON.stringify(result,null,2));
