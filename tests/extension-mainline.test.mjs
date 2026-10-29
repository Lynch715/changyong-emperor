import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as E from '../src/engine.js';import {sceneText} from '../src/story.js';
import {extensionRelation,extensionWork} from '../src/extension-routes.js';
import {extensionEnding} from '../src/extension-ending.js';
import {exportSave,parseImport} from '../src/storage.js';
import {route as zhen,repaired,talk as zhenTalk} from '../scripts/s12-02-scenarios.mjs';
import {route as shen,renewed,act,node,talk} from '../scripts/s12-03-scenarios.mjs';
import {seal,beforeSeal} from '../scripts/s12-04-scenarios.mjs';
const __evidence=f=>{try{return f()}catch(e){if(e&&e.code==='ENOENT')return null;throw e}};

const oldEnd='docs/施工/证据/2026-10-24-S08-04/含混赏赐_两年封卷.json';
for(const world of ['weekly','quarter'])test(`${world}M11读取后来首幕的真实分寸，120组合总矩阵且不要求次幕`,()=>{
 for(const initial of ['open','none','unsure','unspoken'])for(const first of ['develop','cooperate','unsure'])for(const choice of ['clear','open','polite','unsure','vague']){
  const r=zhen({world,initial,first,m11:choice}),s=r.beforeM11,h=E.hash(s),body=sceneText(s,E.getEvent(s,'M11'));
  assert.match(body,/碎玉轩读诗/);assert.match(body,first==='develop'?/读诗后，你说愿意/:first==='cooperate'?/后来你们已把私情的距离说清/:/后来你说尚未想定/);
  assert.ok(!s.events['XR09-02']);assert.equal(E.hash(s),h);
  assert.deepEqual(r.afterM11.transcripts['XR09-01'],s.transcripts['XR09-01']);
  assert.deepEqual(r.afterM11.transcripts.M06,s.transcripts.M06);
  assert.deepEqual(extensionRelation(r.afterM11,'C10'),extensionRelation(s,'C10'));
  const prior={develop:'open',cooperate:'polite',unsure:'unsure'}[first];
  assert.equal(r.afterM11.transcripts.M11.dialogue.includes('今日改了意思'),['open','polite','unsure'].includes(choice)&&choice!==prior);
  assert.equal(r.afterM11.stats.treasury-s.stats.treasury,choice==='vague'?-2:0);
 }
});
test('M11读取首幕之后的新终止；新表态不自动恢复NPC意愿',()=>{
 const base=zhen().beforeM11,s=zhenTalk(base,'boundary','终止恋爱'),old=E.clone(s);
 assert.match(sceneText(s,E.getEvent(s,'M11')),/已明确停止私情/);
 const n=node(s,'M11','open');assert.match(n.transcripts.M11.dialogue,/今日改了意思/);
 assert.equal(extensionRelation(n).requiresRenewal,true);assert.notEqual(extensionRelation(n).npcIntent,'愿发展');assert.deepEqual(n.extensionRoutes,old.extensionRoutes);
});
for(const world of ['weekly','quarter'])test(`${world}真实封卷仅首幕，不补次幕，并列出四XR未完数`,()=>{
 for(const [cid,route,missing]of [['C09',zhen,'XR09-02'],['C10',shen,'XR10-02']]){
  const r=route({world}),s=seal(r.afterFirst),text=s.ending.passages.find(p=>p.startsWith(cid==='C09'?'甄嬛：':'沈眉庄：'));
  assert.match(text,/尚未发生/);assert.match(text,/她尚未答应私情/);assert.ok(!text.includes('两人已亲自答应'));
  assert.equal(s.ending.counts.extension,1);assert.ok(s.ending.pending.includes(missing));assert.equal(s.ending.pending.filter(id=>id.startsWith('XR')).length,3);
  for(const [id,t]of Object.entries(r.afterFirst.transcripts))assert.deepEqual(s.transcripts[id],t);
  assert.deepEqual(parseImport(exportSave(s)),s);
 }
});
for(const choice of ['仅合作','暂缓','终止恋爱'])test(`新封卷${choice}优先于旧NPC愿发展，不写成等候复合`,()=>{
 for(const [cid,route]of [['C09',zhen],['C10',shen]]){
  const r=route(),s=talk(r.afterSecond,'boundary',choice,cid),n=seal(s),text=extensionEnding(n,cid);
  assert.equal(extensionRelation(s,cid).npcIntent,'愿发展');assert.match(text,new RegExp(choice));assert.ok(!text.includes('尚待她自己的新答复'));assert.ok(!text.includes('两人已亲自答应'));
  assert.deepEqual(n.extensionRoutes,s.extensionRoutes);assert.deepEqual(n.transcripts[r.afterSecond.extensionRoutes.history.at(-1).eventId],s.transcripts[r.afterSecond.extensionRoutes.history.at(-1).eventId]);
  if(cid==='C10')assert.deepEqual(extensionWork(n),extensionWork(s));
 }
});
test('含混未补谈、已补谈、已兑现与本人新答各有不同结局且保留旧赏',()=>{
 const r=repaired(),texts=[r.afterSecond,r.repair,r.kept,r.renewed].map(s=>extensionEnding(seal(s),'C09'));
 assert.match(texts[0],/那句回避尚未补谈/);assert.ok(!texts[0].includes('补谈已经发生'));
 assert.match(texts[1],/补谈已经发生/);assert.ok(!texts[1].includes('另日的兑现已有记录'));
 assert.match(texts[2],/另日的兑现已有记录/);assert.match(texts[2],/尚未发生的重新答复/);
 assert.match(texts[3],/两人已亲自答应继续了解/);assert.ok(!texts[3].includes('信任还须由后来相处兑现'));
 for(const s of [r.afterSecond,r.repair,r.kept,r.renewed]){const n=seal(s);assert.deepEqual(n.transcripts.M11,r.afterM11.transcripts.M11);assert.ok(n.ledger.some(l=>l.label==='旧影新衣'&&l.amount===-2));assert.match(extensionEnding(n,'C09'),/赏|旧话/);}
});
test('重新发展尚待答复与当前合作分开；沈眉庄真实新答不凭职差奖励',()=>{
 const r=renewed(),pending=extensionEnding(seal(r.afterSecond),'C10'),yes=extensionEnding(seal(r.afterResume),'C10');
 assert.match(pending,/新的请求没有自动换来她的同意/);assert.match(yes,/两人已亲自答应继续了解/);
 for(const text of [pending,yes]){assert.match(text,/正式回执仍未至/);assert.match(text,/拒绝新增长差/);assert.ok(!text.includes('已经查明'));}
 assert.deepEqual(extensionWork(r.afterSecond),extensionWork(r.afterResume));
});
test('未发生暖阁时只读预判不造旧影事实，且两个人的摘要互不泄露',()=>{
 const z=zhen().afterFirst,s=shen().afterFirst;assert.match(extensionEnding(z,'C09'),/暖阁新衣的质问尚未发生/);assert.ok(!extensionEnding(s,'C10').includes('旧影'));assert.ok(!extensionEnding(z,'C09').includes('冬衣份例'));
 for(const n of [z,s]){const h=E.hash(n);extensionEnding(n,'C09');extensionEnding(n,'C10');assert.equal(E.hash(n),h);}
});

