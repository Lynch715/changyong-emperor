import {monthlyBudget} from './weekly-economy.js';
import {isEighth,eighthEligible,eighthStage} from './volume8.js';
import {V8_RULES} from './volume8-content.js';
import {V7_RULES} from './volume7-content.js';
import {isSeventh,seventhEligible,seventhEventDate} from './volume7.js';
import {V6_RULES} from './volume6-content.js';
import {isSixth,sixthEligible} from './volume6.js';
import {V5_RULES} from './volume5-content.js';
import {isFifth,fifthEligible,fifthEventDate} from './volume5.js';
import {V4_RULES} from './volume4-content.js';
import {activeVolume,continuationWeeks,continuationRoot,isFourth} from './longform.js';
import {EXTENSION_WEEK_RULES} from './extension-content.js';
import {V3_RULES,V3_WEEKS} from './volume3-content.js';
import {hasContinuation,horizonDay,horizonDate,horizonStamp,horizonMonths,longformStops} from './longform.js';
import {validateGovernance} from './governance.js';
import {incenseStop,incenseReuse} from './incense.js';
import {makeWeekReview,validateWeekReviews} from './week-experience.js';
import {configureActivity,itemAvailable,assertActivityStart,finishActivity,recordActivityDelivery,activityStops,validateActivities} from './activities.js';
import {PROJECT_EVENTS,PROJECT_EVENT_RULES} from './project-content.js';
import {personPresence} from './relationship-schedule.js';
import {relationshipStops,recordRelationshipPlan,recordRelationshipDelivery,recordAcceptedExpectation,recordRelationshipBreach,validateRelationships} from './relationships.js';
import {projectEventView,projectSuspended,resolveProjectNotice,validateProjects,syncProjectStatuses} from './projects.js';
import {RuleError,hash} from './rules.js';
import {legacyIncomeStart,legacyCarryCapacity} from './migration-policy.js';
import {ordinal,fromOrdinal,addDays,dateTurn,stamp,unstamp,monthKey,validDate} from './calendar.js';
import {FOCUS_WEEKS,WEEK_EVENT_RULES as BASE_WEEK_EVENT_RULES} from './week-content.js';
import {EVENTS,NAMES} from './content.js';
import {promiseStory} from './story.js';
const copy=x=>structuredClone(x),id=()=>crypto.randomUUID(),date=a=>({year:a[0],month:a[1],day:a[2]});
const WEEK_EVENT_RULES={...BASE_WEEK_EVENT_RULES,...PROJECT_EVENT_RULES,...EXTENSION_WEEK_RULES,...V3_RULES,...V4_RULES,...V5_RULES,...V6_RULES,...V7_RULES,...V8_RULES};
const allEvents=s=>[...Object.values(EVENTS),...Object.values(PROJECT_EVENTS)].filter(e=>!e.volume||e.volume<=activeVolume(s)),eventById=id=>EVENTS[id]||PROJECT_EVENTS[id];
export const WEEK_WORLD='changyong-week-s02-1';
export const isWeekly=s=>s?.worldVersion===WEEK_WORLD;
export const weeklyKey=s=>currentWeek(s)?.id||`regular-${ordinal(s.date)}`;
const FINAL={year:2,month:12,day:30};
 const FINAL_STAMP=stamp(FINAL,'evening');
