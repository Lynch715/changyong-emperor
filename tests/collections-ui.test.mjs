import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../src/engine.js';
import {parseImport,exportSave} from '../src/storage.js';
import {archiveCollections,renderArchiveCollection,chronicleProgress,renderChronicleProgress} from '../src/archive-ui.js';
import {renderWeeklyPalace} from '../src/palace-ui.js';
import {renderProjects} from '../src/project-ui.js';
import {act,choose,before} from '../scripts/check-s08-06.mjs';
const load=p=>parseImport(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const rich=()=>load('docs/施工/证据/2026-10-26-S10-02/IAB_材料与藏品起点.json');
const repaired=()=>load('docs/施工/证据/2026-10-24-S04/民生补工暂停复办闭环_浏览器存档.json');
const needsRepair=()=>load('docs/施工/证据/2026-10-24-S04/民生临时点待补工_规则验收.json');
const ui={heading:(_a,title,sub)=>`<h1>${title}</h1><p>${sub}</p>`,monogram:c=>`<span>${c.sign}</span>`};
test('作品逐字来自已生成的成长成果，练习手记独立保留，浏览不改正文或账目',()=>{
 const s=rich(),raw=JSON.stringify(s),x=archiveCollections(s);assert.equal(x.works.length,1);assert.equal(x.notes.length,3);assert.equal(x.works[0].title,'一册有自己批注的读书小札');assert.ok(renderArchiveCollection(s,'works').includes(x.works[0].text));for(let i=0;i<3;i++){renderArchiveCollection(s,'works');renderChronicleProgress(s);}assert.equal(JSON.stringify(s),raw);assert.deepEqual(parseImport(exportSave(s)),s);
});
test('未履行的学习预约不变成作品或手记，单次练习也不提前补成作品',()=>{
 let s=choose(E.createWeeklyGame(),'M01');s=act(s,{type:'week-plan',kind:'study',actor:'C01',date:s.date,period:'day',exercise:'read'});assert.equal(archiveCollections(s).notes.length,0);assert.equal(archiveCollections(s).works.length,0);s=act(s,{type:'week-fulfill',planId:s.weekly.plans.at(-1).id});assert.equal(archiveCollections(s).notes.length,1);assert.equal(archiveCollections(s).works.length,0);assert.match(renderArchiveCollection(s,'works'),/尚无已经整理成的作品/);
});
test('作品检索覆盖原文而不只标题，未命中的作品不出现',()=>{
 const s=rich();assert.equal(archiveCollections(s,'拿不定').works.length,1);assert.equal(archiveCollections(s,'不存在的作品词').works.length,0);assert.ok(!renderArchiveCollection(s,'works','不存在的作品词').includes('data-activity-entry='));
});
test('历史信物纪念与新物库存分开，不把旧奖励变成可重复赠送物',()=>{
 const s=rich(),x=archiveCollections(s),h=E.hash(s);assert.equal(x.keepsakes.length,1);assert.equal(x.items.length,1);assert.equal(x.items[0].giftId,'GF02');const t=Object.values(s.transcripts).find(t=>t.reward);assert.equal(x.keepsakes[0].text,t.reward.text);const html=renderArchiveCollection(s,'keepsakes');assert.match(html,/旧事中的信物与纪念/);assert.match(html,/新物的来去/);assert.ok(!html.includes('data-activity-buy='));assert.ok(!html.includes('data-person-activity="gift"'));assert.equal(E.hash(s),h);
});
test('已预留新物仍持有但不可再送，在途礼物不写成已收到',()=>{
 let s=rich(),id=s.weekly.activities.inventory[0].id;s=act(s,{type:'week-plan',kind:'gift',actor:'C02',itemId:id,date:{year:1,month:1,day:8},period:'evening'});assert.match(renderArchiveCollection(s,'keepsakes'),/已留给约定/);let sent=act(rich(),{type:'activity-gift-send',actor:'C02',itemId:id});const html=renderArchiveCollection(sent,'keepsakes');assert.match(html,/正在递送，尚未收到回执/);assert.ok(!html.includes('已送给苏培盛'));
});
test('存档原文按文本转义，作品和纪念中的HTML不能成为操作',()=>{
 const s=rich();s.weekly.activities.entries.find(e=>e.kind==='growth-result').text+='<img src=x onerror="bad()">';const t=Object.values(s.transcripts).find(t=>t.reward);t.reward.text+='<script>bad()</script>';const work=renderArchiveCollection(s,'works'),keep=renderArchiveCollection(s,'keepsakes');assert.ok(work.includes('&lt;img'));assert.ok(!work.includes('<img'));assert.ok(keep.includes('&lt;script&gt;'));assert.ok(!keep.includes('<script>'));
});
test('史册只按已发生记录统计，待办项目不提前成为成果或封卷',()=>{
 const s=rich(),raw=JSON.stringify(s),x=chronicleProgress(s);assert.equal(x.works,1);assert.equal(x.activities,3);assert.equal(x.main,2);assert.equal(x.relation,1);assert.equal(x.completedProjects,0);assert.equal(x.projects[0].status,'pending');assert.equal(s.ending,null);assert.match(renderChronicleProgress(s),/等回信到了/);assert.equal(JSON.stringify(s),raw);
});
test('补工前回报如实待修，补工后才列完成，历次失败与原报告保持',()=>{
 const a=needsRepair(),b=repaired(),old=JSON.stringify(b),first=chronicleProgress(a),last=chronicleProgress(b);assert.equal(first.repairProjects,1);assert.equal(first.completedProjects,0);assert.equal(last.completedProjects,1);assert.equal(last.repairProjects,0);assert.match(renderChronicleProgress(a),/仍待补做/);const p=b.weekly.projects.items['PR-WATER'];assert.ok(p.reports.length>=2);assert.equal(last.projects.find(p=>p.id==='PR-WATER').report.text,p.reports.at(-1).text);renderArchiveCollection(b,'keepsakes');assert.equal(JSON.stringify(b),old);
});
test('朝议首位材料取自已核原簿，实际选项及费用可见但不直接执行',()=>{
 const s=rich(),old=JSON.stringify(s),p=s.weekly.projects.items['PR-COURT'],html=renderProjects(s);assert.ok(html.includes(s.transcripts[p.evidence.at(-1).sourceEvent].dialogue));assert.match(html,/已留下的材料/);assert.match(html,/眼前可议的办法/);assert.match(html,/带教并写交接清单/);assert.match(html,/支出1点；七日核带教/);assert.match(html,/data-event="WG-C02"/);assert.ok(!html.includes('data-choice="plan-1"'));assert.equal(JSON.stringify(s),old);
});
test('已完成差事不再展示旧执行选项，原历史回报仍可重读',()=>{
 const s=repaired(),old=JSON.stringify(s),html=renderProjects(s);assert.match(html,/data-project-report="PR-WATER"/);assert.ok(!html.includes('data-event="WG-P02"'));assert.equal(JSON.stringify(s),old);
});
test('宫阙直达话题、真物与约期，未相见人物不获得可执行入口',()=>{
 const s=rich(),old=JSON.stringify(s),html=renderWeeklyPalace(s,ui);assert.match(html,/data-activity-box/);assert.match(html,/data-person-activity="chat" data-activity-actor="C02"/);assert.match(html,/data-person-activity="gift" data-activity-actor="C02"/);assert.match(html,/data-schedule="C02"/);assert.match(html,/data-activity-actor="C03" disabled/);assert.equal(JSON.stringify(s),old);
});
test('远任年羹尧走书信与话题，不把远处写成当面交谈',()=>{
 const s=choose(before.weekly.checkpoints.M11,'M11');assert.equal(E.canMeetOn(s,'C03',s.date),false);const html=renderWeeklyPalace(s,ui);assert.match(html,/data-person-activity="letter" data-activity-actor="C03"/);assert.ok(!html.includes('data-person-activity="chat" data-activity-actor="C03"'));assert.match(html,/写信与话题/);
});
test('封卷后保留人物和藏品重读，行动入口关闭，原结局文本不变',()=>{
 const s=load('docs/施工/证据/2026-10-25-S08-06/八周_work_封卷.json'),old=JSON.stringify(s.ending),html=renderWeeklyPalace(s,ui);assert.match(html,/data-person-activity="banquet" data-activity-actor="C01" disabled/);assert.match(html,/data-person="C02"/);renderChronicleProgress(s);renderArchiveCollection(s,'keepsakes');assert.equal(JSON.stringify(s.ending),old);
});
