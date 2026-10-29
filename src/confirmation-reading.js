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
 const x=confirmationReading(before,plan),readers=ids=>ids.includes('public')?'公开':ids.map(id=>NAMES[id]||'指定知情人').join('、');
 if(!x.hasImmediate&&!x.records.length)return '';
 return `<section class="confirmation-reading"><h3>落笔前核对</h3>${x.hasImmediate?`<p>办理时段：${esc(dateText(x.date))}${x.period?' · '+(x.period==='evening'?'晚间':'日间'):''}</p>`:''}${x.records.map(r=>`<p><strong>${esc(r.label)}</strong>${r.detail?`<br>${esc(r.detail)}`:''}${r.date?`<br>安排时间：${esc(dateText(r.date))}${r.period?' · '+(r.period==='evening'?'晚间':'日间'):''}`:''}<br>这些话会让谁知道：${esc(readers(r.readers))}</p>`).join('')}</section>`;
}
