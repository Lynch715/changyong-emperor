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
import {sceneContinuation} from '../src/scene-reading.js';
const root=fileURLToPath(new URL('../',import.meta.url)),dir=path.join(root,'docs/施工/证据/2026-10-26-S10-03/');
const read=p=>fs.readFileSync(path.join(root,p),'utf8'),json=n=>JSON.parse(fs.readFileSync(dir+n+'.json','utf8')),save=n=>parseImport(fs.readFileSync(dir+n+'.json','utf8')),ax=n=>fs.readFileSync(dir+n+'_AX.txt','utf8');
const baseline=json('施工前文件基线'),changed=[],protectedFiles=[];
for(const [p,h]of Object.entries(baseline))(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')===h?protectedFiles:changed).push(p);
assert.equal(Object.keys(baseline).length,1315);
assert.deepEqual(changed.sort(),['src/app.js','styles.css','src/content.js','package.json','README.md','docs/施工/施工进度.md'].sort());
assert.equal(protectedFiles.filter(p=>p.endsWith('.docx')).length,5);assert.equal(protectedFiles.filter(p=>p.startsWith('assets/')).length,3);
const old=p=>execFileSync('tar',['-xOf',dir+'施工前源码与设计.tar.gz',p],{encoding:'utf8'});
assert.equal(read('src/content.js'),old('src/content.js').replace("VERSION = '0.10.2'","VERSION = '0.10.3'"));
const archives=[];
for(const name of ['原周制档案','原季度档案']){
 const before=json(name+'_施工前'),after=json(name+'_施工后');assert.equal(before.records.length,8);assert.deepEqual(after.records,before.records);assert.ok(after.exportedAt>before.exportedAt);
 let populated=0;for(const r of after.records)if(r.raw){parseImport(r.raw);populated++;}
 archives.push({world:name,slots:8,populated,keyAndRawEqual:true,before:before.exportedAt,after:after.exportedAt});
}
const fromArchive=(name,key)=>{const pack=json(name);assert.equal(pack.records.length,8);const r=pack.records.find(r=>r.key===key);assert.ok(r?.raw);return parseImport(r.raw);};
const tea=save('IAB_留茶首谈最终存档'),military=save('IAB_军需核对最终存档'),quarter=save('IAB_季度最终存档');
assert.deepEqual(tea,fromArchive('IAB_周制最终档案','changyong-week-s02-import-backup'));
assert.deepEqual(military,fromArchive('IAB_周制最终档案','changyong-week-s02-auto'));
assert.deepEqual(quarter,fromArchive('IAB_季度最终档案','changyong-v12-auto'));
function replay(start,end,{militaryInput=false}={}){
 assert.deepEqual(end.transactions.slice(0,start.transactions.length),start.transactions);
 for(const [k,t]of Object.entries(start.transcripts))assert.deepEqual(end.transcripts[k],t,'旧快照 '+k);
 let e=start;
 for(const tx of end.transactions.slice(start.transactions.length)){
  for(const a of tx.actions.filter(a=>a.type==='event')){
   e=E.enterScene(e,a.eventId);
   if(militaryInput&&a.eventId==='G04'){
    const m=end.messages.at(-1);assert.equal(m.role,'player');assert.equal(m.actor,'C03');assert.equal(m.text,'先拨一半，派允祥核账，并押运，暂不公开');
    e=E.recordMessage(e,'C03','player',m.text);e.messages.at(-1).id=m.id;
   }
  }
  const p=E.preview(e,tx.actions);p.id=tx.id;e=E.commit(e,p).state;
 }
 return e;
}
const teaStart=save('IAB_留茶首谈起点'),militaryStart=save('IAB_军需核对起点');
const teaReplay=replay(teaStart,tea),militaryReplay=replay(militaryStart,military,{militaryInput:true});
// The original rule generates one fresh activity ID and uses it as its fact ID.
// Normalize only that new ID pair after proving content and identity linkage.
assert.equal(teaReplay.weekly.activities.entries.length,1);assert.equal(tea.weekly.activities.entries.length,1);
const generated=teaReplay.weekly.activities.entries[0],actual=tea.weekly.activities.entries[0],generatedId=generated.id;
assert.equal(generated.kind,'followup');assert.equal(generated.source,'R02-01');assert.deepEqual({...generated,id:actual.id},actual);
const generatedFact=teaReplay.facts.find(f=>f.id===generatedId),actualFact=tea.facts.find(f=>f.id===actual.id);assert.ok(generatedFact&&actualFact);assert.deepEqual({...generatedFact,id:actual.id},actualFact);
generated.id=actual.id;generatedFact.id=actual.id;assert.deepEqual(teaReplay,tea);assert.deepEqual(militaryReplay,military);
let q=E.createGame();q.gameId=quarter.gameId;assert.equal(quarter.transactions.length,1);const qp=E.preview(q,quarter.transactions[0].actions);qp.id=quarter.transactions[0].id;q=E.commit(q,qp).state;assert.deepEqual(q,quarter);
assert.equal(tea.transactions.length-teaStart.transactions.length,3);assert.equal(tea.messages.length,teaStart.messages.length);assert.ok(!tea.facts.some(f=>f.id.startsWith('DISCLOSE_')));
assert.equal(tea.remaining,6);assert.equal(tea.stats.treasury,60);assert.equal(sceneContinuation(tea,'R02-01'),null);assert.equal(sceneContinuation(tea,'M02',{readingKey:'M02'}),null);
assert.equal(militaryStart.stats.treasury,98);assert.equal(military.stats.treasury,90);assert.equal(military.remaining,5);assert.equal(military.events.G06?.completed,undefined);assert.equal(sceneContinuation(military,'G05'),null);
assert.deepEqual(E.factReaders(military,military.facts.find(f=>f.id==='FACT_G04')),['C01','C03','C26']);
for(const s of [tea,military,quarter])assert.deepEqual(parseImport(exportSave(s)),s);
for(const [n,s,id]of [['留茶夜谈_直接原回应',tea,'M02'],['首谈_结果与未来未接读',tea,'R02-01'],['旧幕重读_不带下一幕',tea,'M02'],['军需_原结果与同项目接读',military,'G04'],['整顿_原结果与未来回报未出现',military,'G05'],['季度_原回应与未来未接读',quarter,'M01']]){
 assert.ok(ax(n).includes(s.transcripts[id].dialogue),n+'原回应逐字');assert.match(ax(n),/button \(collapsed\) 此事留下的变化/);
}
assert.match(ax('留茶夜谈_直接原回应'),/button 接着读 · 留茶 →/);assert.match(ax('军需_原结果与同项目接读'),/button 接着读/);
for(const n of ['首谈_结果与未来未接读','旧幕重读_不带下一幕','整顿_原结果与未来回报未出现','季度_原回应与未来未接读'])assert.doesNotMatch(ax(n),/button 接着读/);
assert.match(ax('旧幕重读_不带下一幕'),/旧事重读/);assert.ok(ax('追问_原回答与折叠细项').includes(actual.text));assert.match(ax('追问_原回答与折叠细项'),/button \(collapsed\) 此事留下的变化/);
assert.match(ax('秘密_确认前范围'),/办理时段：雍正元年1月7日 · 晚间[\s\S]*记录知情范围：雍正、苏培盛/);
assert.match(ax('军需_费用时段范围'),/军费6点，押运另2点，允祥核账[\s\S]*办理时段：雍正二年4月7日 · 日间[\s\S]*记录知情范围：雍正、年羹尧、允祥[\s\S]*国库支出 8 点/);
assert.match(ax('押运_零重复费用与晚间核对'),/沿用已付的押运，本次不再收费[\s\S]*办理时段：雍正二年4月7日 · 晚间/);
for(const n of ['留茶档_零模型调用','周制_零模型调用','季度_零模型调用'])assert.match(ax(n),/今日 0 次调用[\s\S]*失败 0 次/);
const layouts=json('结果页布局');assert.equal(layouts.length,3);for(const l of layouts){assert.equal(l.width,319);assert.equal(l.height,664);assert.equal(l.scrollWidth,l.width);assert.equal(l.detailsOpen,false);assert.ok(l.responseTop<l.height);}
assert.equal(fs.readFileSync(dir+'留茶直接回应_IAB.jpg').subarray(0,3).toString('hex'),'ffd8ff');
assert.equal(VERSION,'0.10.3');assert.equal(JSON.parse(read('package.json')).version,VERSION);assert.equal(STORY_VERSION,9);
assert.match(fs.readFileSync(dir+'接读与确认专项.txt','utf8'),/tests 18[\s\S]*pass 18[\s\S]*fail 0/);assert.match(fs.readFileSync(dir+'最终自动测试.txt','utf8'),/tests 665[\s\S]*pass 665[\s\S]*fail 0/);
const rows=[...read('docs/施工/施工进度.md').matchAll(/^\| (S\d+-\d+) \| ([^|]+) \|/gm)];assert.equal(rows.length,98);assert.equal(rows.filter(x=>x[2].trim()==='通过').length,64);assert.equal(rows.find(x=>x[1]==='S10-03')[2].trim(),'通过');assert.equal(rows.find(x=>x[1]==='S10-04')[2].trim(),'未开始');
const result={version:VERSION,storyVersion:STORY_VERSION,baselineFiles:1315,changedOriginal:changed,protectedUnchanged:protectedFiles.length,wordUnchanged:5,artUnchanged:3,archives,browser:{origin:'http://127.0.0.1:5212',modelCalls:0,layouts,screenshot:'1280×720 desktop',tea:{newTransactions:3,treasury:60,remaining:6,oldTranscriptsEqual:true,secretNotDisclosed:true,replayEqualAfterSingleNewIdPairNormalization:true},military:{treasuryBefore:98,treasuryAfter:90,remaining:5,fullReplayEqual:true,futureReportNotPerformed:true},quarter:{fullReplayEqual:true},roundTripEqual:true},tests:665,newTests:18,tasks:'64/98; next S10-04',notVerified:['physical-phone','soft-keyboard','full-keyboard-acceptance','real-provider-api','full-browser-two-year-playthrough']};
fs.writeFileSync(dir+'保护与实走核验.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
