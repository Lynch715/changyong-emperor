import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';import path from 'node:path';
import * as E from '../src/engine.js';import {parseImport} from '../src/storage.js';import {usedSlots} from '../src/week.js';
const root=fileURLToPath(new URL('../',import.meta.url)),dir=path.join(root,'docs/施工/证据/2026-10-26-S13-01/'),read=n=>JSON.parse(fs.readFileSync(dir+n,'utf8'));
const baseline=read('施工前文件基线.json'),changed=[],missing=[];
for(const [p,h]of Object.entries(baseline)){const f=path.join(root,p);if(!fs.existsSync(f))missing.push(p);else if(createHash('sha256').update(fs.readFileSync(f)).digest('hex')!==h)changed.push(p);}
assert.deepEqual(missing,[]);assert.ok(changed.every(p=>['README.md','docs/施工/施工进度.md'].includes(p)),changed.join('\n'));
const archives=Object.fromEntries(fs.readdirSync(dir).filter(n=>/^浏览器_.+八槽.json$/.test(n)).map(n=>[n,read(n)])),base=archives['浏览器_合作封卷前八槽.json'];let validated=0;
const state=a=>JSON.parse(a.records[0].raw).state;
for(const a of Object.values(archives)){assert.equal(a.records.length,8);for(const r of a.records)if(r.raw){E.validateSave(JSON.parse(r.raw).state);validated++;}for(let i=3;i<8;i++)assert.equal(a.records[i].raw,base.records[i].raw);}
assert.deepEqual(base.records,archives['浏览器_取消封卷八槽.json'].records);
for(const label of ['合作','发展']){
 const before=state(archives[`浏览器_${label}封卷前八槽.json`]),after=state(archives[`浏览器_${label}封卷后八槽.json`]);
 assert.equal(before.sealed,false);assert.equal(after.sealed,true);assert.equal(after.transactions.length,before.transactions.length+1);
 for(const key of ['transcripts','ledger','weekly','relations','extensionRoutes'])assert.deepEqual(after[key],before[key]);
 assert.equal(after.stats.treasury,114);assert.equal(after.weekly.monthly.length,24);assert.deepEqual(after.ending.counts,{main:12,relation:14,government:12,side:4,extension:4});
 assert.equal(after.weekly.weeks.reduce((n,w)=>n+usedSlots(after,w.id),0),35);
 const final=archives[`浏览器_${label}${label==='合作'?'重读':''}刷新后八槽.json`];assert.deepEqual(final.records,archives[`浏览器_${label}封卷后八槽.json`].records);
 const s=parseImport(fs.readFileSync(dir+label+'_封卷.json','utf8')),j=read(label+'_逐笔路径.json'),coverage=read(label+'_排程与覆盖.json');
 assert.equal(j.length,168);assert.equal(s.transactions.length,j.length);assert.equal(coverage.requiredIds.length,55);
 assert.equal(new Set(j.map(x=>x.transactionId)).size,j.length);assert.ok(j.every((x,i)=>i===0||x.clock>=j[i-1].clock));
 assert.equal(s.weekly.weeks.length,8);assert.ok(Object.values(s.weekly.projects.items).every(p=>p.status==='completed'));
}
const views=read('浏览器_六视口.json');assert.equal(views.length,6);assert.ok(views.every(v=>v.width===v.scrollWidth&&v.modalScroll<=v.modalWidth));assert.deepEqual(read('浏览器_控制台.json'),[]);
const log=fs.readFileSync(dir+'全量最终.txt','utf8');assert.match(log,/tests 814/);assert.match(log,/pass 814/);assert.match(log,/fail 0/);
const result={version:'0.12.4',storyVersion:14,task:'S13-01',status:'通过',paths:2,transactionsPerPath:168,logicalUnits:55,focusWeeks:8,extensionWeeks:0,usedSlots:35,totalSlots:48,monthlyPerPath:24,tests:814,newIntegrationTests:2,baselineFiles:Object.keys(baseline).length,changed,unchanged:Object.keys(baseline).length-changed.length,missing,images:Object.keys(baseline).filter(p=>p.startsWith('assets/')&&/\.(png|jpe?g|webp)$/i.test(p)).length,wordFiles:Object.keys(baseline).filter(p=>p.endsWith('.docx')).length,browser:{origin:'http://127.0.0.1:5238',archiveFiles:Object.keys(archives).length,validatedStates:validated,cancelUnchanged:true,readReloadUnchanged:true,fiveLegacySlotsUnchanged:true,viewports:views,consoleErrors:0,scope:'连续规则路径的终点载入、取消、封卷、重读、刷新和六视口；非浏览器从开局逐步通关'},remaining:['S13-02 六类玩法组合','S13-03 更完整的采购、赠礼、宴请、修复连续核账','S13-04 逐周回报与期待来源','S13-05 全程浏览器与真实环境验证','S13-06 交付保护','S12-04后期部分、S14及S15']};
fs.writeFileSync(dir+'验收与保护核对.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
