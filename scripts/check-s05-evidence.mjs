// Recheck durable exports and file hashes; never accesses live browser storage.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseImport} from '../src/storage.js';
import {ordinal} from '../src/calendar.js';

const root=new URL('../',import.meta.url),dir=new URL('../docs/施工/证据/2026-10-24-S05/',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,dir),'utf8'),json=name=>JSON.parse(read(name));
const state=name=>parseImport(read(name)),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const originals=['季度','周制'].map(world=>{
 const a=json(`原${world}八槽_施工前.json`),b=json(`原${world}八槽_施工后只读.json`);
 assert.equal(a.records.length,8);assert.deepEqual(a.records,b.records);
 for(const record of b.records.filter(r=>r.raw))parseImport(record.raw);
 return {world,slots:8,exactRawMatch:true,records:b.records.map(r=>({key:r.key,sha256:r.raw?sha(r.raw):null}))};
});
const before=state('苏培盛_beforeFirstStage_规则样例.json'),heart=state('倾心确认后_浏览器存档.json');
assert.equal(before.remaining,6);assert.equal(heart.remaining,5);assert.deepEqual(heart.stats,before.stats);assert.equal(heart.stats.treasury,59);
assert.equal(before.relations.C02.stage,'信任');assert.equal(heart.relations.C02.stage,'倾心');
assert.deepEqual([heart.relations.C02.trust,heart.relations.C02.intimacy,heart.relations.C02.safety],[54,23,45]);
assert.deepEqual(heart.transcripts,before.transcripts);assert.deepEqual(heart.ledger,before.ledger);
assert.equal(heart.weekly.relationships.history.filter(h=>h.kind==='stage').length,1);
const archive=json('S05五槽_浏览器全部档案.json'),restored=json('S05第五槽恢复后_浏览器全部档案.json');
const auto=records=>parseImport(records.find(r=>r.key.endsWith('-auto')).raw),played=auto(archive.records);
const manual=archive.records.filter(r=>/-manual-[0-4]$/.test(r.key));assert.equal(manual.length,5);
for(const r of manual)assert.deepEqual(parseImport(r.raw),played);
assert.deepEqual(auto(restored.records),played);assert.deepEqual(restored.records.filter(r=>/-manual-[0-4]$/.test(r.key)),manual);
assert.equal(played.remaining,4);assert.equal(played.stats.treasury,59);
assert.deepEqual([played.relations.C02.trust,played.relations.C02.intimacy,played.relations.C02.safety,played.relations.C02.stage],[56,27,48,'倾心']);
const book=played.weekly.relationships,invite=book.messages.find(m=>m.id==='IN-C02-2'),plan=played.weekly.plans.find(p=>p.id===invite.planId);
assert.equal(invite.status,'accepted');assert.equal(plan.status,'completed');assert.equal(plan.socialInviteId,invite.id);
assert.equal(plan.slots,1);assert.equal(plan.money,0);assert.deepEqual(plan.date,{year:1,month:1,day:11});
assert.equal(Object.values(played.weekly.consumed).filter(c=>c.source===plan.id).length,1);
assert.equal(book.history.filter(h=>h.kind==='stage').length,1);assert.equal(book.encounters.length,2);
assert.ok(book.history.some(h=>h.kind==='boundary'&&h.intent==='仅合作'));
const answer=book.requests.find(r=>r.kind==='resume');assert.equal(answer.status,'answered');
assert.equal(ordinal(answer.answeredAt)-ordinal(answer.date),1);assert.equal(answer.answerIntent,'愿发展');
assert.equal(book.messages.find(m=>m.id==='IN-C02-1').status,'read');
const old=parseImport(fs.readFileSync(new URL('../docs/施工/证据/2026-10-24-S04/民生补工暂停复办闭环_浏览器存档.json',import.meta.url),'utf8'));
const readonly=state('S04旧档只读后_浏览器存档.json'),continued=state('S04旧档新表态后_浏览器存档.json');
assert.deepEqual(readonly,old);assert.equal(readonly.weekly.relationships,undefined);
for(const k of Object.keys(old).filter(k=>!['revision','relations','facts','weekly'].includes(k)))assert.deepEqual(continued[k],old[k],`旧档字段 ${k}`);
for(const k of Object.keys(old.weekly))assert.deepEqual(continued.weekly[k],old.weekly[k],`旧周字段 ${k}`);
assert.deepEqual(continued.facts.slice(0,old.facts.length),old.facts);
for(const actor of Object.keys(old.relations)){
 const a=old.relations[actor],b=continued.relations[actor];
 if(actor!=='C02')assert.deepEqual(b,a);else for(const k of ['trust','intimacy','safety','stage','npcIntent'])assert.equal(b[k],a[k]);
}
assert.equal(continued.relations.C02.playerIntent,'仅合作');assert.equal(continued.revision,old.revision+1);
const cb=continued.weekly.relationships;assert.equal(cb.origin,'continued-save');assert.deepEqual(cb.baseline,continued.relations);
for(const k of ['encounters','messages','requests','issues','agreements'])assert.deepEqual(cb[k],[]);
assert.equal(cb.history.length,1);assert.equal(cb.history[0].kind,'boundary');
const baseline=json('施工前文件基线.json'),allowed=new Set(['styles.css','package.json','src/migration.js','src/week.js','src/engine.js','src/content.js','src/week-ui.js','src/app.js','README.md','docs/施工/施工进度.md']);
const changed=[],unchanged=[];for(const [file,digest] of Object.entries(baseline)){
 if(sha(fs.readFileSync(new URL(file,root)))!==digest){assert.ok(allowed.has(file),`意外改变既有文件：${file}`);changed.push(file);}else unchanged.push(file);
}
const diag=json('最终加载诊断.json');assert.deepEqual(diag.logs,[]);assert.equal(diag.measure.width,1280);assert.equal(diag.measure.height,720);assert.ok(diag.measure.scrollWidth<=diag.measure.width);
const rules=json('S05最终交付验收.json');assert.equal(rules.proofs.length,7);
for(const p of rules.proofs){assert.equal(p.final.stage,'相守');assert.equal(p.monthly,24);assert.equal(p.government,12);}
assert.equal(rules.parallel.ending.relation,14);assert.equal(rules.parallel.issues,0);assert.equal(rules.cooperate.ending.relation,14);assert.equal(rules.cooperate.ending.government,12);assert.equal(rules.cooperate.monthly,24);
console.log(JSON.stringify({scope:'只读持久化文件复核；交互过程另见S05记录',originals,browser:{heart:{slotsBefore:6,slotsAfter:5,stage:'倾心',exclusiveQuote:true,oldTranscriptsAndLedgerExact:true},invite:{acceptedThenFulfilled:true,slots:1,chargedOnce:true,treasury:59},resume:{boundaryHistoryRetained:true,actualNextDayAnswer:true,npcWasAlreadyWillingInThisBrowserCase:true,noExtraStage:true},manualSlots:5,fifthSlotRestoredStateExact:true,oldS04:{readonlyStateExact:true,neutralContinuation:true,oldStatsStageNpcIntentProjectsLedgerTranscriptsExact:true}},files:{baseline:Object.keys(baseline).length,changed,unchanged:unchanged.length,protectedWordArtS01AndHistoricalEvidenceExact:true},rules:{independentRoutes:7,allReachCompanionship:true,parallel:rules.parallel,cooperate:rules.cooperate},diagnostics:diag,limits:['两年路径为规则推演，非完整逐屏人工试玩','实际1280×720桌面；未计手机或多视口通过','未测真实AI、长期平衡；正式后续R节点仍待S08']},null,2));
