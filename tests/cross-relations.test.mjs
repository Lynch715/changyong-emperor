import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as E from '../src/engine.js';import {CROSS_PAIRS,crossContext,crossHistory} from '../src/cross-relations.js';
import {buildAIContext,validateNarrative} from '../src/input.js';import {parseImport,exportSave} from '../src/storage.js';import {source,ask,allAccounts} from '../scripts/s12-05-scenarios.mjs';import {act as run} from '../scripts/s12-03-scenarios.mjs';import {beforeSeal,seal} from '../scripts/s12-04-scenarios.mjs';import {reach} from '../scripts/check-s08-06.mjs';
const __evidence=f=>{try{return f()}catch(e){if(e&&e.code==='ENOENT')return null;throw e}};

for(const world of ['weekly','quarter'])for(const [pair,p]of Object.entries(CROSS_PAIRS))test(`${world}${p.name}双方分别听原话：日期、来源、隔离和关系不改`,()=>{
 for(const actor of p.actors){const old=source(world),s=ask(old,pair,actor),h=crossHistory(s)[0],other=p.actors.find(x=>x!==actor),tx=s.transactions.at(-1);assert.equal(h.kind,'statement');assert.deepEqual(h.date,s.date);assert.equal(h.transactionId,tx.id);assert.deepEqual(h.visibleTo,['C01',actor]);assert.equal(tx.results[0].treasury,0);assert.deepEqual(s.relations,old.relations);assert.deepEqual(s.transcripts,old.transcripts);assert.deepEqual(s.ledger,old.ledger);assert.equal(s.extensionRoutes,old.extensionRoutes);assert.equal(E.visibleContext(s,actor).mandatory.crossRelations.accounts.length,1);assert.equal(E.visibleContext(s,other).mandatory.crossRelations.accounts.length,0);assert.ok(E.canReadFact(s,'C01',s.facts.at(-1)));assert.ok(!E.canReadFact(s,other,s.facts.at(-1)));assert.deepEqual(parseImport(exportSave(s)),s);assert.throws(()=>ask(s,pair,actor));}
});
test('六段可连续实际完成，四人知情仍各自独立；同场允礼不重复扣格',()=>{
 const s=allAccounts(),h=crossHistory(s);assert.equal(h.length,6);assert.equal(s.transactions.find(t=>t.id===h[0].transactionId).results[0].actionCost,0);
 assert.equal(crossContext(s,'C09').accounts.length,3);assert.equal(crossContext(s,'C04').accounts.length,1);assert.equal(crossContext(s,'C05').accounts.length,1);assert.equal(crossContext(s,'C10').accounts.length,1);
 for(const cid of ['C02','C06','C08'])assert.ok(!E.visibleContext(s,cid).facts.some(f=>f.id.startsWith('CROSS-')));
 for(const pair of Object.keys(CROSS_PAIRS)){const rows=h.filter(x=>x.pair===pair);assert.notEqual(rows[0].transactionId,rows[1].transactionId);assert.notEqual(rows[0].text,rows[1].text);}
});
test('温实初未终止旧情与甄嬛的独立回答同时保留，不变成她已答应或他已放下',()=>{
 const s=allAccounts(),ctx=buildAIContext(s,'C04',null),h=crossHistory(s).find(h=>h.actor==='C04');assert.equal(h.claim,'own-affection-unresolved');assert.match(h.text,/没有说自己从此放下/);
 assert.match(E.fixedReply(s,'C04','你与甄嬛怎样？'),/不能说已经放下/);assert.ok(!E.fixedReply(s,'C09','温实初如何想？').includes('亲口承认自己'));
 for(const text of ['我已经放下甄嬛了。','我与甄嬛已经相爱。','甄嬛和允礼已经成婚。','甄嬛和眉庄已经决裂。','甄嬛出轨了。'])assert.throws(()=>validateNarrative({speakerId:'C04',text,factIds:[]},ctx));
 assert.equal(validateNarrative({speakerId:'C04',text:'不能说我已经放下甄嬛。',factIds:[h.id]},ctx),'不能说我已经放下甄嬛。');
});
test('停止检索只停止本人事实摘记，原话、旧情和他人记录不删除',()=>{
 const old=allAccounts(),h=crossHistory(old).find(h=>h.actor==='C04'),s=E.changeMemoryRecord(old,'fact:'+h.id,'stop'),ctx=buildAIContext(s,'C04',null);
 assert.ok(!ctx.facts.some(f=>f.id===h.id));assert.equal(ctx.mandatory.crossRelations.accounts.length,0);assert.deepEqual(s.crossRelations,old.crossRelations);assert.deepEqual(s.transcripts,old.transcripts);assert.match(E.fixedReply(s,'C04','甄嬛与你的关系呢？'),/没有在眼前分别问明/);assert.equal(buildAIContext(s,'C09',null).mandatory.crossRelations.accounts.length,3);
});

