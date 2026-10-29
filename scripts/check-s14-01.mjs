import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{createHash}from'node:crypto';import{fileURLToPath}from'node:url';
import{auditLongtermPlan,planAdultDecision}from'./s14-01-audit.mjs';import{ordinal,stamp}from'../src/calendar.js';import * as E from '../src/engine.js';
const root=fileURLToPath(new URL('../',import.meta.url)),dir=path.join(root,'docs/施工/证据/2026-10-27-S14-01/');
const read=p=>JSON.parse(fs.readFileSync(root+p,'utf8')),local=n=>JSON.parse(fs.readFileSync(dir+n,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const plan=read('design/S14/长期周排程.json'),mapping=read('design/S14/后期事件映射.json'),registry=read('design/S01/事件总表.json').events;
const baseline=local('施工前文件基线.json'),changed=[],missing=[],allowed=new Set(['README.md','docs/施工/施工进度.md']);
for(const[p,v]of Object.entries(baseline)){if(!fs.existsSync(root+p))missing.push(p);else if(sha(fs.readFileSync(root+p))!==v.sha256)changed.push(p);}
assert.deepEqual(missing,[]);assert.ok(changed.every(p=>allowed.has(p)),changed.join('\n'));
for(const source of plan.sources)assert.equal(sha(fs.readFileSync(root+source.path)),source.sha256);
const audit=auditLongtermPlan(plan,mapping,registry);const birthCases=[];
const asDate=a=>({year:a[0],month:a[1],day:a[2]});
const items=[...mapping.events,...mapping.events.flatMap(e=>e.stages||[]),...plan.companions].filter(x=>x.slots&&x.recommended);
let eligible=0,pending=0,maxUsedWithAdult=audit.maxUsedInWeek;
for(const y of [3,5,6,12,13])for(const month of [1,4,10,12])for(const day of [1,2,4,15,30]){
 const birth=[y,month,day],r=planAdultDecision(plan,mapping,birth);assert.equal(r.blocksM34,false);
 if(r.status==='eligible-not-executed'){
  eligible++;assert.ok(ordinal(r.date)-ordinal(asDate(birth))>=6480);assert.ok(ordinal(r.date)<=ordinal(asDate([30,12,30])));assert.equal(r.slots+r.p12ExtraSlots,1);
  const w=plan.weeks.find(w=>ordinal(r.date)>=ordinal(asDate(w.start))&&ordinal(r.date)<=ordinal(asDate(w.end)));assert.ok(w);
  const paid=items.filter(x=>x.focusWeek===w.id);assert.ok(paid.every(x=>stamp(asDate(x.recommended),x.period||'day')!==stamp(r.date,r.period)),'birthday collision');
  const used=paid.reduce((n,x)=>n+x.slots,0)+1;assert.ok(used<=6);maxUsedWithAdult=Math.max(maxUsedWithAdult,used);
 }else{pending++;assert.equal(r.status,'pending-after-year30');}
 birthCases.push({birth,...r});
}
const noChild=planAdultDecision(plan,mapping,null),declined=planAdultDecision(plan,mapping,[5,10,2],{willing:false});assert.equal(noChild.status,'not-applicable');assert.equal(declined.status,'declined-or-not-ready');
fs.writeFileSync(dir+'成年与双入口样例.json',JSON.stringify({status:'static-not-game-execution',eligible,pending,noChild,declined,maxUsedWithAdult,cases:birthCases},null,2));
fs.writeFileSync(dir+'静态排程与容量.json',JSON.stringify(audit,null,2));
// Read existing isolated evidence only; validation may not mutate prose or source envelopes.
let states=0;for(const p of [...Object.keys(baseline).filter(p=>/^docs\/施工\/证据\/2026-10-27-S13-06\/浏览器_.+八槽\.json$/.test(p)),'docs/施工/证据/2026-10-24-S02/原5173季度档_只读复核.json']){
 const archive=read(p);for(const r of archive.records)if(r.raw){const s=JSON.parse(r.raw).state,before=JSON.stringify(s),validated=E.validateSave(s);assert.equal(JSON.stringify(s),before);assert.deepEqual(validated.transcripts,s.transcripts);assert.deepEqual(validated.ending,s.ending);if(s.weekly)assert.deepEqual(validated.weekly.reports,s.weekly.reports);states++;}
}
const hashes=fs.readFileSync(root+'output/S13-06交付_20261027/SHA256SUMS.txt','utf8').trim().split('\n');for(const row of hashes){const [hash,name]=row.split('  ');assert.equal(sha(fs.readFileSync(root+'output/S13-06交付_20261027/'+name)),hash);}
const tests=fs.readFileSync(dir+'全量最终.txt','utf8'),special=fs.readFileSync(dir+'排程专项.txt','utf8');assert.match(tests,/tests 849/);assert.match(tests,/pass 849/);assert.match(tests,/fail 0/);assert.match(special,/tests 13/);assert.match(special,/pass 13/);
const progress=fs.readFileSync(root+'docs/施工/施工进度.md','utf8').split('\n').filter(l=>/^\| S\d\d-\d\d \|/.test(l));assert.equal(progress.length,98);assert.equal(progress.filter(l=>l.split('|')[2].trim().startsWith('通过')).length,85);
const result={date:'2026-10-27',task:'S14-01',status:'通过（排程设计）',runtimeVersion:'0.13.0',storyVersion:15,runtimeChanges:0,scope:'周排程、事件映射及静态约束；不是三十年运行通关',progress:{passed:85,total:98},tests:849,newStaticTests:13,calendar:audit,parenthood:{cases:birthCases.length,eligible,pending,noChild: noChild.status,declined:declined.status,maxUsedWithAdult,sharedCost:1,mainPackagesWithAdult:2},protection:{baselineFiles:Object.keys(baseline).length,changed,unchanged:Object.keys(baseline).length-changed.length,missing,images:Object.keys(baseline).filter(p=>p.startsWith('assets/')&&/\.(png|jpe?g|webp)$/i.test(p)).length,wordFiles:Object.keys(baseline).filter(p=>p.endsWith('.docx')).length,validatedExistingStates:states,oldRollbackAndDeliveryPackagesUnchanged:true,actualPlayerStorageTouched:false,oldEvidenceAndHistoryUnchanged:true},unverified:['三至三十年运行引擎和正文待S14-02起逐卷接入','长期数值与多路线可达性仍待实际运行验收','S12-04后期正文与最终史册未关闭','真实API、实体手机和原生输入法未验'],next:'S14-02第三卷排程大纲、运行接续与逐卷施工',published:false};
fs.writeFileSync(dir+'验收与保护核对.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
