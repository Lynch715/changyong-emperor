import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as E from '../src/engine.js';
import {requiredIds} from './s13-01-scenarios.mjs';
import {reconcile} from './s13-03-accounting.mjs';
import {auditReviews} from './s13-04-scenarios.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const dir=path.join(root,'docs/施工/证据/2026-10-27-S13-05/');
const read=n=>JSON.parse(fs.readFileSync(dir+n,'utf8'));
const baseline=read('施工前文件基线.json'),changed=[],missing=[];
const allowed=new Set(['README.md','design/S13/README.md','docs/施工/施工进度.md']);
for(const [p,h] of Object.entries(baseline)){
 const f=path.join(root,p);
 if(!fs.existsSync(f))missing.push(p);
 else if(createHash('sha256').update(fs.readFileSync(f)).digest('hex')!==h)changed.push(p);
}
assert.deepEqual(missing,[]);assert.ok(changed.every(p=>allowed.has(p)),changed.join('\n'));
const names=['新档起点','元年冬','二年春','封卷前','封卷后','刷新后','重读后','全部重读后'];
const archives=names.map(n=>read(`浏览器_${n}八槽.json`));
const states=archives.map(a=>E.validateSave(JSON.parse(a.records[0].raw).state));
const initial=states[0],final=states[4];let validatedStates=0;
assert.equal(initial.revision,0);assert.equal(initial.transactions.length,0);assert.deepEqual(initial.events,{});
const frozen={},frozenReports=[];
for(let index=0;index<archives.length;index++){
 const a=archives[index],s=states[index];assert.equal(a.records.length,8);assert.equal(s.gameId,initial.gameId);
 for(const r of a.records)if(r.raw){E.validateSave(JSON.parse(r.raw).state);validatedStates++;}
 for(let i=3;i<8;i++)assert.equal(a.records[i].raw,archives[0].records[i].raw,`manual slot ${i}`);
 assert.notEqual(s.gameId,JSON.parse(a.records[3].raw).state.gameId,'new route loaded the seeded old game');
 assert.deepEqual(s.transactions.slice(0,initial.transactions.length),initial.transactions);
 for(const [id,text] of Object.entries(frozen))assert.equal(JSON.stringify(s.transcripts[id]),text,`prose changed ${id}`);
 for(const [id,t] of Object.entries(s.transcripts))frozen[id]??=JSON.stringify(t);
 for(let i=0;i<frozenReports.length;i++)assert.equal(JSON.stringify(s.weekly.reports[i]),frozenReports[i]);
 for(let i=frozenReports.length;i<s.weekly.reports.length;i++)frozenReports.push(JSON.stringify(s.weekly.reports[i]));
 reconcile(s);
 if(index>0)assert.deepEqual(s.transactions.slice(0,states[index-1].transactions.length),states[index-1].transactions);
}
for(const a of archives.slice(5))assert.deepEqual(a.records,archives[4].records,'refresh/read mutated saved records');
const completed=new Set(Object.entries(final.events).filter(([,v])=>v.completed).map(([id])=>id.split('@')[0]));
assert.equal(completed.size,54);assert.equal(final.ending.id,'F00');assert.equal(final.sealed,true);completed.add('F00');
assert.ok(requiredIds.every(id=>completed.has(id)));assert.equal(requiredIds.length,55);
assert.equal(final.weekly.monthly.length,24);assert.deepEqual(final.ending.pending,[]);
assert.equal(Object.values(final.weekly.projects.items).filter(p=>p.status==='completed').length,4);
const scenePlan=final.weekly.plans.find(p=>p.eventId==='R05-02');assert.equal(scenePlan.status,'completed');
assert.deepEqual(scenePlan.date,{year:2,month:8,day:2});
const reads=read('浏览器_54幕重读正文.json'),normal=s=>s.replace(/\s+/g,'');assert.equal(reads.length,54);
assert.equal(new Set(reads.map(r=>r.id)).size,54);
for(const r of reads){const t=final.transcripts[r.id];assert.ok(t);assert.ok(normal(r.text).includes(normal(t.dialogue)),`rendered dialogue ${r.id}`);assert.ok(normal(r.text).includes(normal(t.choice)));}
const reviews=auditReviews(final),weekReads=read('浏览器_九周重读正文.json');assert.equal(reviews.length,9);assert.equal(weekReads.length,9);
for(const r of weekReads){assert.ok(reviews.some(w=>w.week===r.id));assert.match(r.text,/接下来，仍有一页/);}
const views=read('浏览器_六视口.json');assert.equal(views.length,6);
for(const v of views)assert.ok(v.scrollWidth<=v.width&&v.left>=0&&v.right<=v.width&&v.top>=0&&v.bottom<=v.height&&v.footerBottom<=v.height);
assert.deepEqual(read('浏览器_控制台.json'),[]);
const tests=fs.readFileSync(dir+'全量最终.txt','utf8');assert.match(tests,/tests 831/);assert.match(tests,/pass 831/);assert.match(tests,/fail 0/);
const environment=read('真实环境状态.json');assert.equal(environment.realProviderRequest,false);
fs.writeFileSync(dir+'实际路径逐周来源.json',JSON.stringify(reviews,null,2));
const result={date:'2026-10-27',task:'S13-05',status:'通过（本地范围）',version:'0.13.0',storyVersion:15,tests:831,runtimeChanges:0,
 browser:{origin:'http://127.0.0.1:5246',freshGame:true,startRevision:initial.revision,finalRevision:final.revision,units:completed.size,transactions:final.transactions.length,monthly:24,reviews:9,extensionWeeks:1,readScenes:54,readWeeks:9,archiveFiles:archives.length,validatedStates,fiveManualSlotsUnchanged:true,refreshReadUnchanged:true,viewports:views.map(({text,...v})=>v),consoleErrors:0},
 accounting:reconcile(final),protection:{baselineFiles:Object.keys(baseline).length,changed,unchanged:Object.keys(baseline).length-changed.length,missing,images:Object.keys(baseline).filter(p=>p.startsWith('assets/')&&/\.(png|jpe?g|webp)$/i.test(p)).length,wordFiles:Object.keys(baseline).filter(p=>p.endsWith('.docx')).length,allOldEvidenceUnchanged:true},environment,
 limitations:['真实API未配置，本轮固定文本模式，模拟代理测试不等于真实模型验收','六视口为桌面浏览器模拟，实体手机与原生输入法未验','UI记录器两次执行超时后重新连接同一标签，部分逐点击日志缺失；独立新档、阶段八槽、完整136事务及54幕原文均保留','未新增独立生活活动；完整生活／修复／通信组合见S13-02至04及本次全量回归'],next:'S13-06交付保护与恢复说明'};
fs.writeFileSync(dir+'验收与保护核对.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
