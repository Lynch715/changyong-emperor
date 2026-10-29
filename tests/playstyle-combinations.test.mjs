import test from 'node:test';import assert from 'node:assert/strict';
import {runPlaystyle,configurations} from '../scripts/s13-02-scenarios.mjs';
import {ordinal} from '../src/calendar.js';import {extensionRelation,extensionWork} from '../src/extension-routes.js';
import {relationshipRecord} from '../src/relationships.js';import * as E from '../src/engine.js';
const coreIds=['C02','C03','C04','C05','C06','C07','C08'];
for(const [mode,label]of Object.entries(configurations))test(`完整两年${label}：55单元、真实约期、24月账与历史保护`,()=>{
 const {s,rows,checks,snapshots}=runPlaystyle(mode);
 assert.deepEqual(s.ending.counts,{main:12,relation:14,government:12,side:4,extension:4});
 assert.equal(Object.values(s.transcripts).filter(t=>/^D0[1-8]$/.test(t.eventId)).length,8);
 assert.equal(s.weekly.monthly.length,24);assert.equal(new Set(s.weekly.monthly.map(x=>x.key)).size,24);
 assert.ok(rows.length<=16);assert.ok(rows.every(w=>w.used+w.held<=6&&w.held===0));
 assert.ok(Object.values(s.weekly.projects.items).every(p=>p.status==='completed'));
 assert.equal(s.weekly.relationships.requests.filter(q=>q.status==='pending').length,0);
 assert.deepEqual(s.transcripts,snapshots.封卷前.transcripts);assert.deepEqual(s.ledger,snapshots.封卷前.ledger);
 if(mode==='politics'){assert.equal(Object.values(s.weekly.projects.items).filter(p=>p.inspected).length,4);assert.equal(rows.reduce((n,w)=>n+w.used,0),43);}
 if(mode==='life'){assert.equal(s.weekly.activities.entries.filter(e=>e.kind==='banquet').length,8);assert.equal(s.stats.treasury,98);assert.equal(s.weekly.plans.filter(p=>p.kind==='banquet'&&p.status==='completed').length,8);}
 if(mode==='parallel'){
  assert.ok(coreIds.every(cid=>s.relations[cid].stage==='相守'&&s.relations[cid].playerIntent==='愿发展'&&s.relations[cid].npcIntent==='愿发展'));
  assert.equal(s.weekly.relationships.issues.length,0);assert.equal(s.weekly.relationships.agreements.length,7);
  assert.ok(s.weekly.relationships.agreements.every(a=>a.kind==='parallel'&&a.visibility==='private'));
  assert.equal(rows.reduce((n,w)=>n+w.used,0),73);
  for(const cid of coreIds){const rec=relationshipRecord(s,cid),stages=rec.history.filter(h=>h.kind==='stage'),heart=stages.find(h=>h.to==='倾心');assert.ok(new Set(rec.encounters.filter(e=>ordinal(e.date)>ordinal(heart.date)).map(e=>ordinal(e.date))).size>=2);for(let i=1;i<stages.length;i++)assert.ok(ordinal(stages[i].date)-ordinal(stages[i-1].date)>=7);}
 }
 if(mode==='cooperation'){assert.ok(coreIds.every(cid=>s.relations[cid].playerIntent==='仅合作'&&s.relations[cid].stage!=='相守'));for(const cid of ['C09','C10'])assert.equal(extensionRelation(s,cid).playerIntent,'仅合作');assert.equal(rows.reduce((n,w)=>n+w.used,0),27);}
 if(mode==='repair'){
  assert.equal(s.events['R02-01'].outcomeId,'distance');assert.equal(s.relations.C02.stage,'倾心');
  assert.equal(s.weekly.plans.filter(p=>p.status==='breached').length,1);assert.equal(s.weekly.relationships.issues[0].status,'resolved');
  assert.equal(s.events.M11.outcomeId,'vague');const r=extensionRelation(s,'C09');assert.equal(r.unresolvedGift,false);assert.equal(r.requiresRenewal,false);assert.equal(r.npcIntent,'愿发展');
  assert.equal(checks.length,2);assert.deepEqual(s.transcripts['XR09-02'],snapshots.旧影补谈前.transcripts['XR09-02']);
  assert.ok(s.extensionRoutes.history.filter(h=>h.actor==='C09').map(h=>h.kind).join(',').includes('repair,keep-word,resume'));
 }
 if(mode==='letters'){
  assert.equal(s.events['R03-01'].channel,'letter');assert.match(s.transcripts['R03-01'].body,/西北|边书/);
  const replies=s.weekly.relationships.requests.filter(q=>q.kind==='node-reply'&&q.actor==='C03');assert.equal(replies.length,2);
  for(const q of replies){assert.equal(q.status,'answered');assert.equal(ordinal(q.deliveryDate)-ordinal(q.date),7);assert.equal(ordinal(q.answeredAt)-ordinal(q.deliveryDate),7);}
  assert.equal(s.weekly.plans.filter(p=>p.kind==='letter'&&p.status==='completed'&&p.deliveredAt).length,6);assert.equal(checks.length,1);assert.equal(s.weekly.activities.shipments.filter(sh=>sh.kind==='letter'&&sh.status==='answered').length,6);for(const sh of s.weekly.activities.shipments.filter(sh=>sh.kind==='letter'))assert.equal(ordinal(sh.answeredAt)-ordinal(sh.deliveryAt),7);
 }
 // Private extension work stays pending independently of the relationship outcome.
 assert.match(extensionWork(s).review,/正式回执未至/);
 const before=JSON.stringify(s);E.visibleContext(s,'C02');E.visibleContext(s,'C09');assert.equal(JSON.stringify(s),before);
});
