import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {EVENTS} from '../src/content.js';
import {parseImport} from '../src/storage.js';
import {buildAIContext} from '../src/input.js';
import {incenseKnowledge} from '../src/incense.js';
import {ordinal} from '../src/calendar.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const dir=path.join(root,'docs/施工/证据/2026-10-25-S08-05/');
const read=n=>JSON.parse(fs.readFileSync(dir+n,'utf8'));
const save=n=>parseImport(fs.readFileSync(dir+n+'.json','utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const before=read('施工前剧情与规则基线.json');
const report={version:'0.8.5',originalSlots:[],ui:[],protectedFiles:0,changedFiles:[],links:0};

for(const world of ['周制','季度']){
 const a=read('原'+world+'档案_施工前.json'),b=read('原'+world+'档案_施工后.json');
 assert.deepEqual(b.records,a.records);
 for(const r of b.records)report.originalSlots.push({world,key:r.key,unchanged:true,sha256:r.raw===null?null:sha(r.raw)});
}
assert.equal(report.originalSlots.length,16);
for(const [id,e] of Object.entries(before.events)){
 if(id==='G01'){const {sceneVisible:oldVisible,...old}=e,{sceneVisible:newVisible,...current}=EVENTS[id];assert.deepEqual(current,old,id);assert.ok(oldVisible.includes('前世'));assert.ok(!newVisible.includes('前世'));}
 else assert.deepEqual(EVENTS[id],e,id);
}
const stop=save('暗停_实际合作补谈后_浏览器存档');
const unread=save('连续实走_七日未读_浏览器存档');
const privateRead=save('连续实走_私阅未分享_浏览器存档');
const shared=save('连续实走_副单已分享_浏览器存档');
const ended=save('连续实走_收周后_浏览器存档');
const isPrefix=(earlier,later)=>assert.deepEqual(later.transactions.slice(0,earlier.transactions.length),earlier.transactions);
for(const [a,b] of [[stop,unread],[unread,privateRead],[privateRead,shared],[shared,ended]])isPrefix(a,b);
assert.equal(stop.events.M03.outcomeId,'quiet');assert.equal(stop.events['R07-01'].outcomeId,'work');
assert.deepEqual(unread.incenseCase.request.date,{year:1,month:4,day:2});
assert.deepEqual(unread.incenseCase.arrivedAt,{year:1,month:4,day:9});
assert.equal(ordinal(unread.incenseCase.request.dueDate)-ordinal(unread.incenseCase.request.date),7);
assert.equal(unread.incenseCase.review,null);assert.equal(unread.incenseCase.shared,null);
assert.equal(privateRead.incenseCase.shared,null);assert.deepEqual(privateRead.incenseCase.review.date,privateRead.date);
for(const key of ['stats','relations','facts','ledger']){assert.deepEqual(privateRead[key],unread[key]);assert.deepEqual(shared[key],privateRead[key]);}
assert.equal(privateRead.transactions.at(-1).results[0].actionCost,0);
assert.equal(shared.transactions.at(-1).results[0].actionCost,1);assert.equal(shared.remaining,5);
for(const s of [unread,privateRead])assert.equal(incenseKnowledge(s,'C07').report,null);
assert.ok(incenseKnowledge(shared,'C07').report);assert.equal(incenseKnowledge(shared,'C19').report,null);
assert.equal(incenseKnowledge(shared,'C04'),null);assert.equal(incenseKnowledge(shared,'C06'),null);
assert.ok(!buildAIContext(privateRead,'C07',null).facts.some(f=>f.id==='IC-INCENSE-REPORT-C07'));
assert.ok(buildAIContext(shared,'C07',null).facts.some(f=>f.id==='IC-INCENSE-REPORT-C07'));
const review=ended.weekly.reports.find(r=>r.weekId==='X2');assert.equal(review.used,1);
assert.ok(review.review.sources.some(x=>x.kind==='incense'&&x.id==='review'));
assert.ok(review.review.sources.some(x=>x.kind==='incense'&&x.id==='shared'));
assert.deepEqual(ended.date,{year:1,month:4,day:16});
report.ui.push({name:'连续4月2日至16日',source:'IAB actual choices, dates and exported transaction prefixes',reportDue:unread.incenseCase.request.dueDate,arrivedUnread:true,privateReadCost:0,separateShareCost:1,endWeekUsed:1,reportUnknownUntilActualShare:true});

for(const [n,p,t]of [['先核验_实际距离后_浏览器存档','sample','distance'],['先说明_实际相谈后_浏览器存档','explain','warm']]){
 const s=save(n);assert.equal(s.events.M03.outcomeId,p);assert.equal(s.events['R07-01'].outcomeId,t);assert.equal(s.incenseCase.review,null);assert.ok(s.transcripts['R07-01'].dialogue.length>100);report.ui.push({name:n,path:p,tone:t,reportNotInvented:true});
}
const sameBefore=save('同场副单分享前'),sameAfter=save('同场分享后_浏览器存档');
for(const key of ['stats','relations','facts','ledger','remaining'])assert.deepEqual(sameAfter[key],sameBefore[key]);
assert.equal(sameAfter.incenseCase.shared.cost,0);isPrefix(sameBefore,sameAfter);
report.ui.push({name:'同场分享',actualShareCost:0,statsRelationsAndLedgerUnchanged:true});
const preview=save('已阅回单_相谈前'),cancelled=save('相谈副单_取消预览后_浏览器存档'),committed=save('相谈副单_实际展示后_浏览器存档');
const {revision:pv,sceneDates:pd,...previewState}=preview,{revision:cv,sceneDates:cd,...cancelState}=cancelled;assert.deepEqual(cancelState,previewState);assert.equal(cv,pv+1);assert.deepEqual(cd,{...pd,'R07-02':preview.date});assert.equal(cancelled.incenseCase.shared,null);
assert.equal(committed.incenseCase.shared.via,'R07-02');assert.equal(committed.remaining,cancelled.remaining-1);
assert.match(committed.transcripts['R07-02'].dialogue,/真正收到的副单/);
report.ui.push({name:'相谈展示副单',cancelDoesNotSubmit:true,sceneEntryOnly:{revisionDelta:1,date:cancelled.date},sharedVia:'R07-02',cost:1});

const legacy=save('旧跨季暗停_只读起点'),readonly=save('旧跨季_只读后_浏览器存档'),continued=save('旧跨季_接续交办后_浏览器存档');
assert.deepEqual(readonly,legacy);assert.ok(!Object.hasOwn(readonly,'incenseCase'));
for(const key of ['date','remaining','transcripts','facts','ledger','relations'])assert.deepEqual(continued[key],legacy[key]);
assert.deepEqual(continued.weekly.reports,legacy.weekly.reports);assert.equal(continued.incenseCase.sample,'unrecorded');
assert.deepEqual(continued.incenseCase.request.date,{year:1,month:7,day:2});assert.deepEqual(continued.incenseCase.request.dueDate,{year:1,month:7,day:9});
assert.equal(continued.incenseCase.arrivedAt,null);assert.equal(continued.incenseCase.review,null);
assert.ok(!JSON.stringify(buildAIContext(continued,'C07',null)).includes(continued.incenseCase.request.transactionId));
report.ui.push({name:'旧跨季档',readOnlyStateIdentical:true,snapshotsPreserved:Object.keys(legacy.transcripts).length,reviewsPreserved:legacy.weekly.reports.length,sourceDate:continued.date,due:continued.incenseCase.request.dueDate,sample:'unrecorded'});

for(const [p,h]of Object.entries(read('施工前文件基线.json'))){
 const full=path.join(root,p);assert.ok(fs.existsSync(full),'旧文件缺失：'+p);const now=sha(fs.readFileSync(full));
 if(/^(assets\/|design\/S01\/|docs\/施工\/证据\/)/.test(p)||/\.docx$/.test(p)){assert.equal(now,h,p);report.protectedFiles++;}
 if(now!==h)report.changedFiles.push(p);
}
const stages=fs.readFileSync(path.join(root,'docs/施工/施工进度.md'),'utf8').split('\n').filter(l=>/^\| S\d+-\d+ \|/.test(l));
report.progress={passed:stages.filter(l=>l.split('|')[2].trim()==='通过').length,total:stages.length};assert.deepEqual(report.progress,{passed:53,total:98});
const docs=['README.md','docs/施工/施工进度.md','docs/施工/S08-05前世线索本世证据与停香路径施工与验收_2026-10-25.md','design/S08/前世线索本世证据与停香路径矩阵.md'];
for(const p of docs){const full=path.join(root,p),text=fs.readFileSync(full,'utf8');for(const m of text.matchAll(/\]\(([^)]+)\)/g)){const target=m[1].replace(/^<|>$/g,'').split('#')[0];if(!target||/^[a-z]+:/.test(target))continue;assert.ok(fs.existsSync(path.resolve(path.dirname(full),target)),p+' -> '+target);report.links++;}}
report.browserLogs=read('浏览器日志.json').logs;assert.equal(report.browserLogs.length,0);
fs.writeFileSync(dir+'验收汇总.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
