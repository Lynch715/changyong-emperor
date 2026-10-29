import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../src/engine.js';
import {parseImport,exportSave} from '../src/storage.js';
import {archiveCollections,renderArchiveCollection,chronicleProgress,renderChronicleProgress} from '../src/archive-ui.js';
import {renderWeeklyPalace} from '../src/palace-ui.js';
import {renderProjects} from '../src/project-ui.js';
import {act,choose,before} from '../scripts/check-s08-06.mjs';
const __evidence=f=>{try{return f()}catch(e){if(e&&e.code==='ENOENT')return null;throw e}};

const load=p=>__evidence(()=>parseImport(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8')));
const rich=()=>load('docs/施工/证据/2026-10-26-S10-02/IAB_材料与藏品起点.json');
const repaired=()=>load('docs/施工/证据/2026-10-24-S04/民生补工暂停复办闭环_浏览器存档.json');
const needsRepair=()=>load('docs/施工/证据/2026-10-24-S04/民生临时点待补工_规则验收.json');
const ui={heading:(_a,title,sub)=>`<h1>${title}</h1><p>${sub}</p>`,monogram:c=>`<span>${c.sign}</span>`};

test('未履行的学习预约不变成作品或手记，单次练习也不提前补成作品',()=>{
 let s=choose(E.createWeeklyGame(),'M01');s=act(s,{type:'week-plan',kind:'study',actor:'C01',date:s.date,period:'day',exercise:'read'});assert.equal(archiveCollections(s).notes.length,0);assert.equal(archiveCollections(s).works.length,0);s=act(s,{type:'week-fulfill',planId:s.weekly.plans.at(-1).id});assert.equal(archiveCollections(s).notes.length,1);assert.equal(archiveCollections(s).works.length,0);assert.match(renderArchiveCollection(s,'works'),/尚无已经整理成的作品/);
});









test('远任年羹尧走书信与话题，不把远处写成当面交谈',()=>{
 const s=choose(before.weekly.checkpoints.M11,'M11');assert.equal(E.canMeetOn(s,'C03',s.date),false);const html=renderWeeklyPalace(s,ui);assert.match(html,/data-person-activity="letter" data-activity-actor="C03"/);assert.ok(!html.includes('data-person-activity="chat" data-activity-actor="C03"'));assert.match(html,/写信与话题/);
});

