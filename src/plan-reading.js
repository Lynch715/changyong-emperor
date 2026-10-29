import {preview,enterScene,dateText} from './engine.js';
import {activityPlanDetail} from './activity-reading.js';
import {stamp} from './calendar.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const planStates={candidate:'待商量 · 未预占',draft:'草稿 · 未预占',accepted:'已约好 · 已预占',executing:'进行中 · 已核销',completed:'已完成 · 已核销',cancelled:'已取消 · 预占已解除',rescheduled:'已改期 · 原预占已解除',breached:'已失约 · 时段已记','needs-reschedule':'旧约待协商 · 未记失约'};
export const planPeriod=p=>p==='day'?'日间':'晚间';
export const sortedPlans=plans=>plans.slice().sort((a,b)=>stamp(a.date,a.period)-stamp(b.date,b.period));
// Future plans are appointments, never a shortcut to perform a later scene.
// Probe due plans through the original rules without persisting the projection.
export function planReading(s,p){
 if(s.sealed)return {ready:false,reason:'初卷已收，仅可重读。'};
 if(p.status!=='accepted')return {ready:false,reason:planStates[p.status]};
 const at=stamp(p.date,p.period);
 if(at>s.weekly.clock)return {ready:false,future:true,reason:'尚未到约期；沿日程向前，遇到较早的事情会先停下。'};
 if(at<s.weekly.clock)return {ready:false,overdue:true,reason:'约期已过，先如实处理失约，不倒放日期。'};
 try{
  if(p.eventId){const n=enterScene(s,p.eventId);if(n.weekly.clock!==s.weekly.clock)throw Error('先沿日程走到本场时段。');}
  else preview(s,[{type:'week-fulfill',planId:p.id}]);
  return {ready:true,reason:'约期已到，确认后才执行。'};
 }catch(e){return {ready:false,reason:e.message};}
}
export function renderPlanCard(s,p){
 const x=planReading(s,p),editable=!s.sealed&&['candidate','draft','accepted','needs-reschedule'].includes(p.status)&&!x.overdue;
 const attr=esc(p.id),date=`${dateText(p.date)} · ${planPeriod(p.period)}${p.slots===2?'至晚间':''}`;
 const cost=['accepted','candidate','draft','needs-reschedule'].includes(p.status)?`${p.status==='accepted'?'预占':'拟用'}${p.slots}格${p.money?'，预算'+p.money+'点（尚未支出）':''}`:`${p.slots}格${p.money?' · '+p.money+'点':''}`;
 const original=p.previousId?s.weekly.plans.find(x=>x.id===p.previousId):null;
 const read=p.eventId?`data-read="${esc(Object.entries(s.transcripts).find(([,t])=>t.eventId===p.eventId&&t.transactionId===p.completedTransaction)?.[0]||p.eventId)}"`:`data-week-read="${attr}"`;
 return `<article class="week-entry" data-plan-card="${attr}"><p><strong>${esc(date)} · ${esc(p.label)}</strong><small>${planStates[p.status]} · ${cost}</small></p>${activityPlanDetail(s,p)?`<p class="plan-context">${esc(activityPlanDetail(s,p))}</p>`:''}${original?`<p class="plan-context">原约：${esc(dateText(original.date))} · ${planPeriod(original.period)}；旧记录保留。</p>`:''}${p.status==='accepted'?`<p class="plan-context">${esc(x.reason)}</p>`:''}<div class="button-row">${x.ready?`<button class="primary-btn" data-week-fulfill="${attr}">照约去做</button>`:x.future?'<button class="text-btn" data-action="week-advance">沿日程向前</button>':''}${editable?`${['candidate','draft'].includes(p.status)?`<button class="text-btn" data-week-accept="${attr}">确认安排</button>`:''}<button class="text-btn" data-week-edit="${attr}">${p.status==='accepted'?'改期':'修改安排'}</button><button class="text-btn" data-week-cancel="${attr}">${p.status==='accepted'?'取消约定':p.status==='needs-reschedule'?'取消旧约':'撤去草稿'}</button>`:''}${!s.sealed&&p.status==='accepted'&&stamp(p.date,p.period)<=s.weekly.clock?`<button class="text-btn" data-week-breach="${attr}">记下失约</button>`:''}${!s.sealed&&p.status==='executing'?`<button class="primary-btn" data-week-complete="${attr}">把这场活动做完</button>`:''}${p.status==='completed'&&(p.eventId||p.dialogue)?`<button class="text-btn" ${read}>重读此刻</button>`:''}</div></article>`;
}
export function renderOtherPlans(s,weekId){
 const plans=sortedPlans(s.weekly.plans.filter(p=>['accepted','candidate','draft','needs-reschedule'].includes(p.status)&&p.weekId!==weekId));
 return plans.length?`<section class="paper-panel settings-section"><h2>未来约定与待商量的事</h2>${plans.map(p=>renderPlanCard(s,p)).join('')}</section>`:'';
}
export function renderPlanHistory(s){
 const plans=sortedPlans(s.weekly.plans.filter(p=>['cancelled','rescheduled','breached'].includes(p.status)));
 return plans.length?`<details class="paper-panel plan-history"><summary>改期、取消与失约记录 · ${plans.length}</summary>${plans.map(p=>{const next=s.weekly.plans.find(x=>x.previousId===p.id);return `<article class="entry"><h3>${esc(p.label)}</h3><p>${esc(dateText(p.date))} · ${planPeriod(p.period)}<br>${planStates[p.status]}${next?`<br>改至：${esc(dateText(next.date))} · ${planPeriod(next.period)}`:''}</p></article>`;}).join('')}</details>`:'';
}
