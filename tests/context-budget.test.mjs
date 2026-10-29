import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import * as E from '../src/engine.js';
import {buildAIContext,buildReactionContext} from '../src/input.js';
import {fitAIContext,AI_CONTEXT_LIMIT,AI_WIRE_LIMIT} from '../src/context-budget.js';
import {chatAI,parseAI,reactionAI,setAIConfig,getUsage} from '../src/ai.js';
import {exportSave,parseImport} from '../src/storage.js';
import {makeServer} from '../server.mjs';
import {before,choose} from '../scripts/check-s08-06.mjs';
import {replyToSegments} from '../src/conversation.js';
const act=(s,a)=>E.commit(s,E.preview(s,[a])).state;
const opened=()=>act(E.createWeeklyGame(),{type:'event',eventId:'M01',choiceId:'steady'});
const msg=(s,text,cid='C02',role='player')=>E.recordMessage(s,cid,role,text);
function long(s=opened(),count=100,text='我不同意现在就说定。'+'这件事情尚未商量清楚。'.repeat(20)){
 for(let i=0;i<count;i++)s=msg(s,'第'+i+'次谈话：'+text,'C02',i%2?'npc':'player');return s;
}
function request(server,body){return new Promise(resolve=>{
 const req=Readable.from([body]);Object.assign(req,{url:'/api/ai',method:'POST',headers:{host:'127.0.0.1:5202',origin:'http://127.0.0.1:5202','x-changyong-request':'1'}});
 server.emit('request',req,{writeHead(status){this.status=status;},end(text){resolve({status:this.status,...JSON.parse(text)});}});
});}
const fixedValue={speakerId:'C02',text:'那句还没有说定的话，留着慢慢核对。',factIds:[]};
async function withAI(mode,protocol,fn){
 const priorFetch=globalThis.fetch,priorStorage=globalThis.localStorage,store=new Map();
 globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 setAIConfig({mode,protocol,url:'https://fixture.invalid/v1',model:'budget-fixture',key:'TEST_ONLY',limit:30});
 try{return await fn();}finally{globalThis.fetch=priorFetch;globalThis.localStorage=priorStorage;setAIConfig({mode:'fixed'});}
}

