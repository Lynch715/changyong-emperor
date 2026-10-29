import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {EVENTS} from '../src/content.js';
import {parseImport} from '../src/storage.js';
import {bridgeContext} from '../src/extension-bridge.js';
import {buildReactionContext,buildAIContext} from '../src/input.js';
const dir=fileURLToPath(new URL('../docs/施工/证据/2026-10-24-S08-04/',import.meta.url));
const read=n=>JSON.parse(fs.readFileSync(dir+n,'utf8')),save=n=>parseImport(fs.readFileSync(dir+n+'.json','utf8'));
const baseline=read('施工前剧情与分支基线.json'),report={version:'0.8.4',originalSlots:[],ui:[],protectedFiles:0,changedFiles:[]};
for(const world of ['周制','季度']){const before=read('原'+world+'档案_施工前.json'),after=read('原'+world+'档案_施工后.json');assert.deepEqual(after.records,before.records);for(const r of after.records){report.originalSlots.push({world,key:r.key,unchanged:true,sha256:r.raw===null?null:crypto.createHash('sha256').update(r.raw).digest('hex')});}}
assert.equal(report.originalSlots.length,16);
for(const [id,e]of Object.entries(baseline.events))if(!['M06','M11'].includes(id))assert.deepEqual(EVENTS[id],e,id);
const m06=[['M06_分别回应后_浏览器存档','open','none'],['M06_甄无意沈愿了解_浏览器存档','none','open'],['M06_双方未定_浏览器存档','unsure','unsure'],['M06_自由输入后_浏览器存档','open','unsure']];
for(const [name,c09,c10]of m06){const s=save(name);assert.equal(bridgeContext(s,'C09').playerIntent,c09);assert.equal(bridgeContext(s,'C10').playerIntent,c10);assert.equal(Object.keys(s.relations).length,7);assert.deepEqual(s.relations,baseline.weekly.checkpoints.M06.relations);assert.equal(s.remaining,6);assert.ok(!buildReactionContext(s,'C08','M06').reaction.establishedOutcome.includes('散后'));report.ui.push({name,source:'IAB page import, actual choice and page export',C09:c09,C10:c10,cost:baseline.weekly.checkpoints.M06.stats.treasury-s.stats.treasury});}
const first=save('M06_分别回应后_浏览器存档');
for(const [name,choice,intent]of [['M11_open_浏览器存档','open','open'],['M11_unsure_浏览器存档','unsure','unsure'],['M11_polite_浏览器存档','polite','none'],['M11_vague_浏览器存档','vague','open']]){const s=save(name);assert.equal(s.events.M11.outcomeId,choice);assert.equal(bridgeContext(s,'C09').playerIntent,intent);assert.equal(bridgeContext(s,'C10').playerIntent,'none');assert.deepEqual(s.transcripts.M06,first.transcripts.M06);if(choice==='vague'){assert.ok(bridgeContext(s,'C09').unresolvedGift);assert.equal(s.stats.treasury,save('M06实机记录_推进至M11起点').stats.treasury-2);}report.ui.push({name,event:'M11',choice,playerIntent:intent,npcConsent:bridgeContext(s,'C09').npcConsent});}
const old=save('weekly_M11_旧影原档'),next=save('M11_旧档接续clear_浏览器存档');for(const [id,t]of Object.entries(old.transcripts))assert.deepEqual(next.transcripts[id],t);assert.deepEqual(next.weekly.reports,old.weekly.reports);assert.deepEqual(next.ledger,old.ledger);assert.deepEqual(next.relations,old.relations);assert.equal(bridgeContext(next,'C09').playerIntent,'unspoken');report.ui.push({name:'M11_旧档接续clear',snapshotsPreserved:Object.keys(old.transcripts).length,reviewsPreserved:old.weekly.reports.length,originalLedgerPreserved:true,intent:'unspoken'});
const review=save('M06_收周回顾后_浏览器存档'),r=review.weekly.reports.find(r=>r.weekId==='W04').review;assert.ok(r.sources.some(x=>x.kind==='transcript'&&x.id==='M06'));assert.ok(r.passages.join(' ').includes(review.transcripts.M06.bridge[1].reply));report.ui.push({name:'actual week-end',reviewSource:'M06',remaining:review.remaining});
const end=save('实际封卷后_浏览器存档'),pre=save('实际含混赏赐_收至封卷前');assert.ok(end.sealed);assert.equal(end.weekly.monthly.length,24);assert.deepEqual(end.stats,pre.stats);assert.deepEqual(end.ledger,pre.ledger);assert.match(end.ending.passages.join(' '),/没有回答|未答/);assert.ok(!end.events['R05-02']?.completed);assert.ok(!end.ending.passages.join(' ').includes('两份旧谱收在一起'));assert.equal(bridgeContext(end,'C10').playerIntent,'none');report.ui.push({name:'actual seal',counts:end.ending.counts,monthly:24,statsAndLedgerUnchanged:true});
const files=read('施工前文件基线.json');for(const [p,h]of Object.entries(files)){if(!fs.existsSync(p)){throw Error('旧文件被移除：'+p);}const now=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');const protectedFile=/^(assets\/|design\/S01\/|docs\/施工\/证据\/)/.test(p)||/\.docx$/.test(p);if(protectedFile){assert.equal(now,h,p);report.protectedFiles++;}if(now!==h)report.changedFiles.push(p);}
const stages=fs.readFileSync('docs/施工/施工进度.md','utf8').split('\n').filter(l=>/^\| S\d+-\d+ \|/.test(l));report.progress={passed:stages.filter(l=>l.split('|')[2].trim()==='通过').length,total:stages.length};assert.deepEqual(report.progress,{passed:52,total:98});
fs.writeFileSync(dir+'验收汇总.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
