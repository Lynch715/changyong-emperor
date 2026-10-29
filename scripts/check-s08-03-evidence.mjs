// Durable browser exports and captured visible text only. No live browser storage access.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseImport} from '../src/storage.js';
import {WORLD_STORY} from '../src/world-story.js';
import {PROJECTS} from '../src/project-content.js';
import {initiativeStory,banquetExchange} from '../src/social-story.js';
import {RELATION_PROFILES} from '../src/relationship-content.js';
import {worldIds} from './s08-world-scenarios.mjs';
const root=new URL('../',import.meta.url),dir=new URL('../docs/施工/证据/2026-10-24-S08-03/',import.meta.url);
const read=n=>fs.readFileSync(new URL(n,dir),'utf8'),json=n=>JSON.parse(read(n)),state=n=>parseImport(read(n));
const sha=x=>createHash('sha256').update(x).digest('hex'),norm=s=>s.replace(/\s+/g,'');
const originals=['周制','季度'].map(world=>{
 const a=json(`原${world}八槽_施工前.json`),b=json(`原${world}八槽_施工后只读.json`),reconnected=json(`原${world}八槽_预览重连后.json`);assert.equal(a.records.length,8);assert.deepEqual(b.records,a.records);assert.deepEqual(reconnected.records,a.records);
 for(const r of b.records.filter(r=>r.raw))parseImport(r.raw);
 return {world,slots:8,rawExact:true,reconnectedRawExact:true,sha256:b.records.map(r=>({key:r.key,hash:r.raw?sha(r.raw):null}))};
});
const scenes=json('逐幕浏览器正文记录.json');assert.deepEqual(scenes.map(r=>r.id),worldIds);
for(const r of scenes){assert.ok(norm(r.body).startsWith(norm(WORLD_STORY[r.id].body)),r.id+'DOM正文');assert.ok(norm(r.dialogue).includes(norm(WORLD_STORY[r.id].replies[r.choice])),r.id+'DOM结果');assert.ok(r.afterAX.includes('旧事已记'));}
const extras=json('附属正文浏览器记录.json');
for(const id of Object.keys(PROJECTS)){
 const before=state(id+'_中途报告前.json'),after=state(id+'_短报阅后_浏览器存档.json'),note=before.weekly.notices.find(n=>n.projectId===id&&n.type==='project-progress'&&n.status==='pending');
 assert.equal(after.weekly.notices.find(n=>n.id===note.id).status,'read');assert.equal(after.weekly.projects.items[id].reports.length,0);assert.deepEqual(after.stats,before.stats);
 const fact=after.facts.find(f=>f.id==='PROJECT_PROGRESS_'+note.id);assert.ok(extras.find(x=>x.kind==='progress'&&x.id===id).ax.includes(fact.text));
 assert.deepEqual(after.transcripts,before.transcripts);
}
const messages=state('十四主动消息_读后_浏览器存档.json'),messageStart=state('IN-C02-1_读取前.json');
assert.equal(extras.filter(e=>e.kind==='initiative').length,14);assert.deepEqual(messages.relations,messageStart.relations);assert.equal(messages.remaining,messageStart.remaining);
for(const m of messages.weekly.relationships.messages){assert.ok(m.readAt);assert.equal(m.text,initiativeStory(messageStart,m,RELATION_PROFILES[m.actor]));assert.ok(extras.find(e=>e.kind==='initiative'&&e.id===m.id).ax.includes(m.text));}
const accepted=state('新炉收下后_浏览器存档.json'),acceptBefore=state('小宴赠礼_beforeGift.json'),refused=state('护腕婉拒后_浏览器存档.json'),refuseBefore=state('小宴赠礼_beforeRefusal.json');
assert.equal(accepted.remaining,acceptBefore.remaining);assert.equal(accepted.weekly.activities.inventory.at(-1).status,'given');assert.deepEqual(accepted.relations,acceptBefore.relations);
assert.equal(refused.weekly.activities.inventory.at(-1).status,'held');assert.deepEqual(refused.relations,refuseBefore.relations);assert.equal(refused.remaining,refuseBefore.remaining);
assert.ok(extras.find(x=>x.id==='GF02-accept').ax.includes(accepted.weekly.activities.entries.at(-1).text));
assert.ok(extras.find(x=>x.id==='GF03-refuse').ax.includes(refused.weekly.activities.entries.at(-1).text));
for(const theme of ['tea','music','season']){
 const s=state(`小宴_${theme}_赴宴后_浏览器存档.json`),p=s.weekly.plans.find(p=>p.kind==='banquet');assert.equal(p.status,'completed');assert.equal(p.slots,2);assert.equal(p.money,{tea:2,music:3,season:4}[theme]);
 assert.ok(p.dialogue.includes(banquetExchange(p.activity.seats,theme)));assert.ok(!p.dialogue.includes('他自己说'));assert.ok(extras.find(x=>x.kind==='banquet'&&x.id===theme).ax.includes(p.dialogue));
}
const week=state('新周回顾收好后_浏览器存档.json'),review=week.weekly.reports.find(r=>r.weekId==='W01').review;
for(const kind of ['activity','initiative','plan'])assert.ok(review.sources.some(x=>x.kind===kind));
assert.ok(review.passages.join(' ').includes('新炉'));assert.ok(review.passages.join(' ').includes('婉拒'));assert.ok(!review.passages.join(' ').includes('他自己说'));
const weekAX=extras.find(x=>x.kind==='week-review').ax;for(const passage of review.passages)assert.ok(weekAX.includes(passage));
const old=state('旧S08-02_只读起点.json'),readonly=state('旧S08-02_只读后_浏览器存档.json'),next=state('旧S08-02_接续新日常后_浏览器存档.json');assert.deepEqual(readonly,old);
assert.equal(read('旧S08-02财政原文_浏览器重读.txt'),old.transcripts.G01.dialogue);
for(const [key,t] of Object.entries(old.transcripts))assert.deepEqual(next.transcripts[key],t);assert.deepEqual(next.weekly.reports,old.weekly.reports);assert.deepEqual(next.ledger,old.ledger);
assert.equal(next.transcripts['D04@W06'].storyVersion,5);assert.equal(next.transcripts['D04@W06'].dialogue,WORLD_STORY.D04.replies.finish);
const rules=json('最终正文与规则验收.json');assert.equal(rules.logicalScenes,24);assert.equal(rules.choiceResults,48);assert.equal(rules.unchangedBranches,82);assert.equal(rules.messages.length,14);assert.equal(rules.gifts.length,14);assert.equal(rules.pairs.length,63);assert.ok(rules.paths.every(p=>p.months===24));
const s05=json('S05七线两年回归.json'),s07=json('S07双玩法回归.json');assert.equal(s05.proofs.length,7);assert.ok(s05.proofs.every(p=>p.final.stage==='相守'&&p.monthly===24));assert.equal(s07.proofs.length,4);assert.equal(s07.nativeSummer.afterFunds,90);
assert.ok(json('S01静态回归.json').checks.every(c=>c.result==='通过'));assert.ok(json('S03迁移回归.json').legacyOriginal8Exact);assert.match(read('自动测试.log'),/pass 350/);assert.match(read('自动测试.log'),/fail 0/);
const baseline=json('施工前文件基线.json'),allowed=new Set(['README.md','package.json','tests/relation-story.test.mjs','tests/main-story.test.mjs','src/story.js','src/activities.js','src/projects.js','src/relationships.js','src/content.js','src/week-experience.js','src/project-content.js','docs/施工/施工进度.md']),changed=[],unchanged=[];
for(const [n,h]of Object.entries(baseline)){if(sha(fs.readFileSync(new URL(n,root)))!==h){assert.ok(allowed.has(n),'意外修改原文件：'+n);changed.push(n);}else unchanged.push(n);}
const progress=fs.readFileSync(new URL('docs/施工/施工进度.md',root),'utf8'),rows=s=>s.split('\n').filter(l=>/^\| S\d\d-\d\d \|/.test(l)).map(l=>l.split('|').slice(1,-1).map(x=>x.trim())),beforeRows=rows(read('施工前进度原文.md')),afterRows=rows(progress);
assert.equal(afterRows.length,98);assert.deepEqual(afterRows.map(r=>[r[0],r[2]]),beforeRows.map(r=>[r[0],r[2]]));assert.equal(afterRows.filter(r=>r[1]==='通过').length,51);assert.equal(afterRows.find(r=>r[0]==='S08-03')[1],'通过');assert.equal(afterRows.find(r=>r[0]==='S08-04')[1],'未开始');assert.ok(progress.includes('下一项S08-04'));
for(const n of ['README.md','docs/施工/施工进度.md','docs/施工/S08-03项目群像日常施工与验收_2026-10-24.md','design/S08/项目群像日常施工矩阵.md']){const file=new URL(n,root);for(const m of fs.readFileSync(file,'utf8').matchAll(/\]\(([^)]+)\)/g)){if(/^(https?:|#)/.test(m[1]))continue;assert.ok(fs.existsSync(new URL(m[1].split('#')[0],file)),n+'断链：'+m[1]);}}
const diagnostics=json('浏览器最终诊断.json');assert.deepEqual(diagnostics.logs,[]);
const syntax=json('语法检查.json');assert.equal(syntax.syntax,'passed');assert.equal(syntax.files,66);
console.log(JSON.stringify({version:'0.8.3',scope:'落盘UI导出、实际DOM与文件保护核对',originals,scenes:scenes.map(r=>({id:r.id,choice:r.choice,bodyAndResult:true})),extras:{progress:4,initiative:14,banquetThemes:3,giftAcceptAndRefuse:true,weekReviewActuallyClosed:true},legacy:{readonlyExact:true,oldTranscripts:Object.keys(old.transcripts).length,oldReports:old.weekly.reports.length,newVersion:5,newDate:next.transcripts['D04@W06'].date,oldLedgerExact:true},files:{baseline:Object.keys(baseline).length,changed,unchanged:unchanged.length,originalWordArtS01AndHistoricalEvidenceExact:true},regression:{tests:350,branches:82,paths:2,months:24,initiative:14,giftCombinations:14,banquetTexts:63,s05Routes:7,s07Samples:4,syntaxFiles:syntax.files},plan:{tasks:98,passed:51,next:'S08-04',requirementsUnchanged:true},diagnostics:diagnostics.logs,limits:diagnostics.notTested},null,2));
