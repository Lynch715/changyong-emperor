// Static planning audit, independent of the generator. No game or storage writes.
import assert from 'node:assert/strict';
import {ordinal,fromOrdinal,stamp,validDate} from '../src/calendar.js';
const obj=a=>({year:a?.[0],month:a?.[1],day:a?.[2]});
const n=a=>ordinal(obj(a)),at=x=>stamp(obj(x.recommended),x.period||'day');
const date=x=>{assert.ok(Array.isArray(x)&&x.length===3&&validDate(obj(x)),'invalid real date');return n(x);};
const month=a=>Math.floor((a[1]-1)/3),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function auditLongtermPlan(plan,mapping,registry){
 assert.equal(plan.status,'design-accepted-runtime-pending');assert.equal(mapping.status,plan.status);
 assert.equal(plan.policies.weekly.slots,6);assert.equal(plan.policies.weekly.dailySlots,2);assert.equal(plan.policies.weekly.mainPackages,2);assert.equal(plan.policies.weekly.extensionPerQuarter,1);assert.equal(plan.policies.weekly.activeProjects,2);assert.equal(plan.policies.weekly.extensionRequiresExplicitAcceptance,true);
 const expected=registry.filter(e=>e.full&&!e.first).map(e=>e.id).sort(),ids=mapping.events.map(e=>e.id).sort();
 assert.equal(new Set(ids).size,ids.length);assert.deepEqual(ids,expected,'late logical inventory');assert.equal(ids.length,127);
 assert.equal(mapping.firstFullIds.length,54);assert.deepEqual([...mapping.firstFullIds].sort(),registry.filter(e=>e.first&&e.full).map(e=>e.id).sort());assert.equal(new Set([...mapping.firstFullIds,...ids]).size,181);
 const ev=new Map(mapping.events.map(e=>[e.id,e]));
 for(const row of registry.filter(e=>e.full&&!e.first)){const e=ev.get(row.id);assert.equal(e.title,row.title);assert.equal(e.actor,row.actor);assert.equal(e.kind,row.kind);assert.equal(e.status,'design-only-runtime-pending');}
 assert.equal(plan.volumes.length,8);assert.equal(new Set(plan.volumes.flatMap(v=>v.mains)).size,48);
 const origin=n([3,1,1]),last=n([30,12,30]),seen=new Uint8Array(last-origin+1);assert.equal(seen.length,10080);
 const weekIds=new Set(),weekById=new Map();let focusDays=0;
 for(const w of plan.weeks){assert.ok(!weekIds.has(w.id)&&!/^T\d/.test(w.id));weekIds.add(w.id);weekById.set(w.id,w);assert.equal(date(w.end)-date(w.start),6);assert.equal(w.slots,6);assert.equal(w.maxDailySlots,2);assert.equal(w.maxMainPackages,2);assert.equal(w.status,'planned-not-created');for(let i=n(w.start);i<=n(w.end);i++){assert.ok(i>=origin&&i<=last);assert.equal(seen[i-origin]++,0,'overlapping focus weeks');focusDays++;}}
 const monthKeys=new Set();let regularDays=0;assert.equal(plan.years.length,28);
 for(const y of plan.years){assert.ok(y.year>=3&&y.year<=30);assert.deepEqual(y.focusWeeks,plan.weeks.filter(w=>w.start[0]===y.year).map(w=>w.id));assert.equal(y.monthlyCheckpoints.length,12);
  for(const r of y.regularPeriods){assert.equal(r.start[0],y.year);assert.equal(r.end[0],y.year);assert.ok(date(r.end)>=date(r.start));for(let i=n(r.start);i<=n(r.end);i++){assert.equal(seen[i-origin]++,0,'regular overlap');regularDays++;}}
  for(const m of y.monthlyCheckpoints){assert.ok(!monthKeys.has(m.key));monthKeys.add(m.key);assert.equal(m.key,`${y.year}-${String(m.date[1]).padStart(2,'0')}`);assert.equal(m.date[2],30);assert.equal(m.date[0],y.year);assert.equal(m.status,'planned-not-settled');}
 }
 assert.ok(seen.every(x=>x===1),'calendar gaps');assert.equal(monthKeys.size,336);
 assert.equal(plan.extensionCandidates.length,112);const ext=new Map();
 for(const w of plan.extensionCandidates){assert.equal(w.status,'candidate-not-accepted');assert.equal(date(w.end)-date(w.start),6);assert.equal(w.start[0],w.end[0]);assert.equal(month(w.start),month(w.end));assert.equal(w.quarterKey,`${w.start[0]}-Q${month(w.start)+1}`);assert.ok(!ext.has(w.quarterKey));ext.set(w.quarterKey,w);assert.ok(plan.weeks.every(x=>n(w.start)>n(x.end)||n(w.end)<n(x.start)),'extension overlaps focus');}
 const nodes=new Map(ev),first=new Set(mapping.firstFullIds);
 for(const e of mapping.events)for(const s of e.stages||[]){assert.ok(s.id.startsWith(e.id+'#')&&!nodes.has(s.id));nodes.set(s.id,s);}
 for(const x of nodes.values()){
  assert.ok(Number.isInteger(x.slots)&&x.slots>=0&&x.slots<=2);
  if(x.recommended){date(x.recommended);assert.ok(n(x.recommended)>=origin&&n(x.recommended)<=last);const w=plan.weeks.find(w=>n(x.recommended)>=n(w.start)&&n(x.recommended)<=n(w.end));assert.equal(x.focusWeek,w?.id||null);}
  for(const ref of [...x.requires||[],...x.evidenceRefs||[],...x.romanceRequires||[]]){assert.ok(nodes.has(ref)||first.has(ref)||ref==='actual-conception-and-both-consent','unknown dependency '+ref);const p=nodes.get(ref);if(p?.recommended&&x.recommended)assert.ok(at(p)<=at(x),`future dependency ${x.id} <- ${ref}`);}
  if(x.minimumDays){const p=nodes.get(x.after);assert.ok(p?.recommended);assert.ok(n(x.recommended)-n(p.recommended)>=x.minimumDays,'report before work period');}
 }
 const done=new Set(),visiting=new Set();function visit(id){if(done.has(id)||!nodes.has(id))return;assert.ok(!visiting.has(id),'dependency cycle');visiting.add(id);for(const ref of nodes.get(id).requires||[])visit(ref);visiting.delete(id);done.add(id);}for(const id of nodes.keys())visit(id);
 for(const e of mapping.events){assert.ok(e.window.start&&e.window.end&&e.window.lateRoute);assert.ok(n(e.window.start)<=n(e.recommended)&&n(e.recommended)<=n(e.window.end));if(e.kind==='main'){assert.ok(e.requires.every(ref=>!/^R|^XR/.test(ref)),'main gated by romance');assert.equal(e.mainPackage,e.id);assert.equal(e.slots,0);const volume=plan.volumes.find(v=>v.mains.includes(e.id));assert.equal(e.volume,volume.id);assert.ok(n(e.recommended)>=n(volume.start)&&n(e.recommended)<=n(volume.end));}
  if(e.kind==='daily'&&e.season!=='any')assert.equal(['spring','summer','autumn','winter'][month(e.recommended)],e.season,'season mismatch');
  if(e.kind==='relation'){assert.ok(e.gates.includes('romance-needs-current-mutual-consent'));assert.equal(e.requiresMode,'previous-node-handled-not-romance');}
  if(e.delivery==='embedded-private-section'){const p=nodes.get(e.effectOwner);assert.ok(p?.recommended&&same(p.recommended,e.recommended));assert.equal(e.sceneId,e.costGroup);assert.equal(e.slots,0);}
 }
 // Presence must be possible at all private military/prince nodes; these are accepted-visit witnesses, not granted visits.
 for(const e of mapping.events.filter(e=>e.kind==='relation'&&['C03','C05'].includes(e.actor))){const t=plan.travel.find(t=>t.actor===e.actor);assert.ok(t?.visits.some(v=>n(e.recommended)>=n(v.start)&&n(e.recommended)<=n(v.end)),'private meeting outside travel window');}
 assert.equal(ev.get('M13').contactMode,'document-no-live-reply');assert.equal(ev.get('M34').contactMode,'document-no-live-reply');
 const adult=nodes.get('M33#adult-decision');assert.equal(adult.slots,1);assert.equal(adult.costGroup,ev.get('P12').costGroup);assert.equal(ev.get('P12').effectOwner,adult.id);assert.equal(ev.get('P12').slots,0);
 assert.deepEqual(ev.get('M34').requires,['M33#education']);assert.ok(!ev.get('M34').requires.includes(adult.id));assert.equal(plan.policies.parenthood.adultAgeDays,6480);
 assert.ok(plan.policies.parenthood.birthNeverFromConsentAlone);assert.equal(plan.policies.parenthood.adultBeyondFinal,'pending-not-blocking');
 const ordered=['M43','R03-06','E01','M44#farewell','R02-06','E02','M45#diagnosis','R04-06','E03','M45#flute','R05-06','E04','M46#yixiu','R06-06','E05','M46#shilan','R07-06','E06','M46#lingrong','R08-06','E07'];
 for(let i=1;i<ordered.length;i++)assert.ok(at(nodes.get(ordered[i]))>=at(nodes.get(ordered[i-1])),'late scene order');
 assert.equal(ev.get('M43').recommended[1],9);assert.equal(ev.get('M44').recommended[1],11);assert.equal(nodes.get('M45#diagnosis').recommended[1],12);assert.equal(nodes.get('M45#flute').recommended[1],12);assert.ok(n(nodes.get('M45#flute').recommended)>n(nodes.get('M45#diagnosis').recommended),'two private scenes merged');
 for(const e of mapping.events.filter(e=>['epilogue','extra-epilogue'].includes(e.kind))){assert.equal(e.slots,0);assert.ok(e.requires[0].startsWith(e.kind==='epilogue'?'R':'XR'));assert.equal(e.delivery,'conditional-readonly-page');assert.equal(e.latePolicy.needs,'actual-prior-meeting-and-current-gates');}
 for(const [m,x]of [['M22','XR10-03'],['M26','XR10-04'],['M27','XR09-04'],['M39','XR09-05'],['M40','XR10-05']]){assert.ok(ev.get(x).requires.includes(m));assert.ok(!ev.get(m).requires.includes(x),'S12 main/XR cycle');assert.ok(ev.get(m).sourceRefs.some(r=>r.includes('S12/主线分支修订')));}
 assert.equal(new Set(mapping.events.filter(e=>e.kind==='ending').map(e=>e.branchGroup)).size,1);assert.ok(ev.get('F01').gates.includes('seven-core-together'));assert.ok(plan.policies.repairTail.dates.includes('year31'));assert.equal(plan.policies.repairTail.newLogicalEvents,0);
 const mainPackages=new Map();for(const x of nodes.values())if(x.mainPackage&&x.focusWeek){const set=mainPackages.get(x.focusWeek)||new Set();set.add(x.mainPackage);mainPackages.set(x.focusWeek,set);}for(const set of mainPackages.values())assert.ok(set.size<=2,'main package overload');
 // All nodes, optional templates and four companion variants fit in distinct physical slots.
 const scheduled=[...mapping.events,...[...nodes.values()].filter(x=>x.id.includes('#')&&x.slots&&x.recommended),...plan.companions].filter(x=>x.slots&&x.id!=='P12');
 const used=new Map(),occupied=new Set(),extensionsUsed=new Set();
 for(const x of scheduled){let key=x.focusWeek,w=weekById.get(key);if(!key){w=x.customExtension||ext.get(`${x.recommended[0]}-Q${month(x.recommended)+1}`);assert.ok(w,'paid scene has no week');if(x.customExtension){assert.equal(date(w.end)-date(w.start),6);assert.equal(w.start[0],w.end[0]);assert.equal(month(w.start),month(w.end));assert.equal(w.id,ext.get(`${w.start[0]}-Q${month(w.start)+1}`)?.id);assert.ok(plan.weeks.every(v=>n(w.start)>n(v.end)||n(w.end)<n(v.start)));}key=w.id;extensionsUsed.add(key);assert.ok(n(x.recommended)>=n(w.start)&&n(x.recommended)<=n(w.end),'paid scene outside selected extension');}
  const st=at(x);assert.ok(!occupied.has(st),`occupied paid moment ${x.id}`);occupied.add(st);used.set(key,(used.get(key)||0)+x.slots);assert.ok(used.get(key)<=6,'weekly capacity exceeded');}
 const decisions=new Map();for(const e of mapping.events.filter(e=>e.decisionCount)){const key=e.focusWeek||`${e.recommended[0]}-Q${month(e.recommended)+1}`;decisions.set(key,(decisions.get(key)||0)+e.decisionCount);assert.ok(decisions.get(key)<=2,'project decisions exceeded');}
 const projects=[];for(const e of mapping.events.filter(e=>e.projectPhase==='execution')){const report=mapping.events.find(x=>x.project===e.project&&x.projectPhase==='review');assert.ok(report);projects.push({id:e.project,start:n(e.recommended),end:n(report.recommended)});}
 for(const x of nodes.values())if(x.minimumDays&&x.after?.startsWith('M')&&x.id!=='M47#complete')projects.push({id:x.id,start:n(nodes.get(x.after).recommended),end:n(x.recommended)});
 let maxProjects=0;for(let day=origin;day<=last;day++){maxProjects=Math.max(maxProjects,projects.filter(p=>day>=p.start&&day<=p.end).length);}assert.ok(maxProjects<=2,'active projects exceeded');
 for(const c of plan.companions){assert.equal(c.budget,'activity-variant-not-logical-event');assert.ok(c.gates.includes('current-mutual-consent'));}
 const capacities=[...used].map(([week,used])=>({week,used,capacity:6,remaining:6-used}));
 const counts=Object.fromEntries([...new Set(mapping.events.map(e=>e.kind))].map(k=>[k,mapping.events.filter(e=>e.kind===k).length]));
 return{logicalEvents:127,fullLogicalEvents:181,firstFullEvents:54,counts,focusWeeks:plan.weeks.length,focusDays,regularDays,coveredDays:seen.length,monthlyCheckpoints:monthKeys.size,extensionCandidates:ext.size,baseSlots:plan.weeks.length*6,maxSlotsWithAllExplicitExtensions:(plan.weeks.length+ext.size)*6,witnessUsedSlots:scheduled.reduce((a,e)=>a+e.slots,0),witnessExtensionWeeks:extensionsUsed.size,maxUsedInWeek:Math.max(...used.values()),maxMainPackages:Math.max(...[...mainPackages.values()].map(x=>x.size)),maxActiveProjects:maxProjects,capacities,stages:[...nodes.keys()].filter(x=>x.includes('#')).length};
}

