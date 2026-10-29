// Reads durable UI exports and captured DOM only; never accesses live browser storage.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseImport} from '../src/storage.js';
import {RELATION_STORY,remoteNodeReply,routeActivityEcho} from '../src/relation-story.js';
import {STORY,STORY_VERSION} from '../src/story.js';
import {EVENTS} from '../src/content.js';
import {visibleContext} from '../src/engine.js';
import {ordinal} from '../src/calendar.js';
import {routeIds} from './s08-relation-scenarios.mjs';
const root=new URL('../',import.meta.url),dir=new URL('../docs/施工/证据/2026-10-24-S08-02/',import.meta.url);
const read=n=>fs.readFileSync(new URL(n,dir),'utf8'),json=n=>JSON.parse(read(n)),state=n=>parseImport(read(n));
const sha=x=>createHash('sha256').update(x).digest('hex'),norm=s=>s.replace(/\s+/g,'');

const originals=['季度','周制'].map(world=>{
 const before=json(`原${world}八槽_施工前.json`),after=json(`原${world}八槽_施工后只读.json`);
 assert.equal(before.records.length,8);assert.deepEqual(after.records,before.records);
 for(const r of after.records.filter(r=>r.raw))parseImport(r.raw);
 return {world,slots:8,rawExact:true,records:after.records.map(r=>({key:r.key,sha256:r.raw?sha(r.raw):null}))};
});
const browser=json('七线逐幕浏览器记录.json');assert.equal(browser.length,14);assert.deepEqual(browser.map(r=>r.id),routeIds);
for(const r of browser){
 assert.equal(norm(r.body),norm(RELATION_STORY[r.id].body),r.id+'实际DOM正文');
 assert.equal(norm(r.dialogue),norm(RELATION_STORY[r.id].replies[r.choice]),r.id+'实际DOM结果');
 assert.ok(r.beforeAX.includes(EVENTS[r.id].title));assert.ok(r.afterAX.includes('旧事已记'));
 if(RELATION_STORY[r.id].previous)assert.ok(r.echo.includes(RELATION_STORY[r.id].echo.warm),r.id+'前一幕真实warm回响');
}

const old=state('旧S08-01_允礼第二幕前.json'),readonly=state('旧S08-01_只读后_浏览器存档.json'),continued=state('旧S08-01_接续允礼第二幕后_浏览器存档.json');
assert.deepEqual(readonly,old);assert.equal(read('旧允礼首幕_浏览器重读原文.txt'),old.transcripts['R05-01'].dialogue);
for(const [id,t] of Object.entries(old.transcripts))assert.deepEqual(continued.transcripts[id],t);
for(const k of ['ledger','transactions'])assert.deepEqual(continued[k].slice(0,old[k].length),old[k]);
assert.deepEqual(continued.weekly.reports.slice(0,old.weekly.reports.length),old.weekly.reports);
assert.equal(old.transcripts['R05-01'].storyVersion,3);assert.equal(continued.transcripts['R05-02'].storyVersion,4);
assert.equal(continued.transcripts['R05-02'].dialogue,RELATION_STORY['R05-02'].replies.work);
assert.ok(continued.transcripts['R05-02'].body.includes(RELATION_STORY['R05-02'].echo.warm));

const pendingLetters=[];
for(const [id,beforeFile,afterFile] of [
 ['R03-02','R03-02_选择前_规则起点.json','年羹尧边书_写出后_浏览器存档.json'],
 ['R03-01','延期边书首谈_选择前.json','延期边书_写出后_浏览器存档.json']
]){
 const before=state(beforeFile),after=state(afterFile),notice=after.weekly.notices.find(n=>n.source===id&&n.type==='delivery');
 if(id==='R03-01')assert.equal(after.events[id].channel,'letter');
 assert.equal(notice.status,'pending');
 assert.equal(ordinal(notice.date)-ordinal(after.events[id].date),7);
 for(const k of ['trust','safety','npcIntent'])assert.equal(after.relations.C03[k],before.relations.C03[k]);
 assert.ok(!visibleContext(after,'C03').facts.some(f=>f.id==='FACT_'+id));
 pendingLetters.push({id,pending:true,noEarlyNpcEffect:true,deliveryDays:7,storyVersion:after.transcripts[id].storyVersion});
}
const remote=json('延期边书_浏览器记录.json');assert.equal(remote.choice,'work');assert.equal(remote.hasMemoryEcho,false);
assert.equal(remote.dialogue,remoteNodeReply({id:'work'}));
assert.equal(state('延期边书_写出后_浏览器存档.json').transcripts['R03-01'].dialogue,remote.dialogue);

const walkBefore=state('C05_后续活动前.json'),walk=state('允礼_后续散步后_浏览器存档.json');
const entry=walk.weekly.activities.entries.at(-1),plan=walk.weekly.plans.find(p=>p.id===entry.source);
assert.equal(entry.kind,'walk');assert.equal(entry.actor,'C05');assert.equal(plan.status,'completed');assert.equal(plan.slots,1);
assert.ok(entry.sources.includes('R05-02'));assert.ok(entry.text.includes(walk.transcripts['R05-02'].choice));
assert.ok(entry.text.includes(routeActivityEcho(walk,'C05').text));
assert.ok(read('允礼_后续散步_浏览器AX.txt').includes(entry.text));
for(const [id,t] of Object.entries(walkBefore.transcripts))assert.deepEqual(walk.transcripts[id],t);
assert.deepEqual(walk.ledger,walkBefore.ledger);
const replyBefore=state('C03_后续回信阅前.json'),reply=state('年羹尧_后续回信收好后_浏览器存档.json');
const mail=reply.weekly.activities.shipments.find(sh=>sh.actor==='C03');assert.equal(mail.status,'answered');
assert.equal(ordinal(mail.deliveryAt)-ordinal(mail.sentAt),7);assert.equal(ordinal(mail.answeredAt)-ordinal(mail.deliveryAt),7);
assert.ok(mail.text.includes(reply.transcripts['R03-02'].choice));assert.ok(mail.text.includes(routeActivityEcho(reply,'C03').text));
assert.ok(read('年羹尧_后续回信_浏览器AX.txt').includes(mail.text));
for(const [id,t] of Object.entries(replyBefore.transcripts))assert.deepEqual(reply.transcripts[id],t);

