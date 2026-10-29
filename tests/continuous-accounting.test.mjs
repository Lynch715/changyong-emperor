import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {runAccountingRoute} from '../scripts/s13-03-scenarios.mjs';import{reconcile}from'../scripts/s13-03-accounting.mjs';import{ordinal}from'../src/calendar.js';
const __evidence=f=>{try{return f()}catch(e){if(e&&e.code==='ENOENT')return null;throw e}};

const prior=mode=>__evidence(()=>JSON.parse(fs.readFileSync(new URL(`../docs/施工/证据/2026-10-27-S13-02/${mode}-封卷.json`,import.meta.url),'utf8'))).state;

test('两年采买、同场礼、登门礼、代送、八席、失约与补工连续核账且每笔重放幂等',()=>{
 const r=runAccountingRoute(),{s,summary:a}=r;assert.equal(a.closing,87);assert.equal(a.income,292);assert.equal(a.expense,265);assert.equal(a.replayChecks,s.transactions.length);assert.equal(a.used,50);assert.equal(a.monthly,24);assert.equal(r.checks.length,6);
 assert.equal(s.weekly.plans.filter(p=>p.kind==='banquet'&&p.status==='completed').length,8);assert.ok(s.weekly.plans.some(p=>p.status==='rescheduled'));assert.ok(s.weekly.plans.some(p=>p.status==='cancelled'));
 const entries=s.weekly.activities.entries;assert.equal(entries.filter(e=>e.kind==='gift-result'&&e.accepted).length,5);assert.equal(entries.filter(e=>e.kind==='gift-result'&&!e.accepted).length,2);
 assert.equal(s.weekly.activities.shipments.length,2);assert.ok(s.weekly.activities.shipments.every(sh=>sh.status==='answered'&&ordinal(sh.answeredAt)-ordinal(sh.actualDeliveryAt)>=7));
 assert.equal(s.weekly.plans.filter(p=>p.status==='breached').length,1);assert.equal(s.weekly.relationships.issues[0].status,'resolved');
 const p=s.weekly.projects.items['PR-WATER'];assert.equal(p.status,'completed');assert.equal(p.reports.length,2);assert.equal(p.reports[0].issue,true);assert.equal(p.reports[1].issue,false);assert.equal(p.funds.reduce((n,f)=>n+f.amount,0),3);
 const m=s.weekly.projects.items['PR-MILITARY'];assert.equal(m.funds.reduce((n,f)=>n+(f.direction==='out'?f.amount:0),0),8);assert.ok(!s.ledger.some(l=>l.id.endsWith('-G05')));
 const reservation=r.snapshots.宴约预留;assert.equal(reconcile(reservation).reserved,4);assert.equal(reservation.ledger.some(l=>l.id.endsWith('-'+reservation.weekly.plans.at(-1).id)),false);
 const start=r.snapshots.小宴已付款;assert.equal(start.weekly.plans.at(-1).status,'executing');assert.equal(start.ledger.at(-1).amount,-3);
});
test('真实采买压低资金后预算保护、取消释放、月结与另季付费补工均可继续',()=>{
 const r=runAccountingRoute('low'),{s,summary:a}=r;assert.equal(a.minSpendable,0);assert.equal(a.replayChecks,s.transactions.length);assert.equal(a.monthly,24);assert.ok(a.closing>0);assert.equal(reconcile(r.snapshots.低资源预留).reserved,4);assert.equal(r.snapshots.低资源预留.stats.treasury,4);
 assert.ok(r.snapshots.低资源补工受阻.stats.treasury<2);assert.ok(r.checks.some(c=>c.label==='补工余款不足时整笔不提交'));
 const p=s.weekly.projects.items['PR-WATER'];assert.equal(p.status,'completed');assert.deepEqual(p.runs[1].startedAt,{year:2,month:1,day:2});assert.deepEqual(p.reports[1].date,{year:2,month:1,day:9});assert.equal(p.reports[0].issue,true);assert.equal(p.funds.reduce((n,f)=>n+f.amount,0),2);
 assert.equal(s.weekly.activities.shipments[0].status,'answered');assert.ok(s.weekly.plans.some(p=>p.kind==='banquet'&&p.status==='completed'));assert.ok(s.weekly.activities.inventory.length>28);
});

