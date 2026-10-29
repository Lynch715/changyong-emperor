import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {exportSave,parseImport} from '../src/storage.js';
import {currentWeek,reservedMoney,heldSlots} from '../src/week.js';
import {stamp} from '../src/calendar.js';
import {planReading,sortedPlans,renderPlanCard,renderOtherPlans,renderPlanHistory} from '../src/plan-reading.js';
import {renderWeekPlans} from '../src/week-ui.js';
const act=(s,a)=>E.commit(s,E.preview(s,Array.isArray(a)?a:[a])).state;
const start=()=>act(E.createWeeklyGame(),{type:'event',eventId:'M01',choiceId:'steady'});
const plan=(s,day,period='day',extra={})=>act(s,{type:'week-plan',kind:'study',actor:'C01',date:{year:1,month:1,day},period,...extra});
test('未来预约没有执行入口，沿日程向前而不直接演出未来活动',()=>{
 const s=plan(start(),5),p=s.weekly.plans.at(-1),raw=JSON.stringify(s),x=planReading(s,p),html=renderPlanCard(s,p);assert.equal(x.future,true);assert.equal(x.ready,false);assert.match(html,/沿日程向前/);assert.doesNotMatch(html,/data-week-fulfill/);assert.equal(JSON.stringify(s),raw);
});
test('约期到达才可执行；日期时段和事务不被只读探测修改',()=>{
 let s=plan(start(),3);const p=s.weekly.plans.at(-1);s=act(s,{type:'week-advance'});assert.equal(s.weekly.clock,stamp(p.date,p.period));const raw=JSON.stringify(s);assert.equal(planReading(s,p).ready,true);assert.match(renderPlanCard(s,p),/data-week-fulfill/);assert.equal(JSON.stringify(s),raw);
});
test('眼前仍有主线时，已到期活动显示原拦截理由，不可绕过原规则',()=>{
 const s=plan(E.createWeeklyGame(),2),p=s.weekly.plans.at(-1),raw=JSON.stringify(s);assert.equal(planReading(s,p).ready,false);assert.match(planReading(s,p).reason,/先回应眼前的剧情/);assert.doesNotMatch(renderPlanCard(s,p),/data-week-fulfill/);assert.equal(JSON.stringify(s),raw);
});
test('乱序添加的日程按日期时段展示，源数组与快照保持',()=>{
 let s=plan(start(),5);s=plan(s,3,'evening');s=plan(s,3,'day');const raw=JSON.stringify(s),rows=sortedPlans(s.weekly.plans);assert.deepEqual(rows.map(p=>[p.date.day,p.period]),[[3,'day'],[3,'evening'],[5,'day']]);assert.equal(JSON.stringify(s),raw);const html=renderWeekPlans(s);assert.ok(html.indexOf('3日')<html.indexOf('5日'));assert.ok(html.indexOf('data-plan-card="'+rows[0].id)<html.indexOf('data-plan-card="'+rows[1].id));
});
test('预占格与预算明确，草稿候选未预占也未支出',()=>{
 let s=plan(start(),3,'day',{kind:'craft',giftId:'GF01'});s=plan(s,4,'day',{status:'draft'});s=plan(s,5,'day',{status:'candidate'});assert.equal(heldSlots(s,currentWeek(s).id),1);assert.equal(s.stats.treasury,60);assert.ok(reservedMoney(s)>0);assert.match(renderWeekPlans(s),/可用 5 \/ 6 格[\s\S]*预占 1 · 已用 0[\s\S]*已预留预算/);assert.match(renderPlanCard(s,s.weekly.plans[0]),/预算\d+点（尚未支出）/);assert.match(renderPlanCard(s,s.weekly.plans[1]),/草稿 · 未预占/);assert.match(renderPlanCard(s,s.weekly.plans[2]),/待商量 · 未预占/);
});
test('改期保留原记录和新约去向，取消释放预占且不扣钱',()=>{
 let s=plan(start(),3);const old=s.weekly.plans.at(-1);s=act(s,{type:'week-edit',planId:old.id,date:{year:1,month:1,day:4},period:'evening'});const p=s.weekly.plans.at(-1);assert.match(renderPlanCard(s,p),/原约：雍正元年1月3日 · 日间/);assert.match(renderPlanHistory(s),/已改期 · 原预占已解除[\s\S]*改至：雍正元年1月4日 · 晚间/);s=act(s,{type:'week-cancel',planId:p.id});assert.equal(s.remaining,6);assert.equal(s.stats.treasury,60);assert.match(renderPlanHistory(s),/已取消 · 预占已解除/);assert.equal(s.weekly.plans[0].status,'rescheduled');
});
test('完成活动仅可重读，原回应和核销后状态保持',()=>{
 let s=plan(start(),2);s=act(s,{type:'week-fulfill',planId:s.weekly.plans.at(-1).id});const p=s.weekly.plans.at(-1),raw=JSON.stringify(s),html=renderPlanCard(s,p);assert.match(html,/已完成 · 已核销/);assert.match(html,/data-week-read/);assert.doesNotMatch(html,/data-week-(fulfill|edit|cancel)/);assert.equal(JSON.stringify(s),raw);assert.deepEqual(parseImport(exportSave(s)),s);
});
test('不在当前周的约定按真实日期排序，候选与正式预占分别显示',()=>{
 let s=plan(start(),11,'day',{status:'candidate'});s=plan(s,9,'evening',{status:'draft'});const raw=JSON.stringify(s),html=renderOtherPlans(s,currentWeek(s).id);assert.ok(html.indexOf('1月9日')<html.indexOf('1月11日'));assert.match(html,/待商量 · 未预占/);assert.match(html,/草稿 · 未预占/);assert.equal(JSON.stringify(s),raw);
});
test('过期旧约仅据实记失约，不给改期取消或倒放执行入口',()=>{
 const s=plan(start(),2),p=s.weekly.plans.at(-1);s.weekly.clock++;const html=renderPlanCard(s,p);assert.equal(planReading(s,p).overdue,true);assert.match(html,/data-week-breach/);assert.doesNotMatch(html,/data-week-(fulfill|edit|cancel)/);assert.match(html,/不倒放日期/);
});
test('旧约待协商用修改安排进入原改期，不伪装成普通候选可直接接受',()=>{
 const s=plan(start(),3),p={...s.weekly.plans.at(-1),status:'needs-reschedule'},html=renderPlanCard(s,p);assert.match(html,/旧约待协商 · 未记失约/);assert.match(html,/data-week-edit/);assert.doesNotMatch(html,/data-week-accept/);
});
test('封卷后未来约定不带写入按钮，只有已完成原回应可以重读',()=>{
 const s=plan(start(),3),p=s.weekly.plans.at(-1);s.sealed=true;assert.equal(planReading(s,p).ready,false);assert.doesNotMatch(renderPlanCard(s,p),/data-week-(edit|cancel|fulfill)|data-action/);
});
test('日程标签与旧记录转义，不把输入变成页面元素',()=>{
 const s=plan(start(),3),p=s.weekly.plans.at(-1);p.label='<img src=x>';let html=renderPlanCard(s,p);assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));p.status='cancelled';html=renderPlanHistory(s);assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));
});
test('较早预约会先停下，后一个预约不会越过它；执行后时钟只向前',()=>{
 let s=plan(start(),5);s=plan(s,3);const later=s.weekly.plans[0],first=s.weekly.plans[1];assert.throws(()=>act(s,{type:'week-fulfill',planId:later.id}),/先处理较早/);s=act(s,{type:'week-advance'});assert.equal(s.weekly.clock,stamp(first.date,first.period));s=act(s,{type:'week-fulfill',planId:first.id});const after=s.weekly.clock;assert.equal(planReading(s,later).future,true);s=act(s,{type:'week-advance'});assert.ok(s.weekly.clock>after);assert.equal(s.weekly.clock,stamp(later.date,later.period));s=act(s,{type:'week-fulfill',planId:later.id});assert.equal(s.weekly.plans.filter(p=>p.status==='completed').length,2);
});