export function planAdultDecision(plan,mapping,birth,{willing=true}={}){
 if(!birth)return{status:'not-applicable',blocksM34:false,slots:0};
 const eligible=n(birth)+18*360,last=n(plan.policies.calendar.spanEnd);
 if(eligible>last)return{status:'pending-after-year30',eligibleDate:fromOrdinal(eligible),blocksM34:false,slots:0};
 if(!willing)return{status:'declined-or-not-ready',blocksM34:false,slots:0};
 const education=mapping.events.find(e=>e.id==='M33').stages.find(s=>s.id==='M33#education');
 const lower=Math.max(eligible,n(education.recommended));let chosen=null,period=null;
 const paid=[...mapping.events,...mapping.events.flatMap(e=>e.stages||[]),...plan.companions].filter(x=>x.slots&&x.recommended&&x.id!=='P12');
 const occupied=new Set(paid.map(at));
 for(const w of plan.weeks){if(paid.filter(x=>x.focusWeek===w.id).reduce((s,x)=>s+x.slots,0)>=6)continue;for(let day=Math.max(lower,n(w.start));day<=n(w.end)&&chosen===null;day++)for(const p of ['day','evening'])if(!occupied.has(stamp(fromOrdinal(day),p))){chosen=day;period=p;break;}if(chosen!==null)break;}
 assert.ok(chosen!==null);const when=fromOrdinal(chosen);
 return{status:'eligible-not-executed',eligibleDate:fromOrdinal(eligible),date:when,period,slots:1,costGroup:'FAMILY-ADULT-DECISION-C36',transactionOwner:'M33#adult-decision',p12ExtraSlots:0,blocksM34:false};
}
