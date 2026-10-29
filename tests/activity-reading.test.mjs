import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../src/engine.js';
import {parseImport,exportSave} from '../src/storage.js';
import {activityPresentation,renderBondAvailability,availableGiftItems,giftInventory,renderGiftInventory,banquetSeatOrder} from '../src/activity-reading.js';
import {renderPersonActivities,renderActivityBox,activityPlannerFields} from '../src/activity-ui.js';
import {renderWeeklyPalace} from '../src/palace-ui.js';
import {renderConfirmationReading} from '../src/confirmation-reading.js';
import {renderPlanCard} from '../src/plan-reading.js';
const act=(s,a)=>E.commit(s,E.preview(s,[a])).state,opened=()=>act(E.createWeeklyGame(),{type:'event',eventId:'M01',choiceId:'steady'});
const heart=()=>parseImport(JSON.parse(fs.readFileSync(new URL('../docs/施工/证据/2026-10-24-S05/S05五槽_浏览器全部档案.json',import.meta.url),'utf8')).records[0].raw);
const buy=(s,giftId)=>act(s,{type:'activity-buy',giftId});
const perform=(s,kind,extra={})=>{s=act(s,{type:'week-plan',kind,actor:'C02',date:s.date,period:s.weekly.clock%2?'evening':'day',...extra});return act(s,{type:'week-fulfill',planId:s.weekly.plans.at(-1).id});};
test('尚未互表心意时，普通话题仍可用，亲近入口说明当前分寸并禁用',()=>{
 const s=opened(),raw=JSON.stringify(s),x=activityPresentation(s,'C02'),html=renderPersonActivities(s,'C02');assert.equal(x.modes.length,0);assert.equal(x.topics.length,4);assert.match(html,/交谈与日常/);assert.match(html,/data-person-activity="chat" data-activity-actor="C02" >/);assert.match(html,/data-person-activity="bond" data-activity-actor="C02" disabled/);assert.match(html,/亲近要听双方此刻的意思/);assert.equal(JSON.stringify(s),raw);
});
test('真实倾心旧档只显示当前四种亲近，不提前提供共担夜谈与相守留宿',()=>{
 const s=heart(),raw=JSON.stringify(s),x=activityPresentation(s,'C02');assert.deepEqual(x.modes.map(m=>m.id),['quiet','hand','hug','outing']);assert.match(renderBondAvailability(s,'C02'),/牵手同行/);assert.doesNotMatch(renderBondAvailability(s,'C02'),/留宿|相伴夜谈/);assert.equal(JSON.stringify(s),raw);assert.deepEqual(parseImport(exportSave(s)),s);
});
test('玩家暂缓或NPC不愿时，旧倾心阶段不继续开放亲近，普通交谈仍在',()=>{
 let s=E.setBoundary(heart(),'C02','暂缓','ui-boundary');assert.equal(activityPresentation(s,'C02').modes.length,0);assert.match(renderPersonActivities(s,'C02'),/你的意愿：暂缓/);s=heart();s.relations.C02.npcIntent='仅合作';assert.equal(activityPresentation(s,'C02').modes.length,0);assert.match(renderPersonActivities(s,'C02'),/对方意愿：仅合作/);
});
test('恢复请求待答复时保留真实意愿，不把已倾心误作当前同意',()=>{
 let s=E.setBoundary(heart(),'C02','暂缓','ui-pause');s=act(s,{type:'resume',actor:'C02'});assert.equal(s.relations.C02.npcIntent,'愿发展');assert.equal(activityPresentation(s,'C02').modes.length,0);assert.match(activityPresentation(s,'C02').reason,/等答复/);
});
test('未相见与封卷不开放亲近，人物旧原文保持',()=>{
 const s=opened(),raw=JSON.stringify(s.transcripts);assert.equal(activityPresentation(s,'C03').modes.length,0);assert.match(activityPresentation(s,'C03').reason,/还未真正相见/);const h=heart();h.sealed=true;assert.equal(activityPresentation(h,'C02').modes.length,0);assert.match(renderBondAvailability(h,'C02'),/disabled/);assert.equal(JSON.stringify(s.transcripts),raw);
});
test('修改赠礼约定能保留该约预留的新物，其他约定仍不可占用它',()=>{
 let s=buy(opened(),'GF02');const item=s.weekly.activities.inventory[0];s=act(s,{type:'week-plan',kind:'gift',actor:'C02',itemId:item.id,date:{year:1,month:1,day:3},period:'day'});const p=s.weekly.plans.at(-1),raw=JSON.stringify(s);assert.equal(availableGiftItems(s).length,0);assert.equal(availableGiftItems(s,p.id)[0].id,item.id);const html=activityPlannerFields(s,'gift','C02',{...p.activity,planId:p.id});assert.ok(html.includes(`value="${item.id}" selected`));assert.equal(JSON.stringify(s),raw);const n=act(s,{type:'week-edit',planId:p.id,date:{year:1,month:1,day:4},period:'evening',itemId:item.id});assert.equal(n.weekly.plans.at(-1).activity.itemId,item.id);assert.equal(n.stats.treasury,s.stats.treasury);
});
test('匣中、预留与在途各自显示真实状态，未收回执不冒称收下',()=>{
 let s=buy(opened(),'GF02');const item=s.weekly.activities.inventory[0];assert.equal(giftInventory(s)[0].status,'匣中可送');let held=act(s,{type:'week-plan',kind:'gift',actor:'C02',itemId:item.id,date:{year:1,month:1,day:3},period:'day'});assert.match(renderGiftInventory(held),/已留给苏培盛的约定/);const sent=act(s,{type:'activity-gift-send',actor:'C02',itemId:item.id});assert.match(renderGiftInventory(sent),/正在递送，等实际回执/);assert.doesNotMatch(renderGiftInventory(sent),/已送给|重读收礼原话/);
});
test('收礼回执只引用实际原记录，收下不再列为可送库存',()=>{
 let s=buy(opened(),'GF02');const item=s.weekly.activities.inventory[0];s=perform(s,'gift',{itemId:item.id});const raw=JSON.stringify(s),row=giftInventory(s)[0],html=renderGiftInventory(s);assert.equal(row.status,'已送给苏培盛');assert.equal(row.receipt.accepted,true);assert.ok(html.includes(`data-activity-entry="${row.receipt.id}"`));assert.equal(availableGiftItems(s).length,0);assert.equal(JSON.stringify(s),raw);
});
test('婉拒后实物仍可用，原拒绝回执可重读且不改意愿',()=>{
 let s=buy(opened(),'GF03');const item=s.weekly.activities.inventory[0],r=structuredClone(s.relations.C02);s=perform(s,'gift',{itemId:item.id});const row=giftInventory(s)[0];assert.equal(row.available,true);assert.equal(row.receipt.accepted,false);assert.match(renderGiftInventory(s),/婉拒耐磨护腕/);assert.deepEqual(s.relations.C02,r);
});
test('未拥有的新物与旧纪念不伪造库存，采买目录默认收起仍可达',()=>{
 const s=heart(),raw=JSON.stringify(s);assert.equal(giftInventory(s).length,0);const html=renderActivityBox(s);assert.match(html,/<details class="gift-catalog"><summary>挑选新的物件/);assert.match(html,/data-activity-buy="GF01"/);assert.equal(JSON.stringify(s),raw);
});
test('更换宴席宾客保留仍在席的顺序，新宾客补入且不重复',()=>{
 assert.deepEqual(banquetSeatOrder(['C02','C06'],['C06','C02']),['C06','C02']);assert.deepEqual(banquetSeatOrder(['C02','C06','C07'],['C06','C02']),['C06','C02','C07']);assert.deepEqual(banquetSeatOrder(['C02','C07'],['C06','C02','C07']),['C02','C07']);assert.deepEqual(banquetSeatOrder(['C02','C06'],['C02','C02','C99']),['C02','C06']);
});
test('宫阙可直接商量当前亲近，普通话题与送礼入口保留，转义物品原名',()=>{
 const s=heart(),raw=JSON.stringify(s),html=renderWeeklyPalace(s,{heading:()=>'',monogram:()=>''});assert.match(html,/data-person-activity="bond" data-activity-actor="C02" >/);assert.match(html,/data-person-activity="chat" data-activity-actor="C02"/);assert.equal(JSON.stringify(s),raw);const n=buy(opened(),'GF02');n.weekly.activities.inventory[0].name='<script>';assert.ok(renderGiftInventory(n).includes('&lt;script&gt;'));assert.ok(!renderGiftInventory(n).includes('<script>'));
});
test('小宴确认与已约卡片明示实际主题和座次，不只显示宾客集合',()=>{
 const s=opened(),raw=JSON.stringify(s),p=E.preview(s,[{type:'week-plan',kind:'banquet',actor:'C01',guests:['C02','C06'],seats:['C06','C02'],theme:'tea',date:{year:1,month:1,day:3},period:'day'}]);assert.match(renderConfirmationReading(s,p),/清茶小席 · 座次：宜修、苏培盛/);assert.equal(JSON.stringify(s),raw);const n=E.commit(s,p).state;assert.match(renderPlanCard(n,n.weekly.plans.at(-1)),/清茶小席 · 座次：宜修、苏培盛/);
});
test('赠礼和亲近确认明确原物与具体方式，预演不改变实物或旧相处',()=>{
 const s=buy(opened(),'GF02'),raw=JSON.stringify(s),p=E.preview(s,[{type:'week-plan',kind:'gift',actor:'C02',itemId:s.weekly.activities.inventory[0].id,date:{year:1,month:1,day:3},period:'day'}]);assert.match(renderConfirmationReading(s,p),/所带新物：铜制暖手炉/);assert.equal(JSON.stringify(s),raw);const h=heart(),old=JSON.stringify(h),hp=E.preview(h,[{type:'week-plan',kind:'bond',actor:'C02',mode:'hug',date:{year:1,month:1,day:13},period:'evening'}]);assert.match(renderConfirmationReading(h,hp),/相伴方式：拥抱/);assert.equal(JSON.stringify(h),old);
});
