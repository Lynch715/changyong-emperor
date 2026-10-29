import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';
import * as E from '../src/engine.js';import{parseImport,exportSave}from'../src/storage.js';
import{runPlaystyle}from'../scripts/s13-02-scenarios.mjs';import{runAccountingRoute}from'../scripts/s13-03-scenarios.mjs';
import{auditReviews,answerWeek,legacyContinuation,act,reach}from'../scripts/s13-04-scenarios.mjs';import{weekReviewHTML}from'../src/week-experience-ui.js';
const __evidence=f=>{try{return f()}catch(e){if(e&&e.code==='ENOENT')return null;throw e}};

let work;const cooperation=()=>work||=runPlaystyle('cooperation').s;
test('新档八重点周各有真实来源的回报与可追溯后续，扩展两人原话均收录',()=>{
 const s=cooperation(),raw=JSON.stringify(s),rows=auditReviews(s);assert.equal(rows.length,8);assert.ok(rows.every(r=>r.payoffSources.length&&r.expectations.length));
 const four=s.weekly.reports.find(r=>r.weekId==='W04').review;for(const id of ['XR09-01','XR10-01']){assert.ok(four.sources.some(x=>x.id===id));assert.ok(four.passages.some(p=>p.includes(s.transcripts[id].dialogue)));}
 assert.match(weekReviewHTML(four),/接下来，仍有一页/);assert.equal(JSON.stringify(s),raw);
});

test('未来约定不算已赴约，后来取消不倒改原回顾或发经历',()=>{
 let s=act(E.createWeeklyGame(),{type:'event',eventId:'M01',choiceId:'steady'});s=act(s,{type:'week-plan',kind:'chat',actor:'C02',date:{year:1,month:4,day:3},period:'evening'});const id=s.weekly.plans.at(-1).id;s=reach(s,{year:1,month:1,day:9});const old=structuredClone(s.weekly.reports[0].review);assert.ok(old.expectations.some(x=>x.kind==='plan'&&x.id===id));assert.ok(!old.sources.some(x=>x.kind==='plan'));s=act(s,{type:'week-cancel',planId:id});assert.deepEqual(s.weekly.reports[0].review,old);assert.equal(s.weekly.relationships.encounters.length,0);
});

test('伪造回报、期待正文、来源或提前工期不能读入新版回顾',()=>{
 const source=cooperation();for(const edit of [s=>s.weekly.reports[0].review.passages.push('未赴的约定已经履行，大家都答应相守。'),s=>s.weekly.reports[0].review.expectations[0].text='前营已经领齐粮。',s=>s.weekly.reports[0].review.expectations[0].id='不存在',s=>s.weekly.reports[0].review.expectations[0].date.day=9,s=>s.weekly.reports[0].review.sources.push({kind:'extension-talk',id:'假答复'})]){const s=structuredClone(source);edit(s);assert.throws(()=>E.validateSave(s));}
});
test('低资金待补、后来补工及原回报分别留源，不把未来完工写进旧周',()=>{
 const {s}=runAccountingRoute('low');auditReviews(s);const p=s.weekly.projects.items['PR-WATER'],old=s.weekly.reports.find(r=>r.weekId==='X4').review;assert.ok(old.expectations.some(x=>x.kind==='project-report'&&x.id===p.reports[0].id));assert.ok(!old.passages.some(t=>t===p.reports[1].text));assert.equal(p.reports[0].issue,true);assert.equal(p.reports[1].issue,false);
});