export const planLive=p=>['accepted','executing'].includes(p.status);
export const weekCapacity=(s,w)=>!w||s.weekly.migration?.mode==='sealed'&&!hasContinuation(s)?0:s.weekly.migration?.carryWeekId===w.id?s.weekly.migration.carryCapacity:6;
export const monthlyStart=s=>s.weekly.migration?.firstIncomeMonth||1;
export const monthlyGoal=s=>Math.max(0,horizonMonths(s)+1-monthlyStart(s));
export const weeklyActivityKey=(s,name)=>{const key=`${name}@${weeklyKey(s)}`;return s.weekly.migration?.aliases[key]||key;};
const mainWindow=(s,id)=>s.weekly.migration?.eventWindows[id]||{date:date(WEEK_EVENT_RULES[id].window.recommended),period:WEEK_EVENT_RULES[id].period||'day'};
export function currentWeek(s){return s.weekly.weeks.find(w=>w.status!=='ended'&&ordinal(s.date)>=ordinal(w.start)&&ordinal(s.date)<=ordinal(w.end))||null;}
export function weekAt(s,d){return s.weekly.weeks.find(w=>w.status!=='ended'&&ordinal(d)>=ordinal(w.start)&&ordinal(d)<=ordinal(w.end))||null;}
export function initializeWeekly(s){
 s.saveVersion=2;s.worldVersion=WEEK_WORLD;s.remaining=6;s.closureRemaining=0;
 s.weekly={version:1,economy:{version:2},clock:stamp(s.date),weeks:FOCUS_WEEKS.map(w=>({id:w.id,start:date(w.start),end:date(w.end),quarter:dateTurn(date(w.start)),type:'focus',status:'open'})),plans:[],consumed:{},rewarded:{},monthly:[],reports:[],notices:[],stop:null};
 syncWeek(s);return s;
}
export function reservedMoney(s,excludeId=null){return s.weekly.plans.filter(p=>p.status==='accepted'&&p.id!==excludeId).reduce((n,p)=>n+p.money,0);}
export const spendableMoney=s=>s.stats.treasury-reservedMoney(s);
export function usedSlots(s,weekId){return Object.values(s.weekly.consumed).filter(c=>c.weekId===weekId).reduce((n,c)=>n+c.slots,0);}
export function heldSlots(s,weekId,excludeId=null){return s.weekly.plans.filter(p=>(p.status==='accepted'&&p.weekId===weekId||p.status==='needs-reschedule'&&p.carryHoldWeekId===weekId)&&p.id!==excludeId&&!s.weekly.consumed[p.costGroup]).reduce((n,p)=>n+p.slots,0);}
export function syncWeek(s){const d=unstamp(s.weekly.clock);s.date=d.date;s.turn=dateTurn(s.date);const w=currentWeek(s);s.remaining=w?weekCapacity(s,w)-usedSlots(s,w.id)-heldSlots(s,w.id):0;syncProjectStatuses(s);}
export function weekActorUnlocked(s,cid){if(!NAMES[cid])return false;if(s.weekly.migration?.knownActors.includes(cid))return true;if(cid==='C01')return true;const needed={C03:'M10',C04:'M08',C05:'M09',C08:'M06',C09:'M06',C10:'M06'}[cid];return !needed||!!s.events[needed]?.completed||!!s.sceneDates?.[needed]&&ordinal(s.sceneDates[needed])===ordinal(s.date);}
export function weekCanMeet(s,cid,d,{promised=false,period=s.weekly.clock%2?'evening':'day',scene=false,legacy=false}={}){
 if(!weekActorUnlocked(s,cid))return false;
 if(s.weekly.relationships)return personPresence(s,cid,d,period,{promised,scene,legacy}).available;
 if(cid==='C03'&&s.weekly.migration?.legacyVisit){const v=s.weekly.migration.legacyVisit;if(ordinal(d)>=ordinal(v.start)&&ordinal(d)<=ordinal(v.end))return true;}
 if(cid==='C03')return ordinal(d)>=ordinal({year:2,month:4,day:7})&&ordinal(d)<=ordinal({year:2,month:4,day:9});
 // A formal accepted invitation supplies the prince's visit authorization; he is never permanently on duty in the garden.
 if(cid==='C05')return promised||[[2,4,2],[2,4,4]].some(a=>ordinal(date(a))===ordinal(d));
 return true;
}
function baseWeekEvent(s,e){if((s.weekly.migration?.documentEvents.includes(e.id)||['G04','G05'].includes(e.id)&&s.events.M10?.completed&&!weekCanMeet(s,'C03',s.date))){const actor=s.flags.militaryRecord?.officer||'C28',body=e.id==='G04'?`旧日军需副册重新送到御案，两笔相同支领仍圈在原处。年羹尧当时的说明附在册后。现在要决定先给多少、由谁核账，承办人${NAMES[actor]}等你落笔；远处的将军通过公文往来。`:`前一份军需朱批与粮道交接单放在一起。${NAMES[actor]}呈来经手人的记录：拨下去的银有人接，路上的粮也须有人押。你核对原来已付的项目，再决定还要补哪一处，不把同一笔押运重付一次。`;return {...e,actor,documentContinuation:true,location:'御案阅军需文书',body,sceneVisible:body};}const r=WEEK_EVENT_RULES[e.id];if(!r)return e;return {...e,actor:e.id==='G06'?(s.flags.militaryRecord?.officer||'C28'):r.actor,location:e.id==='G06'?'御案阅承办人回执':e.location};}
export function weekEvent(s,e){const out=projectEventView(s,baseWeekEvent(s,e));if(['R03-03','R03-04','R03-05'].includes(e.id)&&(s.deferred.includes(e.id)||e.id==='R03-05')&&!weekCanMeet(s,'C03',s.date)){const body=e.id==='R03-05'?'副将轮替后的那半句话，今日另写成边书。年羹尧仍在西北，你只写自己看到的本批交接与想问的近况，不把信纸当成他已经到场。\n\n信与答复各有实际驿程，送达之后另等回信；未核的权限与尚未说出的心意都不提前补写。':'那一回献图后的半句话，今日另写成边书。年羹尧仍在西北，你只写自己要说的，不将信纸当成他已经到场。\n\n图与军权各有原簿，信与答复也各有驿程；尚未送达的话，不先填成他的回应。';return {...out,remoteRelation:true,location:'御案续写献图边书',body,sceneVisible:body};}if(e.id==='R03-01'&&!s.events[e.id]?.completed&&!weekCanMeet(s,'C03',s.date)&&s.deferred.includes(e.id)){const body='凯旋时没能说完的那页舆图，又由驿递送到案边。年羹尧仍在西北，这一次，你把战功之外想问的话写进回信。\n\n“图上的这一处，朕还记着。只是那日仓促，还有半句想听你自己说完。”\n\n信要先走到他手里；他的意思，还须等另一程驿路。';return {...out,remoteRelation:true,location:'御案拟写边书补谈',body,sceneVisible:'正在拟写边书补谈，双方不在同地。未送达的话不等于对方已收到，不能生成当面回应。'};}return out;}
export function weekEventCost(s,e,d=s.date){if(isEighth(s)&&e.id==='G24')return 0;if(isEighth(s)&&e.volume===8&&e.kind==='relation'){const stageId={'R03-06':'M43#arrival','R02-06':'M44#farewell','R04-06':'M45#diagnosis','R05-06':'M45#flute','R06-06':'M46#yixiu','R07-06':'M46#shilan','R08-06':'M46#lingrong'}[e.id];const p=eighthStage(s,stageId);return p&&ordinal(p.date)===ordinal(d)?0:1;}if(e.id==='P12')return 1;if(['G19','G16','G07','G13','G10','G22'].includes(e.id))return 0;if(incenseReuse(s,e.id)&&ordinal(d)===ordinal(s.date)&&ordinal(weekEventDate(s,e))===ordinal(s.date))return 0;if(e.projectStage==='discover')return 0;if(e.kind==='main'||e.kind==='followup')return 0;if(e.parent&&!s.deferred.includes(e.id)&&s.events[e.parent]&&ordinal(s.events[e.parent].date)===ordinal(d))return 0;return 1;}
export function weekEventKey(s,e){return e.kind==='daily'?weeklyActivityKey(s,e.id):e.id;}
function complete(s,e){return !!s.events[weekEventKey(s,e)]?.completed;}
export function weekEventDate(s,e){
 const planned=s.weekly.plans.find(p=>p.eventId===e.id&&p.status==='accepted');if(planned)return copy(planned.date);
 const adultDate=seventhEventDate(s,e);if(adultDate)return adultDate;
 const dated=fifthEventDate(s,e);if(dated)return dated;
 const cached=s.sceneDates?.[weekEventKey(s,e)];if(cached&&ordinal(cached)>=ordinal(s.date))return copy(cached);
 const rule=WEEK_EVENT_RULES[e.id];let n=ordinal(s.date);
 if(e.kind==='main')n=Math.max(n,ordinal(mainWindow(s,e.id).date));
 else if(e.kind==='followup'){const q=s.queue.find(q=>q.eventId===e.id);if(q?.dueDate)n=Math.max(n,ordinal(q.dueDate));}
 else if(e.parent&&!s.deferred.includes(e.id)&&s.events[e.parent])n=Math.max(n,ordinal(s.events[e.parent].date));
 else if(rule?.window.earliest)n=Math.max(n,ordinal(date(rule.window.earliest)));
 if(rule?.minimumDaysAfterPrevious){const first=s.events[rule.requires[0]];if(first)n=Math.max(n,ordinal(first.date)+rule.minimumDaysAfterPrevious);}
 return fromOrdinal(n);
}
function dependencies(s,e){if(!fifthEligible(s,e)||!sixthEligible(s,e)||!seventhEligible(s,e)||!eighthEligible(s,e))return false;if(['R03-03','R03-04','R03-05'].includes(e.id)&&s.weekly.relationships?.requests.some(r=>r.actor==='C03'&&r.status==='pending'))return false;return (WEEK_EVENT_RULES[e.id]?.requires||e.requires||[]).every(k=>s.events[k]?.completed||!(e.kind==='extension'||e.kind==='relation'&&e.id.endsWith('02'))&&s.deferred.includes(k));}
// A missed recommendation is not a completed scene. Keep one-off work available,
// while a full round trip to the frontier must still fit before the first-volume end.
export function weekLastDay(s,e){
 if(e.volume)return e.remoteRelation?horizonDay(s)-14:horizonDay(s);
 if(e.kind==='extension')return horizonDay(s);
 if(e.id==='R03-02'||e.id==='R03-01'&&s.deferred.includes(e.id)&&!weekCanMeet(s,'C03',s.date))return horizonDay(s)-14;
 if(['G01','G02','G04','G05','P01','P09','P10','P11'].includes(e.id))return horizonDay(s)-1;
 if(s.weekly.migration?.recoverableEventIds.includes(e.id))return horizonDay(s);
 return WEEK_EVENT_RULES[e.id]?.window.latest?ordinal(date(WEEK_EVENT_RULES[e.id].window.latest)):horizonDay(s);
}
export function weekPendingEmbedded(s){return allEvents(s).filter(e=>e.parent&&dependencies(s,e)&&s.events[e.parent]?.completed&&!complete(s,e)&&!s.deferred.includes(e.id)&&!projectSuspended(s,e.id));}
export function weekDueItems(s){return s.queue.filter(q=>!q.projectPaused&&q.dueDate&&ordinal(q.dueDate)<=ordinal(s.date)&&!s.events[q.eventId]?.completed).sort((a,b)=>ordinal(a.dueDate)-ordinal(b.dueDate));}
 export function weekRequired(s){if(s.sealed)return [];return [...weekDueItems(s).map(q=>weekEvent(s,eventById(q.eventId))),...weekPendingEmbedded(s).map(e=>weekEvent(s,e)),...allEvents(s).filter(e=>e.kind==='main'&&!complete(s,e)&&eighthEligible(s,e)&&stamp(mainWindow(s,e.id).date,mainWindow(s,e.id).period)<=s.weekly.clock).slice(0,1).map(e=>weekEvent(s,e))];}