test('预览与取消不写入；重复提交不重复扣格；越权范围和混批拒绝',()=>{
 const s=source(),h=E.hash(s),a={type:'cross-inquiry',pair:'C09-C10',actor:'C09'},p=E.preview(s,[a]);assert.equal(E.hash(s),h);const n=E.commit(s,p).state;assert.deepEqual(E.commit(n,p).state,n);
 for(const bad of [{...a,actor:'C04'},{...a,pair:'C02-C09'},{...a,visibleTo:['public']},{...a,conclusion:'相爱'}])assert.throws(()=>E.preview(s,[bad]));
 assert.throws(()=>E.preview(s,[a,{...a,actor:'C10'}]));assert.throws(()=>E.preview(E.createWeeklyGame(),[a]));assert.equal(E.hash(s),h);
});
test('伪造知情、日期、他人答复、删来源与错配事务不能导入',()=>{
 const old=allAccounts();for(const mutate of [s=>delete s.crossRelations,s=>s.crossRelations.history.pop(),s=>s.crossRelations.history[0].visibleTo.push('C09'),s=>s.crossRelations.history[0].date.day++,s=>s.crossRelations.history[0].actor='C09',s=>s.crossRelations.history[0].claim='romance-confirmed',s=>s.crossRelations.history[0].transactionId='fake',s=>s.crossRelations.history[0].text='代答',s=>s.facts.find(f=>f.id.startsWith('CROSS-')).visibleTo=['public'],s=>s.facts=s.facts.filter(f=>!f.id.startsWith('CROSS-')),s=>s.crossRelations.history.reverse()]){const s=E.clone(old);mutate(s);assert.throws(()=>E.validateSave(s));}
});
test('王府日程不跳过；旧档晚期可问甄嬛而不假造允礼到场',()=>{
 let s=source();s=reach(s,{year:2,month:7,day:3});assert.throws(()=>ask(s,'C05-C09','C05'));const n=ask(s,'C05-C09','C09');assert.deepEqual(crossHistory(n)[0].visibleTo,['C01','C09']);assert.deepEqual(n.transcripts,s.transcripts);
});
test('病休期间询问须排到实际复诊后晚间，不把病休日写作本人已到场',async()=>{
 const {before}=await import('../scripts/check-s08-04.mjs');let s=run(before.weekly.checkpoints.M08,{type:'event',eventId:'M08',choiceId:'listen'});
 for(const e of E.requiredEvents(s))if(e.parent==='M08')s=run(s,{type:'event',eventId:e.id,choiceId:'work'});
 s=reach(s,{year:2,month:1,day:10});s=run(s,{type:'week-extend',date:s.date});const n=ask(s,'C04-C09','C04');assert.deepEqual(crossHistory(n)[0].date,{year:2,month:1,day:13});assert.deepEqual(n.transcripts,s.transcripts);
});
test('封卷后只读相谈，封卷前已有事实和正文完整保留',()=>{
 const s=allAccounts(),pre=beforeSeal(s),n=seal(pre);assert.deepEqual(n.crossRelations,s.crossRelations);assert.deepEqual(n.transcripts,pre.transcripts);assert.deepEqual(parseImport(exportSave(n)),n);assert.throws(()=>ask(seal(source()),'C05-C09','C09'));
});
test('季度档复制迁移保留原话、真实费用来源与原始JSON，不重建交叉关系',async()=>{
 const {prepareMigration}=await import('../src/migration.js'),s=ask(source('quarter'),'C04-C09','C04'),raw=exportSave(s),plan=await prepareMigration(raw,{storage:{getItem:()=>null,length:0}});
 assert.equal(plan.sourceRaw,raw);assert.deepEqual(plan.target.crossRelations,s.crossRelations);assert.deepEqual(plan.target.transcripts,s.transcripts);assert.ok(plan.report.preserved.some(r=>r.key==='crossRelations'&&r.equal));assert.deepEqual(E.validateSave(plan.target).crossRelations,s.crossRelations);
});
test('实际另谈与同场费用不能互相伪造，记忆明确为本人陈述',()=>{
 const s=allAccounts(),paid=crossHistory(s).find(h=>h.encounter.cost===1),f=E.visibleContext(s,paid.actor).facts.find(f=>f.id===paid.id);assert.equal(f.epistemic.status,'personal-statement');
 for(const mutate of [n=>n.crossRelations.history[0].encounter.sceneId='R04-01',n=>delete n.crossRelations.history[0].encounter,n=>{const h=n.crossRelations.history.find(h=>h.id===paid.id);h.encounter={cost:0,sceneId:'R05-01'};n.transactions.find(t=>t.id===h.transactionId).results[0].actionCost=0;},n=>{for(const[k,c]of Object.entries(n.weekly.consumed))if(c.source==='CROSS-'+paid.transactionId)delete n.weekly.consumed[k];}]){const n=E.clone(s);mutate(n);assert.throws(()=>E.validateSave(n));}
});
