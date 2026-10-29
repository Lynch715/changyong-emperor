import test from 'node:test';import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {initial,node,perform,act} from '../scripts/s12-06-scenarios.mjs';
import {reach} from '../scripts/check-s08-06.mjs';
import {addDays} from '../src/calendar.js';
import {extensionRelation} from '../src/extension-routes.js';
import {relationshipMessageBuckets} from '../src/relationship-ui.js';
const message=(s,cid,n)=>s.weekly.relationships.messages.find(m=>m.id===`IN-${cid}-${n}`);
for(const cid of ['C09','C10'])test(`${cid} 从本人新前事寄两笺，阅读免费、接受预占、改期和履约只核销一次`,()=>{
 let s=initial('none');assert.equal(message(s,cid,1),undefined);s=node(s,cid,'cooperate');const original=structuredClone(s),r=extensionRelation(s,cid),note=message(s,cid,1),invite=message(s,cid,2);assert.ok(note&&invite);assert.throws(()=>E.preview(s,[{type:'relationship-message',actor:cid,messageId:note.id}]),/尚未到达/);
 s=reach(s,addDays(s.date,2));const remaining=s.remaining;s=act(s,{type:'relationship-message',actor:cid,messageId:note.id});const text=message(s,cid,1).text;assert.equal(s.remaining,remaining);assert.match(text,/上回|相谈/);s=act(s,{type:'relationship-message',actor:cid,messageId:invite.id});const m=message(s,cid,2);assert.ok(m.suggested);assert.match(m.text,/合作分寸/);assert.equal(s.weekly.plans.length,original.weekly.plans.length);
 const p=E.preview(s,[{type:'relationship-invite',actor:cid,messageId:m.id,kind:'chat',...m.suggested}]);assert.equal(message(s,cid,2).status,'read');s=E.validateSave(E.commit(s,p).state);const plan=s.weekly.plans.at(-1);assert.equal(plan.socialInviteId,m.id);assert.equal(s.remaining,remaining-1);const afterAccepted=s.remaining;
 s=act(s,{type:'week-edit',planId:plan.id,date:addDays(plan.date,1),period:'evening'});assert.equal(s.remaining,afterAccepted);s=reach(s,s.weekly.plans.at(-1).date);s=act(s,{type:'week-fulfill',planId:s.weekly.plans.at(-1).id});assert.equal(s.remaining,afterAccepted);assert.deepEqual(extensionRelation(s,cid),r);assert.deepEqual(s.transcripts,original.transcripts);assert.equal(message(s,cid,1).text,text);
 const other=cid==='C09'?'C10':'C09';assert.equal(E.visibleContext(s,other).facts.some(f=>f.id==='INITIATIVE_'+m.id),false);assert.equal(s.weekly.relationships.messages.filter(m=>m.actor===cid).length,2);
});
test('读档不补造来信；实际聊天也可触发，停止检索来源不写新笺',()=>{
 const s=initial(),raw=JSON.stringify(s);E.validateSave(s);relationshipMessageBuckets(s);assert.equal(JSON.stringify(s),raw);let n=perform(s,'C09','chat');assert.ok(message(n,'C09',1).source.startsWith('AC-'));n=reach(n,addDays(n.date,1));n=E.changeMemoryRecord(n,'fact:'+message(n,'C09',1).source,'stop');assert.throws(()=>E.preview(n,[{type:'relationship-message',actor:'C09',messageId:'IN-C09-1'}]),/停止检索/);
});
test('暂缓终止不催约；新边界收回未接受邀约，谢绝不损失分数或职业',()=>{
 for(const cid of ['C09','C10']){const paused=node(initial(),cid,'unsure');assert.equal(message(paused,cid,2),undefined);let s=node(initial(),cid);s=reach(s,addDays(s.date,2));const r=extensionRelation(s,cid),before=s.remaining;s=act(s,{type:'relationship-decline',actor:cid,messageId:`IN-${cid}-2`});assert.deepEqual(extensionRelation(s,cid),r);assert.equal(s.remaining,before);assert.equal(s.weekly.plans.length,0);
 let b=node(initial(),cid);b=act(b,{type:'extension-talk',actor:cid,kind:'boundary',choice:'终止恋爱'});assert.equal(message(b,cid,2).status,'declined');assert.equal(b.weekly.plans.length,0);}
});
test('两人新邀约与七核心共用每周两条首页提示，其他消息仍在信箱',()=>{
 let s=node(initial(),'C09');s=node(s,'C10');s=reach(s,addDays(s.date,2));const b=relationshipMessageBuckets(s);assert.ok(b.front.length<=2);assert.ok(b.front.length+b.mail.length>=4);const own=relationshipMessageBuckets(s,'C10');assert.ok(own.front.some(m=>m.id==='IN-C10-2'));
});
test('来信不能伪造本人前事、提前阅读、公开私话或虚构正式约定',()=>{
 let s=node(initial(),'C10');s=reach(s,addDays(s.date,2));s=act(s,{type:'relationship-message',actor:'C10',messageId:'IN-C10-2'});
 for(const change of [s=>message(s,'C10',2).source='FACT_M06',s=>message(s,'C10',2).createdTransaction='fake',s=>message(s,'C10',2).date=message(s,'C10',2).sourceDate,s=>s.facts.find(f=>f.id==='INITIATIVE_IN-C10-2').visibleTo.push('C09'),s=>message(s,'C10',2).status='accepted']){const bad=structuredClone(s);change(bad);assert.throws(()=>E.validateSave(bad));}
});
test('甄沈代送礼沿实际七日送达与七日回执，不提前收下或改变意愿',()=>{
 for(const cid of ['C09','C10']){let s=initial(),r=extensionRelation(s,cid);s=act(s,{type:'activity-buy',giftId:cid==='C09'?'GF10':'GF01'});const itemId=s.weekly.activities.inventory.at(-1).id,remaining=s.remaining,money=s.stats.treasury;s=act(s,{type:'activity-gift-send',actor:cid,itemId});const sh=s.weekly.activities.shipments.at(-1);assert.equal(s.remaining,remaining);assert.equal(s.stats.treasury,money-1);assert.throws(()=>E.preview(s,[{type:'activity-receive',shipmentId:sh.id}]));s=reach(s,sh.deliveryAt);s=act(s,{type:'activity-receive',shipmentId:sh.id});assert.equal(s.weekly.activities.inventory.at(-1).status,'in-transit');s=reach(s,s.weekly.activities.shipments.at(-1).dueDate);s=act(s,{type:'activity-receive',shipmentId:sh.id});assert.equal(s.weekly.activities.inventory.at(-1).status,'given');assert.deepEqual(extensionRelation(s,cid),r);}
});
