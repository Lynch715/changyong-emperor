import {economyReading} from './weekly-economy.js';
import{renderVolumeLife}from'./volume-life-ui.js';
import {isEighth} from './volume8.js';
import {renderEighth} from './volume8-ui.js';
import {isSeventh} from './volume7.js';
import {renderSeventh} from './volume7-ui.js';
import {renderSixth} from './volume6-ui.js';
import {isSixth,sixthRunLabel} from './volume6.js';
import {isFifth} from './volume5.js';
import {renderFifth} from './volume5-ui.js';
import {renderFourthLife} from './volume4-ui.js';
import {isFourth} from './volume4.js';
import {sortedPlans,renderPlanCard,renderOtherPlans,renderPlanHistory} from './plan-reading.js';
import {renderDeskReading} from './desk-reading.js';
import {renderWeekContinuations} from './week-continuation-ui.js';
import {renderIncensePanel} from './incense-ui.js';
import {PROJECTS} from './project-content.js';
import {renderWeekInvitation,renderLastWeekReview} from './week-experience-ui.js';
import {renderActivityInbox} from './activity-ui.js';
import {renderRelationshipInbox} from './relationship-ui.js';
import {renderProjectDesk} from './project-ui.js';
import {TURNS,NAMES} from './content.js';
import {hasContinuation,horizonDay,volumeTurn} from './longform.js';
import {renderVolumeReviews} from './continuation-ui.js';
import {dateText,requiredEvents,availableEvents} from './engine.js';
import {currentWeek,weekCapacity,usedSlots,heldSlots,reservedMoney} from './week.js';
import {addDays,ordinal,stamp,unstamp} from './calendar.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderWeekPlans(s,{open=false}={}){
 const w=currentWeek(s);if(!w)return `<section class="paper-panel settings-section"><h2>宫中岁时</h2><p>日常差事由各处照常经办。到了回报、约期或下一段要紧的日子，案前会再停下来。</p></section>`;
 const used=usedSlots(s,w.id),held=heldSlots(s,w.id);
 return `<details class="paper-panel week-plan" data-week-plan ${open?'open':''}><summary><strong>这一周的安排</strong><span>还可安排 ${s.remaining} / ${weekCapacity(s,w)} 格${held?` · 已约 ${held}`:''}</span></summary><p class="plan-budget">已预留预算 ${reservedMoney(s)} 点，履约时才支出；草稿与待商量的事不占格。</p><div class="week-days">${Array.from({length:ordinal(w.end)-ordinal(w.start)+1},(_,i)=>{
  const d=addDays(w.start,i),past=ordinal(d)<ordinal(s.date),plans=sortedPlans(s.weekly.plans.filter(p=>p.weekId===w.id&&ordinal(p.date)===ordinal(d)&&!['cancelled','rescheduled','breached'].includes(p.status)));
  const social=Object.values(s.weekly.consumed).filter(g=>/^REL-(?:C0[2-8]-[1-4]|REPAIR-)/.test(g.source)&&ordinal(unstamp(g.at).date)===ordinal(d));
  const scenes=Object.values(s.transcripts).filter(t=>ordinal(t.date)===ordinal(d)&&!plans.some(p=>p.eventId===t.eventId&&p.status==='completed'));
  const work=Object.values(s.weekly.consumed).filter(g=>g.slots&&ordinal(unstamp(g.at).date)===ordinal(d)&&!social.includes(g)&&!plans.some(p=>p.id===g.source||p.eventId===g.source)&&!scenes.some(t=>t.eventId===g.source));
  const workLabel=g=>g.forfeited?'失约时段 · 未执行活动':g.label||Object.values(PROJECTS).filter(p=>String(g.source||'').includes(p.id)).map(p=>(String(g.source||'').startsWith('INSPECT-')?'亲核':'补做')+' · '+p.title)[0]||'已用的安排';
  return `<section class="week-day ${past?'past':''}"><h3>${d.month}月${d.day}日${ordinal(d)===ordinal(s.date)?' · 今日':''}</h3><div>${social.map(g=>`<p class="week-scene">${esc(g.label||((NAMES[g.source.match(/^REL-(C0[2-8])/ )?.[1]]||'故人')+' · 谈心'))} · 已用${g.slots}格</p>`).join('')}${work.map(g=>`<p class="week-scene">${esc(workLabel(g))} · 已用${g.slots}格</p>`).join('')}${scenes.map(t=>`<p class="week-scene">${esc(t.title)} · 已记</p>`).join('')}${plans.map(p=>renderPlanCard(s,p)).join('')}${!plans.length&&!scenes.length&&!social.length&&!work.length?'<p class="small-label">尚未安排，留白也好。</p>':''}${!past&&stamp(d,'evening')>=s.weekly.clock?`<button class="text-btn" data-week-date="${d.year}-${d.month}-${d.day}">在这一天安排</button>`:''}</div></section>`;
 }).join('')}</div><div class="week-plan-actions button-row"><button class="primary-btn" data-action="week-new">安排一件想做的事</button><button class="secondary-btn" data-action="week-end">本周收笔</button></div></details>`;
}
export function renderWeeklyDesk(s,{heading,eventCard,button,tag,weekPlanOpen=false}){
 const t=volumeTurn(s)||TURNS[s.turn-1],w=currentWeek(s),required=requiredEvents(s),available=availableEvents(s).filter(e=>!e.projectId);
 const notices=s.weekly.notices.filter(n=>n.status==='pending'&&!n.suspended&&ordinal(n.date)<=ordinal(s.date));
 const otherRequired=required.slice(1);
 return `${heading('THE IMPERIAL DESK','御案',dateText(s.date)+' · '+(s.weekly.clock%2?'晚间':'日间'),tag(s.sealed?(isEighth(s)?'最终史册已收':isSeventh(s)?'第七卷已收':isSixth(s)?'第六卷已收':isFifth(s)?'第五卷已收':isFourth(s)?'第四卷已收':hasContinuation(s)?'第三卷已收':'初卷已收'):w?w.type==='focus'?'重点周':w.type==='transition'?'承接时段':w.type==='repair'?'修复时段':'延展周':'常规时段','gold'))}
 <p class="desk-chapter">江山与故人 · ${esc(t.season)} · ${esc(s.sealed?(isEighth(s)?'山河长明，旧页仍留':isSeventh(s)?'新旧之间，旧页仍留':isSixth(s)?'共治风雨，旧页仍留':isFifth(s)?'太平有隙，旧页仍留':isFourth(s)?'改命成局，旧页仍留':hasContinuation(s)?'信任有价，旧页仍留':'两载灯火，初卷暂收'):w?t.title:'灯下待书')}</p>
 ${renderDeskReading(s,{eventCard,button})}
 ${otherRequired.length||notices.length?`<section><div class="section-header"><h2>案前还有回音</h2></div><div class="paper-panel">${otherRequired.map(e=>eventCard(e)).join('')}${notices.map(n=>`<article class="entry"><h3>${esc(n.label)}</h3><p>${n.type==='delivery'?'信已按实际日期送达，回信还要再等。':'先前惦记的那件事，到了可以再问的时候。'}</p>${n.choices?n.choices.map(c=>`<button class="secondary-btn" data-week-notice="${n.id}" data-week-answer="${esc(c)}">${esc(c)}</button>`).join(''):`<button class="primary-btn" data-week-notice="${n.id}">展开阅核</button>`}</article>`).join('')}</div></section>`:''}
 ${renderWeekInvitation(s,w,{required,available})}
 ${!s.sealed?renderWeekPlans(s,{open:weekPlanOpen}):''}
 ${renderEighth(s)}${renderSeventh(s)}${renderSixth(s)}${renderFifth(s)}${renderFourthLife(s)}${renderVolumeReviews(s)}${renderIncensePanel(s)}${renderProjectDesk(s)}${renderRelationshipInbox(s)}${renderActivityInbox(s)}
 ${renderVolumeLife(s)}${renderLastWeekReview(s)}${renderWeekContinuations(s)}
 ${available.length&&!s.sealed?`<section><div class="section-header"><h2>还想留一段时间</h2></div><div class="paper-panel">${available.filter(e=>e.kind!=='daily').slice(0,4).map(e=>eventCard(e)).join('')||available.slice(0,2).map(e=>eventCard(e)).join('')}</div>${button('看看还有哪些事可办','all-events','text-btn')}</section>`:''}
 ${renderOtherPlans(s,w?.id)}${renderPlanHistory(s)}
 ${!s.sealed?`<div class="advance-panel"><div><strong>${required.length?'先把眼前的话说完':'让时日向前'}</strong><p>约期、回报与重点周会停下，常例月账沿途逐月记入。</p></div>${button('等到下一件要紧事 →','week-forward','primary-btn')}${button('逐项向后走','week-advance','text-btn')}</div><div class="button-row">${button('为本季再留一周','week-extend','text-btn')}${ordinal(s.date)===horizonDay(s)?button(isEighth(s)?'据实封存最终史册':isSeventh(s)?'据实收存第七卷':isSixth(s)?'据实收存第六卷':isFifth(s)?'据实收存第五卷':isFourth(s)?'据实收存第四卷':hasContinuation(s)?'据实收存第三卷':'据实封存初卷','seal','secondary-btn'):''}</div>`:''}`;
}
