import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {parseImport,exportSave} from '../src/storage.js';
import {buildAIContext} from '../src/input.js';
import {VERSION} from '../src/content.js';
import {STORY_VERSION} from '../src/story.js';
const root=fileURLToPath(new URL('../',import.meta.url)),dir=path.join(root,'docs/施工/证据/2026-10-25-S09-05/');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=n=>JSON.parse(fs.readFileSync(dir+n+'.json','utf8'));
const state=n=>parseImport(fs.readFileSync(dir+n+'.json','utf8'));
const base=json('施工前文件基线');
const allowed=['package.json','src/memory-book.js','src/ai.js','src/conversation.js','src/engine.js','src/content.js','src/app.js','src/input.js','README.md','docs/施工/施工进度.md','docs/施工/项目进度审计与待办_2026-10-25.md'];
const changed=[],protectedFiles=[];
for(const[p,h]of Object.entries(base)){
 const now=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
 (now===h?protectedFiles:changed).push(p);
}
assert.deepEqual(changed.sort(),allowed.sort());assert.equal(protectedFiles.filter(p=>p.endsWith('.docx')).length,5);
const archives=[];
for(const name of ['原季度档案','原周制档案']){
 const before=json(name+'_施工前'),after=json(name+'_施工后');assert.deepEqual(after.records,before.records);assert.equal(after.records.length,8);assert.ok(after.exportedAt>before.exportedAt);
 for(const r of after.records)if(r.raw){const x=JSON.parse(r.raw);parseImport(JSON.stringify(x.state||x));}
 archives.push({world:name,slots:8,rawEqual:true,before:before.exportedAt,after:after.exportedAt});
}
assert.equal(JSON.parse(read('docs/施工/证据/2026-10-25-S09-04/保护与实走核验.json')).tasks,'58/98; next S09-05');
const before=state('长谈预算_验收起点'),after=state('最终浏览器存档');
for(const k of ['stats','relations','events','transcripts','transactions','ledger','weekly','promises','facts','flags','date'])assert.deepEqual(after[k],before[k],k+'因聊天或检索修订变化');
assert.deepEqual(after.messages.slice(0,before.messages.length),before.messages);assert.equal(after.messages.length,before.messages.length+6);
assert.deepEqual(parseImport(exportSave(after)),after);assert.equal(after.remaining,4);assert.equal(after.stats.treasury,60);assert.equal(after.memoryControl.changes.length,8);
assert.ok(after.messages.slice(before.messages.length).filter(m=>m.role==='npc').every(m=>m.memorySources.length>0&&m.memorySources.length<=512));
const requests=json('IAB模拟请求');assert.equal(requests.length,4);
for(const r of requests){assert.equal(r.kind,'chat');assert.ok(r.requestChars<=44000);assert.ok(r.providerWireChars<48000);assert.equal(r.otherPrivateAbsent,true);assert.equal(r.retiredPreferenceAbsent,true);assert.equal(r.context.mandatory.relation.playerIntent,'仅合作');assert.ok(r.context.mandatory.promises.some(p=>p.status==='accepted'&&p.kind==='walk'&&p.date.day===4));assert.ok(!JSON.stringify(r.context).includes('_PRIVATE_NOTE'));}
assert.deepEqual(requests.map(r=>r.oldSourceFound),[true,true,false,false]);
for(const r of requests.slice(-2))assert.ok(!JSON.stringify(r.context).includes('那句荷塘旧约尚未说定的话还在'));
const finalContext=buildAIContext(after,'C02',null,{input:'荷塘旧约'});assert.ok(!JSON.stringify(finalContext).includes('荷塘旧约尚未说定，先别替我答应。'));assert.ok(!JSON.stringify(finalContext).includes('_PRIVATE_NOTE'));
const pending=finalContext.mandatory.promises.find(p=>p.kind==='walk');assert.equal(pending.status,'accepted');assert.equal(after.weekly.plans.find(p=>p.kind==='walk').status,'accepted');
const rows=[...read('docs/施工/施工进度.md').matchAll(/^\| (S\d+-\d+) \| ([^|]+) \|/gm)];assert.equal(rows.length,98);assert.equal(rows.filter(x=>x[2].trim()==='通过').length,59);
for(const id of ['S09-04','S09-05'])assert.equal(rows.find(x=>x[1]===id)[2].trim(),'通过');assert.equal(rows.find(x=>x[1]==='S09-06')[2].trim(),'未开始');
assert.equal(VERSION,'0.9.5');assert.equal(JSON.parse(read('package.json')).version,VERSION);assert.equal(STORY_VERSION,9);
assert.match(fs.readFileSync(dir+'最终自动测试.txt','utf8'),/tests 554[\s\S]*pass 554[\s\S]*fail 0/);
const reproduction=json('审计复现_修复前后');assert.equal(reproduction.beforeChars,70340);assert.ok(reproduction.afterChars<40000);
const result={version:VERSION,storyVersion:STORY_VERSION,baselineFiles:Object.keys(base).length,changedOriginal:changed,protectedUnchanged:protectedFiles.length,wordUnchanged:5,archives,tests:554,tasks:'59/98; next S09-06',reproduction,browser:{origin:'http://127.0.0.1:5202',viewport:'1280x720 desktop',simulatedCalls:4,failures:0,clientRequestChars:requests.map(r=>r.requestChars),providerWireChars:requests.map(r=>r.providerWireChars),worldFieldsUnchanged:true,oldMessagePrefixUnchanged:true,newMessages:6,retiredSourceAndParaphraseAbsent:true,treasury:60,remaining:4,walkStillAccepted:true},notVerified:['real-provider-api','physical-phone','soft-keyboard','full-browser-two-year-playthrough','complete-S09-06-and-S09-07']};
fs.writeFileSync(dir+'保护与实走核验.json',JSON.stringify(result,null,2));
fs.writeFileSync(dir+'最终上下文复算.json',JSON.stringify(finalContext,null,2));
console.log(JSON.stringify(result,null,2));
