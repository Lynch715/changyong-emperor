import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {EVENTS}from'../src/content.js';import {preview,commit,validateSave,clone,hash,visibleContext,fixedReply,getEvent,setBoundary,ordinal,requiredEvents}from'../src/engine.js';
import {parseImport,exportSave}from'../src/storage.js';import {incenseKnowledge,incenseReport}from'../src/incense.js';import {addDays}from'../src/calendar.js';import{buildAIContext,buildReactionContext,validateNarrative}from'../src/input.js';
import {sceneText}from'../src/story.js';
import {ruleProjection}from'../scripts/s08-main-scenarios.mjs';import{before,dir,act,choose,opened,reach,readReport}from'../scripts/check-s08-05.mjs';import{prepareMigration}from'../src/migration.js';
const __evidence=f=>{try{return f()}catch(e){if(e&&e.code==='ENOENT')return null;throw e}};

const reportText='领用单与出库簿的日期核对相符';

for(const world of ['weekly','quarter'])for(const p of ['sample','explain','quiet'])test(`${world} ${p}三种相谈都能说明与查证，亲近和距离不改变核对内容`,()=>{
 const start=opened(world,p).afterM03,results=[];
 for(const tone of ['warm','work','distance']){const n=choose(start,'R07-01',tone);validateSave(n);assert.equal(n.incenseCase.request.transactionId,start.incenseCase.request.transactionId);assert.equal(incenseKnowledge(n,'C07').explanationHeard,true);assert.equal(incenseKnowledge(n,'C07').report,null);assert.deepEqual(n.stats,start.stats);assert.equal(n.relations.C07.trust,Math.min(100,start.relations.C07.trust+{warm:5,work:3,distance:1}[tone]));if(tone==='distance')assert.equal(n.relations.C07.playerIntent,'仅合作');if(p==='quiet')assert.equal(n.flags.incenseExplanationDue,false);for(const cid of Object.keys(n.relations).filter(c=>c!=='C07'))assert.deepEqual(n.relations[cid],start.relations[cid]);const q=readReport(n);results.push(q.incenseCase.review.text);assert.equal(incenseKnowledge(q,'C07').report,null);}
 assert.equal(new Set(results).size,1);
});
test('先说明的路线不再被正文当成未说明；暗停也保留补谈后的真实经历',()=>{
 for(const p of ['sample','explain','quiet']){const r=opened('weekly',p,'warm');assert.notEqual(getEvent(r.afterM03,'R07-01').body,EVENTS['R07-01'].body);if(p==='explain'){assert.match(getEvent(r.afterM03,'R07-01').body,/说好先停再核/);assert.ok(!r.afterTalk.transcripts['R07-01'].dialogue.includes('若臣妾今日不问呢'));}if(p==='quiet')assert.match(r.afterTalk.transcripts['R07-01'].dialogue,/没把疑处告诉你/);assert.deepEqual(r.afterTalk.transcripts.M03,r.afterM03.transcripts.M03);}
});
test('周推进在七日回单处停下，只到达不替玩家阅核或替人物读懂',()=>{
 const start=opened().afterTalk;let s=reach(start,addDays(start.incenseCase.request.date,6));assert.equal(s.incenseCase.arrivedAt,null);assert.throws(()=>act(s,{type:'incense-review'}));s=reach(s,s.incenseCase.request.dueDate);assert.ok(s.incenseCase.arrivedAt);assert.equal(s.incenseCase.review,null);assert.equal(incenseKnowledge(s,'C07').report,null);assert.equal(incenseKnowledge(s,'C01').report,null);assert.match(incenseKnowledge(s,'C22').report.text,/原方册却少了一处用量/);const stats=clone(s.stats),rel=clone(s.relations),n=act(s,{type:'incense-review'});assert.deepEqual(n.stats,stats);assert.deepEqual(n.relations,rel);assert.equal(n.incenseCase.shared,null);assert.equal(n.transactions.at(-1).results[0].actionCost,0);assert.throws(()=>act(n,{type:'incense-review'}));
});
test('御案私阅不向年世兰、颂芝、皇后或其他医官广播，具体知情须有实际来源',()=>{
 const n=readReport(opened('weekly','quiet').afterTalk),doctor=buildAIContext(n,'C22',null),year=buildAIContext(n,'C07',null),servant=buildAIContext(n,'C19',null),queen=buildAIContext(n,'C06',null);assert.ok(JSON.stringify(doctor).includes(reportText));for(const ctx of [year,servant,queen])assert.ok(!JSON.stringify(ctx).includes(reportText));assert.equal(queen.mandatory.incenseKnowledge,null);assert.throws(()=>validateNarrative({speakerId:'C07',text:'回单已核对过日期。',factIds:['IC-INCENSE-REPORT-C07']},year));assert.throws(()=>validateNarrative({speakerId:'C06',text:'回单已查明皇后下毒。',factIds:[]},queen));assert.throws(()=>buildAIContext(n,'C04',null));assert.match(fixedReply(n,'C07','回单查明了什么？'),/还没交到臣妾手里/);
 const later=reach(n,{year:2,month:1,day:8});assert.equal(buildAIContext(later,'C04',null).mandatory.incenseKnowledge,null);assert.ok(!JSON.stringify(buildAIContext(later,'C04',null)).includes(reportText));
});
test('另往分享按一格，同场分享按零格，合作边界不撤照护或改变双方意愿',()=>{
 let s=readReport(opened('weekly','quiet','distance').afterTalk);s=act(s,{type:'week-extend',date:s.date});s=setBoundary(s,'C07','仅合作','incense-boundary');const old=clone(s),p=preview(s,[{type:'incense-share'}]);assert.equal(p.actionCost,1);assert.equal(hash(s),hash(old));s=commit(s,p).state;assert.equal(s.remaining,old.remaining-1);assert.deepEqual(s.relations,old.relations);assert.deepEqual(s.stats,old.stats);assert.equal(s.flags.incenseExplanationDue,false);assert.match(incenseKnowledge(s,'C07').report.text,/缺了一处|少了一处/);assert.equal(incenseKnowledge(s,'C19').report,null);const known=buildAIContext(s,'C07',null);assert.ok(known.facts.some(f=>f.id==='IC-INCENSE-REPORT-C07'));assert.equal(validateNarrative({speakerId:'C07',text:'回单核对过领用日期，用量仍缺一行。',factIds:['IC-INCENSE-REPORT-C07']},known),'回单核对过领用日期，用量仍缺一行。');assert.throws(()=>act(s,{type:'incense-share'}));
 let same=opened().afterTalk;same=reach(same,same.incenseCase.request.dueDate);same=act(same,{type:'week-extend',date:same.date});same=choose(same,'R07-02','work');same=act(same,{type:'incense-review'});const before=clone(same);same=act(same,{type:'incense-share'});assert.equal(same.transactions.at(-1).results[0].actionCost,0);assert.equal(same.remaining,before.remaining);assert.deepEqual(same.relations,before.relations);
});
test('实际相谈可以展示已读回单，没有提前接收时不出现共享报告',()=>{
 const early=opened().afterTalk,unread=choose(early,'R07-02','work');assert.equal(unread.incenseCase.shared,null);assert.ok(!unread.transcripts['R07-02'].dialogue.includes('真正收到的副单'));
 let s=readReport(early);s=act(s,{type:'week-extend',date:s.date});s=choose(s,'R07-02','work');assert.equal(s.incenseCase.shared.via,'R07-02');assert.match(s.transcripts['R07-02'].dialogue,/真正收到的副单/);assert.ok(incenseKnowledge(s,'C07').report);assert.equal(incenseKnowledge(s,'C19').report,null);validateSave(s);
});



