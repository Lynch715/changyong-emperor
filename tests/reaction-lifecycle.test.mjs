import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {claimReaction,finishReaction,failReaction,createReactionLifecycle,reactionHint} from '../src/reaction-lifecycle.js';
import {reactionAI,chatAI,setAIConfig,getUsage} from '../src/ai.js';
import {requestScope} from '../src/ai-request.js';
import {exportSave,parseImport} from '../src/storage.js';
import {prepareMigration} from '../src/migration.js';
const act=(s,a)=>E.commit(s,E.preview(s,[a])).state;
const opened=(weekly=true)=>act(weekly?E.createWeeklyGame():E.createGame(),{type:'event',eventId:'M01',choiceId:'steady'});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const text='灯还留在手边，先把这一口气喘匀。';
const business=s=>Object.fromEntries(['stats','relations','events','transactions','ledger','weekly','promises','facts','flags','date','messages','turnReports','remaining','sealed'].filter(k=>s[k]!==undefined).map(k=>[k,E.clone(s[k])]));
function rig({state=opened(),request=null}={}){
 let stateNow=state,serial=0,writeId='save-0',beforeWrite=null;
 const frame={storageKey:state.weekly?'weekly':'quarter',writeId,visit:1,appVersion:'0.9.6',configVersion:1,view:'scene',sceneId:'M01',readingKey:null,sceneKey:'M01'};
 const calls=[],paints=[];
 const read=()=>({...frame,state:stateNow,writeId});
 const lifecycle=createReactionLifecycle({read,write:async fn=>{if(beforeWrite)await beforeWrite();stateNow=fn(stateNow);E.validateSave(stateNow);writeId='save-'+(++serial);return{state:stateNow};},request:async(s,actor,key,options)=>{calls.push({s,actor,key,options});return request?request(s,actor,key,options):text;},onChange:()=>paints.push(read())});
 return{lifecycle,calls,paints,read,frame,replace(s){stateNow=s;writeId='restore-'+(++serial);},change(fn){stateNow=fn(stateNow);writeId='change-'+(++serial);},beforeWrite(fn){beforeWrite=fn;},setWriteId(id){writeId=id;}};
}
test('手写结果及规则先提交，挂起网络仍可读原文；成功仅附一次接话',async()=>{
 const gate=deferred(),s=opened(),before=business(s),trans=E.clone(s.transcripts),r=rig({state:s,request:()=>gate.promise}),work=r.lifecycle.start('M01','M01');await flush();
 assert.equal(r.calls.length,1);assert.equal(r.read().state.events.M01.completed,true);assert.equal(r.read().state.transcripts.M01.dialogue,trans.M01.dialogue);assert.equal(r.lifecycle.pendingKey(),'M01');assert.deepEqual(business(r.read().state),before);
 gate.resolve(text);assert.equal(await work,'saved');const n=r.read().state;assert.equal(n.transcripts.M01.aiReaction,text);assert.equal(n.transcripts.M01.reactionRequest.status,'saved');
 for(const[k,v]of Object.entries(trans.M01))assert.deepEqual(n.transcripts.M01[k],v);assert.deepEqual(business(n),before);assert.equal(await r.lifecycle.start('M01','M01'),'skipped');assert.equal(r.calls.length,1);
});
test('离开再回同一场景，迟到回包按场次丢弃',async()=>{
 const gate=deferred(),r=rig({request:()=>gate.promise}),work=r.lifecycle.start('M01','M01');await flush();r.frame.view='desk';r.frame.visit++;r.frame.view='scene';r.frame.visit++;gate.resolve(text);
 assert.equal(await work,'discarded');assert.ok(!r.read().state.transcripts.M01.aiReaction);assert.equal(r.read().state.transcripts.M01.reactionRequest.status,'requested');
});
test('同幕进入旧事重读不接受尚在等待的回包',async()=>{
 const gate=deferred(),r=rig({request:()=>gate.promise}),work=r.lifecycle.start('M01','M01');await flush();r.frame.readingKey='M01';gate.resolve(text);assert.equal(await work,'discarded');assert.ok(!r.read().state.transcripts.M01.aiReaction);
});
for(const [name,mutate]of [
 ['换档',r=>r.replace(opened())],
 ['相同游戏与revision但另一份恢复写入',r=>r.setWriteId('another-envelope')],
 ['换存储来源',r=>r.frame.storageKey='other-copy'],
 ['改revision',r=>r.change(s=>E.recordMessage(s,'C02','player','稍后再说'))],
 ['改应用版本',r=>r.frame.appVersion='0.9.7'],
 ['改模型配置版本',r=>r.frame.configVersion++],
 ['换场景键',r=>r.frame.sceneKey='M01@another-week'],
 ['换人物',r=>{const n=E.clone(r.read().state);n.transcripts.M01.actor='C06';r.replace(n);}],
 ['换事务',r=>{const n=E.clone(r.read().state);n.transcripts.M01.transactionId='other';r.replace(n);}],
 ['换正文版本',r=>{const n=E.clone(r.read().state);n.transcripts.M01.storyVersion=8;r.replace(n);}],
 ])test(name+'后旧回复不写入',async()=>{
 const gate=deferred(),r=rig({request:()=>gate.promise}),work=r.lifecycle.start('M01','M01');await flush();mutate(r);const raw=JSON.stringify(r.read().state);gate.resolve(text);assert.equal(await work,'discarded');assert.equal(JSON.stringify(r.read().state),raw);
});
test('响应前检查通过、等待写入锁时换档，锁内再次核对',async()=>{
 const gate=deferred(),lock=deferred(),r=rig({request:()=>gate.promise}),work=r.lifecycle.start('M01','M01');await flush();r.beforeWrite(()=>lock.promise);gate.resolve(text);await flush();const next=opened();r.replace(next);lock.resolve();assert.equal(await work,'discarded');assert.deepEqual(r.read().state,next);
});
test('领取尝试前等待写入锁时离开，不发网络或写标记',async()=>{
 const gate=deferred(),r=rig();r.beforeWrite(()=>gate.promise);const before=E.clone(r.read().state),work=r.lifecycle.start('M01','M01');r.frame.visit++;r.frame.view='desk';gate.resolve();assert.equal(await work,'discarded');assert.deepEqual(r.read().state,before);assert.equal(r.calls.length,0);
});
test('失败状态等待写入锁时换档，也不能写回另一份进度',async()=>{
 const gate=deferred(),lock=deferred(),r=rig({request:()=>gate.promise}),work=r.lifecycle.start('M01','M01');await flush();r.beforeWrite(()=>lock.promise);gate.reject(Error('simulated failure'));await flush();const next=opened();r.replace(next);lock.resolve();assert.equal(await work,'discarded');assert.deepEqual(r.read().state,next);
});
test('其他标签页改变存储但本页尚未同步时，CAS拒绝成功和失败回写',async()=>{
 const gate=deferred(),r=rig({request:()=>gate.promise}),work=r.lifecycle.start('M01','M01');await flush();const raw=JSON.stringify(r.read().state);r.beforeWrite(()=>{throw new E.RuleError('另一窗口已更新','CONFLICT');});gate.resolve(text);assert.equal(await work,'discarded');assert.equal(JSON.stringify(r.read().state),raw);
});
test('失败只关闭本次尝试，不撤销事件、钱款、意愿与历史原话',async()=>{
 const s=opened(),before=business(s),old=E.clone(s.transcripts.M01),r=rig({state:s,request:()=>{throw Error('simulated failure');}});
 assert.equal(await r.lifecycle.start('M01','M01'),'failed');const n=r.read().state;assert.equal(n.transcripts.M01.reactionRequest.status,'failed');assert.ok(!n.transcripts.M01.aiReaction);assert.deepEqual(business(n),before);for(const[k,v]of Object.entries(old))assert.deepEqual(n.transcripts.M01[k],v);
 assert.equal(await r.lifecycle.start('M01','M01'),'skipped');assert.equal(r.calls.length,1);assert.ok(reactionHint(n.transcripts.M01,false).includes('当时的话'));
});
test('取消旧请求后新请求可开始，旧finally不清掉新等待状态',async()=>{
 const old=deferred(),newer=deferred();let i=0;const r=rig({request:()=>i++?newer.promise:old.promise}),first=r.lifecycle.start('M01','M01');await flush();const signal=r.calls[0].options.signal;r.lifecycle.cancel();assert.equal(signal.aborted,true);
 r.replace(opened());r.frame.visit++;const second=r.lifecycle.start('M01','M01');await flush();old.resolve('旧回复应该丢弃。');assert.equal(await first,'discarded');assert.equal(r.lifecycle.pendingKey(),'M01');newer.resolve(text);assert.equal(await second,'saved');assert.equal(r.read().state.transcripts.M01.aiReaction,text);
});
test('挂起标记经导入重读不自动续发，旧档无标记也不在读入时补写',async()=>{
 const original=opened(),raw=exportSave(original),readBack=parseImport(raw);assert.deepEqual(readBack,original);assert.ok(!readBack.transcripts.M01.reactionRequest);
 const pending=claimReaction(original,'M01',original.transcripts.M01.transactionId,'pending','0.9.6'),restored=parseImport(exportSave(pending)),r=rig({state:restored});assert.equal(await r.lifecycle.start('M01','M01'),'skipped');assert.equal(r.calls.length,0);assert.deepEqual(r.read().state,pending);
});
test('新请求元数据随季度复制迁移保留，旧原文与已保存接话不改写',async()=>{
 const r=rig({state:opened(false)});assert.equal(await r.lifecycle.start('M01','M01'),'saved');const s=r.read().state,p=await prepareMigration(exportSave(s),{storage:{getItem:()=>null}});assert.deepEqual(p.target.transcripts,s.transcripts);assert.deepEqual(parseImport(exportSave(p.target)).transcripts,s.transcripts);
});
test('恶意请求字段、状态与来源错配不能导入',()=>{
 const s=opened(),n=claimReaction(s,'M01',s.transcripts.M01.transactionId,'valid','0.9.6');
 for(const mutate of [r=>r.status='retry',r=>r.transactionId='other',r=>r.actor='C06',r=>r.eventId='M02',r=>r.storyVersion=8,r=>r.appVersion='https://private',r=>r.requestedRevision=-1,r=>r.key='secret',r=>r.status='saved']){const x=E.clone(n);mutate(x.transcripts.M01.reactionRequest);assert.throws(()=>parseImport(JSON.stringify(x)),/接话请求/);}
 assert.throws(()=>E.attachReaction(n,'M01',s.transcripts.M01.transactionId,text),/原接话请求/);
});
test('重复领取或已保存接话不覆盖，历史AI正文保持',()=>{
 const s=opened(),tx=s.transcripts.M01.transactionId,n=E.attachReaction(s,'M01',tx,'旧档已经留下的一句。'),raw=JSON.stringify(n);assert.throws(()=>claimReaction(n,'M01',tx,'new','0.9.6'),/已经尝试/);assert.equal(JSON.stringify(n),raw);
});

