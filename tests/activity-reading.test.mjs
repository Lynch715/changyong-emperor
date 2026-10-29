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
const __evidence=f=>{try{return f()}catch(e){if(e&&e.code==='ENOENT')return null;throw e}};

const act=(s,a)=>E.commit(s,E.preview(s,[a])).state,opened=()=>act(E.createWeeklyGame(),{type:'event',eventId:'M01',choiceId:'steady'});
const heart=()=>__evidence(()=>parseImport(JSON.parse(fs.readFileSync(new URL('../docs/施工/证据/2026-10-24-S05/S05五槽_浏览器全部档案.json',import.meta.url),'utf8')).records[0].raw));
const buy=(s,giftId)=>act(s,{type:'activity-buy',giftId});
const perform=(s,kind,extra={})=>{s=act(s,{type:'week-plan',kind,actor:'C02',date:s.date,period:s.weekly.clock%2?'evening':'day',...extra});return act(s,{type:'week-fulfill',planId:s.weekly.plans.at(-1).id});};
test('尚未互表心意时，普通话题仍可用，亲近入口说明当前分寸并禁用',()=>{
 const s=opened(),raw=JSON.stringify(s),x=activityPresentation(s,'C02'),html=renderPersonActivities(s,'C02');assert.equal(x.modes.length,0);assert.equal(x.topics.length,4);assert.match(html,/交谈与日常/);assert.match(html,/data-person-activity="chat" data-activity-actor="C02" >/);assert.match(html,/data-person-activity="bond" data-activity-actor="C02" disabled/);assert.match(html,/亲近要听双方此刻的意思/);assert.equal(JSON.stringify(s),raw);
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

test('更换宴席宾客保留仍在席的顺序，新宾客补入且不重复',()=>{
 assert.deepEqual(banquetSeatOrder(['C02','C06'],['C06','C02']),['C06','C02']);assert.deepEqual(banquetSeatOrder(['C02','C06','C07'],['C06','C02']),['C06','C02','C07']);assert.deepEqual(banquetSeatOrder(['C02','C07'],['C06','C02','C07']),['C02','C07']);assert.deepEqual(banquetSeatOrder(['C02','C06'],['C02','C02','C99']),['C02','C06']);
});

test('小宴确认与已约卡片明示实际主题和座次，不只显示宾客集合',()=>{
 const s=opened(),raw=JSON.stringify(s),p=E.preview(s,[{type:'week-plan',kind:'banquet',actor:'C01',guests:['C02','C06'],seats:['C06','C02'],theme:'tea',date:{year:1,month:1,day:3},period:'day'}]);assert.match(renderConfirmationReading(s,p),/清茶小席 · 座次：宜修、苏培盛/);assert.equal(JSON.stringify(s),raw);const n=E.commit(s,p).state;assert.match(renderPlanCard(n,n.weekly.plans.at(-1)),/清茶小席 · 座次：宜修、苏培盛/);
});