test('已记录的行动、听过的说法与已核文书不升级成病因、罪责或本人前世记忆',()=>{
 let n=opened().afterTalk;const before=clone(n.facts),ctx=buildAIContext(n,'C07','R07-01');assert.equal(ctx.facts.find(f=>f.id==='FACT_R07-01').epistemic.kind,'action-record');assert.deepEqual(n.facts,before);assert.equal(visibleContext(n,'C01').facts.find(f=>f.id==='FACT_REBIRTH').epistemic.kind,'past-life-lead');for(const text of ['已经证实太后下毒。','已查明皇后害你。','验出这香使人不孕。','凶手就是太后。','根据前世记忆可以定罪。'])assert.throws(()=>validateNarrative({speakerId:'C07',text,factIds:[]},ctx));assert.equal(validateNarrative({speakerId:'C07',text:'回单尚未查明病因，也没说是谁授意。',factIds:[]},ctx),'回单尚未查明病因，也没说是谁授意。');
 n=act(n,{type:'disclose',actor:'C07',scope:'partial'});const partial=buildAIContext(n,'C07',null);assert.equal(partial.mandatory.secretDisclosure[0].epistemic.status,'unverified');assert.throws(()=>validateNarrative({speakerId:'C07',text:'你确实重生了。',factIds:[]},partial));n=act(n,{type:'disclose',actor:'C07',scope:'full'});assert.throws(()=>validateNarrative({speakerId:'C07',text:'我已经确信前世的一切。',factIds:[]},buildAIContext(n,'C07',null)));
});

test('新季度案卷迁移按原字段保留，七条关系与历史快照不重算',async()=>{
 const s=readReport(opened('quarter','quiet').afterTalk);class Store{m=new Map();getItem(k){return this.m.get(k)||null;}setItem(k,v){this.m.set(k,v);}}const p=await prepareMigration(exportSave(s),{storage:new Store()});assert.deepEqual(p.target.incenseCase,s.incenseCase);assert.ok(p.report.preserved.some(x=>x.key==='incenseCase'&&x.equal));assert.deepEqual(p.target.transcripts,s.transcripts);assert.deepEqual(p.target.relations,s.relations);assert.equal(Object.keys(p.target.relations).length,7);validateSave(p.target);
});




test('先分享再补正式相谈，记得已解释且只复用一个同场节点',()=>{let s=choose(before.weekly.checkpoints.M03,'M03','quiet');s=act(s,{type:'defer',eventId:'R07-01'});s=readReport(s);s=act(s,{type:'week-extend',date:s.date});s=act(s,{type:'incense-share'});const old=clone(s);assert.equal(preview(s,[{type:'event',eventId:'R07-01',choiceId:'work'},{type:'event',eventId:'R07-02',choiceId:'work'}]).actionCost,1);const e=getEvent(s,'R07-01'),text=sceneText(s,e);assert.match(text,/已经亲手交过/);assert.ok(!text.includes('今日那句为什么还没有得到回答'));assert.ok(!e.body.includes('为什么要换，却一直没人说清'));s=choose(s,'R07-01','work');assert.equal(s.transactions.at(-1).results[0].actionCost,0);assert.equal(s.remaining,old.remaining);assert.ok(!s.transcripts['R07-01'].body.includes('今日那句为什么还没有得到回答'));const next=preview(s,[{type:'event',eventId:'R07-02',choiceId:'work'}]);assert.equal(next.actionCost,1);validateSave(s);});
