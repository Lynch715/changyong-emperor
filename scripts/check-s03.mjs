// Reconcile durable migration and browser evidence; never reads or writes live browser storage.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareMigration,inspectMigrationBundle} from '../src/migration.js';
import {parseImport} from '../src/storage.js';
import {hash} from '../src/engine.js';
const dir=new URL('../docs/施工/证据/2026-10-24-S03/',import.meta.url),read=name=>fs.readFileSync(new URL(name,dir),'utf8'),json=name=>JSON.parse(read(name));
const old=JSON.parse(fs.readFileSync(new URL('../docs/施工/证据/2026-10-24-S02/原5173季度档_只读复核.json',import.meta.url),'utf8')),current=json('原5173季度8槽_只读复核.json');
assert.deepEqual(current.records,old.records);
const store={get length(){return 0;},key(){return null;},getItem(){return null;},setItem(){throw Error('本脚本不可写存储');}};
const samples=[];
for(const r of old.records.filter(r=>r.raw)){const source=parseImport(r.raw),plan=await prepareMigration(r.raw,{storage:store});assert.ok(plan.report.preserved.every(p=>p.equal));assert.deepEqual(source.date,plan.target.date);samples.push({key:r.key,rawSha256:createHash('sha256').update(r.raw).digest('hex'),copyId:plan.copyId,date:plan.target.date,sealed:plan.target.sealed,treasury:plan.target.stats.treasury,remaining:plan.target.remaining,firstIncomeMonth:plan.report.firstIncomeMonth,historicalFieldsEqual:plan.report.preserved.length});}
const sourceRaw=old.records.find(r=>r.key.endsWith('-auto')).raw;
assert.equal(read('浏览器下载_季度原JSON.json'),sourceRaw);
const checked=await inspectMigrationBundle(read('浏览器导出_迁移包.json'),store),auto=parseImport(checked.bundle.records.find(r=>r.key.endsWith('-auto')).raw),restored=parseImport(read('浏览器恢复后当前进度.json'));
assert.deepEqual(restored,auto);assert.equal(checked.bundle.sourceRaw,sourceRaw);assert.equal(checked.nonempty,6);
const beforeWeek=json('原5173周制8槽_只读复核.json'),afterWeek=json('原5173周制8槽_入口预览后.json');assert.deepEqual(beforeWeek.records,afterWeek.records);
const results={scope:'文件证据核对；真实交互另见浏览器记录。不接触实时localStorage。',legacyOriginal8Exact:true,nativeWeek8BeforeAfterPreviewExact:true,downloadOriginalExact:true,samples,distinctRawCopies:new Set(samples.map(s=>s.copyId)).size,browser:{bundleSlots:checked.bundle.records.length,nonemptySlots:checked.nonempty,manualSlots:checked.bundle.records.filter(r=>r.raw&&r.key.includes('-manual-')).length,restoredStateMatches:true,restoredStateHash:hash(restored),date:restored.date,treasury:restored.stats.treasury,remaining:restored.remaining},limits:['实际IAB桌面1280x720','尺寸覆盖未生效，不计多视口通过','未测实体手机、软键盘和真实模型']};
console.log(JSON.stringify(results,null,2));
