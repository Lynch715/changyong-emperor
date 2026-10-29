import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as E from '../src/engine.js';
import {STORY} from '../src/story.js';
import {NAMES} from '../src/content.js';
import {parseImport,exportSave} from '../src/storage.js';
import {sceneContinuation,committedScene,renderResultHeading,renderReceiptDetails,renderActivityResultDetails} from '../src/scene-reading.js';
import {confirmationReading,renderConfirmationReading} from '../src/confirmation-reading.js';
import {act,choose,before,reach} from '../scripts/check-s08-06.mjs';
const military=()=>choose(choose(before.weekly.checkpoints.M10,'M10'),'R03-01');
const money=(visibility='private',officer='C26')=>({type:'event',eventId:'G04',choiceId:'custom',params:{amount:6,officer,visibility,escort:true}});
const preview=(s,a)=>E.previewInteraction(s,Array.isArray(a)?a:[a]).plan;
test('同场主线后接内嵌相知，探测只读且不替玩家选择下一幕',()=>{
 const s=choose(before.weekly.checkpoints.M02,'M02'),raw=JSON.stringify(s),next=sceneContinuation(s,'M02');assert.equal(next.id,'R02-01');assert.equal(E.eventDone(s,'R02-01'),false);assert.equal(JSON.stringify(s),raw);assert.deepEqual(parseImport(exportSave(s)),s);
});
test('重读同一旧幕不提供接读，封卷与较早事务也不误作刚才的选择',()=>{
 const s=choose(before.weekly.checkpoints.M02,'M02');assert.equal(sceneContinuation(s,'M02',{readingKey:'M02'}),null);const later=act(s,{type:'activity-buy',giftId:'GF02'});assert.equal(sceneContinuation(later,'M02'),null);assert.equal(sceneContinuation(before.weekly.checkpoints.M09,'M02'),null);assert.equal(sceneContinuation({...s,sealed:true},'M02'),null);
});
test('周制与季度都不借接读入口跳到未来日期',()=>{
 for(const s of [choose(E.createWeeklyGame(),'M01'),choose(E.createGame(),'M01')]){const h=E.hash(s);assert.equal(sceneContinuation(s,'M01'),null);assert.equal(E.hash(s),h);}
});
test('季度同日的主线与相知仍能接读，原次数与正文保持',()=>{
 const s=choose(before.quarter.checkpoints.M02,'M02'),h=E.hash(s);assert.equal(sceneContinuation(s,'M02').id,'R02-01');assert.equal(E.hash(s),h);
});
test('六格已用完仍可继续同场零格相知，不凭余量误拦原规则',()=>{
 let s=choose(E.createWeeklyGame(),'M01');for(let i=0;i<6;i++){s=act(s,{type:'week-plan',kind:'study',actor:'C01',date:{year:1,month:1,day:2+Math.floor(i/2)},period:i%2?'evening':'day'});s=act(s,{type:'week-fulfill',planId:s.weekly.plans.at(-1).id});}s=reach(s,{year:1,month:1,day:7},'evening');s=choose(s,'M02');assert.equal(s.remaining,0);assert.equal(sceneContinuation(s,'M02').id,'R02-01');
});
test('多项事务含唯一剧情时定位已提交结果，不用旧快照冒充新结果',()=>{
 const s=choose(before.weekly.checkpoints.M02,'M02'),p=preview(s,[{type:'event',eventId:'R02-01',choiceId:'work'},{type:'week-plan',kind:'study',actor:'C01',date:{year:1,month:1,day:8},period:'day'}]),n=E.commit(s,p).state;assert.deepEqual(committedScene(n,p),{id:'R02-01',key:'R02-01'});assert.equal(committedScene(s,p),null);assert.equal(committedScene(n,{actions:[{type:'week-plan'}]}),null);assert.deepEqual(n.transcripts.M02,s.transcripts.M02);
});
test('紧凑结果抬头转义标题，原手写与既有AI附文完全不改',()=>{
 const s=choose(before.weekly.checkpoints.M02,'M02'),t=s.transcripts.M02;t.aiReaction='既有接话，仍留原句。';const old=JSON.stringify(t),html=renderResultHeading({...t,title:t.title+'<img src=x>'},{location:'旧地点',reread:true});assert.match(html,/旧事重读/);assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));assert.equal(JSON.stringify(t),old);
});
test('私下军需的知情人与承办取实际预演，金额押运与原档均不变',()=>{
 const s=military(),raw=JSON.stringify(s),p=preview(s,money()),x=confirmationReading(s,p),n=E.commit(s,p).state,f=n.facts.find(f=>f.id==='FACT_G04');assert.equal(p.totalCost,8);assert.deepEqual(x.records[0].readers,E.factReaders(n,f));assert.ok(x.records[0].readers.includes('C26'));assert.ok(!x.records[0].readers.includes('public'));assert.match(renderConfirmationReading(s,p),/允祥/);assert.equal(JSON.stringify(s),raw);
});
test('公开军需与私下军需明确区分，不由选项文案猜测范围',()=>{
 const s=military(),p=preview(s,money('public'));assert.ok(confirmationReading(s,p).records[0].readers.includes('public'));assert.match(renderConfirmationReading(s,p),/这些话会让谁知道：公开/);
});
test('暗中停香只保留雍正知情，未误列场景里的年世兰',()=>{
 const s=before.weekly.checkpoints.M03,p=preview(s,{type:'event',eventId:'M03',choiceId:'quiet'}),x=confirmationReading(s,p);assert.deepEqual(x.records[0].readers,['C01']);assert.match(renderConfirmationReading(s,p),/这些话会让谁知道：雍正/);assert.equal(s.events.M03?.completed,undefined);
});
test('秘密零费用仍显示当前听者，预演不提前增加事实、消息或信任',()=>{
 const s=choose(E.createWeeklyGame(),'M01'),raw=JSON.stringify(s);for(const scope of ['partial','full']){const p=preview(s,{type:'disclose',actor:'C02',scope}),x=confirmationReading(s,p);assert.deepEqual(x.records[0].readers,['C01','C02']);assert.equal(p.totalCost,0);assert.match(renderConfirmationReading(s,p),/对苏培盛的说明/);}assert.equal(JSON.stringify(s),raw);
});
test('多人宴席后的两份私谈分别列听者，不把一个人的话广播给另一人',()=>{
 const s=before.weekly.checkpoints.M06,e=E.getEvent(s,'M06'),p=preview(s,{type:'event',eventId:'M06',choiceId:e.options[0].id,params:{attitudes:{C09:'open',C10:'none'}}}),rows=confirmationReading(s,p).records;assert.deepEqual(rows.find(r=>r.label==='散后对甄嬛的话').readers,['C01','C09']);assert.deepEqual(rows.find(r=>r.label==='散后对沈眉庄的话').readers,['C01','C10']);
});
test('预约实际日期时段与通信暂留范围可见，不改成即时送达',()=>{
 const s=choose(E.createWeeklyGame(),'M01'),p=preview(s,[{type:'week-plan',kind:'walk',actor:'C02',date:{year:1,month:1,day:3},period:'evening'},{type:'week-plan',kind:'letter',actor:'C06',date:{year:1,month:1,day:4},period:'day'}]),x=confirmationReading(s,p);assert.equal(x.records.length,2);assert.equal(x.records[0].date.day,3);assert.equal(x.records[0].period,'evening');assert.deepEqual(x.records[1].readers,['C01']);assert.match(renderConfirmationReading(s,p),/安排时间：雍正元年1月4日 · 日间/);assert.equal(s.weekly.plans.length,0);
});
test('候选和草稿未被接受，不把拟约对象列为已经知情',()=>{
 const s=choose(E.createWeeklyGame(),'M01');for(const status of ['candidate','draft']){const p=preview(s,{type:'week-plan',kind:'walk',actor:'C02',date:{year:1,month:1,day:3},period:'evening',status});assert.equal(confirmationReading(s,p).records.length,0);assert.equal(s.weekly.plans.length,0);}
});
test('季度旧约核对显示原未来日期与双方，不写入周制字段',()=>{
 const s=choose(choose(before.quarter.checkpoints.M02,'M02'),'R02-01'),raw=JSON.stringify(s),p=preview(s,{type:'promise',actor:'C02',when:'tomorrow',purpose:'meet'}),x=confirmationReading(s,p);assert.deepEqual(x.records[0].readers,['C01','C02']);assert.equal(x.records[0].date.day,s.date.day+1);assert.equal(JSON.stringify(s),raw);assert.equal(s.weekly,undefined);
});
test('日常与其他行动的辅助结果折叠，未完成约定不冒充已用费用',()=>{
 const s=choose(E.createWeeklyGame(),'M01'),p=preview(s,{type:'week-plan',kind:'study',actor:'C01',date:s.date,period:'day'}),n=E.commit(s,p).state,held=n.weekly.plans.at(-1);assert.equal(renderActivityResultDetails(held),'');const done=act(n,{type:'week-fulfill',planId:held.id}).weekly.plans.at(-1),raw=JSON.stringify(done);assert.match(renderActivityResultDetails(done),/<details class="result-details"><summary>此事留下的变化/);assert.match(renderActivityResultDetails(done),/本场记为1格/);assert.equal(JSON.stringify(done),raw);assert.ok(renderReceiptDetails({results:[{detail:'<script>不执行</script>'}]}).includes('&lt;script&gt;'));
});
test('同一项目可接读实际可办的下一步，未来回报不借入口提前出现',()=>{
 let s=act(military(),money());const next=sceneContinuation(s,'G04');assert.equal(next.id,'G05');const entered=E.enterScene(s,next.id);assert.equal(entered.weekly.clock,s.weekly.clock);s=act(entered,{type:'event',eventId:'G05',choiceId:'escort'});assert.equal(sceneContinuation(s,'G05'),null);assert.equal(s.events.G06?.completed,undefined);
});
test('确认页使用已付押运的实际选项说明，不把旧价写回零费用处置',async()=>{
 const state=act(military(),money()),raw=JSON.stringify(state),source=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8'),a=source.indexOf('async function propose('),b=source.indexOf('\nasync function openEvent(',a);let body;
 const context={state,busy:false,committing:false,previewInteraction:E.previewInteraction,getEvent:E.getEvent,eventOptions:E.eventOptions,STORY,NAMES,renderConfirmationReading,isWeekly:s=>!!s.weekly,dateText:E.dateText,esc:x=>String(x??'').replace(/</g,'&lt;'),dialog:(_title,html)=>{body=html;},$:()=>({}),showError:e=>{throw e;},executePlan:()=>{throw Error('正式处置不可自动执行');}};
 await vm.runInNewContext('('+source.slice(a,b)+')([{type:"event",eventId:"G05",choiceId:"escort"}])',context);assert.ok(body.includes('沿用已付的押运，本次不再收费'));assert.equal(JSON.stringify(state),raw);
});
