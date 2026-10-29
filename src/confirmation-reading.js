import {NAMES} from './content.js';
import {activityPlanDetail} from './activity-reading.js';
import {commit,eventKey,getEvent,factReaders,dateText} from './engine.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// commit is a pure rule projection here. Only app.update persists a choice.
// The projection is discarded; generated IDs are never copied into a request.
export function confirmationReading(before,plan){
 const after=commit(before,plan).state,records=[];
 const add=(label,readers,extra={})=>{if(Array.isArray(readers)&&readers.length)records.push({label,readers:[...new Set(readers)],...extra});};
 for(const a of plan.actions){
  if(a.type==='event'){
   const key=eventKey(after,a.eventId),f=after.facts.find(f=>f.id==='FACT_'+key),t=after.transcripts[key];
   if(f)add(getEvent(after,a.eventId).title,factReaders(after,f));
   if(a.eventId==='M06')for(const b of t?.bridge||[])add('散后对'+NAMES[b.actor]+'的话',['C01',b.actor]);
  }
  if(a.type==='disclose'){const f=after.facts.find(f=>f.id==='DISCLOSE_'+a.actor);if(f)add('对'+NAMES[a.actor]+'的说明',factReaders(after,f));}
 }
 if(after.weekly)for(const p of after.weekly.plans){
  const newlyCreated=p.createdTransaction===plan.id,referenced=plan.actions.some(a=>a.planId===p.id);
  if((newlyCreated||referenced)&&!['rescheduled','candidate','draft','needs-reschedule'].includes(p.status))add(p.label,p.visibleTo,{date:p.date,period:p.period,detail:activityPlanDetail(after,p)});
 }
 if(!after.weekly)for(const p of after.promises)if(p.sourceTransaction===plan.id)add('与'+NAMES[p.actor]+'的约定',p.visibleTo,{date:p.date});
 return {date:after.date,period:after.weekly?(after.weekly.clock%2?'evening':'day'):null,hasImmediate:plan.actions.some(a=>a.type==='event'||a.type==='disclose'),records};
}
export function renderConfirmationReading(before,plan){
 const x=confirmationReading(before,plan),when=(d,p)=>esc(dateText(d))+(p?' · '+(p==='evening'?'晚间':'日间'):'');
 if(!x.records.some(r=>r.date||r.detail||r.readers.includes('public')))return '';
 return `<section class="confirmation-reading">${x.records.map(r=>`<p><strong>${esc(r.label)}</strong>${r.detail?`<br>${esc(r.detail)}`:''}${r.date?`<br>${when(r.date,r.period)}`:''}${r.readers.includes('public')?'<br>此事会传开。':''}</p>`).join('')}</section>`;
}
