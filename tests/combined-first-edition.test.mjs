import test from 'node:test';
import assert from 'node:assert/strict';
import {runCombined} from '../scripts/s13-01-scenarios.mjs';
import * as E from '../src/engine.js';
import {ordinal,season} from '../src/calendar.js';
import {extensionRelation} from '../src/extension-routes.js';

for(const extension of ['cooperate','develop'])test(`从新档连续完成55单元、八周与24月，扩展${extension}不改写旧正文`,()=>{
 const r=runCombined({extension,roundtrip:true}),s=r.s;
 assert.deepEqual(s.ending.counts,{main:12,relation:14,government:12,side:4,extension:4});
 assert.equal(Object.values(s.transcripts).filter(t=>/^D0[1-8]$/.test(t.eventId)).length,8);
 assert.deepEqual(r.rows.map(w=>w.used),[4,3,4,6,5,5,5,3]);
 assert.equal(r.rows.reduce((n,w)=>n+w.used,0),35);
 assert.ok(r.rows.every(w=>w.held===0));assert.equal(s.weekly.plans.filter(p=>p.status==='completed').length,8);
 assert.equal(new Set(s.weekly.monthly.map(m=>m.key)).size,24);
 assert.deepEqual(s.date,{year:2,month:12,day:30});assert.equal(s.sealed,true);
 assert.equal(s.stats.treasury,114);assert.equal(s.weekly.reports.length,8);
 for(const t of Object.values(s.transcripts).filter(t=>/^D0/.test(t.eventId)))assert.equal(season(t.date),E.getEvent(s,t.eventId).season);
 for(const p of Object.values(s.weekly.projects.items)){
  assert.equal(p.status,'completed');assert.equal(p.runs.length,1);assert.equal(p.reports.length,1);
  assert.ok(ordinal(p.reports[0].date)-ordinal(p.runs[0].startedAt)>=p.runs[0].minimumDays);
 }
 assert.deepEqual(s.weekly.projects.items['PR-MILITARY'].reports[0].date,{year:2,month:4,day:29});
 for(const cid of ['C09','C10']){
  const rel=extensionRelation(s,cid);assert.equal(rel.nodes.length,2);assert.equal(rel.stage,'信任');
  assert.equal(rel.playerIntent,extension==='develop'?'愿发展':'仅合作');assert.equal(rel.npcIntent,rel.playerIntent);
 }
 for(const t of Object.values(s.transcripts).filter(t=>/^R0[2-8]-0[12]$/.test(t.eventId)))assert.equal(s.events[t.eventId].outcomeId,'work');
 for(const rel of Object.values(s.relations))assert.notEqual(rel.playerIntent,'愿发展');
 const delivery=s.weekly.notices.find(n=>n.source==='R03-02');
 assert.equal(delivery.status,'read');assert.ok(ordinal(delivery.date)-ordinal(s.transcripts['R03-02'].date)>=7);
 assert.throws(()=>E.preview(s,[{type:'seal'}]));
 // The last step appends an ending; it does not rewrite any earlier prose or money entries.
 assert.deepEqual(s.transcripts,r.beforeSeal.transcripts);assert.deepEqual(s.ledger,r.beforeSeal.ledger);
});