async function withAI(protocol,fn){
 const oldFetch=globalThis.fetch,oldStorage=globalThis.localStorage,store=new Map();globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};setAIConfig({mode:'byok',protocol,url:'https://fixture.invalid/v1',model:'lifecycle-fixture',key:'TEST_ONLY',limit:30});
 try{await fn();}finally{globalThis.fetch=oldFetch;globalThis.localStorage=oldStorage;setAIConfig({mode:'fixed'});}
}
const response=(protocol,value)=>({ok:true,json:async()=>protocol==='responses'?{status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]}:{choices:[{message:{content:JSON.stringify(value)}}]}});
for(const protocol of ['responses','chat-completions']){
 test(protocol+'主动取消即释放传输；忽略abort的旧适配器不会堵塞或清空新请求',async()=>withAI(protocol,async()=>{
  const old=deferred(),next=deferred(),controller=new AbortController(),s=opened();let calls=0;globalThis.fetch=async()=>++calls===1?old.promise:next.promise;
  const first=reactionAI(s,'C02','M01',{signal:controller.signal});controller.abort();const rejected=assert.rejects(first,e=>e.code==='CANCELLED');
  const second=chatAI(s,'C02',null,'说说窗外的灯');await rejected;assert.equal(calls,2);old.resolve(response(protocol,{speakerId:'C02',text:'旧回复。',factIds:[]}));await flush();await assert.rejects(()=>reactionAI(s,'C02','M01'),/上一条回复/);next.resolve(response(protocol,{speakerId:'C02',text,factIds:[]}));assert.equal(await second,text);assert.equal(getUsage().calls,2);assert.equal(getUsage().failures,0);
 }));
 test(protocol+'取消前已结束的请求不污染下一次额度或失败数',async()=>withAI(protocol,async()=>{
  let calls=0;globalThis.fetch=async()=>{calls++;return response(protocol,{speakerId:'C02',text,factIds:[]});};const c=new AbortController(),s=opened();assert.equal(await reactionAI(s,'C02','M01',{signal:c.signal}),text);c.abort();assert.equal(await reactionAI(s,'C02','M01'),text);assert.equal(calls,2);assert.equal(getUsage().failures,0);
 }));
}
test('调用前已取消不发出请求、不增加调用数',async()=>withAI('responses',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;};const c=new AbortController();c.abort();await assert.rejects(()=>reactionAI(opened(),'C02','M01',{signal:c.signal}),e=>e.code==='CANCELLED');assert.equal(calls,0);assert.equal(getUsage().calls,0);
}));
test('14秒覆盖响应体解码，适配器忽略取消也能回退且只记一次失败',async t=>withAI('responses',async()=>{
 t.mock.timers.enable({apis:['setTimeout']});globalThis.fetch=async()=>({ok:true,json:()=>new Promise(()=>{})});const work=reactionAI(opened(),'C02','M01');await flush();const rejection=assert.rejects(work,e=>e.code==='TIMEOUT');t.mock.timers.tick(14000);await rejection;assert.equal(getUsage().calls,1);assert.equal(getUsage().failures,1);
}));
test('错误响应的正文也受期限约束，不能卡住固定回应',async t=>withAI('responses',async()=>{
 setAIConfig({mode:'server'});t.mock.timers.enable({apis:['setTimeout']});globalThis.fetch=async()=>({ok:false,status:502,json:()=>new Promise(()=>{})});const work=reactionAI(opened(),'C02','M01');await flush();const rejection=assert.rejects(work,e=>e.code==='TIMEOUT');t.mock.timers.tick(14000);await rejection;assert.equal(getUsage().failures,1);
}));
test('主动取消错误响应正文解码时，不误记为服务失败',async()=>withAI('responses',async()=>{
 setAIConfig({mode:'server'});globalThis.fetch=async()=>({ok:false,status:502,json:()=>new Promise(()=>{})});const c=new AbortController(),work=reactionAI(opened(),'C02','M01',{signal:c.signal});await flush();c.abort();await assert.rejects(work,e=>e.code==='CANCELLED');assert.equal(getUsage().calls,1);assert.equal(getUsage().failures,0);
}));
test('请求域清理定时器后，已完成调用不再被过期定时取消',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let aborted=0;const scope=requestScope({timeoutMs:14000,onAbort:()=>aborted++});assert.equal(await scope.wait(Promise.resolve('done')),'done');scope.dispose();t.mock.timers.tick(20000);assert.equal(aborted,0);
});