const prior=json('施工前剧情与规则基线.json');
for(const [id,s] of Object.entries(prior.story))if(!routeIds.includes(id))assert.deepEqual(STORY[id],s);
const rules=json('七线正文与规则验收.json');assert.equal(rules.distinctResults,42);assert.equal(rules.unchangedRuleBranches,84);
assert.equal(rules.continuousPaths.length,3);assert.ok(rules.continuousPaths.every(p=>p.monthly===24));
assert.equal(rules.followups.length,21);assert.equal(rules.remoteResults.length,3);assert.equal(STORY_VERSION,4);
const s05=json('S05七线两年回归.json'),s07=json('S07双玩法回归.json');
assert.equal(s05.proofs.length,7);assert.ok(s05.proofs.every(p=>p.final.stage==='相守'&&p.monthly===24));
assert.equal(s05.parallel.ending.relation,14);assert.equal(s05.cooperate.monthly,24);
assert.equal(s07.proofs.length,4);assert.equal(s07.nativeSummer.afterFunds,90);
assert.equal(json('S01静态回归.json').checks.length,9);assert.ok(json('S01静态回归.json').checks.every(c=>c.result==='通过'));
assert.ok(json('S03迁移回归.json').legacyOriginal8Exact);
assert.match(read('自动测试.log'),/pass 302/);assert.match(read('自动测试.log'),/fail 0/);
const diagnostics=json('浏览器最终诊断.json');assert.deepEqual(diagnostics.logs,[]);
const syntax=json('语法与文档检查.json');assert.equal(syntax.syntax,'passed');assert.equal(syntax.javascriptFiles,60);

const baseline=json('施工前文件基线.json'),allowed=new Set(['README.md','package.json','src/content.js','src/story.js','src/activities.js','src/engine.js','tests/main-story.test.mjs','docs/施工/施工进度.md']),changed=[],unchanged=[];
for(const [name,h] of Object.entries(baseline)){
 if(sha(fs.readFileSync(new URL(name,root)))!==h){assert.ok(allowed.has(name),'意外改变原文件：'+name);changed.push(name);}else unchanged.push(name);
}
const progress=fs.readFileSync(new URL('docs/施工/施工进度.md',root),'utf8');
const rows=s=>s.split('\n').filter(l=>/^\| S\d\d-\d\d \|/.test(l)).map(l=>l.split('|').slice(1,-1).map(x=>x.trim()));
const beforeRows=rows(read('施工前进度原文.md')),afterRows=rows(progress);assert.equal(afterRows.length,98);
assert.deepEqual(afterRows.map(r=>[r[0],r[2]]),beforeRows.map(r=>[r[0],r[2]]),'98项任务原文不改');
assert.equal(afterRows.filter(r=>r[1]==='通过').length,50);assert.equal(afterRows.find(r=>r[0]==='S08-02')[1],'通过');
assert.equal(afterRows.find(r=>r[0]==='S08-03')[1],'未开始');assert.ok(progress.includes('下一项S08-03'));
for(const name of ['README.md','docs/施工/施工进度.md','docs/施工/S08-02七线首版剧情施工与验收_2026-10-24.md','design/S08/七线前两节点施工矩阵.md']){
 const file=new URL(name,root),text=fs.readFileSync(file,'utf8');
 for(const m of text.matchAll(/\]\(([^)]+)\)/g)){const link=m[1];if(/^(https?:|#)/.test(link))continue;assert.ok(fs.existsSync(new URL(link.split('#')[0],file)),name+'链接缺失：'+link);}
}
console.log(JSON.stringify({version:'0.8.2',scope:'落盘UI导出、捕获DOM、存档保护与施工登记；未访问实时浏览器存储',originals,
 browser:{scenes:browser.map(r=>({id:r.id,choice:r.choice,bodyExact:true,resultExact:true})),scope:'14独立起点逐幕各一选；不计42选项全逐屏',oldTextRereadExact:true,remoteNoOnsiteEcho:true,walkActualFulfilled:true,activityReplyActualRead:true},
 legacy:{readonlyExact:true,oldTranscripts:Object.keys(old.transcripts).length,oldReviewsAndLedgerPrefixExact:true,oldStoryVersion:3,newStoryVersion:4},pendingLetters,
 files:{baseline:Object.keys(baseline).length,changed,unchanged:unchanged.length,protectedWordArtS01AndHistoricalEvidenceExact:true},
 regression:{tests:302,branches:84,continuousPaths:3,months:24,followups:21,s05Routes:7,s07Samples:4,syntaxFiles:syntax.javascriptFiles},
 plan:{tasks:98,passed:50,next:'S08-03',requirementsUnchanged:true},diagnostics:diagnostics.logs,limits:diagnostics.notTested},null,2));
