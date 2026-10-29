import{saveEnvelope,saveManual,backupBeforeRestore,STORAGE_KEY}from'../src/storage.js';
import{renderLastWeekReview}from'../src/week-experience-ui.js';
import{courtEvents,renderCourtAgenda}from'../src/court-reading.js';
import{renderProjectDesk,renderProjects}from'../src/project-ui.js';
import{readingText,readingNote}from'../src/reading-copy.js';
import{resolveInput}from'../src/input.js';
import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import zlib from'node:zlib';
import * as E from'../src/engine.js';import{installContinuation}from'../src/longform.js';import{monthlyBudget}from'../src/weekly-economy.js';import{weekStops}from'../src/week.js';import{stamp}from'../src/calendar.js';import{settle,reach}from'../scripts/s14-02-v03-scenarios.mjs';import{deskReading,renderDeskReading}from'../src/desk-reading.js';import{createInputSession}from'../src/input-session.js';
const __evidence=f=>{try{return f()}catch(e){if(e&&e.code==='ENOENT')return null;throw e}};

const act=(s,a)=>E.commit(s,E.preview(s,[a])).state;
const base=__evidence(()=>JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../docs/施工/证据/2026-10-28-最终验收/cooperation-卷2.json.gz',import.meta.url)))));
function third(){const s=structuredClone(base);s.weekly.economy={version:2};return installContinuation(s,'a'.repeat(64));}
function freeMarch(){return reach(third(),{year:3,month:1,day:24});}
test('开局两年净增72，三至三十年只另增84，费用报价不因等待膨胀',()=>{const s=E.createWeeklyGame();let sum=0;for(let y=1;y<=30;y++)for(let m=1;m<=12;m++){const x=monthlyBudget(s,{year:y,month:m,day:30});assert.equal(x.income,12);assert.ok([9,12].includes(x.expense));sum+=x.net;}assert.equal(sum,156);assert.equal(monthlyBudget(s,{year:2,month:12}).net,3);assert.equal(monthlyBudget(s,{year:3,month:2}).net,0);assert.equal(monthlyBudget(s,{year:3,month:1}).net,3);});



test('御案到期约定可直接执行，未来约定不提前开放，重读不改变预约',()=>{let s=act(E.createWeeklyGame(),{type:'event',eventId:'M01',choiceId:'steady'});s=act(s,{type:'week-plan',kind:'chat',actor:'C02',date:s.date,period:'day'});const raw=JSON.stringify(s),id=s.weekly.plans[0].id,x=deskReading(s);assert.equal(x.duePlan.id,id);const html=renderDeskReading(s,{eventCard:()=>'',button:()=>''});assert.ok(html.includes('data-week-fulfill="'+id+'"'));assert.equal(JSON.stringify(s),raw);let future=act(E.createWeeklyGame(),{type:'event',eventId:'M01',choiceId:'steady'});future=act(future,{type:'week-plan',kind:'chat',actor:'C02',date:{year:1,month:1,day:3},period:'day'});assert.equal(deskReading(future).duePlan,null);});
test('取消立即中止旧请求，旧完成不能释放或取消后来的输入',()=>{const gate=createInputSession(),old=gate.start();let aborted=0;old.controller.signal.addEventListener('abort',()=>aborted++);assert.equal(gate.cancel(),true);assert.equal(aborted,1);assert.equal(gate.current(old),false);const next=gate.start();assert.equal(gate.finish(old),false);assert.equal(gate.current(next),true);assert.equal(gate.finish(next),true);assert.equal(gate.cancel(),false);});


test('陪朕说闲话直接交谈，混合未来安排仍保留正式候选',async()=>{let s=act(E.createWeeklyGame(),{type:'event',eventId:'M01',choiceId:'steady'}),calls=0;const remote=async()=>{calls++;throw Error('闲话不应送解析');};for(const input of ['今夜窗外有风，陪朕说两句闲话','陪朕聊聊','陪我说说话']){const x=await resolveInput(input,{state:s,actor:'C02'},remote);assert.equal(x.actions.length,0);assert.equal(x.clarifications.length,0);}assert.equal(calls,0);const mixed=await resolveInput('陪朕说两句闲话，再明日晚间陪你散步',{state:s,actor:'C02'},remote);assert.equal(mixed.actions.length,1);assert.equal(mixed.actions[0].kind,'walk');assert.equal(mixed.actions[0].period,'evening');assert.equal(calls,0);});