test('审计100条长谈负载进入预算，存档、历史正文和修订原文不变',()=>{
 const s=long(),raw=JSON.stringify(s),h=E.hash(s),ctx=buildAIContext(s,'C02',null,{input:'你还记得这些分歧吗'});
 assert.ok(JSON.stringify({kind:'chat',context:ctx,input:'你还记得这些分歧吗'}).length<=AI_CONTEXT_LIMIT);
 assert.ok(ctx.conversationMemory.summaries.length);assert.ok(JSON.stringify(ctx).includes('尚未商量清楚'));
 assert.equal(JSON.stringify(s),raw);assert.equal(E.hash(s),h);assert.deepEqual(parseImport(exportSave(s)),s);assert.ok(!('contextBudget'in s));
});
test('密集长谈仍完整保留当下双方意愿和未赴约的日期状态',()=>{
 let s=act(opened(),{type:'week-plan',kind:'walk',actor:'C02',date:{year:1,month:1,day:3},period:'evening'});
 s=msg(s,'只谈公事');s=E.setBoundary(s,'C02','仅合作',s.messages.at(-1).id);s=long(s,240);
 const ctx=buildAIContext(s,'C02',null,{input:'原来的散步约定还在吗'}),p=ctx.mandatory.promises[0];
 assert.equal(ctx.mandatory.relation.playerIntent,'仅合作');assert.equal(p.status,'accepted');assert.deepEqual(p.date,{year:1,month:1,day:3});assert.equal(p.period,'evening');
 assert.equal(E.memoryBook(s,'C02').personal.find(x=>x.kind==='promise').fulfilled,false);
});
test('本次话题能找回最近12组之外的旧分歧，摘记保持原话及来源',()=>{
 let s=msg(opened(),'荷塘旧约尚未说定，先别替我答应。');const id=s.messages.at(-1).id;
 s=long(s,320,'今日账页还未翻完，先别急。');
 const ctx=buildAIContext(s,'C02',null,{input:'荷塘旧约的分歧还记得吗'});
 const group=ctx.conversationMemory.summaries.find(g=>g.atoms.some(a=>a.sourceId===id));assert.ok(group);
 assert.equal(group.atoms.find(a=>a.sourceId===id).text,'荷塘旧约尚未说定，先别替我答应。');assert.ok(group.sourceRefs.some(r=>r.id===id));
});
test('相关旧世界事实在最近30条之外仍可检索，停止后立即退出',()=>{
 let s=opened();s.facts.push({id:'OLD_WELL',text:'柳树井回访仍待原册核对。',visibleTo:['C01','C02'],source:'audit-fixture',date:E.clone(s.date)});
 for(let i=0;i<90;i++)s.facts.push({id:'WINDOW_'+i,text:'今日窗纸第'+i+'处已登记。',visibleTo:['C01','C02'],source:'fixture',date:E.clone(s.date)});
 assert.ok(buildAIContext(s,'C02',null,{input:'柳树井回访如何'}).facts.some(f=>f.id==='OLD_WELL'));
 s=E.changeMemoryRecord(s,'fact:OLD_WELL','stop');assert.ok(!JSON.stringify(buildAIContext(s,'C02',null,{input:'柳树井回访如何'})).includes('柳树井回访仍待原册核对'));
});
test('当前场景来源在大量后来记录之后仍优先保留',()=>{
 const s=long();for(let i=0;i<100;i++)s.facts.push({id:'RECENT_'+i,text:'窗外记事'+i,visibleTo:['C01','C02'],source:'fixture',date:E.clone(s.date)});
 const ctx=buildAIContext(s,'C02','M01');assert.equal(ctx.event.id,'M01');assert.ok(ctx.facts.some(f=>f.id==='FACT_M01'));
});
test('其他人私聊与未披露前世不因全量检索进入请求',()=>{
 let s=msg(opened(),'仅宜修知道的PRIVATE_06','C06');s=long(s,200);const ctx=buildAIContext(s,'C02','M03',{input:'宜修之前说了什么'}),raw=JSON.stringify(ctx);
 assert.equal(ctx.event,null);assert.ok(!raw.includes('PRIVATE_06'));assert.ok(!raw.includes('FACT_REBIRTH'));assert.ok(!('transactions'in ctx));assert.ok(!('weekly'in ctx));
});
test('同一人物标签下的玩家草稿和仅自己可见的偏好不进入NPC上下文',()=>{
 let s=E.recordMessage(opened(),'C02','player','内心草稿_PRIVATE_DRAFT',{status:'draft'});
 s=E.recordMessage(s,'C02','player','仅自己知道_PRIVATE_THOUGHT',{visibleTo:['C01']});
 s=msg(s,'我想静看雨_PRIVATE_PREF');s=E.savePreference(s,'C02','我想静看雨_PRIVATE_PREF',s.messages.at(-1).id);s.memories.at(-1).visibleTo=['C01'];s=long(s,60);
 assert.deepEqual(parseImport(exportSave(s)),s);assert.ok(!JSON.stringify(buildAIContext(s,'C02',null,{input:'你知道我的内心吗'})).includes('_PRIVATE_'));
});
test('更正后的旧偏好及引用回响不被相关性重新捞回，恢复单句仅恢复原句',()=>{
 let s=msg(opened(),'朕不爱浓茶');s=E.savePreference(s,'C02','朕不爱浓茶',s.messages.at(-1).id);const pref=s.memories[0].id;
 s=msg(s,'你说「朕不爱浓茶」，我记着。','C02','npc');s=long(s,100);
 s=msg(s,'其实我喜欢静看雨');s=E.correctPreference(s,pref,'其实我喜欢静看雨',s.messages.at(-1).id);
 assert.ok(!JSON.stringify(buildAIContext(s,'C02',null,{input:'以前浓茶的偏好呢'})).includes('朕不爱浓茶'));
 s=msg(s,'荷塘约期还没说定');const id=s.messages.at(-1).id;s=long(s,40);s=E.changeMemoryRecord(s,'message:'+id,'stop','私人批注_PRIVATE');
 assert.ok(!JSON.stringify(buildAIContext(s,'C02',null,{input:'荷塘约期'})).includes('荷塘约期还没说定'));
 s=E.changeMemoryRecord(s,'message:'+id,'restore','另一段_PRIVATE');const raw=JSON.stringify(buildAIContext(s,'C02',null,{input:'荷塘约期'}));
 assert.ok(raw.includes('荷塘约期还没说定'));assert.ok(!raw.includes('_PRIVATE'));
});
test('近期长句末尾的否定不在一千字处截断成相反意思',()=>{
 const text='这句还需要完整核对，'+('窗外的叶子'.repeat(220))+'，不是答应相守，也没有接受新约。';
 const s=msg(opened(),text),ctx=buildAIContext(s,'C02',null,{input:'这句话的结尾呢'});assert.equal(ctx.dialogue.at(-1).text,text);
});
test('摘要只发送一次原文表示，来源日期和未决状态仍在',()=>{
 const ctx=buildAIContext(long(),'C02',null),g=ctx.conversationMemory.summaries[0];assert.ok(g.atoms.length);assert.ok(g.sourceRefs.length);assert.ok(g.date);assert.ok(!('text'in g));assert.equal(g.status,'原话摘记');
});
test('强制材料本身超预算时明确回退，不能删边界或动作候选凑长度',()=>{
 const ctx=buildAIContext(opened(),'C02','M01');ctx.actionCatalog=[{id:'A1',sourceText:'原句'.repeat(25000),action:{type:'event'}}];const raw=JSON.stringify(ctx);
 assert.throws(()=>fitAIContext(ctx,{kind:'parse'}),/固定文本/);assert.equal(JSON.stringify(ctx),raw);
});
test('停止当前事实后reaction不把该结果从旧正文旁路发出',async()=>{
 await withAI('server','responses',async()=>{let calls=0;globalThis.fetch=async()=>{calls++;};const s=E.changeMemoryRecord(opened(),'fact:FACT_M01','stop');await assert.rejects(()=>reactionAI(s,'C02','M01'),/尚未向此人说明/);assert.equal(calls,0);assert.equal(getUsage().calls,0);});
});
test('完整当前结果与事实仍在接话上下文，历史文本不改',()=>{
 const s=long(),h=E.hash(s),ctx=buildReactionContext(s,'C02','M01');assert.equal(ctx.reaction.establishedOutcome,s.transcripts.M01.dialogue);assert.ok(ctx.facts.some(f=>f.id==='FACT_M01'));assert.equal(E.hash(s),h);
});
test('停用主线来源后不从停香派生观察重新送出，原正文保留',()=>{
 let s=choose(before.weekly.checkpoints.M03,'M03','explain');const old=JSON.stringify(s.transcripts);
 assert.ok(buildAIContext(s,'C07',null).mandatory.incenseKnowledge.observations.some(o=>o.source.eventId==='M03'));
 s=E.changeMemoryRecord(s,'fact:FACT_M03','stop');const ctx=buildAIContext(s,'C07',null);
 assert.ok(!ctx.mandatory.incenseKnowledge.observations.some(o=>o.source.eventId==='M03'));assert.ok(!ctx.facts.some(f=>f.id.includes('C07-M03-')));assert.equal(JSON.stringify(s.transcripts),old);
});
test('停止扩展表态来源后旧回复不进入历史检索，当前边界仍约束',()=>{
 let s=act(before.weekly.checkpoints.M06,{type:'event',eventId:'M06',choiceId:'fair',params:{attitudes:{C09:'none',C10:'open'}}});
 const old=JSON.stringify(s.transcripts);s=E.changeMemoryRecord(s,'fact:FACT_M06','stop');const ctx=buildAIContext(s,'C09',null);
 assert.equal(ctx.mandatory.extensionAttitude.playerIntent,'none');assert.equal(ctx.mandatory.extensionAttitude.history.length,0);assert.equal(JSON.stringify(s.transcripts),old);
});
test('新AI改述留来源引用，停止原句后连同改述及其后续回响退出检索',async()=>{
 await withAI('server','responses',async()=>{
  let s=msg(opened(),'荷塘旧约尚未说定，先别替我答应。');const id=s.messages.at(-1).id;s=long(s,80);
  const paraphrase='那一段湖畔相约仍未定下，先听你的意思。';globalThis.fetch=async()=>({ok:true,json:async()=>({value:{speakerId:'C02',text:paraphrase,factIds:[]}})});
  const answer=await replyToSegments(s,'C02',null,[{kind:'chat',text:'关于荷塘旧约，你愿听我说完吗'}],{askAI:text=>chatAI(s,'C02',null,text,{withSources:true})});
  assert.ok(answer.memorySources.some(r=>r.kind==='message'&&r.id===id));s=E.recordMessage(s,'C02','npc',answer.reply,{memorySources:answer.memorySources});const echo=s.messages.at(-1).id;
  s=E.recordMessage(s,'C02','npc','这句后来的话，也先慢慢留着。',{memorySources:[{kind:'message',id:echo}]});const original=E.clone(s.messages);
  s=E.changeMemoryRecord(s,'message:'+id,'stop');const raw=JSON.stringify(buildAIContext(s,'C02',null,{input:'湖畔那段怎么说'}));assert.ok(!raw.includes(paraphrase));assert.ok(!raw.includes('这句后来的话'));assert.deepEqual(s.messages,original);assert.deepEqual(parseImport(exportSave(s)),s);
 });
});
test('新对白来源字段只允许有限引用，恶意字段与超量引用拒绝导入',()=>{
 const s=E.recordMessage(opened(),'C02','npc','灯还亮着。',{memorySources:[{kind:'fact',id:'FACT_M01'}]});assert.deepEqual(parseImport(exportSave(s)),s);
 for(const value of ['arbitrary',[{kind:'execute',id:'FACT_M01'}],[{kind:'fact',id:'FACT_M01',text:'私人批注'}],Array.from({length:513},()=>({kind:'fact',id:'FACT_M01'}))]){const n=E.clone(s);n.messages.at(-1).memorySources=value;assert.throws(()=>parseImport(JSON.stringify(n)),/对白来源/);}
});

