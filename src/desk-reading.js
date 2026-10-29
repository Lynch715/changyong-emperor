import {planReading} from './plan-reading.js';
import {recordReading} from './reading-copy.js';
// Read-only desk projection. Reading an existing response never creates a new
// scene, action, summary, model request or save field.
import {NAMES} from './content.js';
import {requiredEvents,dateText} from './engine.js';
import {currentWeek,usedSlots,heldSlots,reservedMoney,weekStops} from './week.js';
import {ordinal,unstamp} from './calendar.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function deskReading(s){
 const required=requiredEvents(s),w=currentWeek(s),orders=new Map(s.transactions.map((t,i)=>[t.id,i]));
 const records=Object.entries(s.transcripts).map(([key,t])=>({kind:'story',key,title:t.title,actor:t.actor,date:t.date,text:recordReading(t,'dialogue'),order:orders.get(t.transactionId)??-1}));
 for(const p of s.weekly.plans)if(p.status==='completed'&&!p.eventId&&p.dialogue)records.push({kind:'activity',key:p.id,title:p.label,actor:p.actor,date:p.date,text:p.dialogue,order:orders.get(p.completedTransaction)??-1});
 const latest=records.filter(r=>r.text&&r.date&&ordinal(r.date)<=ordinal(s.date)).sort((a,b)=>ordinal(a.date)-ordinal(b.date)||a.order-b.order).at(-1)||null;
 const ledger=w?s.ledger.filter(r=>ordinal(r.date)>=ordinal(w.start)&&ordinal(r.date)<=Math.min(ordinal(w.end),ordinal(s.date))):[];
 const changes=w?{remaining:s.remaining,used:usedSlots(s,w.id),held:heldSlots(s,w.id),income:ledger.reduce((n,r)=>n+Math.max(0,r.amount),0),expense:ledger.reduce((n,r)=>n+Math.max(0,-r.amount),0)}:null;
 const next=s.sealed?null:weekStops(s).find(x=>!(x.kind==='month'&&!(s.weekly.life&&x.id.endsWith('-12'))&&x.id!==((s.weekly.continuation?.horizon||2)+'-12'))&&x.at>=s.weekly.clock&&!(x.kind==='event'&&required.some(e=>e.id===x.id)))||null;
 const duePlan=next?.kind==='plan'?s.weekly.plans.find(p=>p.id===next.id):null;
 return {duePlan:duePlan&&planReading(s,duePlan).ready?duePlan:null,current:s.sealed?null:required[0]||null,latest,changes,reserved:reservedMoney(s),next:next?{...next,...unstamp(next.at),due:next.at===s.weekly.clock}:null};
}
export function renderDeskReading(s,{eventCard,button}){
 const x=deskReading(s);
 const response=x.latest?`<article class="paper-panel desk-response" aria-labelledby="desk-response-title"><div class="desk-reading-meta">${esc(dateText(x.latest.date))} · ${esc(NAMES[x.latest.actor]||'留下的片刻')}</div><h2 id="desk-response-title">${esc(x.latest.title)}</h2><p class="desk-dialogue">${esc(x.latest.text)}</p><button class="text-btn" ${x.latest.kind==='story'?'data-read':'data-week-read'}="${esc(x.latest.key)}">重读全文 · ${esc(x.latest.title)}</button></article>`:'';
 const current=x.current?`<section class="desk-current" aria-labelledby="desk-current-title"><div class="section-header"><h2 id="desk-current-title">眼前的故事</h2></div><div class="paper-panel">${eventCard(x.current,true)}</div></section>`:!x.latest?'<section class="paper-panel desk-response"><h2>灯下待书</h2><p>案前暂静。可以留一段自己的时间，也可以等下一封回音。</p></section>':'';
 return `${current}${response}<section class="paper-panel desk-week-change" aria-labelledby="desk-change-title"><h2 id="desk-change-title">${x.changes?'这一周留下的变化':'灯下的时日'}</h2>${x.changes?`<p class="desk-capacity">可用 <strong>${x.changes.remaining}</strong> 格 · 预占 ${x.changes.held} 格 · 已用 ${x.changes.used} 格</p><p>本周实际入账 ${x.changes.income} 点，支出 ${x.changes.expense} 点。${x.reserved?`未来约定另预留 ${x.reserved} 点，尚未支出。`:''}</p>`:'<p>已经走过的日子留在旧事里，宫门内外各有新的回音。</p>'}${x.next?`<p class="desk-next"><span>${x.next.due?'眼前等你':'接下来'}</span> · ${esc(dateText(x.next.date))}${x.next.period==='evening'?'晚间':'日间'} · ${esc(x.next.label)}</p>`:''}<div class="button-row">${x.duePlan?`<button class="primary-btn" data-week-fulfill="${esc(x.duePlan.id)}">照约去做 · ${esc(x.duePlan.label)}</button>`:''}${s.sealed?button('翻看阶段史册','ending','primary-btn'):button('安排一段时间','week-new','primary-btn')}${button('看看故人的去处','people','text-btn')}</div></section>`;
}
