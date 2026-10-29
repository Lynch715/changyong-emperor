import {EVENTS,NAMES} from './content.js';
import {PROJECTS} from './project-content.js';
import {getEvent,eventKey,eventDone,requiredEvents,availableEvents,enterScene,dateText} from './engine.js';
import {weekNodeStatus} from './week.js';
import {ordinal} from './calendar.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// A continuation is a read opportunity, never permission to choose or settle.
// Probe the real entry guard on a copy; do not move to a later moment here.
export function sceneContinuation(s,id,{readingKey=null}={}){
 if(!id||readingKey||s.sealed)return null;
 const e=getEvent(s,id),t=e&&s.transcripts[eventKey(s,id)];
 if(!t||s.transactions.at(-1)?.id!==t.transactionId||ordinal(t.date)!==ordinal(s.date))return null;
 const required=requiredEvents(s).filter(x=>!eventDone(s,x.id));
 const nextRelation=e.kind==='relation'&&id.endsWith('01')?EVENTS[id.replace(/01$/,'02')]:null;
 const projectNodes=PROJECTS[e.projectId]?.nodes,index=projectNodes?.indexOf(id),nextProject=index>=0?projectNodes[index+1]:null;
 const next=required[0]||availableEvents(s).find(x=>x.id===(nextRelation?.id||nextProject));
 if(!next)return null;
 if(s.weekly&&!['main','followup'].includes(next.kind)&&!weekNodeStatus(s,next).ready)return null;
 if(!s.weekly&&!['main','followup'].includes(next.kind)&&!next.parent&&(s.closureMode?s.closureRemaining:s.remaining)<=0)return null;
 try{const entered=enterScene(s,next.id);if(ordinal(entered.date)!==ordinal(s.date)||entered.turn!==s.turn||s.weekly&&entered.weekly.clock!==s.weekly.clock)return null;}catch{return null;}
 return {id:next.id,title:next.title,actor:next.actor};
}
export function committedScene(s,plan){
 const events=plan.actions.filter(a=>a.type==='event');if(events.length!==1)return null;
 const id=events[0].eventId,key=eventKey(s,id);return s.transcripts[key]?.transactionId===plan.id?{id,key}:null;
}
export function renderResultHeading(t,{actor=t.actor,location='',reread=false}={}){
 return `<header class="result-stage"><div><span>${esc(NAMES[actor])} · ${esc(dateText(t.date))}</span><h2>${esc(t.title)}</h2><p>${esc(location)}</p></div><small>${reread?'旧事重读':'这一刻已记'}</small></header>`;
}
export function renderReceiptDetails(plan){
 const text=plan.results.map(r=>r.detail).filter(Boolean).join('\n');return text?`<details class="result-details"><summary>此事留下的变化</summary><p>${esc(text)}</p></details>`:'';
}
export function renderActivityResultDetails(p){
 return p.status==='completed'?`<details class="result-details"><summary>此事留下的变化</summary><p>${esc(dateText(p.date))} · ${p.period==='evening'?'晚间':'日间'}\n本场记为${p.slots}格，原预占已核销；支出${p.money}点。</p></details>`:'';
}
