import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,preview,commit,requiredEvents,done,clone,visibleContext,factReaders,setBoundary,validateSave,actorPlace,eventOptions} from '../src/engine.js';
import {EVENTS} from '../src/content.js';
import {buildReactionContext} from '../src/input.js';
import {reactionAI,setAIConfig} from '../src/ai.js';
const act=(s,a)=>commit(s,preview(s,[a])).state;
const choose=(s,id,choiceId=EVENTS[id].options[0].id)=>act(s,{type:'event',eventId:id,choiceId});
function drain(s){let guard=0;while(requiredEvents(s).length){assert.ok(++guard<30);s=choose(s,requiredEvents(s)[0].id);}return s;}
function atG04(){let s=createGame();for(let t=1;t<6;t++){s=drain(s);s=act(s,{type:'advance'});}while(!requiredEvents(s).some(e=>e.id==='G04'))s=choose(s,requiredEvents(s)[0].id);if(!done(s,'R03-01'))s=choose(s,'R03-01');return s;}
function supply(s,{escort=true,visibility='private',officer='C28'}={}){return act(s,{type:'event',eventId:'G04',choiceId:'custom',params:{amount:6,officer,escort,visibility}});}
test('已付押运在G05沿用：预览、显示、流水与提交均不重复收2点',()=>{
 const before=atG04(),paid=supply(before),p=preview(paid,[{type:'event',eventId:'G05',choiceId:'escort'}]);
 assert.equal(p.totalCost,0);assert.equal(eventOptions(paid,EVENTS.G05)[0].effects.treasury,0);
 assert.match(eventOptions(paid,EVENTS.G05)[0].detail,/不再收费/);
 const after=commit(paid,p).state;assert.equal(before.stats.treasury-after.stats.treasury,8);
 assert.equal(after.ledger.filter(l=>l.label===EVENTS.G05.title).length,0);
 assert.match(after.transcripts.G05.result,/不再收取押运费/);assert.equal(after.remaining,paid.remaining-1);
 assert.equal(commit(after,p).duplicate,true);
});
test('未付押运仍正常收费，已付押运另选签领只收新的1点',()=>{
 const s=atG04(),notPaid=supply(s,{escort:false});assert.equal(preview(notPaid,[{type:'event',eventId:'G05',choiceId:'escort'}]).totalCost,2);
 const paid=supply(s);assert.equal(preview(paid,[{type:'event',eventId:'G05',choiceId:'ledger'}]).totalCost,1);
});
test('保密军需仅发给当事人与指定承办人，公开选择仍公开',()=>{
 const s=supply(atG04(),{officer:'C26'});const canSee=cid=>visibleContext(s,cid).facts.some(f=>f.id==='FACT_G04');
 assert.equal(canSee('C03'),true);assert.equal(canSee('C26'),true);
 for(const cid of ['C02','C06','C07','C28','C32'])assert.equal(canSee(cid),false,cid);
 const open=supply(atG04(),{visibility:'public'});assert.ok(visibleContext(open,'C02').facts.some(f=>f.id==='FACT_G04'));
});
test('旧档错误公开标记在检索时收紧，不改历史原文或原始存档',()=>{
 const legacy=supply(atG04());legacy.facts.find(f=>f.id==='FACT_G04').visibleTo=['public'];
 const original=clone(legacy),restored=validateSave(legacy);
 assert.equal(visibleContext(restored,'C02').facts.some(f=>f.id==='FACT_G04'),false);
 assert.deepEqual(visibleContext(restored,'C03').facts.find(f=>f.id==='FACT_G04').visibleTo,['C01','C03','C28']);
 assert.deepEqual(factReaders(restored,restored.facts.find(f=>f.id==='FACT_G04')),['C01','C03','C28']);
 assert.deepEqual(legacy,original);assert.deepEqual(restored.transcripts,original.transcripts);assert.deepEqual(restored.ledger,original.ledger);
});
test('未公开的停香处置不成为年世兰或其他人的事实',()=>{
 let s=drain(createGame());s=act(s,{type:'advance'});s=choose(s,'M03','quiet');
 for(const id of ['C07','C02','C06'])assert.equal(visibleContext(s,id).facts.some(f=>f.id==='FACT_M03'),false);
 assert.throws(()=>buildReactionContext(s,'C07','M03'),/尚未向此人说明/);
 s=choose(s,'R07-01','warm');assert.ok(visibleContext(s,'C07').facts.some(f=>f.id==='FACT_R07-01'));
});
test('隐瞒结果不通过reaction旁路发送给模型，正常留茶仍有接话上下文',async t=>{
 let s=drain(createGame());s=act(s,{type:'advance'});s=choose(s,'M03','quiet');
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;throw Error('不应调用');});setAIConfig({mode:'server'});
 try{await assert.rejects(()=>reactionAI(s,'C07','M03'),/尚未向此人说明/);assert.equal(calls,0);}finally{setAIConfig({mode:'fixed'});}
 const normal=drain(createGame());assert.equal(buildReactionContext(normal,'C02','R02-01').reaction.choice,normal.transcripts['R02-01'].choice);
});
test('宫中私下主线不广播，原有明确公开事实仍可见',()=>{
 let s=drain(createGame());assert.equal(visibleContext(s,'C06').facts.some(f=>f.id==='FACT_M02'),false);
 s.facts.push({id:'PUBLIC_NOTICE',text:'公开告示',visibleTo:['public'],source:'notice'});
 assert.ok(visibleContext(s,'C06').facts.some(f=>f.id==='PUBLIC_NOTICE'));
});
test('恢复意愿不替NPC答应，明确暂缓时不能暖选项绕过',()=>{
 let s=drain(createGame());s=setBoundary(s,'C02','终止恋爱','test');s.relations.C02.npcIntent='暂缓';
 const old=clone(s.relations.C02);s=act(s,{type:'resume',actor:'C02'});
 assert.equal(s.relations.C02.playerIntent,'愿发展');assert.equal(s.relations.C02.npcIntent,'暂缓');
 for(const k of ['trust','intimacy','safety','stage'])assert.equal(s.relations.C02[k],old[k]);
 assert.throws(()=>choose(s,'R02-02','warm'),/对方当前尚未愿意/);
 assert.doesNotThrow(()=>choose(s,'R02-02','work'));assert.ok(!s.facts.at(-1).text.includes('双方同意'));
});
test('对方已经愿发展时保留原意愿，仍不跳阶段或重复节点',()=>{
 let s=drain(createGame());s=setBoundary(s,'C02','仅合作','test');const stage=s.relations.C02.stage;
 s=act(s,{type:'resume',actor:'C02'});assert.equal(s.relations.C02.npcIntent,'愿发展');assert.equal(s.relations.C02.stage,stage);
 s=choose(s,'R02-02','warm');assert.equal(s.events['R02-02'].advanced,true);assert.throws(()=>choose(s,'R02-01','warm'));
});
test('预约核对目标日期：夏季不能约秋季外任会面，可改寄信',()=>{
 const s=drain(supply(atG04()));assert.equal(actorPlace(s,'C03'),'在京');
 assert.throws(()=>act(s,{type:'promise',actor:'C03',when:'next-turn',purpose:'meet'}),/约定当日.*外任/);
 assert.doesNotThrow(()=>act(s,{type:'promise',actor:'C03',when:'next-turn',purpose:'letter'}));
 assert.doesNotThrow(()=>act(s,{type:'promise',actor:'C03',when:'tomorrow',purpose:'meet'}));
});
test('履约也核对地点，旧档的不可能会面可以取消且不伪造赴约',()=>{
 let s=drain(supply(atG04()));s=act(s,{type:'promise',actor:'C03',when:'tomorrow',purpose:'meet'});
 const p=s.promises.at(-1);p.date={year:2,month:7,day:12};p.dueTurn=7;
 s=act(s,{type:'advance'});s=drain(s);validateSave(s);
 assert.throws(()=>act(s,{type:'fulfill',promiseId:p.id}),/外任/);
 const cancelled=act(s,{type:'cancel-promise',promiseId:p.id});assert.equal(cancelled.promises.at(-1).status,'cancelled');
 assert.equal(cancelled.stats.treasury,s.stats.treasury);assert.equal(cancelled.remaining,s.remaining);
});
test('年羹尧在京会面与书信使用不同正文，履约仍只核销一次',()=>{
 const base=drain(supply(atG04()));let meet=act(base,{type:'promise',actor:'C03',when:'tomorrow',purpose:'meet'});
 const remaining=meet.remaining;meet=act(meet,{type:'fulfill',promiseId:meet.promises.at(-1).id});
 assert.equal(meet.remaining,remaining);assert.match(meet.promises.at(-1).dialogue,/按约进来/);
 let letter=act(base,{type:'promise',actor:'C03',when:'tomorrow',purpose:'letter'});letter=act(letter,{type:'fulfill',promiseId:letter.promises.at(-1).id});
 assert.match(letter.promises.at(-1).dialogue,/驿使/);
});
