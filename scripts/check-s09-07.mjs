import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as E from '../src/engine.js';
import {parseImport,exportSave} from '../src/storage.js';
import {VERSION} from '../src/content.js';
import {STORY_VERSION} from '../src/story.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const dir=path.join(root,'docs/施工/证据/2026-10-25-S09-07/');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=n=>JSON.parse(fs.readFileSync(dir+n+'.json','utf8'));
const save=n=>parseImport(fs.readFileSync(dir+n+'.json','utf8'));
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const base=json('施工前文件基线'),changed=[],protectedFiles=[];
for(const[p,h]of Object.entries(base))(digest(p)===h?protectedFiles:changed).push(p);
const allowed=['package.json','src/content.js','src/input.js','src/activity-input.js','src/candidate-evidence.js','README.md','docs/施工/施工进度.md'];
assert.deepEqual(changed.sort(),allowed.sort());assert.equal(Object.keys(base).length,1200);
assert.equal(protectedFiles.filter(p=>p.endsWith('.docx')).length,5);
const oldContent=execFileSync('tar',['-xOf',dir+'施工前源码与设计.tar.gz','src/content.js'],{encoding:'utf8'});
assert.equal(read('src/content.js'),oldContent.replace("VERSION = '0.9.6'","VERSION = '0.9.7'"));
const archives=[];
for(const name of ['原周制档案','原季度档案']){
 const before=json(name+'_施工前'),after=json(name+'_施工后');
 assert.equal(before.records.length,8);assert.deepEqual(after.records,before.records);assert.ok(after.exportedAt>before.exportedAt);
 let present=0;for(const record of after.records)if(record.raw){const value=JSON.parse(record.raw);parseImport(JSON.stringify(value.state||value));present++;}
 archives.push({world:name,slots:8,populated:present,keyAndRawEqual:true,before:before.exportedAt,after:after.exportedAt});
}
const projection=s=>s.weekly.plans.map(p=>Object.fromEntries(['kind','actor','date','period','status','slots','money','guests','activity'].map(k=>[k,p[k]])));
const comboSeed=save('IAB_组合起点'),combo=save('IAB_组合最终');
assert.equal(combo.transactions.length,comboSeed.transactions.length+2);
assert.deepEqual(combo.transactions.slice(0,comboSeed.transactions.length),comboSeed.transactions);
assert.deepEqual(combo.weekly.plans.slice(0,1),comboSeed.weekly.plans);
assert.deepEqual(combo.transcripts,comboSeed.transcripts);
assert.deepEqual(combo.stats,comboSeed.stats);assert.deepEqual(combo.date,comboSeed.date);
assert.equal(combo.remaining,1);assert.equal(combo.stats.treasury,59);
assert.deepEqual(combo.weekly.plans.map(p=>[p.kind,p.status,p.slots,p.money]),[['chat','completed',1,0],['gift','accepted',1,0],['walk','accepted',1,0],['banquet','accepted',2,2]]);
assert.deepEqual(combo.weekly.activities.inventory,comboSeed.weekly.activities.inventory);
assert.deepEqual(combo.weekly.plans.at(-1).guests,['C06','C02']);assert.deepEqual(combo.weekly.plans.at(-1).activity.seats,['C06','C02']);
assert.equal(combo.weekly.plans.at(-1).activity.theme,'tea');
assert.equal(combo.relations.C02.playerIntent,'仅合作');assert.ok(combo.memories.some(m=>m.text==='朕不爱浓茶'&&m.actor==='C02'));
assert.equal(combo.messages.length,9);assert.ok(combo.messages.every(m=>!/重生|前世/.test(m.text)));assert.ok(!combo.facts.some(f=>f.id.startsWith('DISCLOSE_')));
assert.deepEqual(combo.transactions.slice(-2).map(t=>t.actions.map(a=>a.type)),[['week-plan','week-plan'],['week-plan']]);
let replay=structuredClone(comboSeed);for(const tx of combo.transactions.slice(-2))replay=E.commit(replay,E.preview(replay,tx.actions)).state;
assert.deepEqual(projection(combo),projection(replay));assert.deepEqual(combo.stats,replay.stats);assert.equal(combo.remaining,replay.remaining);
const deferSeed=save('IAB_延期起点'),defer=save('IAB_延期最终');
assert.deepEqual(defer.transcripts,deferSeed.transcripts);assert.deepEqual(defer.stats,deferSeed.stats);
assert.equal(defer.transactions.length,deferSeed.transactions.length+1);assert.deepEqual(defer.transactions.slice(0,-1),deferSeed.transactions);
assert.deepEqual(defer.transactions.at(-1).actions.map(a=>a.type),['defer','week-plan']);
assert.ok(defer.deferred.includes('R05-01'));assert.ok(!defer.events['R05-01']?.completed);assert.equal(defer.remaining,5);assert.equal(defer.stats.treasury,98);
const deferReplay=E.commit(deferSeed,E.preview(deferSeed,defer.transactions.at(-1).actions)).state;
assert.deepEqual(projection(defer),projection(deferReplay));assert.deepEqual(defer.deferred,deferReplay.deferred);
for(const state of [combo,defer])assert.deepEqual(parseImport(exportSave(state)),state);
// End-state exports above are the independently checked browser artifacts.
// AX requests were differential; unchanged-tree notices are not full snapshots
// and must not be used as proof of intermediate UI text.
assert.equal(fs.readFileSync(dir+'组合安排_IAB.jpg').subarray(0,3).toString('hex'),'ffd8ff');
const progress=read('docs/施工/施工进度.md');
const rows=[...progress.matchAll(/^\| (S\d+-\d+) \| ([^|]+) \|/gm)];
assert.equal(rows.length,98);assert.equal(rows.filter(x=>x[2].trim()==='通过').length,61);
assert.equal(rows.find(x=>x[1]==='S09-07')[2].trim(),'通过');assert.equal(rows.find(x=>x[1]==='S10-01')[2].trim(),'未开始');
assert.equal(VERSION,'0.9.7');assert.equal(JSON.parse(read('package.json')).version,VERSION);assert.equal(STORY_VERSION,9);
assert.match(fs.readFileSync(dir+'组合专项_复核.txt','utf8'),/tests 40[\s\S]*pass 40[\s\S]*fail 0/);
assert.match(fs.readFileSync(dir+'最终自动测试.txt','utf8'),/tests 626[\s\S]*pass 626[\s\S]*fail 0/);
const result={version:VERSION,storyVersion:STORY_VERSION,baselineFiles:1200,changedOriginal:changed,protectedUnchanged:protectedFiles.length,wordUnchanged:5,archives,browser:{origin:'http://127.0.0.1:5206',fixedText:true,modelCalls:0,modelCallsEvidence:'live settings observation; config:{} loopback fixture',intermediateUiEvidence:'manual observations in acceptance record; AX files are differential notices',combo:{remaining:combo.remaining,treasury:combo.stats.treasury,newTransactions:2,originalTranscriptsEqual:true,originalTransactionsEqual:true,giftStillHeld:true,guestsAndSeats:['C06','C02'],secretNotDelivered:true},deferral:{remaining:defer.remaining,treasury:defer.stats.treasury,newTransactions:1,originalTranscriptsEqual:true,originalTransactionsEqual:true,nodeStillIncomplete:true},ruleProjectionEqual:true,roundTripEqual:true},tests:626,newCompoundTests:40,tasks:'61/98; next S10-01',notVerified:['real-provider-api','physical-phone','soft-keyboard','full-browser-two-year-playthrough']};
fs.writeFileSync(dir+'保护与实走核验.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
