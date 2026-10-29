import test from 'node:test';
import assert from 'node:assert/strict';
import {EVENTS,CHARACTERS} from '../src/content.js';
import {createGame,requiredEvents,preview,commit,savePreference,setBoundary,clone,hash,validateSave,attachReaction} from '../src/engine.js';
import {STORY,memoryEcho,sceneText} from '../src/story.js';
import {parseLocal,resolveInput,validateRemoteParse,buildAIContext,validateNarrative,inputActionCatalog} from '../src/input.js';
const act=(s,a)=>commit(s,preview(s,[a])).state;
const choose=(s,id,choiceId=EVENTS[id].options[0].id)=>act(s,{type:'event',eventId:id,choiceId});
const active=[['R02-02'],['G02','R07-02'],['R06-02','P01'],['P09'],['R08-02','R04-02'],['R05-02','G05'],['R03-02','P10'],['P11']];
function checkpoints(){let s=createGame();const states={};for(let turn=1;turn<=8;turn++){let guard=0;while(requiredEvents(s).length){assert.ok(++guard<20);const e=requiredEvents(s)[0];states[e.id]=clone(s);s=choose(s,e.id);}for(const id of active[turn-1]){states[id]=clone(s);s=choose(s,id);}if(turn<8)s=act(s,{type:'advance'});}return states;}
test('开局三选有独立回应，14关系节点42个专属回应互不复用',()=>{
 const states=checkpoints(),replies=[];
 for(const e of Object.values(EVENTS).filter(e=>!e.volume&&(e.kind==='relation'||e.id==='M01'||e.id==='M02'))){
  assert.ok(STORY[e.id]);assert.ok(e.body.length>180,e.id+'需要完整情境');
  for(const o of e.options){let s=states[e.id]||createGame();s=choose(s,e.id,o.id);const t=s.transcripts[e.id];assert.ok(t.dialogue.length>65);assert.ok(!/结果已据实|相知仍需|不能代替|不产生恋爱承诺/.test(t.dialogue));replies.push(t.dialogue);if(e.kind==='relation'){assert.ok(t.reward);assert.equal(s.facts.filter(f=>f.id==='MOMENT_'+e.id).length,1);}}
 }
 assert.equal(new Set(replies).size,replies.length);
});
test('七线第二节点回想真实第一选择，合作和拒绝不套亲密回响',()=>{
 const states=checkpoints();
 for(const c of CHARACTERS){const first='R'+c.id.slice(1)+'-01',second=first.replace('01','02');const e=EVENTS[second];
  for(const outcome of ['warm','work','distance']){const s=clone(states[second]);s.events[first].outcomeId=outcome;s.relations[c.id].playerIntent=outcome==='distance'?'仅合作':outcome==='warm'?'愿发展':'未表态';assert.ok(memoryEcho(s,e).includes(STORY[second].echo[outcome]));}
 }
});
test('偏好更正与停止检索影响回响，人物私话不串线',()=>{
 let s=checkpoints()['R02-02'];s=savePreference(s,'C02','朕夜里不爱浓茶','test-source');
 assert.ok(memoryEcho(s,EVENTS['R02-02']).includes('沏得淡'));
 assert.ok(!memoryEcho(s,EVENTS['R06-02']).includes('沏得淡'));
 s=savePreference(s,'C02','朕如今爱喝浓茶','test-correct');const echo=memoryEcho(s,EVENTS['R02-02']);assert.ok(echo.includes('浓淡试了水色'));assert.ok(!echo.includes('沏得淡'));
 s.memories.at(-1).deleted=true;assert.ok(!memoryEcho(s,EVENTS['R02-02']).includes('浓淡试了水色'));
});
test('已接受未履行约定不伪造成回响；真实赴约有场景且不再收费',()=>{
 let s=checkpoints()['R02-02'];s=act(s,{type:'promise',actor:'C02',purpose:'rest',when:'tomorrow'});const e=EVENTS['R02-02'];assert.ok(!memoryEcho(s,e).includes('睡得踏实'));
 const funds=s.stats.treasury,remaining=s.remaining,relations=clone(s.relations);const plan=preview(s,[{type:'fulfill',promiseId:s.promises.at(-1).id}]);s=commit(s,plan).state;
 assert.ok(s.promises.at(-1).dialogue.includes('明早再来'));assert.ok(memoryEcho(s,e).includes('睡得踏实'));assert.equal(s.stats.treasury,funds);assert.equal(s.remaining,remaining);assert.deepEqual(s.relations,relations);assert.throws(()=>act(s,{type:'fulfill',promiseId:s.promises.at(-1).id}));
});
test('重读保存当时回响，不因后来改偏好、改边界或版本升级而改写',()=>{
 let s=checkpoints()['R02-02'];s=savePreference(s,'C02','朕夜里不爱浓茶','source');const body=sceneText(s,EVENTS['R02-02']);s=choose(s,'R02-02','distance');assert.equal(s.transcripts['R02-02'].body,body);
 const original=clone(s.transcripts);s=savePreference(s,'C02','朕改喝淡茶','new-source');s=setBoundary(s,'C02','暂缓','later');assert.deepEqual(validateSave(s).transcripts,original);
 const legacy=clone(s);delete legacy.transcripts.M01.storyVersion;legacy.transcripts.M01.dialogue='旧档原有的那句话。';assert.equal(validateSave(legacy).transcripts.M01.dialogue,'旧档原有的那句话。');
});
test('混合句命中偏好后，剩余部分仍进入AI解析；偏好不被模型漏掉',async()=>{
 const input='朕夜里不爱浓茶，今天就按第一项办',s=choose(createGame(),'M01');let calls=0;
 const local=parseLocal(input,{actor:'C02',eventId:'M02'});assert.equal(local.recognized,true);assert.equal(local.needsAI,true);
 const result=await resolveInput(input,{state:s,actor:'C02',eventId:'M02'},async text=>{calls++;assert.equal(text,input);const catalog=inputActionCatalog(s,'C02','M02',input);return validateRemoteParse({segments:[],actions:[{type:'candidate',candidateId:catalog[0].id,sourceText:'今天就按第一项办'}],clarifications:[]},{state:s,input,actor:'C02',eventId:'M02'});});
 assert.equal(calls,1);assert.equal(result.actions[0].choiceId,'tea');assert.equal(result.segments.filter(s=>s.kind==='preference').length,1);
 const failed=await resolveInput(input,{actor:'C02',eventId:'M02'},async()=>{throw Error('offline');});assert.equal(failed.actions.length,0);assert.equal(failed.segments[0].kind,'preference');assert.ok(failed.clarifications.length);
});
test('咨询双重保护：原句或模型标记咨询都不能留行动；普通咨询仅需一次问答',async()=>{
 for(const [input,kind] of [['如果先拨一半会怎样','chat'],['先聊聊这个办法','query']]){const result=validateRemoteParse({segments:[{kind,text:input,intent:''}],actions:[{type:'event',eventId:'G04',choiceId:'custom',amount:6,officer:'C28',visibility:'private',escort:false}],clarifications:[]},{input,actor:'C03',eventId:'G04'});assert.equal(result.actions.length,0);assert.equal(result.consultation,true);}
 let calls=0;const q=await resolveInput('如果先拨一半会怎样',{actor:'C03',eventId:'G04'},async()=>{calls++;});assert.equal(calls,0);assert.equal(q.actions.length,0);
});
test('未连接AI时，混合句未解出的命令须澄清，已识别偏好仍保留',async()=>{const result=await resolveInput('朕夜里不爱浓茶，今天就依你说的办',{actor:'C02',eventId:'M02'});assert.equal(result.actions.length,0);assert.equal(result.segments[0].kind,'preference');assert.ok(result.clarifications.length);});
test('模型不能改掉本地已经明确识别的军饷金额，复合命令不重复投递',async()=>{
 const input='朕不爱浓茶，先拨一半，和你说说话';const result=await resolveInput(input,{actor:'C03',eventId:'G04'},async()=>({segments:[],actions:[{type:'event',eventId:'G04',choiceId:'custom',params:{amount:12,officer:'C28',visibility:'private',escort:false}}],clarifications:[],consultation:false}));assert.equal(result.actions.length,1);assert.equal(result.actions[0].params.amount,6);
});
test('AI能读到角色可见场景，接话只存一次且不改变规则结果',()=>{
 let s=choose(createGame(),'M01');const ctx=buildAIContext(s,'C02','M01');assert.ok(ctx.event.visibleScene.includes('苏培盛'));assert.ok(!JSON.stringify(ctx).includes('记得前世'));
 const text=validateNarrative({speakerId:'C02',text:'奴才把灯留在这儿，皇上若还睡不稳，叫一声便是。',factIds:[]},ctx);const before=clone(s.stats),relations=clone(s.relations),tx=s.transcripts.M01.transactionId;s=attachReaction(s,'M01',tx,text);assert.equal(s.transcripts.M01.aiReaction,text);assert.deepEqual(s.stats,before);assert.deepEqual(s.relations,relations);assert.deepEqual(attachReaction(s,'M01',tx,'第二份不应覆盖。'),s);assert.throws(()=>attachReaction(s,'M01','wrong',text));assert.equal(validateSave(s).transcripts.M01.aiReaction,text);
});
