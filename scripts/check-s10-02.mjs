import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as E from '../src/engine.js';
import {CHARACTERS,NAMES,STAT_NAMES,VERSION} from '../src/content.js';
import {STORY_VERSION} from '../src/story.js';
import {parseImport,exportSave} from '../src/storage.js';
import {preferenceActive} from '../src/memory-book.js';
import {archiveCollections,chronicleProgress} from '../src/archive-ui.js';
const root=fileURLToPath(new URL('../',import.meta.url)),dir=path.join(root,'docs/施工/证据/2026-10-26-S10-02/');
const read=p=>fs.readFileSync(path.join(root,p),'utf8'),json=n=>JSON.parse(fs.readFileSync(dir+n+'.json','utf8'));
const save=n=>parseImport(fs.readFileSync(dir+n+'.json','utf8'));
const base=json('施工前文件基线'),changed=[],protectedFiles=[];
for(const[p,h]of Object.entries(base))(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')===h?protectedFiles:changed).push(p);
const allowed=['styles.css','package.json','src/content.js','src/project-ui.js','src/app.js','README.md','docs/施工/施工进度.md'];
assert.equal(Object.keys(base).length,1270);assert.deepEqual(changed.sort(),allowed.sort());assert.equal(protectedFiles.filter(p=>p.endsWith('.docx')).length,5);assert.equal(protectedFiles.filter(p=>p.startsWith('assets/')).length,3);
const old=p=>execFileSync('tar',['-xOf',dir+'施工前源码与设计.tar.gz',p],{encoding:'utf8'});
assert.equal(read('src/content.js'),old('src/content.js').replace("VERSION = '0.10.1'","VERSION = '0.10.2'"));
const archives=[],quarterStates=[];
for(const name of ['原周制档案','原季度档案']){
 const before=json(name+'_施工前'),after=json(name+'_施工后');assert.equal(before.records.length,8);assert.deepEqual(after.records,before.records);assert.ok(after.exportedAt>before.exportedAt);
 let populated=0;for(const r of after.records)if(r.raw){const s=parseImport(r.raw);populated++;if(name==='原季度档案')quarterStates.push(s);}
 archives.push({world:name,slots:8,populated,keyAndRawEqual:true,before:before.exportedAt,after:after.exportedAt});
}
function extract(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a);return source.slice(a,b).trim();}
const beforeApp=old('src/app.js'),afterApp=read('src/app.js'),quarterCases=[];
const functions=[['renderQuarterCourt','function renderQuarterCourt(','\nfunction renderPalace('],['renderPalace','function renderPalace(','\nfunction renderPeople('],['renderJournal','function renderJournal(','\nfunction renderChronicle('],['renderChronicle','function renderChronicle(','\nfunction renderSettings(']];
const helpers={isWeekly:s=>!!s.weekly,CHARACTERS,NAMES,STAT_NAMES,actorPlace:E.actorPlace,actorUnlocked:E.actorUnlocked,dateText:E.dateText,requiredEvents:E.requiredEvents,availableEvents:E.availableEvents,preferenceActive,factReaders:E.factReaders,heading:(_e,t,sub,right='')=>`<h1>${t}</h1><p>${sub}</p>${right}`,tag:(t,c='')=>`<tag class="${c}">${t}</tag>`,button:(t,a,c='',x='')=>`<button data-action="${a}" class="${c}" ${x}>${t}</button>`,monogram:c=>`<span>${c.sign}</span>`,empty:(t,x)=>`<p>${t}|${x}</p>`,esc:x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),eventCard:e=>`<event>${e.id}|${e.title}</event>`};
for(const [name,start,end]of functions){const oldFunction=extract(beforeApp,start,end),newFunction=extract(afterApp,start,end);if(name==='renderQuarterCourt')assert.equal(newFunction,oldFunction);
 for(const [i,state]of quarterStates.entries())for(const tab of name==='renderJournal'?['events','dialogue','memories','facts']:['events']){
  const context={...helpers,state,journalTab:tab,journalSearch:''};const a=vm.runInNewContext('('+oldFunction+')()',context),b=vm.runInNewContext('('+newFunction+')()',context);assert.equal(b,a,`${name}:${i}:${tab}`);quarterCases.push(`${name}:${i}:${tab}`);
 }
}
const fromArchive=name=>{const pack=json(name);assert.equal(pack.records.length,8);const record=pack.records.find(r=>r.key==='changyong-week-s02-auto');assert.ok(record?.raw);return parseImport(record.raw);};
const richStart=save('IAB_材料与藏品起点'),richEnd=fromArchive('IAB_材料与藏品最终档案');assert.deepEqual(richEnd,E.enterScene(richStart,'WG-C02'));assert.equal(richEnd.transactions.length,12);assert.equal(richEnd.stats.treasury,59);assert.equal(richEnd.remaining,3);
for(const key of ['transcripts','messages','ledger','relations','facts','flags','weekly','transactions'])assert.deepEqual(richEnd[key],richStart[key]);
const oldStart=save('IAB_历史回报起点'),oldEnd=fromArchive('IAB_历史回报最终档案');assert.deepEqual(oldEnd,oldStart);assert.equal(oldEnd.stats.treasury,77);
for(const s of [richEnd,oldEnd])assert.deepEqual(parseImport(exportSave(s)),s);
const collections=archiveCollections(richEnd);assert.equal(collections.works.length,1);assert.equal(collections.notes.length,3);assert.equal(collections.keepsakes.length,1);assert.equal(collections.items.length,1);assert.equal(collections.items[0].status,'held');assert.equal(chronicleProgress(richEnd).completedProjects,0);assert.equal(chronicleProgress(oldEnd).completedProjects,1);
const ax=n=>fs.readFileSync(dir+n+'_AX.txt','utf8');
assert.match(ax('朝议_材料与办法'),/已留下的材料[\s\S]*圈出夜三更[\s\S]*眼前可议的办法[\s\S]*支出1点/);
assert.match(ax('朝议_费用核对未执行'),/本场 1 格[\s\S]*国库支出 1 点/);
assert.match(ax('宫阙_话题表单'),/Value: 交谈[\s\S]*Value: 苏培盛[\s\S]*想说什么/);
assert.match(ax('宫阙_实际新物'),/铜制暖手炉[\s\S]*正式登门/);
assert.match(ax('宫阙_约期表单'),/Value: 会面[\s\S]*Value: 苏培盛/);
assert.match(ax('宫阙_宾客与主题'),/小宴主题[\s\S]*诗曲小宴/);
assert.match(ax('作品_正文检索'),/Value: 拿不定[\s\S]*一册有自己批注的读书小札/);
assert.match(ax('纪念与新物_分开保留'),/留茶 · 共事有了默契[\s\S]*新物的来去[\s\S]*铜制暖手炉[\s\S]*尚未送出/);
assert.match(ax('史册_未冒算成果'),/主线 2 幕，相知 1 幕[\s\S]*回报到案后/);
assert.match(ax('史册_旧档实际回报'),/1 项已完成，0 项仍待补做/);
assert.ok(ax('旧回报_全文保持').includes(oldEnd.weekly.projects.items['PR-WATER'].reports.at(-1).text));
for(const n of ['材料档_零模型调用','旧档_零模型调用'])assert.match(ax(n),/今日 0 次调用[\s\S]*失败 0 次/);
const layouts=json('四页桌面布局');assert.equal(layouts.length,4);for(const l of layouts){assert.equal(l.width,1280);assert.equal(l.height,720);assert.equal(l.scrollWidth,l.width);}
for(const n of ['宫阙直接入口','作品入口','旧档回报全文'])assert.equal(fs.readFileSync(dir+n+'_IAB.jpg').subarray(0,3).toString('hex'),'ffd8ff');
const rows=[...read('docs/施工/施工进度.md').matchAll(/^\| (S\d+-\d+) \| ([^|]+) \|/gm)];assert.equal(rows.length,98);assert.equal(rows.filter(x=>x[2].trim()==='通过').length,63);assert.equal(rows.find(x=>x[1]==='S10-02')[2].trim(),'通过');assert.equal(rows.find(x=>x[1]==='S10-03')[2].trim(),'未开始');
assert.equal(VERSION,'0.10.2');assert.equal(JSON.parse(read('package.json')).version,VERSION);assert.equal(STORY_VERSION,9);
assert.match(fs.readFileSync(dir+'入口与藏品专项.txt','utf8'),/tests 13[\s\S]*pass 13[\s\S]*fail 0/);assert.match(fs.readFileSync(dir+'最终自动测试.txt','utf8'),/tests 647[\s\S]*pass 647[\s\S]*fail 0/);
const result={version:VERSION,storyVersion:STORY_VERSION,baselineFiles:1270,changedOriginal:changed,protectedUnchanged:protectedFiles.length,wordUnchanged:5,artUnchanged:3,archives,quarterRenderCases:quarterCases.length,quarterRenderEqual:true,browser:{origin:'http://127.0.0.1:5210',layouts,modelCalls:0,rich:{transactions:12,treasury:59,remaining:3,onlyChange:'enterScene WG-C02: revision +1 and sceneDates',allRuleAndNarrativeFieldsEqual:true,works:1,notes:3,keepsakes:1,heldItems:1},historical:{stateFullyEqual:true,treasury:77,completedProjects:1,originalReportEqual:true},roundTripEqual:true},tests:647,newCollectionTests:13,tasks:'63/98; next S10-03',notVerified:['mobile-viewport-this-phase','physical-phone','soft-keyboard','full-keyboard-acceptance','real-provider-api','full-browser-two-year-playthrough']};
fs.writeFileSync(dir+'保护与实走核验.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
