import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EVENTS,CHARACTERS} from '../src/content.js';
import {preview,commit,clone,hash,validateSave,visibleContext,fixedReply,requiredEvents} from '../src/engine.js';
import {bridgeContext,bridgeSummary,attitudeEcho} from '../src/extension-bridge.js';
import {buildAIContext,buildReactionContext,validateNarrative,parseLocal} from '../src/input.js';
import {parseImport,exportSave} from '../src/storage.js';
import {sceneText,STORY_VERSION} from '../src/story.js';
import {makeWeekReview} from '../src/week-experience.js';
import {ruleProjection} from '../scripts/s08-main-scenarios.mjs';
import {before,choose,act,carryTo,branch,dir} from '../scripts/check-s08-04.mjs';
const __evidence=f=>{try{return f()}catch(e){if(e&&e.code==='ENOENT')return null;throw e}};

const intents=['unspoken','open','none','unsure'];


for(const first of ['open','none','unsure'])test(`甄嬛先前${first}在暖阁五选分别承接，澄清旧影不抹除原心意`,()=>{
 const r=branch(true,{C09:first,C10:'none'},'clear'),echo=attitudeEcho(r.beforeM11,EVENTS.M11);assert.ok(echo);assert.ok(r.afterM11.transcripts.M11.body.includes(echo));assert.equal(bridgeContext(r.afterM11,'C09').playerIntent,first);assert.equal(bridgeContext(r.afterM11,'C10').playerIntent,'none');
 for(const choice of EVENTS.M11.options){const n=choose(r.beforeM11,'M11',choice.id),b=bridgeContext(n,'C09');validateSave(n);if(['open','unsure','polite'].includes(choice.id)){const expected=choice.id==='polite'?'none':choice.id;assert.equal(b.playerIntent,expected);if(first!==expected)assert.match(n.transcripts.M11.dialogue,/上次皇上说的/);}if(choice.id==='vague'){assert.ok(b.unresolvedGift);assert.equal(b.playerIntent,first);assert.equal(n.stats.treasury,r.beforeM11.stats.treasury-2);assert.equal(n.stats.mood,Math.max(0,r.beforeM11.stats.mood-2));assert.match(bridgeSummary(n,'C09'),/没喝完|未答/);}assert.deepEqual(n.transcripts.M06,r.beforeM11.transcripts.M06);}
});
test('双方私谈分开进入本人上下文，安陵容与其他核心人物不旁听',()=>{
 const s=branch().afterM06,ctx9=buildAIContext(s,'C09','M06'),ctx10=buildAIContext(s,'C10','M06'),ctx8=buildReactionContext(s,'C08','M06');
 assert.equal(ctx9.mandatory.extensionAttitude.playerIntent,'open');assert.equal(ctx10.mandatory.extensionAttitude.playerIntent,'none');assert.ok(ctx9.mandatory.extensionAttitude.history.every(x=>x.actor==='C09'));assert.ok(ctx10.mandatory.extensionAttitude.history.every(x=>x.actor==='C10'));assert.equal(ctx8.mandatory.extensionAttitude,null);assert.ok(!ctx8.reaction.establishedOutcome.includes('散后'));assert.ok(!JSON.stringify(ctx8).includes('不另许私情'));assert.ok(!JSON.stringify(ctx9).includes('她的本领没有'));assert.ok(!JSON.stringify(ctx10).includes('想读的一本书名'));
 for(const cid of ['C02','C06','C07'])assert.equal(visibleContext(s,cid).mandatory.extensionAttitude,null);assert.ok(s.transcripts.M06.dialogue.includes('散后'));assert.throws(()=>buildReactionContext(s,'C10','M06'));
});
test('人物记得本人的实际原话，礼遇与未定不被AI说成已经相爱',()=>{
 for(const tone of ['open','none','unsure']){const s=branch(true,{C09:tone,C10:tone},tone==='none'?'polite':tone).afterM11;for(const cid of ['C09','C10']){const ctx=buildAIContext(s,cid,null),answer=fixedReply(s,cid,'你记得朕的心意吗？');assert.ok(answer.length>20);assert.throws(()=>validateNarrative({speakerId:cid,text:'我们已经相爱，已经答应相守。',factIds:[]},ctx));assert.equal(validateNarrative({speakerId:cid,text:'臣妾听见了，也请容臣妾自己想一想。',factIds:[]},ctx),'臣妾听见了，也请容臣妾自己想一想。');}}
 const n=branch(true,{C09:'open',C10:'none'},'vague').afterM11;assert.match(fixedReply(n,'C09','赏物之后你怎么想？'),/至今没有得到回答/);
});

test('错误或伪造参数原子拒绝，不能改变其他人态度或注入任免与奖励',()=>{
 const s=before.weekly.checkpoints.M06,h=hash(s);for(const params of [null,[],{gift:2},{attitudes:[]},{attitudes:{C08:'open'}},{attitudes:{toString:'open'}},{attitudes:{C09:'true-love'}},{attitudes:{C10:'open',C09:'open',reward:99}}]){assert.throws(()=>preview(s,[{type:'event',eventId:'M06',choiceId:'fair',params}]));assert.equal(hash(s),h);}
 assert.throws(()=>preview(before.weekly.checkpoints.M11,[{type:'event',eventId:'M11',choiceId:'clear',params:{attitudes:{C09:'open'}}}]));
 const n=branch().afterM06;for(const mutate of [b=>b.transcripts.M06.bridge[0].actor='C08',b=>b.transcripts.M06.bridge[0].intent='none',b=>b.transcripts.M06.transactionId='fake',b=>delete b.events.M06,b=>delete b.transcripts.M06.publicDialogue,b=>b.transcripts.M06.bridge.pop(),b=>b.transcripts.M06.bridge[0]=null]){const b=clone(n);mutate(b);assert.throws(()=>validateSave(b));}
});
test('固定选项自由输入可命中新暖阁选项，咨询不替玩家执行',()=>{
 for(const id of ['open','unsure']){const o=EVENTS.M11.options.find(o=>o.id===id),p=parseLocal(o.label,{actor:'C09',eventId:'M11'});assert.equal(p.actions[0]?.choiceId,id);}
 assert.equal(parseLocal('如果愿意慢慢了解她，会怎样？',{actor:'C09',eventId:'M11'}).actions.length,0);
});
test('当周回顾收录真实殿前私话与暖阁答复，未来及未发生的表态不出现',()=>{
 const r=branch(),s=r.afterM06,w=s.weekly.weeks.find(w=>w.id==='W04'),h=hash(s),review=makeWeekReview(s,w);assert.ok(review.sources.some(x=>x.kind==='transcript'&&x.id==='M06'));assert.ok(review.passages.join(' ').includes(s.transcripts.M06.bridge[0].reply));assert.ok(!review.sources.some(x=>x.id==='M11'));assert.equal(hash(s),h);const w7=r.afterM11.weekly.weeks.find(w=>w.id==='W07');assert.ok(makeWeekReview(r.afterM11,w7).sources.some(x=>x.id==='M11'));
});

