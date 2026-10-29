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
const root=fileURLToPath(new URL('../',import.meta.url)),dir=path.join(root,'docs/施工/证据/2026-10-26-S10-05/');
const read=p=>fs.readFileSync(path.join(root,p),'utf8'),json=n=>JSON.parse(fs.readFileSync(dir+n+'.json','utf8')),save=n=>parseImport(fs.readFileSync(dir+n+'.json','utf8')),ax=n=>fs.readFileSync(dir+n+'_AX.txt','utf8');
const base=json('施工前文件基线'),changed=[],protectedFiles=[];
for(const [p,h]of Object.entries(base))(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')===h?protectedFiles:changed).push(p);
assert.equal(Object.keys(base).length,1392);
assert.deepEqual(changed.sort(),['src/app.js','src/palace-ui.js','src/activity-ui.js','src/plan-reading.js','src/confirmation-reading.js','styles.css','src/content.js','package.json','README.md','docs/施工/施工进度.md'].sort());
assert.equal(protectedFiles.filter(p=>p.endsWith('.docx')).length,5);assert.equal(protectedFiles.filter(p=>p.startsWith('assets/')).length,3);
const old=p=>execFileSync('tar',['-xOf',dir+'施工前源码与设计.tar.gz',p],{encoding:'utf8'});
assert.equal(read('src/content.js'),old('src/content.js').replace("VERSION = '0.10.4'","VERSION = '0.10.5'"));
const archives=[];
for(const name of ['原周制档案','原季度档案']){const a=json(name+'_保护基线'),b=json(name+'_施工后');assert.equal(a.records.length,8);assert.deepEqual(a.records,b.records);assert.ok(b.exportedAt>a.exportedAt);let populated=0;for(const r of b.records)if(r.raw){parseImport(r.raw);populated++;}archives.push({world:name,slots:8,populated,keyAndRawEqual:true,before:a.exportedAt,after:b.exportedAt,baseline:'S10-04 sealed after-export'});}
const pack=json('IAB_全部验收档案');assert.equal(pack.records.length,8);
// Only align generated random identities, then compare the entire state including every body and amount.
function align(value,map){if(typeof value==='string')return map.get(value)||value;if(Array.isArray(value))return value.map(x=>align(x,map));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,align(v,map)]));return value;}
function checkRun(startName,endName,types,key){
 const start=save(startName),end=save(endName);assert.deepEqual(end,parseImport(pack.records.find(r=>r.key===key).raw));
 for(const k of ['transactions','memories','facts','messages','turnReports'])for(const a of start[k])assert.ok(end[k].some(b=>JSON.stringify(a)===JSON.stringify(b)),k+' preserves old record');
 for(const a of start.weekly.activities?.entries||[])assert.deepEqual(end.weekly.activities.entries.find(b=>b.id===a.id),a);
 for(const [k,v] of Object.entries(start.transcripts))assert.deepEqual(end.transcripts[k],v);
 const txs=end.transactions.slice(start.transactions.length);assert.deepEqual(txs.map(t=>t.actions[0].type),types);
 let replay=start;const normalized=[];
 for(const tx of txs){const p=E.preview(replay,tx.actions);p.id=tx.id;replay=E.commit(replay,p).state;
  const map=new Map();
  for(const a of replay.weekly.plans.filter(p=>p.createdTransaction===tx.id)){const b=end.weekly.plans.find(p=>p.createdTransaction===tx.id);assert.ok(b);map.set(a.id,b.id);map.set(a.costGroup,b.costGroup);normalized.push('plan id and costGroup');}
  replay=align(replay,map);
  const ids=new Map();for(const a of replay.weekly.activities?.entries||[]){const b=end.weekly.activities.entries.find(b=>b.kind===a.kind&&b.source===a.source);assert.ok(b);assert.deepEqual({...a,id:b.id},b);if(a.id!==b.id){ids.set(a.id,b.id);normalized.push('activity identity and exact references');}}
  replay=align(replay,ids);
 }
 assert.deepEqual(replay,end);assert.deepEqual(parseImport(exportSave(end)),end);
 return {start,end,summary:{newTransactions:txs.length,oldNarrativeEqual:true,replayEqualAfterIdentityNormalization:true,normalized,roundTripEqual:true,date:end.date,treasury:end.stats.treasury,remaining:end.remaining,held:heldSlots(end,currentWeek(end).id),used:usedSlots(end,currentWeek(end).id),reservedMoney:reservedMoney(end)}};
}
const gift=checkRun('IAB_赠礼与小宴起点','IAB_赠礼与小宴最终存档',['week-edit','week-advance','week-fulfill','week-plan','week-advance','week-fulfill'],'changyong-week-s02-import-backup');
assert.equal(gift.end.stats.treasury,55);assert.equal(gift.end.remaining,2);assert.equal(gift.summary.used,4);assert.equal(gift.summary.held,0);assert.equal(gift.summary.reservedMoney,0);
assert.equal(gift.end.weekly.activities.inventory.length,2);assert.equal(gift.end.weekly.activities.inventory.find(i=>i.giftId==='GF03').status,'held');assert.equal(gift.end.weekly.activities.inventory.find(i=>i.giftId==='GF02').status,'given');
const banquet=gift.end.weekly.plans.find(p=>p.kind==='banquet');assert.equal(banquet.activity.theme,'tea');assert.deepEqual(banquet.activity.seats,['C06','C02']);assert.equal(banquet.status,'completed');
const bond=checkRun('IAB_倾心原档起点','IAB_亲近最终存档',['week-plan','week-advance','week-fulfill'],'changyong-week-s02-auto');
assert.deepEqual(bond.end.relations,bond.start.relations);assert.equal(bond.end.stats.treasury,59);assert.equal(bond.end.remaining,3);assert.equal(bond.summary.held,0);assert.equal(bond.summary.used,3);assert.equal(bond.end.weekly.plans.at(-1).activity.paused,true);
assert.match(ax('赠礼改期_保留原预留实物'),/铜制暖手炉/);assert.match(ax('库存_收下与婉拒实物'),/苏培盛收下铜制暖手炉/);assert.match(ax('库存_收下与婉拒实物'),/苏培盛婉拒耐磨护腕/);
assert.match(ax('小宴_完整确认'),/清茶小席 · 座次：宜修、苏培盛/);assert.match(ax('小宴完成_主题座次与互答'),/先按说定的位置落座：宜修、苏培盛/);
assert.match(ax('未表态_普通入口与亲近分开'),/button \(disabled\) 商量亲近相伴/);assert.match(ax('倾心旧档_四种相伴'),/独处片刻 · 牵手同行 · 拥抱 · 同游/);assert.match(ax('亲近表单_刷新后门槛'),/\(disabled\) 留宿/);assert.match(ax('赴约_暂缓入口'),/今天先安静坐坐/);
for(const n of ['亲近暂缓_实际正文','亲近暂缓_刷新恢复'])assert.ok(ax(n).includes(bond.end.weekly.plans.at(-1).dialogue));
for(const n of ['赠礼宴席_零模型调用','亲近暂缓_零模型调用'])assert.match(ax(n),/今日 0 次调用[\s\S]*失败 0 次/);
const layout=json('活动布局');assert.deepEqual(layout,{width:1280,height:720,scrollWidth:1280});assert.equal(fs.readFileSync(dir+'亲近暂缓_IAB.jpg').subarray(0,3).toString('hex'),'ffd8ff');
assert.match(fs.readFileSync(dir+'人物活动呈现专项.txt','utf8'),/tests 14[\s\S]*pass 14[\s\S]*fail 0/);assert.match(fs.readFileSync(dir+'最终自动测试.txt','utf8'),/tests 692[\s\S]*pass 692[\s\S]*fail 0/);assert.equal(VERSION,'0.10.5');assert.equal(JSON.parse(read('package.json')).version,VERSION);assert.equal(STORY_VERSION,9);
const rows=[...read('docs/施工/施工进度.md').matchAll(/^\| (S\d+-\d+) \| ([^|]+) \|/gm)];assert.equal(rows.length,98);assert.equal(rows.filter(x=>x[2].trim()==='通过').length,66);assert.equal(rows.find(x=>x[1]==='S10-05')[2].trim(),'通过');
const result={version:VERSION,storyVersion:STORY_VERSION,baselineFiles:1392,changedOriginal:changed,protectedUnchanged:protectedFiles.length,wordUnchanged:5,artUnchanged:3,archives,browser:{origin:'http://127.0.0.1:5216',layout,modelCalls:0,giftAndBanquet:gift.summary,bondPause:{...bond.summary,relationsUnchanged:true},refreshVerified:true},tests:692,newTests:14,tasks:'66/98; next S10-06',notVerified:['other-viewports-this-phase','physical-phone','soft-keyboard','full-keyboard-acceptance','real-provider-api','full-browser-two-year-playthrough']};fs.writeFileSync(dir+'保护与实走核验.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