for(const mode of ['server','byok'])for(const protocol of ['responses','chat-completions'])test(mode+' '+protocol+'长谈与转义字符的实际聊天请求有预算且仅调用一次',async()=>{
 await withAI(mode,protocol,async()=>{
  const s=long(opened(),140,'我不同意「这个说法」。\\"'.repeat(60)),h=E.hash(s);let calls=0,wire,ctx;
  globalThis.fetch=async(_url,options)=>{calls++;wire=options.body;const outer=JSON.parse(wire),p=mode==='server'?outer:JSON.parse(outer.input||outer.messages[1].content);ctx=p.context;
   return{ok:true,json:async()=>mode==='server'?{value:fixedValue}:protocol==='responses'?{status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(fixedValue)}]}]}:{choices:[{message:{content:JSON.stringify(fixedValue)}}]}};
  };
  assert.equal(await chatAI(s,'C02',null,'你还记得这些分歧吗'),fixedValue.text);assert.equal(calls,1);assert.ok(wire.length<=AI_WIRE_LIMIT);assert.equal(ctx.contextBudget.requestChars,wire.length);assert.equal(E.hash(s),h);
 });
});
for(const protocol of ['responses','chat-completions'])test(protocol+'代理长谈从实际API入口到服务端处理不再413',async()=>{
 await withAI('server',protocol,async()=>{
  let calls=0;const server=makeServer({config:{key:'TEST_ONLY',model:'budget-fixture',base:'https://fixture.invalid/v1',protocol,limit:10},fetcher:async(_url,options)=>{calls++;const body=JSON.parse(options.body),p=JSON.parse(body.input||body.messages[1].content);assert.equal(p.context.actorId,'C02');return{ok:true,json:async()=>protocol==='responses'?{status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(fixedValue)}]}]}:{choices:[{message:{content:JSON.stringify(fixedValue)}}]}};}});
  globalThis.fetch=async(_url,options)=>{const result=await request(server,options.body);assert.equal(result.status,200);return{ok:true,json:async()=>result};};
  assert.equal(await chatAI(long(),'C02',null,'你还记得这些分歧吗'),fixedValue.text);assert.equal(calls,1);
 });
});
test('长谈后的解析完整保留合法候选与原句，预算不替换费用日期',async()=>{
 await withAI('server','responses',async()=>{
  const s=long(),h=E.hash(s),input='明日晚间陪你散步';let ctx;
  globalThis.fetch=async(_url,options)=>{const p=JSON.parse(options.body);ctx=p.context;const a=ctx.actionCatalog[0];return{ok:true,json:async()=>({value:{segments:[],actions:[{type:'candidate',candidateId:a.id,sourceText:a.sourceText}],clarifications:[]}})};};
  const p=await parseAI(s,'C02',null,input);assert.equal(ctx.actionCatalog.length,1);assert.equal(ctx.actionCatalog[0].sourceText,input);assert.equal(p.actions[0].period,'evening');assert.deepEqual(p.actions[0].date,{year:1,month:1,day:3});assert.equal(E.hash(s),h);
 });
});
test('固定请求字段已超预算时在真实调用入口回退，不联网或计费',async()=>{
 await withAI('byok','responses',async()=>{
  const s=opened(),h=E.hash(s);let calls=0;globalThis.fetch=async()=>{calls++;};setAIConfig({model:'x'.repeat(50000)});
  await assert.rejects(()=>chatAI(s,'C02',null,'说说今日的小事'),/固定文本/);assert.equal(calls,0);assert.equal(getUsage().calls,0);assert.equal(E.hash(s),h);
 });
});
