import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as E from '../src/engine.js';
import {VERSION} from '../src/content.js';
import {STORY_VERSION} from '../src/story.js';
import {parseImport,exportSave} from '../src/storage.js';
import {usedSlots,heldSlots,reservedMoney,currentWeek} from '../src/week.js';
const root=fileURLToPath(new URL('../',import.meta.url)),dir=path.join(root,'docs/施工/证据/2026-10-26-S10-04/');
const read=p=>fs.readFileSync(path.join(root,p),'utf8'),json=n=>JSON.parse(fs.readFileSync(dir+n+'.json','utf8')),save=n=>parseImport(fs.readFileSync(dir+n+'.json','utf8')),ax=n=>fs.readFileSync(dir+n+'_AX.txt','utf8');
const base=json('施工前文件基线'),changed=[],protectedFiles=[];
for(const [p,h]of Object.entries(base))(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')===h?protectedFiles:changed).push(p);
assert.equal(Object.keys(base).length,1357);assert.deepEqual(changed.sort(),['src/app.js','src/week-ui.js','styles.css','src/content.js','package.json','README.md','docs/施工/施工进度.md'].sort());
assert.equal(protectedFiles.filter(p=>p.endsWith('.docx')).length,5);assert.equal(protectedFiles.filter(p=>p.startsWith('assets/')).length,3);
const old=p=>execFileSync('tar',['-xOf',dir+'施工前源码与设计.tar.gz',p],{encoding:'utf8'});
assert.equal(read('src/content.js'),old('src/content.js').replace("VERSION = '0.10.3'","VERSION = '0.10.4'"));
const slice=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
assert.equal(slice(read('src/app.js'),'function renderDesk()','function renderCourt()'),slice(old('src/app.js'),'function renderDesk()','function renderCourt()'));
const archives=[];
for(const name of ['原周制档案','原季度档案']){const a=json(name+'_施工前'),b=json(name+'_施工后');assert.equal(a.records.length,8);assert.deepEqual(a.records,b.records);assert.ok(b.exportedAt>a.exportedAt);let populated=0;for(const r of b.records)if(r.raw){parseImport(r.raw);populated++;}archives.push({world:name,slots:8,populated,keyAndRawEqual:true,before:a.exportedAt,after:b.exportedAt});}
const start=save('IAB_周计划起点'),end=save('IAB_周计划最终存档'),pack=json('IAB_周计划最终档案');assert.equal(pack.records.length,8);assert.deepEqual(end,parseImport(pack.records.find(r=>r.key==='changyong-week-s02-auto').raw));
assert.deepEqual(end.transactions.slice(0,start.transactions.length),start.transactions);assert.deepEqual(end.transcripts,start.transcripts);assert.deepEqual(end.messages,start.messages);
const newTx=end.transactions.slice(start.transactions.length);assert.deepEqual(newTx.map(t=>t.actions[0].type),['week-edit','week-cancel','week-advance','week-fulfill','week-advance','week-fulfill']);
let replay=start;const normalized=[];
for(const tx of newTx){const p=E.preview(replay,tx.actions);p.id=tx.id;replay=E.commit(replay,p).state;if(tx.actions[0].type==='week-edit'){const a=replay.weekly.plans.at(-1),b=end.weekly.plans.find(x=>x.createdTransaction===tx.id);assert.ok(b);a.id=b.id;a.costGroup=b.costGroup;normalized.push('new edited plan id and costGroup');}}
// Align only newly generated identities; all narrative, dates, amounts and references must then match.
assert.equal(replay.weekly.activities.entries.length,2);assert.equal(replay.weekly.activities.growth.length,2);
for(const a of replay.weekly.activities.entries){const b=end.weekly.activities.entries.find(x=>x.source===a.source);assert.ok(b);assert.deepEqual({...a,id:b.id},b);const f=replay.facts.find(f=>f.id===a.id),g=end.facts.find(f=>f.id===b.id),p=replay.weekly.plans.find(p=>p.id===a.source);assert.ok(f&&g&&p);assert.deepEqual({...f,id:b.id},g);assert.equal(p.activity.entryId,a.id);a.id=b.id;f.id=b.id;p.activity.entryId=b.id;normalized.push('activity id, fact id and plan entryId');}
for(const a of replay.weekly.activities.growth){const b=end.weekly.activities.growth.find(x=>x.planId===a.planId);assert.ok(b);assert.deepEqual({...a,id:b.id},b);a.id=b.id;normalized.push('growth id');}
assert.deepEqual(replay,end);assert.deepEqual(parseImport(exportSave(end)),end);
assert.deepEqual(end.date,{year:1,month:1,day:5});assert.equal(end.weekly.clock%2,1);assert.equal(end.stats.treasury,60);assert.equal(end.remaining,4);assert.equal(heldSlots(end,currentWeek(end).id),0);assert.equal(usedSlots(end,currentWeek(end).id),2);assert.equal(reservedMoney(end),0);assert.equal(end.weekly.plans.filter(p=>p.status==='completed').length,2);assert.equal(end.weekly.plans.filter(p=>p.status==='cancelled').length,1);assert.equal(end.weekly.plans.filter(p=>p.status==='rescheduled').length,1);assert.equal(end.weekly.plans.filter(p=>p.status==='draft').length,1);assert.equal(end.weekly.activities.inventory.length,0);
assert.match(ax('未来预约_日期排序与预占'),/可用 3 \/ 6 格 · 预占 3 · 已用 0/);assert.doesNotMatch(ax('未来预约_日期排序与预占'),/button 照约去做/);assert.match(ax('改期_新约与原约日期'),/原约：雍正元年1月4日 · 晚间/);assert.match(ax('取消_释放预算与历史'),/已取消 · 预占已解除[\s\S]*已改期 · 原预占已解除/);
assert.match(ax('较晚预约入口_先停较早约期'),/走到雍正元年1月3日 · 日间/);assert.equal((ax('到期_仅眼前活动可执行').match(/button 照约去做/g)||[]).length,1);
for(const n of ['两项完成_核销与日期','刷新恢复_完成与历史']){assert.match(ax(n),/雍正元年1月5日 · 晚间/);assert.match(ax(n),/可用 4 \/ 6 格 · 预占 0 · 已用 2/);assert.equal((ax(n).match(/button 重读此刻/g)||[]).length,2);assert.doesNotMatch(ax(n),/button 照约去做/);}
for(const [kind,name]of [['rest','休养完成_原回应'],['study','读书完成_原回应']])assert.ok(ax(name).includes(end.weekly.plans.find(p=>p.kind===kind&&p.status==='completed').dialogue));
assert.match(ax('验收档_零模型调用'),/今日 0 次调用[\s\S]*失败 0 次/);const layout=json('周计划布局');assert.deepEqual(layout,{width:1280,height:720,scrollWidth:1280});assert.equal(fs.readFileSync(dir+'周计划完成_IAB.jpg').subarray(0,3).toString('hex'),'ffd8ff');
assert.match(fs.readFileSync(dir+'周计划专项.txt','utf8'),/tests 13[\s\S]*pass 13[\s\S]*fail 0/);assert.match(fs.readFileSync(dir+'最终自动测试.txt','utf8'),/tests 678[\s\S]*pass 678[\s\S]*fail 0/);assert.equal(VERSION,'0.10.4');assert.equal(JSON.parse(read('package.json')).version,VERSION);assert.equal(STORY_VERSION,9);
const rows=[...read('docs/施工/施工进度.md').matchAll(/^\| (S\d+-\d+) \| ([^|]+) \|/gm)];assert.equal(rows.length,98);assert.equal(rows.filter(x=>x[2].trim()==='通过').length,65);assert.equal(rows.find(x=>x[1]==='S10-04')[2].trim(),'通过');
const result={version:VERSION,storyVersion:STORY_VERSION,baselineFiles:1357,changedOriginal:changed,protectedUnchanged:protectedFiles.length,wordUnchanged:5,artUnchanged:3,archives,browser:{origin:'http://127.0.0.1:5214',layout,modelCalls:0,newTransactions:6,date:end.date,period:'evening',treasury:60,remaining:4,held:0,used:2,reservedMoney:0,completed:2,oldNarrativeEqual:true,replayEqualAfterIdentityNormalization:true,normalized,roundTripEqual:true,refreshVerified:true},tests:678,newTests:13,tasks:'65/98; next S10-05',notVerified:['other-viewports-this-phase','physical-phone','soft-keyboard','full-keyboard-acceptance','real-provider-api','full-browser-two-year-playthrough']};fs.writeFileSync(dir+'保护与实走核验.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
