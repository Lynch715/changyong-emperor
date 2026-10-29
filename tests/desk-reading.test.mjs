import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {deskReading,renderDeskReading} from '../src/desk-reading.js';
import {renderWeeklyDesk} from '../src/week-ui.js';
import {before,act,choose} from '../scripts/check-s08-06.mjs';
import {parseImport,exportSave} from '../src/storage.js';
const opened=()=>choose(E.createWeeklyGame(),'M01');
const helpers={heading:(_e,t,sub)=>`<h1>${t}</h1><p>${sub}</p>`,eventCard:e=>`<article data-event="${e.id}">${e.title}</article>`,button:(t,a)=>`<button data-action="${a}">${t}</button>`,tag:t=>`<span>${t}</span>`};
const chat=()=>{let s=opened();s=act(s,{type:'week-plan',kind:'chat',actor:'C02',date:s.date,period:'day',topic:'recent',choice:'listen'});return act(s,{type:'week-fulfill',planId:s.weekly.plans.at(-1).id});};
test('新开局只呈现实际待办，没有虚构人物回应或提前完成的故事',()=>{
 const s=E.createWeeklyGame(),raw=JSON.stringify(s),x=deskReading(s);assert.equal(x.current.id,'M01');assert.equal(x.latest,null);assert.deepEqual(x.changes,{remaining:6,used:0,held:0,income:0,expense:0});assert.equal(JSON.stringify(s),raw);
});
test('已做选择的回应逐字来自原快照，重读入口不结算、不请求接话',()=>{
 const s=opened(),raw=JSON.stringify(s),x=deskReading(s),h=renderDeskReading(s,helpers);assert.equal(x.latest.key,'M01');assert.equal(x.latest.text,s.transcripts.M01.dialogue);assert.ok(h.includes('data-read="M01"'));for(let i=0;i<3;i++)renderWeeklyDesk(s,helpers);assert.equal(JSON.stringify(s),raw);assert.deepEqual(parseImport(exportSave(s)),s);
});
test('晚日期的回应优先，存档对象重排不把旧幕错当刚发生',()=>{
 const s=choose(before.weekly.checkpoints.M09,'M09');s.transcripts=Object.fromEntries(Object.entries(s.transcripts).reverse());E.validateSave(s);assert.equal(deskReading(s).latest.key,'M09');
});
test('同日按真实事务次序选最近片刻，实际完成交谈可从御案重读',()=>{
 const s=chat(),p=s.weekly.plans.at(-1),x=deskReading(s);assert.equal(x.latest.kind,'activity');assert.equal(x.latest.key,p.id);assert.equal(x.latest.text,p.dialogue);assert.ok(renderDeskReading(s,helpers).includes(`data-week-read="${p.id}"`));assert.deepEqual(x.changes,{remaining:5,used:1,held:0,income:0,expense:0});
});
test('未来预约不冒充回应，预占不误计成已用或支出',()=>{
 let s=act(chat(),{type:'activity-buy',giftId:'GF02'});s=act(s,{type:'week-plan',kind:'gift',actor:'C02',date:{year:1,month:1,day:4},period:'evening',itemId:s.weekly.activities.inventory[0].id});const x=deskReading(s);assert.equal(x.latest.kind,'activity');assert.equal(x.latest.key,s.weekly.plans[0].id);assert.deepEqual(x.changes,{remaining:4,used:1,held:1,income:0,expense:1});assert.equal(s.weekly.activities.inventory[0].status,'held');
});
test('本周账只统计真实当周流水，保留未来宴席预算但不提前支出',()=>{
 let s=chat();s=act(s,{type:'week-plan',kind:'banquet',actor:'C01',guests:['C06','C02'],date:{year:1,month:1,day:4},period:'day',theme:'tea'});const x=deskReading(s);assert.equal(x.reserved,2);assert.equal(x.changes.expense,0);assert.equal(x.changes.held,2);assert.equal(x.changes.used,1);assert.match(renderDeskReading(s,helpers),/预留 2 点，尚未支出/);
 const later=choose(before.weekly.checkpoints.M09,'M09');assert.ok(later.ledger.some(r=>r.amount<0));assert.equal(deskReading(later).changes.expense,0);
});
test('故事、真实回应与周变化先于项目和信箱，当前场景只有一份执行入口',()=>{
 const s=choose(before.weekly.checkpoints.M09,'M09'),x=deskReading(s),html=renderWeeklyDesk(s,helpers);assert.equal(x.current.id,'R05-01');assert.equal(html.split('data-event="R05-01"').length-1,1);assert.ok(html.indexOf('desk-current')<html.indexOf('desk-response'));assert.ok(html.indexOf('desk-response')<html.indexOf('desk-week-change'));assert.ok(html.indexOf('desk-week-change')<html.indexOf('project-desk'));assert.match(html,/data-action="week-new"/);assert.match(html,/data-week-plan/);
});
test('旧手写文本与已有AI附文不改写，展示严格转义玩家可影响的原文',()=>{
 const s=opened();s.transcripts.M01.dialogue+='\n<script>window.bad=true</script> & “旧句保留”';s.transcripts.M01.aiReaction='既有接话保留';E.validateSave(s);const raw=JSON.stringify(s),html=renderDeskReading(s,helpers);assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('旧句保留'));assert.equal(JSON.stringify(s),raw);assert.equal(s.transcripts.M01.aiReaction,'既有接话保留');
});
