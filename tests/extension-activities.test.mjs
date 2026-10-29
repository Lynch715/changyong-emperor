import {before} from '../scripts/check-s08-04.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {initial,node,perform,buy,gifted,act} from '../scripts/s12-06-scenarios.mjs';
import {extensionRelation,extensionWork} from '../src/extension-routes.js';
import {parseActivityClause} from '../src/activity-input.js';
import {extensionActivityScene} from '../src/extension-activities.js';
import {renderExtensionPerson} from '../src/extension-ui.js';
import {route} from '../scripts/s12-02-scenarios.mjs';
const unchanged=(a,b)=>{assert.deepEqual(b.transcripts,a.transcripts);assert.deepEqual(b.relations,a.relations);assert.deepEqual(b.extensionRoutes,a.extensionRoutes);assert.deepEqual(b.ledger,a.ledger);};
for(const cid of ['C09','C10'])for(const phase of [1,2])test(`${cid} 阶段${phase}私聊散步与真实库存送礼，既有正文和意愿保持`,()=>{
 let s=initial('none');if(phase===2)s=node(s,cid,'cooperate');const before=structuredClone(s),r=extensionRelation(s,cid);
 s=perform(s,cid,'chat',{topic:'shared',choice:'share'});const t=s.weekly.activities.entries.at(-1);assert.equal(t.variantId,`AC-${cid}-T${phase}`);assert.ok(t.text.length>160);assert.equal(s.remaining,before.remaining-1);unchanged(before,s);
 s=perform(s,cid,'walk',{topic:'shared',choice:'listen',place:'corridor'});const w=s.weekly.activities.entries.at(-1);assert.equal(w.variantId,`AC-${cid}-W${phase}`);assert.match(w.text,/避风长廊/);assert.ok(w.sources.includes(t.id));assert.equal(s.remaining,before.remaining-2);unchanged(before,s);
 s=buy(s,cid==='C09'?'GF10':'GF01');const money=s.stats.treasury,item=s.weekly.activities.inventory.at(-1);s=perform(s,cid,'gift',{itemId:item.id});const g=s.weekly.activities.entries.filter(e=>e.kind==='gift-result').at(-1);assert.equal(g.variantId,`AC-${cid}-G${phase}`);assert.equal(g.accepted,true);assert.equal(g.reward,0);assert.equal(s.weekly.activities.inventory.at(-1).status,'given');assert.equal(s.stats.treasury,money);assert.deepEqual(extensionRelation(s,cid),r);assert.deepEqual(s.transcripts,before.transcripts);
 const own=E.visibleContext(s,cid).mandatory.activityMoments;assert.ok(own.some(e=>e.text===g.text));assert.equal(E.visibleContext(s,cid==='C09'?'C10':'C09').mandatory.activityMoments.length,0);assert.equal(E.visibleContext(s,'C02').mandatory.activityMoments.length,0);
 assert.equal(E.validateSave(JSON.parse(JSON.stringify(s))).weekly.activities.entries.at(-1).text,s.weekly.activities.entries.at(-1).text);
});
for(const cid of ['C09','C10'])test(`${cid} 同场送礼与一次追问不重复占格，另一次礼或拒收保留库存`,()=>{
 let s=initial(),start=s.remaining;s=buy(s,cid==='C09'?'GF10':'GF01');s=perform(s,cid,'chat');const planId=s.weekly.plans.at(-1).id,itemId=s.weekly.activities.inventory.at(-1).id;
 s=act(s,{type:'activity-gift-same',actor:cid,planId,itemId});assert.equal(s.remaining,start-1);s=act(s,{type:'activity-followup',actor:cid,planId,choice:'share'});assert.equal(s.remaining,start-1);assert.throws(()=>E.preview(s,[{type:'activity-followup',actor:cid,planId}]),/已经说过/);
 s=buy(s,cid==='C09'?'GF10':'GF01');s=act(s,{type:'activity-gift-same',actor:cid,planId,itemId:s.weekly.activities.inventory.at(-1).id});assert.equal(s.weekly.activities.inventory.at(-1).status,'held');assert.equal(s.weekly.activities.entries.at(-1).accepted,false);assert.equal(s.remaining,start-1);
 s=perform(s,'C01','study');assert.throws(()=>E.preview(s,[{type:'activity-gift-same',actor:cid,planId,itemId:s.weekly.activities.inventory.at(-1).id}]),/同场|结束/);
});
for(const cid of ['C09','C10'])test(`${cid} XR同场接问不另占格，陌生、未达伴侣阶段与伪造同场拒绝`,()=>{
 let s=node(initial(),cid);const remaining=s.remaining,t=s.transcripts[`XR${cid.slice(1)}-01`];s=act(s,{type:'activity-followup',actor:cid,sceneTransaction:t.transactionId});assert.equal(s.remaining,remaining);
 assert.throws(()=>E.preview(s,[{type:'activity-followup',actor:cid,sceneTransaction:'not-real'}]));assert.throws(()=>E.preview(E.createWeeklyGame(),[{type:'week-plan',kind:'chat',actor:cid}]));assert.throws(()=>E.preview(s,[{type:'week-plan',kind:'bond',actor:cid}]),/相见|亲近|阶段/);
});
test('首次问公事没有虚造沈眉庄疑账，正式节点后仍只保留待核而非已查清',()=>{
 const a=initial(),p={kind:'chat',actor:'C10',activity:{topic:'project',choice:'listen'}};assert.equal(extensionWork(a),null);assert.match(extensionActivityScene(a,p).text,/没有她已经提出/);const b=node(a,'C10');assert.match(extensionActivityScene(b,p).text,/正式回执未至/);assert.deepEqual(extensionWork(perform(b,'C10','chat',{topic:'project'})),extensionWork(b));
});
test('预览取消与页面查看不落经历；自由输入识别两人并走相同预约',()=>{
 const s=initial(),raw=JSON.stringify(s);for(const cid of ['C09','C10']){const name=cid==='C09'?'甄嬛':'沈眉庄';const p=parseActivityClause(`明日晚间与${name}散步`,{state:s,actor:'C01'});assert.equal(p.actions[0].actor,cid);E.preview(s,p.actions);assert.match(renderExtensionPerson(s,cid),/问近况与说话/);}assert.equal(JSON.stringify(s),raw);
});
test('新周聊天入口支持两人事件身份并可重新导入，不向七核心关系添加伪造分数',()=>{
 for(const cid of ['C09','C10']){const before=initial(),s=act(before,{type:'chat-open',actor:cid});assert.deepEqual(s.relations,before.relations);assert.equal(s.remaining,before.remaining-1);assert.ok(Object.values(s.events).some(e=>e.id==='CHAT_'+cid));}
});

