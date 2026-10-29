import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as E from '../src/engine.js';
import {parseImport,exportSave} from '../src/storage.js';
import {VERSION} from '../src/content.js';
import {STORY_VERSION} from '../src/story.js';
const root=fileURLToPath(new URL('../',import.meta.url)),dir=path.join(root,'docs/施工/证据/2026-10-25-S09-06/');
const text=p=>fs.readFileSync(path.join(root,p),'utf8'),json=n=>JSON.parse(fs.readFileSync(dir+n+'.json','utf8'));
const base=json('施工前文件基线'),allowed=['package.json','src/ai.js','src/engine.js','src/content.js','src/app.js','README.md','docs/施工/施工进度.md'],changed=[],protectedFiles=[];
for(const[p,h]of Object.entries(base)){const now=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');(now===h?protectedFiles:changed).push(p);}
assert.deepEqual(changed.sort(),allowed.sort());assert.equal(protectedFiles.filter(p=>p.endsWith('.docx')).length,5);
const archives=[];
for(const name of ['原季度档案','原周制档案']){
 const before=json(name+'_施工前'),after=json(name+'_施工后');assert.equal(before.records.length,8);assert.deepEqual(after.records,before.records);assert.ok(after.exportedAt>before.exportedAt);
 for(const r of after.records)if(r.raw){const x=JSON.parse(r.raw);parseImport(JSON.stringify(x.state||x));}
 archives.push({world:name,slots:8,rawEqual:true,before:before.exportedAt,after:after.exportedAt});
}
const browser=[];
for(const world of ['周制','季度']){
 const actual=parseImport(fs.readFileSync(dir+world+'_最终浏览器存档.json','utf8'));let expected=world==='周制'?E.createWeeklyGame():E.createGame();expected.gameId=actual.gameId;
 for(const tx of actual.transactions){for(const a of tx.actions)if(a.type==='event')expected=E.enterScene(expected,a.eventId);const plan=E.preview(expected,tx.actions);plan.id=tx.id;expected=E.commit(expected,plan).state;}
 for(const key of ['stats','relations','events','ledger','promises','facts','flags','date','remaining'])assert.deepEqual(actual[key],expected[key],world+':'+key);
 for(const[id,t]of Object.entries(expected.transcripts))for(const[k,v]of Object.entries(t))assert.deepEqual(actual.transcripts[id][k],v,world+':'+id+':'+k);
 assert.deepEqual(parseImport(exportSave(actual)),actual);
 const states=Object.fromEntries(Object.entries(actual.transcripts).map(([k,t])=>[k,t.reactionRequest.status]));
 if(world==='周制'){
  assert.deepEqual(states,{M01:'requested',M02:'saved'});assert.ok(!actual.transcripts.M01.aiReaction);assert.equal(actual.transcripts.M02.aiReaction,'这盏茶还暖，奴才便把刚才的话慢慢说完。');assert.equal(actual.remaining,6);assert.equal(actual.stats.mood,46);assert.equal(actual.transactions.length,3);
 }else{assert.deepEqual(states,{M01:'failed'});assert.ok(!actual.transcripts.M01.aiReaction);assert.equal(actual.remaining,2);assert.equal(actual.stats.execution,52);assert.equal(actual.transactions.length,1);}
 browser.push({world,ruleProjectionEqual:true,handwrittenFieldsEqual:true,roundTripEqual:true,requestStates:states,treasury:actual.stats.treasury,remaining:actual.remaining,transactions:actual.transactions.length});
}
const requests=json('IAB模拟请求');assert.equal(requests.length,3);assert.deepEqual(requests.map(r=>[r.eventId,r.phase]),[['M01','returned'],['M02','returned'],['M01','failed']]);assert.ok(requests.every(r=>r.kind==='reaction'));
assert.equal(requests[0].slow,true);assert.ok(Date.parse(requests[0].finishedAt)-Date.parse(requests[0].startedAt)>=6000);
assert.equal(requests[2].failure,true);
assert.match(fs.readFileSync(dir+'周制_手写结果先展示_AX.txt','utf8'),/他像是还有一句话想说/);
assert.match(fs.readFileSync(dir+'周制_旧幕重读不补写_AX.txt','utf8'),/先留住当时的话/);
assert.match(fs.readFileSync(dir+'周制_调用统计_AX.txt','utf8'),/今日 2 次调用[\s\S]*失败 0 次/);
assert.match(fs.readFileSync(dir+'季度_最终调用统计_AX.txt','utf8'),/今日 3 次调用[\s\S]*失败 1 次/);
const rows=[...text('docs/施工/施工进度.md').matchAll(/^\| (S\d+-\d+) \| ([^|]+) \|/gm)];assert.equal(rows.length,98);assert.equal(rows.filter(x=>x[2].trim()==='通过').length,60);assert.equal(rows.find(x=>x[1]==='S09-06')[2].trim(),'通过');assert.equal(rows.find(x=>x[1]==='S09-07')[2].trim(),'未开始');
assert.equal(VERSION,'0.9.6');assert.equal(JSON.parse(text('package.json')).version,VERSION);assert.equal(STORY_VERSION,9);
assert.match(fs.readFileSync(dir+'最终自动测试.txt','utf8'),/tests 586[\s\S]*pass 586[\s\S]*fail 0/);
const result={version:VERSION,storyVersion:STORY_VERSION,baselineFiles:Object.keys(base).length,changedOriginal:changed,protectedUnchanged:protectedFiles.length,wordUnchanged:5,archives,browser,simulatedCalls:3,serviceFailures:1,cancelledNotCountedAsFailure:true,rereadRequests:0,tests:586,newLifecycleTests:32,tasks:'60/98; next S09-07',notVerified:['real-provider-api','physical-phone','soft-keyboard','full-browser-two-year-playthrough']};
fs.writeFileSync(dir+'保护与实走核验.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