export function weekAvailable(s){
 if(s.sealed)return [];
 return allEvents(s).filter(e=>{
  if(e.id==='R03-02'&&s.weekly.relationships?.requests.some(r=>r.sourceNode==='R03-01'&&r.status==='pending'))return false;
  if((!currentWeek(s)&&e.projectStage!=='discover'&&!(isEighth(s)&&e.id==='G24'))||projectSuspended(s,e.id)||['main','followup'].includes(e.kind)||complete(s,e)||e.parent&&!s.deferred.includes(e.id)||!dependencies(s,e))return false;
  if(e.kind==='dilemma'){const w=WEEK_EVENT_RULES[e.id]?.window;if(!w||ordinal(s.date)<ordinal(date(w.earliest))||ordinal(s.date)>ordinal(date(w.latest)))return false;}
  if(!weekActorUnlocked(s,weekEvent(s,e).actor))return false;
  if(e.kind==='daily'&&e.season!=='any'&&e.season!==['春','夏','秋','冬'][Math.floor((s.date.month-1)/3)])return false;
  const d=weekEventDate(s,e),r=WEEK_EVENT_RULES[e.id];
  if(ordinal(d)>weekLastDay(s,e))return false;
 return (isEighth(s)&&e.id==='G24'||e.projectStage==='discover'||!!weekAt(s,d)&&weekAt(s,d).id===currentWeek(s)?.id)&&(weekEvent(s,e).actor!=='C03'||weekEvent(s,e).remoteRelation||e.id==='R03-02'||e.id==='D06'||weekCanMeet(s,'C03',d));
 }).map(e=>weekEvent(s,e));
}
function eventStops(s){
 const rows=[];
 for(const e of allEvents(s))if(e.kind==='main'&&!complete(s,e)&&eighthEligible(s,e)){const rule=mainWindow(s,e.id);rows.push({kind:'event',id:e.id,label:e.title,at:Math.max(s.weekly.clock,stamp(rule.date,rule.period))});}
 for(const e of weekPendingEmbedded(s))rows.push({kind:'event',id:e.id,label:e.title,at:s.weekly.clock});
 for(const q of s.queue)if(!q.projectPaused&&q.dueDate&&!s.events[q.eventId]?.completed)rows.push({kind:'event',id:q.eventId,label:eventById(q.eventId).title,at:Math.max(s.weekly.clock,stamp(q.dueDate))});
 return rows;
}
export function weekStops(s){
 const rows=[...eventStops(s),...longformStops(s)],now=s.weekly.clock;
 for(const n of [...relationshipStops(s),...activityStops(s),...[incenseStop(s)].filter(Boolean)])rows.push({...n,at:stamp(n.date)});
 for(const p of s.weekly.plans.filter(planLive))rows.push({kind:'plan',id:p.id,label:p.label,at:Math.max(now,stamp(p.date,p.period))});
 for(const n of s.weekly.notices.filter(n=>n.status==='pending'&&!n.suspended))rows.push({kind:'notice',id:n.id,label:n.label,at:Math.max(now,stamp(n.date))});
 for(const w of s.weekly.weeks){if(w.status==='ended')continue;const begin=stamp(w.start),end=stamp(addDays(w.end,1));if(begin>now)rows.push({kind:'week-start',id:w.id,label:'进入下一个重点周',at:begin});if(end>=now&&end<=horizonStamp(s))rows.push({kind:'week-end',id:w.id,label:'本周收笔',at:end});}
 for(let m=monthlyStart(s);m<=horizonMonths(s);m++){const d={year:Math.floor((m-1)/12)+1,month:(m-1)%12+1,day:30};if(!s.weekly.monthly.some(x=>x.key===monthKey(d)))rows.push({kind:'month',id:monthKey(d),label:'月度收支',at:Math.max(now,stamp(d,'evening'))});}
 const priority={'event':0,'notice':1,'plan':2,'month':3,'week-end':4,'week-start':5,'relationship':6,'activity':7,'incense':8,'volume-review':0,'family':0};
 return rows.sort((a,b)=>a.at-b.at||priority[a.kind]-priority[b.kind]);
}
export function moveWeekly(s,d,period=s.weekly.clock%2?'evening':'day',{ignorePlanId=null,allowEventId=null}={}){
 const target=stamp(d,period);if(target<s.weekly.clock)throw new RuleError('过去的日期和时段不能倒放。');if(target>horizonStamp(s))throw new RuleError('日期超出首版二年末。');
 const blocking=weekStops(s).find(x=>x.at<target&&!(x.kind==='plan'&&x.id===ignorePlanId)&&!(x.kind==='event'&&x.id===allowEventId));
 if(blocking)throw new RuleError(`先处理较早的「${blocking.label}」，再向后安排。`,'TIME_BLOCK');
 s.weekly.clock=target;syncWeek(s);
}
export function assertWeeklyEvent(s,e){
 if(e.volume>activeVolume(s))throw new RuleError('本卷事件尚未显式开放。');
 if(e.id==='R05-05'&&isSeventh(s)){const v=s.weekly.continuation.visit,p=s.weekly.plans.find(p=>p.eventId===e.id&&p.status==='accepted');if(!p&&(!v||ordinal(s.date)<ordinal(v.start)||ordinal(s.date)>ordinal(v.end)))throw new RuleError('先明确接受二十二年允礼本次奉事往返，再按真实日期相见。');}
 if(e.id==='M29'&&isFifth(s)){const v=s.weekly.continuation.visit,p=s.weekly.plans.find(p=>p.eventId===e.id&&p.status==='accepted');if(!p&&(!v||ordinal(s.date)<ordinal(v.start)||ordinal(s.date)>ordinal(v.end)))throw new RuleError('先明确接受十一年允礼奉事往返，再依实际日期相见。');}
 if(e.id==='M20'){const v=s.weekly.continuation?.visit,p=s.weekly.plans.find(p=>p.eventId===e.id&&p.status==='accepted');if(!p&&(!v||ordinal(s.date)<ordinal(v.start)||ordinal(s.date)>ordinal(v.end)))throw new RuleError('先明确接受允礼这次王府奉事往返，再按真实日期相见。');}
 if(s.sealed||complete(s,e))throw new RuleError('该事件尚未到日期、前置未齐，或本周尚无可用窗口。');
 if(!dependencies(s,e))throw new RuleError('前置尚未处理。');
 if(e.id==='R03-02'&&s.weekly.relationships?.requests.some(r=>r.sourceNode==='R03-01'&&r.status==='pending'))throw new RuleError('首封补谈边书的答复还在路上，先听完那半句话，再续下一封。');
 if(![...weekRequired(s),...weekAvailable(s)].some(x=>x.id===e.id)&&!s.weekly.plans.some(p=>p.eventId===e.id&&p.status==='accepted'))throw new RuleError('该事件尚未到日期、前置未齐，或本周尚无可用窗口。');
 const d=weekEventDate(s,e);if(ordinal(d)>weekLastDay(s,e))throw new RuleError('初卷剩余日期已不足这场实际安排，未谈部分留在原记录，不补作已完成。');if(weekEventCost(s,e,d)>0&&!weekAt(s,d))throw new RuleError('须安排在已建立的重点或延展周。');
 if(e.actor==='C03'&&!e.documentContinuation&&!e.remoteRelation&&!['M10','R03-02','D06'].includes(e.id)&&!weekCanMeet(s,'C03',d))throw new RuleError('将军当日外任，只能通信，不能瞬移会面。');
 if(s.weekly.relationships&&['relation','extension'].includes(e.kind)&&!e.remoteRelation&&!['R03-02'].includes(e.id)){const p=s.weekly.plans.find(p=>p.eventId===e.id&&p.status==='accepted');if(!weekCanMeet(s,e.actor,d,{promised:!!p&&e.actor==='C05',period:p?.period||WEEK_EVENT_RULES[e.id]?.period||'day',scene:true,legacy:!!p&&s.weekly.relationships.legacyPlanIds.includes(p.id)}))throw new RuleError('对方此时病休、外任或尚未约定入宫，请改到可用日期，不把人直接写到场。');}
 return e;
}
function groupFor(s,e){const shared=incenseReuse(s,e.id);if(shared&&ordinal(weekEventDate(s,e))===ordinal(s.date))return shared;return e.kind==='daily'?`${WEEK_EVENT_RULES[e.id].costGroup}@${weeklyKey(s)}`:e.parent&&!s.deferred.includes(e.id)&&ordinal(s.events[e.parent]?.date||s.date)===ordinal(s.date)?`SC-${e.parent}`:WEEK_EVENT_RULES[e.id]?.costGroup||`SC-${e.id}`;}
function occupied(s,d,period,excludeId=null){const at=stamp(d,period);return s.weekly.plans.some(p=>planLive(p)&&p.id!==excludeId&&at>=stamp(p.date,p.period)&&at<stamp(p.date,p.period)+p.slots)||Object.values(s.weekly.consumed).some(g=>at>=g.at&&at<g.at+g.slots);}
function checkCapacity(s,d,period,slots,excludeId=null){
 if(!slots)return;
 const w=weekAt(s,d);if(!w)throw new RuleError('目标日期没有已建立的可操作周，请先保留候选或创建本季延展周。');
 if(stamp(d,period)<s.weekly.clock)throw new RuleError('不能预约过去的时段。');
 if(slots===2&&period!=='day')throw new RuleError('两格小宴须占同日日间和晚间。');
 if(usedSlots(s,w.id)+heldSlots(s,w.id,excludeId)+slots>weekCapacity(s,w))throw new RuleError('目标周六格已不足。');
 for(let i=0;i<slots;i++){const moment=unstamp(stamp(d,period)+i);if(ordinal(moment.date)!==ordinal(d)||occupied(s,moment.date,moment.period,excludeId))throw new RuleError('该日时段已被占用，请换一个空位。');}
}
export function spendWeeklyEvent(s,e,{planId=null}={}){
 const cost=weekEventCost(s,e),group=groupFor(s,e),plan=planId?s.weekly.plans.find(p=>p.id===planId):s.weekly.plans.find(p=>p.status==='accepted'&&p.eventId===e.id);
 if(s.weekly.plans.some(p=>p.status==='executing'&&p.id!==plan?.id))throw new RuleError('先完成正在进行的活动。');
 if(plan){if(plan.eventId!==e.id||plan.status!=='accepted')throw new RuleError('这项预约不属于本场节点。');moveWeekly(s,plan.date,plan.period,{ignorePlanId:plan.id,allowEventId:e.id});plan.status='executing';}
 else {const d=weekEventDate(s,e);moveWeekly(s,d,e.volume&&e.kind==='relation'?WEEK_EVENT_RULES[e.id]?.period||'evening':ordinal(d)===ordinal(s.date)&&s.weekly.clock%2?'evening':'day',{allowEventId:e.id});}
 const effective=plan?plan.slots:cost;
 if(effective&&!s.weekly.consumed[group]){checkCapacity(s,s.date,s.weekly.clock%2?'evening':'day',effective,plan?.id);const w=currentWeek(s);s.weekly.consumed[group]={weekId:w.id,at:s.weekly.clock,slots:effective,source:e.id};}
 syncWeek(s);return {cost:effective,group,plan};
}
export function finishWeeklyEvent(s,e,paid,tx){
 if(paid.plan){paid.plan.status='completed';paid.plan.completedTransaction=tx;}
 if(e.id==='M26')enqueueNotice(s,{id:'v5-relief-dispatch-'+tx,date:addDays(s.date,7),label:'春荒本批经手送达：'+({emergency:'六点救急到经手，实领与重名仍等二十一日回执',sample:'两点抽查材料到经手，未拨救济仍是缺口',pause:'未拨本批粮，延误与待核仍保留'}[s.events.M26.outcomeId]),type:'delivery',actor:'C31',source:'M26'});
 if(e.id==='M13')enqueueNotice(s,{id:'v3-dispatch-'+tx,date:addDays(s.date,7),label:'本批西北处置送达：'+({supply:'应急六点，仍须独立回执',audit:'核转运两点，补给未足部分待议',pause:'未新增粮款，仍保留缺口'}[s.events.M13.outcomeId]),type:'delivery',actor:'C03',source:'M13'});
 if(e.followup&&!s.queue.some(q=>q.eventId===e.followup)){const days=e.minimumFollowupDays||(e.followup==='G06'?21:7),d=addDays(s.date,days);s.queue.push({eventId:e.followup,dueDate:d,dueTurn:dateTurn(d),source:e.id,minimumDays:days});}
 // An outgoing message is not a received message. Delivery is processed on its actual day.
 if(e.id==='R03-02'||e.remoteRelation)enqueueNotice(s,{id:`delivery-${tx}`,date:addDays(s.date,7),label:'西北回信送达',type:'delivery',actor:'C03',source:e.id,pendingRelation:paid.pendingRelation||null});
 s.weekly.rewarded[e.id]=tx;
 // Scene text may continue at this instant (embedded nodes); only paid independent activities consume the clock.
 if(paid.cost){s.weekly.clock=Math.min(s.weekly.clock+paid.cost,stamp(s.date,'evening'));syncWeek(s);}
 s.weekly.stop=null;
}
// Preserve the old paid repair option for a crisis actually present at cutover.
export function spendProjectSlot(s,source,tx){
 if(weekRequired(s).length)throw new RuleError('请先处理眼前剧情与回报。');
 const moment=nextFreeMoment(s);moveWeekly(s,moment.date,moment.period);const event={id:source,kind:'government'},paid=spendWeeklyEvent(s,event);finishWeeklyEvent(s,event,paid,tx);
}
export function spendRelationshipSlot(s,cid,source,tx,{letter=false,sameOnly=false,independent=false}={}){
 if(weekRequired(s).length)throw new RuleError('先处理眼前剧情与回报，再把这段话说完。');
 const scene=Object.values(s.transcripts).at(-1),sceneIndex=scene?s.transactions.findIndex(t=>t.id===scene.transactionId):-1;
 const sameScene=scene?.actor===cid&&ordinal(scene.date)===ordinal(s.date)&&/^(R|XR)/.test(scene.eventId)&&scene.eventId!=='R03-02'&&s.events[scene.eventId]?.channel!=='letter'&&sceneIndex>=0&&s.transactions[sceneIndex].revisionAfter>s.weekly.relationships.cutoverRevision&&!s.transactions.slice(sceneIndex+1).some(t=>t.results.some(r=>r.actionCost>0));
 if(sameScene&&!letter&&!independent)return {cost:0,sceneId:scene.eventId};
 const last=Object.values(s.weekly.consumed).sort((a,b)=>b.at-a.at)[0];
 const same=s.weekly.plans.find(p=>p.id===last?.source&&(p.actor===cid||p.guests?.includes(cid))&&['meet','chat','walk','bond','banquet'].includes(p.kind)&&p.status==='completed'&&ordinal(p.date)===ordinal(s.date)&&(s.weekly.relationships?.encounters.some(e=>e.planId===p.id)||!!p.activity));
 if(same&&!letter&&!independent)return {cost:0,planId:same.id};
 if(sameOnly)throw new RuleError('同场已经结束，下一次长谈请另约时段。');
 const w=currentWeek(s);if(!w)throw new RuleError('正式谈心或写信须留出一格；眼下可先阅信，或为本季留一周。');
 for(let at=s.weekly.clock;at<=stamp(w.end,'evening');at++){
  const moment=unstamp(at);if(!letter&&!personPresence(s,cid,moment.date,moment.period).available)continue;
  try{checkCapacity(s,moment.date,moment.period,1);}catch{continue;}
  moveWeekly(s,moment.date,moment.period);const e={id:source,kind:'relation'},paid=spendWeeklyEvent(s,e);finishWeeklyEvent(s,e,paid,tx);s.weekly.consumed[paid.group].label=(letter?'给':'与')+NAMES[cid]+(letter?'写心意信':source.startsWith('REL-REPAIR-')?'补谈':'谈心');return {cost:1};
 }
 throw new RuleError('本周没有对方可用的空时段，可另约合法时段或选择写信。');
}
export function spendLegacyRepair(s,stat,tx){
 if(s.sealed||!s.weekly.migration?.source.crises[stat]?.active||!s.crises[stat]?.active)throw new RuleError('没有可承接修复的旧危机。');
 if(weekRequired(s).length)throw new RuleError('请先处理眼前剧情与回报。');
 const moment=nextFreeMoment(s);moveWeekly(s,moment.date,moment.period);
 const event={id:'LEGACY-REPAIR-'+stat,kind:'government'},paid=spendWeeklyEvent(s,event);
 finishWeeklyEvent(s,event,paid,tx);
}
export function nextFreeMoment(s,slots=1){const w=currentWeek(s);if(!w)throw new RuleError('眼下在常规时段，须等到重点周或创建可用延展周。');for(let at=s.weekly.clock;at<=stamp(w.end,'evening');at++){const m=unstamp(at);try{checkCapacity(s,m.date,m.period,slots);return m;}catch{}}throw new RuleError('本周没有可排的时段。');}
const kinds={meet:{slots:1,money:0,label:'赴约'},chat:{slots:1,money:0,label:'交谈'},letter:{slots:1,money:0,label:'写信'},rest:{slots:1,money:0,label:'专注休养'},study:{slots:1,money:0,label:'灯下读书'},training:{slots:1,money:0,label:'习武'},banquet:{slots:2,money:3,label:'小宴'},walk:{slots:1,money:0,label:'散步'},gift:{slots:1,money:0,label:'登门送礼'},craft:{slots:1,money:1,label:'备制新物'},bond:{slots:1,money:0,label:'亲近相伴'},scene:{slots:1,money:0,label:'约定相谈'}};
const isLetterPlan=p=>p.kind==='letter'||p.channel==='letter'||['R03-02','D06'].includes(p.eventId);
function makePlan(s,a,tx){
 const kind=a.kind||({meet:'meet',letter:'letter',rest:'rest'}[a.purpose]),cfg=kinds[kind];if(!cfg)throw new RuleError('本阶段不支持这类活动。');
 const actor=a.actor||'C01';if(['C09','C10'].includes(actor)&&!s.transactions.some(t=>t.id===s.events.M06?.transactionId))throw new RuleError('先单独完成殿前相见，再安排她的日常。');if(actor!=='C01'&&((!s.relations[actor]&&!(['scene','chat','meet','walk','gift','bond'].includes(kind)&&['C09','C10'].includes(actor)))||!weekActorUnlocked(s,actor)))throw new RuleError('人物尚未相见，不能预约。');
 if(['meet','chat','letter','gift','bond'].includes(kind)&&actor==='C01')throw new RuleError('请选一位已经相见的人。');
 let eventId=null;if(kind==='scene'){eventId=a.eventId;const e=EVENTS[eventId];if(!e||!['relation','extension'].includes(e.kind)||complete(s,e)||!dependencies(s,e)||e.parent&&!s.deferred.includes(e.id)||e.actor!==actor)throw new RuleError('这项相谈必须来自已解锁的同一人物节点。');}
 const moment=a.date?{date:copy(a.date),period:'day'}:nextFreeMoment(s,cfg.slots),d=moment.date,period=a.period||moment.period;stamp(d,period);
 if(ordinal(d)>ordinal(horizonDate(s)))throw new RuleError('安排超出首版日期。');
 const guests=kind==='banquet'?a.guests:[];if(kind==='banquet'&&(!Array.isArray(guests)||guests.length<2||guests.length>3||new Set(guests).size!==guests.length||guests.some(cid=>!s.relations[cid]||!weekActorUnlocked(s,cid))))throw new RuleError('小宴请选2至3位已相见的宾客。');
 const p={id:id(),kind,actor,...(eventId&&weekEvent(s,EVENTS[eventId]).remoteRelation?{channel:'letter'}:{}),label:`${actor==='C01'?'':NAMES[actor]+' · '}${eventId?EVENTS[eventId].title:cfg.label}${kind==='banquet'?' · '+guests.map(cid=>NAMES[cid]).join('、'):''}`,date:d,period,slots:cfg.slots,money:cfg.money,guests:copy(guests),eventId,costGroup:eventId?WEEK_EVENT_RULES[eventId].costGroup:`PLAN-${id()}`,weekId:weekAt(s,d)?.id||null,status:a.status==='candidate'?'candidate':a.status==='draft'?'draft':'accepted',createdTransaction:tx,history:[],purpose:kind==='letter'||eventId&&weekEvent(s,EVENTS[eventId]).remoteRelation||['R03-02','D06'].includes(eventId)?'letter':kind==='rest'?'rest':'meet',dueTurn:dateTurn(d),visibleTo:kind==='banquet'?['C01',...guests]:kind==='letter'||eventId&&weekEvent(s,EVENTS[eventId]).remoteRelation||['R03-02','D06'].includes(eventId)?['C01']:['C01',actor]};
 configureActivity(s,p,a);return p;
}
// Read-only projection. A suggested window is neither an accepted invitation nor a reward.
export function weekNodeStatus(s,event){
 const e=weekEvent(s,event),key=weekEventKey(s,e),p=s.weekly.plans.find(p=>p.eventId===e.id&&planLive(p));
 const allowed=!s.sealed&&!s.events[key]?.completed&&dependencies(s,e)&&weekActorUnlocked(s,e.actor)&&!projectSuspended(s,e.id);
 const first=weekEventDate(s,e),last=weekLastDay(s,e),canDefer=!!e.parent&&!!s.events[e.parent]?.completed&&!s.deferred.includes(e.id)&&!p;
 const waiting=e.id==='R03-02'&&s.weekly.relationships?.requests.some(r=>r.sourceNode==='R03-01'&&r.status==='pending');
 const out={id:e.id,actor:e.actor,title:e.title,canDefer:allowed&&canDefer,ready:false,next:null,reason:''};
 if(!allowed){out.reason=projectSuspended(s,e.id)?'这件差事已暂停，先沿项目原簿复办，工期不从旧日期偷走。':'这句话还未走到，或已经留在旧事里。';return out;}
 if(waiting){out.reason='首封补谈边书的答复还在路上，先等那半句话走回来。';return out;}
 if(ordinal(first)>last){out.reason=e.actor==='C03'?'封卷前已不足一来一回的驿程，这半句话保留未谈，不编造到信。':'初卷剩余日期已不足另约，原话保留未谈。';return out;}
 const period=p?.period||(ordinal(first)===ordinal(s.date)&&s.weekly.clock%2?'evening':'day'),d=p?.date||first;
 const remote=!!e.remoteRelation||e.id==='R03-02',here=remote||!['relation','extension'].includes(e.kind)||personPresence(s,e.actor,d,period,{promised:!!p&&e.actor==='C05',scene:true,legacy:!!p&&s.weekly.relationships?.legacyPlanIds.includes(p.id)}).available;
 const cost=weekEventCost(s,e,d);let capacity=true;try{checkCapacity(s,d,period,p?.slots??cost,p?.id);}catch{capacity=false;}
 out.ready=here&&capacity&&(cost===0||!!weekAt(s,d))&&(!p||p.status==='accepted');
 if(p){out.next={date:copy(p.date),period:p.period,weekId:p.weekId,appointment:true,planId:p.id};out.reason='已留着原约，改期或取消须沿原约办理。';return out;}
 if(!here)out.reason=personPresence(s,e.actor,d,period,{scene:true}).reason;
 else if(!capacity||!weekAt(s,d))out.reason=currentWeek(s)&&!s.remaining?'这一周已经排满，原话仍留着，另留时辰再续。':'眼下没有可用的相谈时段，原话仍留着。';
 // Search actual free moments in existing weeks, then a legal single extension in this quarter.
 const q=dateTurn(s.date),focus=s.weekly.weeks.find(w=>w.type==='focus'&&w.quarter===q),extensionUsed=s.weekly.weeks.some(w=>['extension','transition'].includes(w.type)&&w.quarter===q);
 for(let n=Math.max(ordinal(first),ordinal(s.date));n<=last;n++){
  const nd=fromOrdinal(n),w=weekAt(s,nd),extension=!w&&!extensionUsed&&(!focus||n>ordinal(focus.end))&&dateTurn(nd)===q&&dateTurn(addDays(nd,6))===q;
  if(!w&&!extension)continue;
  for(const np of ['day','evening']){
   if(stamp(nd,np)<s.weekly.clock)continue;
   const appointment=e.actor==='C05'&&!personPresence(s,e.actor,nd,np,{scene:true}).available;
   if(!remote&&['relation','extension'].includes(e.kind)&&(!personPresence(s,e.actor,nd,np,{promised:appointment&&n>ordinal(s.date),scene:true}).available||appointment&&n<=ordinal(s.date)))continue;
   if(w){try{checkCapacity(s,nd,np,1);}catch{continue;}}
   out.next={date:nd,period:np,weekId:w?.id||null,extensionStart:extension?copy(nd):null,appointment,remote};return out;
  }
 }
 out.reason=out.reason||'初卷余下没有可用的相谈窗口，仍保留未谈。';return out;
}
export function weekResumptions(s){
 if(s.sealed)return [];
 return allEvents(s).filter(e=>!complete(s,e)&&dependencies(s,e)&&weekActorUnlocked(s,e.actor)&&ordinal(s.date)>=ordinal(date(WEEK_EVENT_RULES[e.id]?.window.earliest||[1,1,2]))&&(s.deferred.includes(e.id)||['relation','extension'].includes(e.kind)&&!e.parent||['government','side'].includes(e.kind)&&WEEK_EVENT_RULES[e.id]?.window.latest&&ordinal(s.date)>ordinal(date(WEEK_EVENT_RULES[e.id].window.latest)))).map(e=>({...weekNodeStatus(s,e),event:weekEvent(s,e)}));
}
function acceptPlan(s,p){
 if(p.kind==='gift'&&p.activity&&!itemAvailable(s,p.activity.itemId,p.id))throw new RuleError('约定中的新物已不在手中，请重新选择。');
 checkCapacity(s,p.date,p.period,p.slots,p.id);p.weekId=weekAt(s,p.date).id;
 if(s.weekly.relationships&&!s.weekly.relationships.legacyPlanIds.includes(p.id)&&!p.eventId&&!isLetterPlan(p)&&[p.actor,...p.guests].includes('C05')&&ordinal(p.date)<=ordinal(s.date)&&!personPresence(s,'C05',p.date,p.period).available)throw new RuleError('允礼常住王府，入宫至少提前一日约定；也可先通信。');
 if(p.eventId){const e=weekEvent(s,EVENTS[p.eventId]);if(e.remoteRelation)p.channel='letter';const earliest=weekEventDate(s,e);if(ordinal(p.date)<ordinal(earliest)||ordinal(p.date)>weekLastDay(s,e))throw new RuleError('约谈日期不在节点窗口内，请保留前次相处的实际间隔。');}
 if(p.actor!=='C01'&&!isLetterPlan(p)&&!weekCanMeet(s,p.actor,p.date,{promised:p.actor==='C05',period:p.period,scene:!!p.eventId,legacy:s.weekly.relationships?.legacyPlanIds.includes(p.id)}))throw new RuleError('对方当日在外任或不在京，可改期或通信。');
 for(const cid of p.guests)if(!weekCanMeet(s,cid,p.date,{promised:cid==='C05',period:p.period,scene:true,legacy:s.weekly.relationships?.legacyPlanIds.includes(p.id)}))throw new RuleError('宾客当日不能到场，须另选日期。');
 if(p.money>spendableMoney(s))throw new RuleError('扣除其他预约预算后国库不足。');
 if(p.eventId&&s.weekly.plans.some(x=>x.id!==p.id&&planLive(x)&&x.eventId===p.eventId))throw new RuleError('同一节点已有预约。');
 p.status='accepted';p.acceptedAt=copy(s.date);if(s.weekly.relationships)recordAcceptedExpectation(s,p);syncWeek(s);
}
function planRecord(s,a){const p=s.weekly.plans.find(x=>x.id===a.planId||x.id===a.promiseId);if(!p)throw new RuleError('没有这项周安排。');return p;}
function result(label,detail,extra={}){return {label,detail,actionCost:0,treasury:0,...extra};}
const planWhen=p=>`${p.date.year}年${p.date.month}月${p.date.day}日${p.period==='day'?'日间':'晚间'}${p.slots===2?'至晚间':''}`;
export function enqueueNotice(s,n){if(!validDate(n.date)||!n.id||s.weekly.notices.some(x=>x.id===n.id))throw new RuleError('到期事项标识或日期不合法。');s.weekly.notices.push({...copy(n),status:'pending'});}
function startPlan(s,p,tx){
 if(p.status!=='accepted')throw new RuleError('只有已接受的安排可以开始。');
 if(s.weekly.plans.some(x=>x.status==='executing'))throw new RuleError('先完成正在进行的活动。');
 if(p.eventId)throw new RuleError('已预约的剧情节点请进入原场景选择，同场不会重复收费。');
 moveWeekly(s,p.date,p.period,{ignorePlanId:p.id});
 if(weekRequired(s).length)throw new RuleError('先回应眼前的剧情或阅核到期回报，再开始这场活动。');
 if(p.actor!=='C01'&&!isLetterPlan(p)&&!weekCanMeet(s,p.actor,p.date,{promised:p.actor==='C05',period:p.period,scene:!!p.eventId,legacy:s.weekly.relationships?.legacyPlanIds.includes(p.id)}))throw new RuleError('履约当日对方不在，须协商改期或取消。');
 for(const cid of p.guests)if(!weekCanMeet(s,cid,p.date,{promised:cid==='C05',period:p.period,scene:true,legacy:s.weekly.relationships?.legacyPlanIds.includes(p.id)}))throw new RuleError('履约当日宾客不能到场，须协商改期或取消。');
 assertActivityStart(s,p);
 checkCapacity(s,p.date,p.period,p.slots,p.id);p.status='executing';p.startedTransaction=tx;
 if(p.money>s.stats.treasury-reservedMoney(s,p.id))throw new RuleError('实际履行时国库不足。');
 if(!s.weekly.consumed[p.costGroup]){s.weekly.consumed[p.costGroup]={weekId:p.weekId,at:stamp(p.date,p.period),slots:p.slots,source:p.id};if(p.money){s.stats.treasury-=p.money;s.ledger.push({id:`${tx}-${p.id}`,date:copy(s.date),turn:s.turn,label:p.label,amount:-p.money,balance:s.stats.treasury});}}
 syncWeek(s);
}
function finishPlan(s,p,tx,options={}){
 if(p.status!=='executing')throw new RuleError('活动还未开始或已结束。');
 p.status='completed';p.completedTransaction=tx;
 const authored=finishActivity(s,p,tx,options);
 const text=authored??(p.legacyPromiseId&&['meet','rest'].includes(p.kind)?promiseStory(p.actor,p.purpose):{study:'翻到先前圈过的那一页，你这回终于把疑问写在页旁。灯还亮着，下一次可以从这句接下去。',training:'最后一遍起势比初来时稳了一些。你将今日未顺的地方记下，收势后，肩背也松开了。',rest:'你把这一段时间留给了自己。窗外的脚步渐远，案上那盏灯，也终于不再催着你。',banquet:'杯盏收起时，席上那段谈兴还没有散。你记下真正说过的话，给下一次相见留一个话头。',letter:'回信已经写毕封好，交给了递送的人。话还在路上，送达之前，不把对方尚未说的回应填上去。',chat:`${NAMES[p.actor]}在你留出的时间里坐定。你们接着先前的话往下说，追问仍在这场交谈里。`,meet:`约好的时辰，${NAMES[p.actor]}来了。你将手边的事放下，让这次相见有一个不仓促的开头。`}[p.kind]);
 p.dialogue=text;p.result='已按实际日期完成';
 if(!s.weekly.rewarded[p.costGroup]){
  if(p.kind==='rest'&&!p.legacyPromiseId)s.stats.health=Math.min(100,s.stats.health+2);
  s.facts.push({id:`ACTIVITY_${p.id}`,text:p.kind==='letter'?`${p.label}：信已发出，尚在递送。`:`${p.label}：${p.result}。`,date:copy(s.date),turn:s.turn,source:tx,visibleTo:p.kind==='letter'?['C01']:copy(p.visibleTo)});s.weekly.rewarded[p.costGroup]=tx;
  if(p.kind==='letter')enqueueNotice(s,{id:`delivery-${p.id}`,date:addDays(s.date,7),label:`给${NAMES[p.actor]}的信送达`,type:'delivery',actor:p.actor,source:p.id});
 }
 if(s.weekly.relationships)recordRelationshipPlan(s,p,tx);
 s.weekly.clock=Math.min(stamp(p.date,p.period)+p.slots,stamp(p.date,'evening'));syncWeek(s);s.weekly.stop=null;
 return result(p.label,`完成${p.slots}格；预约已核销，费用只记一次。`,{dialogue:text,actor:p.actor});
}
export function applyWeeklyAction(s,a,tx){
 if(s.sealed)throw new RuleError('初卷已封存，只能重读。');
 switch(a.type){
 case 'week-plan':{const p=makePlan(s,a,tx);if(p.status==='accepted')acceptPlan(s,p);s.weekly.plans.push(p);syncWeek(s);return result(p.label,`${planWhen(p)}。`+(p.status==='accepted'?`将预占${p.slots}格与${p.money}点预算，履行时才支出。`:'仅保存候选或草稿，未占时间与预算。'));}
 case 'week-accept':{const p=planRecord(s,a);if(!['candidate','draft'].includes(p.status))throw new RuleError('此安排不处于候选或草稿状态。');acceptPlan(s,p);return result(p.label,`${planWhen(p)}，预占${p.slots}格与${p.money}点预算。`);}
 case 'week-edit':{const old=planRecord(s,a);if(!['candidate','draft','accepted','needs-reschedule'].includes(old.status))throw new RuleError('已开始、已完成或已解除的安排不能改写。');if(stamp(old.date,old.period)<s.weekly.clock&&old.status==='accepted')throw new RuleError('已过约期，请先据实处理失约。');const status=old.status==='needs-reschedule'?'accepted':old.status;old.status='rescheduled';old.history.push({date:copy(old.date),period:old.period,transaction:tx});const p=makePlan(s,{...old,...a,kind:old.legacyPromiseId&&old.status==='rescheduled'&&['meet','letter'].includes(old.kind)&&['meet','letter'].includes(a.kind)?a.kind:old.kind,actor:old.actor,status},tx);p.previousId=old.id;if(old.legacyPromiseId)p.legacyPromiseId=old.legacyPromiseId;if(status==='accepted')acceptPlan(s,p);s.weekly.plans.push(p);syncWeek(s);return result('协商改期',`${p.label}改至${planWhen(p)}，${p.slots}格与${p.money}点预算；旧约保留，未支出的费用不扣。`);}
 case 'week-cancel':{const p=planRecord(s,a);if(!['candidate','draft','accepted','needs-reschedule'].includes(p.status))throw new RuleError('该安排无法取消，已完成活动不退回时间。');if(p.status==='accepted'&&stamp(p.date,p.period)<s.weekly.clock)throw new RuleError('已跨过约期，须记录实际失约。');p.status='cancelled';p.resolvedTransaction=tx;syncWeek(s);return result('已协商取消','保留原约记录，解除未执行的预占，不扣款。');}
 case 'week-breach':{const p=planRecord(s,a);if(p.status!=='accepted'||stamp(p.date,p.period)>s.weekly.clock)throw new RuleError('仅到期的正式约定可以据实记失约。');p.status='breached';p.resolvedTransaction=tx;if(s.weekly.relationships)recordRelationshipBreach(s,p,tx);s.weekly.consumed[p.costGroup]={weekId:p.weekId,at:stamp(p.date,p.period),slots:p.slots,source:p.id,forfeited:true};syncWeek(s);return result('约期已错过','如实保留失约记录，未发生的活动不发奖励或收宴费；过去时段不退回。');}
 case 'week-start':{const p=planRecord(s,a);startPlan(s,p,tx);return result('活动开始','费用与时段已结算，完成前不会再收一次。',{treasury:p.money?-p.money:0,actionCost:p.slots});}
 case 'week-complete':return finishPlan(s,planRecord(s,a),tx,{paused:!!a.pause});
 case 'week-fulfill':{const p=planRecord(s,a);startPlan(s,p,tx);return {...finishPlan(s,p,tx,{paused:!!a.pause}),actionCost:p.slots,treasury:p.money?-p.money:0};}
 case 'week-resolve':{const n=s.weekly.notices.find(n=>n.id===a.noticeId&&n.status==='pending'&&!n.suspended);if(!n||ordinal(n.date)>ordinal(s.date))throw new RuleError('这份回报还未到期或已处理。');if(n.choices&&!n.choices.includes(a.choice))throw new RuleError('请明确处理这项到期决定。');const projectResult=resolveProjectNotice(s,n,a.choice,tx);n.status='read';n.choice=a.choice||null;n.resolvedTransaction=tx;if(n.type==='delivery'){s.facts.push({id:`DELIVERED_${n.id}`,text:n.label+'。尚未自动生成回信。',date:copy(s.date),turn:s.turn,source:n.source,visibleTo:['C01',n.actor]});if(n.pendingRelation){const r=s.relations[n.actor];for(const [key,delta] of Object.entries(n.pendingRelation.changes))r[key]=Math.min(100,r[key]+delta);if(!s.weekly.relationships&&n.pendingRelation.intent==='愿发展'&&r.playerIntent==='愿发展'&&!['仅合作','终止恋爱','暂缓'].includes(r.npcIntent))r.npcIntent='愿发展';if(!s.weekly.relationships&&r.trust>=35&&r.stage==='相识')r.stage='信任';for(const f of s.facts.filter(f=>f.source===n.source&&!f.visibleTo.includes(n.actor)))f.visibleTo.push(n.actor);}if(s.weekly.relationships)recordRelationshipDelivery(s,n,tx);recordActivityDelivery(s,n);}s.weekly.stop=null;return result(n.label,projectResult?.detail||'已按实际到期日阅核；重读不重结奖励，不自动产生下一封回信。',projectResult?.dialogue?{dialogue:projectResult.dialogue}:{});}
 case 'week-extend':{
  const quarter=dateTurn(s.date);if(s.weekly.weeks.some(w=>['extension','transition'].includes(w.type)&&w.quarter===quarter))throw new RuleError('本季已经使用过唯一延展周。');
  const focus=s.weekly.weeks.find(w=>w.type==='focus'&&w.quarter===quarter),earliest=Math.max(ordinal(s.date),(focus?ordinal(focus.end)+1:ordinal(s.date))),start=a.date?copy(a.date):fromOrdinal(earliest),end=addDays(start,6);
  if(ordinal(start)<earliest)throw new RuleError('延展周不能倒放或与重点周重叠。');
  if(dateTurn(end)!==quarter||ordinal(end)>ordinal(horizonDate(s)))throw new RuleError('本季余下日期不足完整七日，不能跨季额外添周。');
  const w={id:`X${quarter}`,start,end,quarter,type:'extension',status:'open'};s.weekly.weeks.push(w);syncWeek(s);return result('留出延展周',`${start.month}月${start.day}日至${end.month}月${end.day}日，六格；占实际日期，本季不再新增。`);
 }
 case 'week-advance':case 'week-end':{
  if(a.routine!==undefined&&typeof a.routine!=='boolean')throw new RuleError('请选择逐项推进或等到下一件事。');
  if(a.routine){let months=0,net=0;for(let i=0;i<400;i++){const step=applyWeeklyAction(s,{type:a.type,...(a.date?{date:a.date}:{}),...(a.period?{period:a.period}:{})},tx);net+=step.treasury||0;if(s.weekly.stop?.kind==='month')months++;if(s.weekly.stop?.kind!=='month'||s.weekly.life&&s.date.month===12||s.weekly.clock===horizonStamp(s))return months?{...step,label:'时日向前',detail:`沿途${months}份月账已逐月记入，净增${net}点。停在${s.date.year}年${s.date.month}月${s.date.day}日；约定与差事仍由你亲自办理。`,treasury:net}:step;}throw new RuleError('这一段日期尚未走完，请分段向前。');}
  if(s.weekly.plans.some(p=>p.status==='executing'))throw new RuleError('先完成正在进行的活动。');
  const w=currentWeek(s);let target=a.type==='week-end'?stamp(addDays(w?.end||s.date,1)):a.date?stamp(a.date,a.period||'day'):horizonStamp(s);
  target=Math.min(target,horizonStamp(s));if(target<s.weekly.clock)throw new RuleError('不能倒放日期。');
  const stop=weekStops(s).find(x=>x.at<=target);s.weekly.clock=stop?.at??target;syncWeek(s);s.weekly.stop=stop||null;
  if(stop?.kind==='month'){
   const d=copy(s.date),key=monthKey(d),{income,expense,net}=monthlyBudget(s,d);s.stats.treasury+=income-expense;s.weekly.monthly.push({key,date:d,income,expense,balance:s.stats.treasury,transaction:tx});
   s.ledger.push({id:`MONTH-${key}-in`,date:d,turn:s.turn,label:`${d.year}年${d.month}月常规收入`,amount:income,balance:s.stats.treasury+expense},{id:`MONTH-${key}-out`,date:d,turn:s.turn,label:`${d.year}年${d.month}月常规支出`,amount:-expense,balance:s.stats.treasury});
   return result('本月账已核',`常规收入${income}、支出${expense}，净增${net}点；此月不再结算。`,{treasury:net});
  }
  if(stop?.kind==='week-end'){const ended=s.weekly.weeks.find(w=>w.id===stop.id);ended.status='ended';s.weekly.reports.push({weekId:ended.id,date:copy(s.date),used:usedSlots(s,ended.id),completed:s.weekly.plans.filter(p=>p.weekId===ended.id&&p.status==='completed').map(p=>p.id),transaction:tx,review:makeWeekReview(s,ended)});syncWeek(s);return result('这一周收笔',`实际用去${usedSlots(s,ended.id)}格，留空也照常生活；有到期回报会再停下。`);}
  return result(stop?stop.label:'时日向前',stop?`停在${s.date.month}月${s.date.day}日，请亲自处理眼前事项。`:'已到所选实际日期；没有替你赴约或完成剧情。');
 }
 default:throw new RuleError('周制没有这项操作。');
 }
}
function validateMigrationMeta(s){
 const m=s.weekly.migration,source=m?.source;
 if(!m||m.version!==1||typeof m.copyId!=='string'||!/^[a-f0-9]{64}$/.test(m.copyId)||m.sourceDigest!==m.copyId||source?.worldVersion!=='changyong-v1.2-first-1'||source.saveVersion!==1||source.weekly||m.sourceHash!==hash(source)||(continuationRoot(s).gameId)!=='week-copy-'+m.copyId||!validDate(m.cutoverDate)||ordinal(m.cutoverDate)!==ordinal(source.date)||ordinal(s.date)<ordinal(m.cutoverDate)||m.firstIncomeMonth!==legacyIncomeStart(source)||m.carryCapacity!==legacyCarryCapacity(source)||m.carryCapacity>6||m.mode!==(source.sealed?'sealed':'continuing'))throw new RuleError('迁移来源或起算规则不一致，未接受该副本。');
 for(const key of ['knownActors','documentEvents','recoverableEventIds','deferredAdditions'])if(!Array.isArray(m[key]))throw new RuleError('迁移映射缺项。');
 for(const key of ['eventWindows','aliases'])if(!m[key]||typeof m[key]!=='object'||Array.isArray(m[key]))throw new RuleError('迁移索引错误。');
 for(const key of ['ledger','transactions','turnReports','messages']){if(!Array.isArray(source[key])||source[key].some((item,i)=>hash(item)!==hash(s[key][i])))throw new RuleError('迁移前历史账目或原始记录被改写。');}
 for(const [key,event] of Object.entries(source.events))if(event.completed&&hash(event)!==hash(s.events[key]))throw new RuleError('迁移前已完成节点被改写。');
 for(const [key,text] of Object.entries(source.transcripts))if(hash(text)!==hash(s.transcripts[key]))throw new RuleError('迁移前已展示的剧情原文被改写。');
 if(source.sealed&&!hasContinuation(s)){if(ordinal(s.date)!==ordinal(source.date)||!s.sealed||hash(source.ending)!==hash(s.ending)||hash(source.stats)!==hash(s.stats)||s.weekly.monthly.length||s.weekly.plans.length||s.weekly.notices.length||m.carryWeekId!==null)throw new RuleError('旧封卷只读保留，不能重开或补发收益。');}
 else if(!source.sealed){const carry=s.weekly.weeks.find(w=>w.id===m.carryWeekId);if(!carry||ordinal(source.date)<ordinal(carry.start)||ordinal(source.date)>ordinal(carry.end)||carry.quarter!==source.turn)throw new RuleError('迁移承接窗口不一致。');}
 for(const [key,legacy] of Object.entries(m.aliases)){const e=source.events[legacy];if(!e?.completed||e.turn!==source.turn||key!==`${e.id}@${m.carryWeekId}`||!(EVENTS[e.id]?.kind==='daily'||e.id.startsWith('CHAT_')))throw new RuleError('旧日常或交谈引用错误。');}
 for(const [key,w] of Object.entries(m.eventWindows))if(EVENTS[key]?.kind!=='main'||source.events[key]?.completed||EVENTS[key].turn!==source.turn||!validDate(w.date)||ordinal(w.date)<ordinal(source.date)||!['day','evening'].includes(w.period))throw new RuleError('待接续主线日期错误。');
 if(m.knownActors.some(cid=>!NAMES[cid])||m.documentEvents.some(eid=>!['G04','G05'].includes(eid)||source.events[eid]?.completed)||m.recoverableEventIds.some(eid=>!EVENTS[eid]||EVENTS[eid].turn>source.turn||source.events[eid]?.completed))throw new RuleError('迁移补谈或人物映射错误。');
 if(m.legacyVisit){const v=m.legacyVisit,end=Math.min(source.turn*90,Math.max(ordinal(source.date)+2,ordinal({year:2,month:4,day:9})));if(source.turn!==6||v.actor!=='C03'||ordinal(v.start)!==ordinal(source.date)||ordinal(v.end)!==end)throw new RuleError('旧版在京状态承接错误。');}
 for(const p of s.weekly.plans){if(p.legacyPromiseId&&!source.promises.some(old=>old.id===p.legacyPromiseId&&old.status==='accepted'&&old.actor===p.actor))throw new RuleError('旧约来源不存在。');if(p.status==='needs-reschedule'){const old=source.promises.find(old=>old.id===p.legacyPromiseId);if(!old||old.status!=='accepted'||ordinal(p.date)!==ordinal(old.date)||p.carryHoldWeekId!==(old.dueTurn===source.turn?m.carryWeekId:null))throw new RuleError('待协商旧约的日期或预占错误。');}}
}