test('含混旧影未解时婉拒新礼，原赏、旧文与关系不被新物冲掉',()=>{
 let s=route({m11:'vague'}).afterSecond;const original=structuredClone(s);s=buy(s,'GF10');const itemId=s.weekly.activities.inventory.at(-1).id;s=perform(s,'C09','gift',{itemId});assert.equal(s.weekly.activities.inventory.at(-1).status,'held');assert.match(s.weekly.activities.entries.at(-1).text,/未答的话/);assert.deepEqual(s.transcripts,original.transcripts);assert.deepEqual(extensionRelation(s,'C09'),extensionRelation(original,'C09'));
});
test('错误知情人、他人原话来源、伪造变体与恋爱奖励不能导入',()=>{
 const good=gifted('C09',2);for(const change of [s=>s.weekly.activities.entries[0].visibleTo.push('C10'),s=>s.weekly.activities.entries[0].reward=2,s=>s.weekly.activities.entries[0].variantId='AC-C09-G1',s=>s.weekly.activities.entries[0].sources=['M06']]){const bad=structuredClone(good);change(bad);assert.throws(()=>E.validateSave(bad));}
});
test('停止检索也停用后来引用的相处与短笺，历史正文保持可重读',()=>{
 let s=perform(initial(),'C09','chat');const first=s.weekly.activities.entries.at(-1);s=perform(s,'C09','walk',{topic:'shared'});const second=s.weekly.activities.entries.at(-1),raw=JSON.stringify(s.weekly.activities.entries);s=E.changeMemoryRecord(s,'activity:'+first.id,'stop');assert.equal(JSON.stringify(s.weekly.activities.entries),raw);assert.equal(E.visibleContext(s,'C09').mandatory.activityMoments.some(e=>[first.id,second.id].includes(e.id)),false);assert.equal(E.visibleContext(s,'C09').facts.some(f=>[first.id,second.id].includes(f.id)),false);assert.notEqual(E.fixedReply(s,'C09','上次散步'),second.text);
});

test('殿前尚未提交与同批新相识不能预约扩展活动',()=>{
 const s=before.weekly.checkpoints.M06;assert.throws(()=>E.preview(s,[{type:'week-plan',actor:'C09',kind:'chat'}]),/先单独/);assert.throws(()=>E.preview(s,[{type:'event',eventId:'M06',choiceId:'fair'},{type:'week-plan',actor:'C10',kind:'walk'}]),/先单独/);
});