export function validateWeekly(value){
 const w=value.weekly;if(value.saveVersion!==2||!w||w.version!==1||!Number.isInteger(w.clock)||w.clock<stamp({year:1,month:1,day:2})||w.clock>horizonStamp(value))throw new RuleError('周档版本或时钟错误。');
 if(w.economy!==undefined&&(!w.economy||w.economy.version!==2||Object.keys(w.economy).length!==1))throw new RuleError('常规收支规则不一致。');
 if(w.continuation&&JSON.stringify(w.economy)!==JSON.stringify(w.continuation.source.weekly.economy))throw new RuleError('接续须沿用本局收支规则。');
 if(w.migration)validateMigrationMeta(value);
 validateProjects(value);validateGovernance(value);validateRelationships(value);validateActivities(value);validateWeekReviews(value);
 if(!validDate(value.date)||ordinal(unstamp(w.clock).date)!==ordinal(value.date)||dateTurn(value.date)!==value.turn)throw new RuleError('周档日期与时钟不一致。');
 for(const key of ['weeks','plans','monthly','reports','notices'])if(!Array.isArray(w[key])||w[key].length>20000)throw new RuleError('周档记录字段错误。');
 for(const key of ['consumed','rewarded'])if(!w[key]||typeof w[key]!=='object'||Array.isArray(w[key]))throw new RuleError('周档结算索引错误。');
 const unique=(xs,key)=>new Set(xs.map(x=>x[key])).size===xs.length;
 if(!unique(w.weeks,'id')||!unique(w.plans,'id')||!unique(w.monthly,'key')||!unique(w.notices,'id'))throw new RuleError('周档存在重复标识。');
 for(const week of w.weeks){if(week.type==='repair'&&(!isEighth(value)||!value.weekly.continuation.repairTail||!['V8-REPAIR-TAIL-1','V8-REPAIR-TAIL-2'].includes(week.id)||week.start.year!==31||week.start.month!==1||week.start.day!==(week.id.endsWith('1')?2:9)))throw new RuleError('修复尾声窗口不一致。');if((week.type==='transition'?(!w.migration||week.id!==w.migration.carryWeekId||ordinal(week.start)!==ordinal(w.migration.cutoverDate)||ordinal(week.end)-ordinal(week.start)>6||ordinal(week.end)<ordinal(week.start)):ordinal(week.end)-ordinal(week.start)!==6)||!['focus','extension','transition',...(isEighth(value)&&value.weekly.continuation.repairTail?['repair']:[])].includes(week.type)||!['open','ended'].includes(week.status)||dateTurn(week.start)!==week.quarter||dateTurn(week.end)!==week.quarter)throw new RuleError('周窗口须为同季七个实际日。');if(week.status==='ended'&&stamp(addDays(week.end,1))>w.clock)throw new RuleError('未来周不能提前收笔。');}
 if(w.weeks.filter(x=>x.type==='focus').length!==(isEighth(value)?76:isSeventh(value)?64:isSixth(value)?52:isFifth(value)?36:isFourth(value)?24:hasContinuation(value)?16:8))throw new RuleError('重点周缺失。');
 for(const source of [...FOCUS_WEEKS,...(hasContinuation(value)?continuationWeeks(value).map(w=>({id:w.id,start:[w.start.year,w.start.month,w.start.day],end:[w.end.year,w.end.month,w.end.day]})):[])]){const actual=w.weeks.find(x=>x.id===source.id&&x.type==='focus');if(!actual||ordinal(actual.start)!==ordinal(date(source.start))||ordinal(actual.end)!==ordinal(date(source.end)))throw new RuleError('重点周与冻结窗口不一致。');}
 for(let q=1;q<=(isEighth(value)?(value.weekly.continuation.repairTail?121:120):isSeventh(value)?104:isSixth(value)?80:isFifth(value)?48:isFourth(value)?24:hasContinuation(value)?16:8);q++)if(w.weeks.filter(x=>x.quarter===q&&['extension','transition'].includes(x.type)).length>1)throw new RuleError('同季不能有多个延展周。');
 for(let i=0;i<w.weeks.length;i++)for(let j=i+1;j<w.weeks.length;j++)if(ordinal(w.weeks[i].start)<=ordinal(w.weeks[j].end)&&ordinal(w.weeks[j].start)<=ordinal(w.weeks[i].end))throw new RuleError('周窗口相互重叠。');
 for(const p of w.plans){if(p.status==='needs-reschedule'&&!w.migration)throw new RuleError('普通周档不得凭空加入旧约。');if(!kinds[p.kind]||!NAMES[p.actor]||!['candidate','draft','accepted','executing','completed','cancelled','rescheduled','breached','needs-reschedule'].includes(p.status)||p.slots!==kinds[p.kind].slots||p.money!==(p.activity&&p.kind==='banquet'?({tea:2,music:3,season:4}[p.activity.theme]):p.activity&&p.kind==='craft'?p.money:kinds[p.kind].money)||!Array.isArray(p.history)||typeof p.costGroup!=='string'||!Array.isArray(p.guests))throw new RuleError('周安排内容不合法。');stamp(p.date,p.period);if(p.slots===2&&p.period!=='day')throw new RuleError('小宴须占同日两格。');if(p.kind==='banquet'&&(p.guests.length<2||p.guests.length>3||new Set(p.guests).size!==p.guests.length||p.guests.some(cid=>!value.relations[cid])))throw new RuleError('小宴宾客错误。');if(planLive(p)&&!w.weeks.some(x=>x.id===p.weekId&&ordinal(p.date)>=ordinal(x.start)&&ordinal(p.date)<=ordinal(x.end)))throw new RuleError('正式约定不在可操作周内。');if(p.eventId&&(!EVENTS[p.eventId]||p.costGroup!==WEEK_EVENT_RULES[p.eventId].costGroup))throw new RuleError('剧情预约的来源错误。');if(['completed','executing','breached'].includes(p.status)&&!w.consumed[p.costGroup])throw new RuleError('已执行安排缺少格数核销。');}
 for(const [group,c] of Object.entries(w.consumed)){const week=w.weeks.find(x=>x.id===c.weekId);if(!group||!week||!Number.isInteger(c.at)||![0,1,2].includes(c.slots)||c.at<stamp(week.start)||c.at+c.slots>stamp(addDays(week.end,1))||c.at>w.clock)throw new RuleError('周格结算记录错误。');}
 const ranges=[...Object.entries(w.consumed).filter(([,c])=>c.slots).map(([key,c])=>({key,at:c.at,slots:c.slots})),...w.plans.filter(p=>p.status==='accepted'&&!w.consumed[p.costGroup]).map(p=>({key:p.costGroup,at:stamp(p.date,p.period),slots:p.slots}))];
 for(let i=0;i<ranges.length;i++)for(let j=i+1;j<ranges.length;j++)if(ranges[i].at<ranges[j].at+ranges[j].slots&&ranges[j].at<ranges[i].at+ranges[i].slots)throw new RuleError('周档有重复占用的日间或晚间。');
 for(const week of w.weeks)if(usedSlots(value,week.id)+heldSlots(value,week.id)>weekCapacity(value,week))throw new RuleError('周档超过六格容量。');
 if(reservedMoney(value)>value.stats.treasury)throw new RuleError('周档预占预算超过国库。');
 for(const m of w.monthly)if(((m.date.year-1)*12+m.date.month)<monthlyStart(value)||m.key!==monthKey(m.date)||m.date.day!==30||m.income!==monthlyBudget(value,m.date).income||m.expense!==monthlyBudget(value,m.date).expense||stamp(m.date,'evening')>w.clock)throw new RuleError('月账字段或日期错误。');
 for(const n of w.notices)if(!validDate(n.date)||!['pending','read'].includes(n.status)||typeof n.label!=='string')throw new RuleError('到期事项错误。');
 for(const n of w.notices)if(n.pendingRelation){const e=value.events[n.source],allowed={warm:{trust:5,safety:2},work:{trust:3},distance:{trust:1}}[e?.outcomeId],changes=n.pendingRelation.changes;if(!['R03-01','R03-02',...(hasContinuation(value)?['R03-03',...(isFourth(value)||isFifth(value)||isSixth(value)||isSeventh(value)||isEighth(value)?['R03-04',...(isSixth(value)||isSeventh(value)||isEighth(value)?['R03-05']:[])]:[])]:[])].includes(n.source)||n.source==='R03-01'&&e?.channel!=='letter'||n.actor!=='C03'||!allowed||!changes||Object.keys(changes).length!==Object.keys(allowed).length||Object.entries(allowed).some(([k,v])=>changes[k]!==v)||n.pendingRelation.intent!==(e.outcomeId==='warm'?'愿发展':null))throw new RuleError('通信的待结关系结果与原选择不一致。');}
 for(const q of value.queue){const execution=value.events[q.source],days=eventById(q.source)?.minimumFollowupDays||(q.eventId==='G06'?21:7);if(!validDate(q.dueDate)||dateTurn(q.dueDate)!==q.dueTurn||!execution||ordinal(q.dueDate)-ordinal(execution.date)<days||q.minimumDays!==days)throw new RuleError('回访日期与实际执行工期不一致。');}
 for(const e of Object.values(value.events))if(!validDate(e.date)||ordinal(e.date)>ordinal(value.date)||dateTurn(e.date)!==e.turn)throw new RuleError('事件存在未来或不一致的日期。');
 if(value.promises.length)throw new RuleError('周档不得混用旧季度预约。');
 const expected=currentWeek(value)?weekCapacity(value,currentWeek(value))-usedSlots(value,currentWeek(value).id)-heldSlots(value,currentWeek(value).id):0;if(value.remaining!==expected)throw new RuleError('周格余量与记录不一致。');
 return copy(w);
}
