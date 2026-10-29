// Reusable acceptance paths. Native paths never edit dates, scores, consent, or history.
// The separately returned budget fixture has one explicit QA-only starting adjustment.
import {createWeeklyGame,preview,commit,validateSave,requiredEvents,getEvent,clone,hash,fixedReply} from '../src/engine.js';
import {ordinal,stamp,addDays} from '../src/calendar.js';
import {usedSlots} from '../src/week.js';
export const d=(year,month,day)=>({year,month,day});
export const action=(s,a)=>{const n=commit(s,preview(s,[a])).state;validateSave(n);return n;};
export const choose=(s,id,choiceId=null,extra={})=>action(s,{type:'event',eventId:id,choiceId:choiceId||getEvent(s,id).options[0].id,...extra});
export function settle(s,{stop=[],first='warm'}={}){for(let guard=0;guard<50;guard++){
 const notice=s.weekly.notices.find(n=>n.status==='pending'&&!n.suspended&&ordinal(n.date)<=ordinal(s.date));if(notice){s=action(s,{type:'week-resolve',noticeId:notice.id,choice:notice.choices?.[0]});continue;}
 const e=requiredEvents(s)[0];if(!e||stop.includes(e.id))return s;s=choose(s,e.id,e.id==='R05-01'?first:e.id==='G04'?'custom':null,e.id==='G04'?{params:{amount:6,officer:'C26',visibility:'private',escort:true}}:{});
 }throw Error('required loop');}
export function reach(s,target,period='day',options={}){for(let guard=0;guard<220;guard++){s=settle(s,options);if(s.weekly.clock>=stamp(target,period))return s;if(requiredEvents(s).some(e=>options.stop?.includes(e.id)))throw Error('先处理'+requiredEvents(s)[0].id);s=action(s,{type:'week-advance',date:target,period});}throw Error('date loop');}
export function perform(s,kind,day,period='day',fields={}){s=action(s,{type:'week-plan',kind,actor:'C01',date:day,period,...fields});const id=s.weekly.plans.at(-1).id;s=reach(s,day,period);return action(s,{type:'week-fulfill',planId:id});}
export function opening(style='court'){
 let s=choose(createWeeklyGame(),'M01','call');const first=clone(s);s=choose(s,'WG-C01',style==='court'?'records':'listen');
 if(style==='court'){
  s=reach(s,d(1,1,3));s=action(s,{type:'project-inspect',projectId:'PR-COURT'});s=choose(s,'D02');s=perform(s,'study',d(1,1,4),'day',{exercise:'compare'});s=perform(s,'rest',d(1,1,5),'day',{exercise:'sleep'});
 }else{
  s=perform(s,'chat',d(1,1,2),'evening',{actor:'C02',topic:'wish',choice:'share'});const p=s.weekly.plans.at(-1);s=action(s,{type:'activity-buy',giftId:'GF02'});s=action(s,{type:'activity-gift-same',actor:'C02',planId:p.id,itemId:s.weekly.activities.inventory.at(-1).id});
  s=perform(s,'walk',d(1,1,3),'day',{actor:'C02',topic:'shared',place:'corridor'});s=perform(s,'study',d(1,1,4),'day',{exercise:'read'});s=perform(s,'rest',d(1,1,5),'day',{exercise:'quiet'});
 }
 s=reach(s,d(1,1,8));s=choose(s,'WG-C02','plan-1');const beforeLast=clone(s);s=choose(s,'R02-02','warm');const beforeEnd=clone(s);s=reach(s,d(1,1,9));const weekEnd=clone(s);s=reach(s,d(1,1,15));
 return {style,first,beforeLast,beforeEnd,weekEnd,final:s,summary:{slots:usedSlots(s,'W01'),treasuryAtWeekEnd:weekEnd.stats.treasury,treasuryAfterFollowup:s.stats.treasury,handling:s.weekly.projects.items['PR-COURT'].handling,courtStatus:s.weekly.projects.items['PR-COURT'].status,review:s.weekly.reports.find(r=>r.weekId==='W01').review,relation:s.relations.C02,projectDue:s.weekly.projects.items['PR-COURT'].runs[0].dueDate}};
}
export function summerSource({first='warm'}={}){return reach(createWeeklyGame(),d(2,4,2),'day',{first});}
export function budgetFixture(source){const s=clone(source),adjustment=60-s.stats.treasury;s.stats.treasury=60;s.ledger.push({id:'QA-S07-STARTING-BUDGET',date:clone(s.date),turn:s.turn,label:'仅验收：独立样例预算起点调整',amount:adjustment,balance:60});s.gameId='s07-qa-'+source.gameId;s.revision++;validateSave(s);return {state:s,metadata:{qaOnly:true,kind:'independent-budget-baseline',sourceHash:hash(source),sourceTreasury:source.stats.treasury,budget:60,adjustment,note:'仅独立验收起点，不是正式游戏动作、赠款或历史改写；源文件另存。'}};}
export function summer(style='court',{normalized=true,first='warm'}={}){
 const source=summerSource({first}),fixture=normalized?budgetFixture(source):{state:source,metadata:{qaOnly:false,kind:'native-continuous'}};let s=clone(fixture.state);
 if(style==='court')s=perform(s,'study',d(2,4,3),'day',{exercise:'compare'});else s=perform(s,'study',d(2,4,3),'day',{exercise:'read'});
 s=reach(s,d(2,4,4));s=choose(s,'R05-02',first==='distance'?'distance':first==='work'?'work':'warm');
 if(style!=='court')s=perform(s,'walk',d(2,4,4),'evening',{actor:'C05',topic:'shared',place:'garden'});
 s=perform(s,'rest',d(2,4,5),'day',{exercise:'sleep'});
 if(style==='court')s=action(s,{type:'project-inspect',projectId:'PR-FISCAL'});else s=perform(s,'chat',d(2,4,6),'evening',{actor:'C05',topic:'shared',choice:'share'});
 s=reach(s,d(2,4,7),'day',{stop:['G04']});const beforeFunds=clone(s);s=choose(s,'G04','custom',{params:{amount:6,officer:'C26',visibility:'private',escort:true}});const afterFunds=clone(s);
 if(style==='court')s=action(s,{type:'project-inspect',projectId:'PR-MILITARY'});
 s=reach(s,d(2,4,8));const beforeLast=clone(s);s=choose(s,'G05','escort');const beforeEnd=clone(s);s=reach(s,d(2,4,9));const weekEnd=clone(s);
 const invitation=s.weekly.relationships.messages.find(m=>m.id==='IN-C05-2');if(invitation&&['pending','read'].includes(invitation.status))s=action(s,{type:'relationship-message',actor:'C05',messageId:invitation.id});const afterInvite=clone(s);
 s=reach(s,d(2,4,11));const progress=clone(s);s=reach(s,d(2,4,29));const reviewed=clone(s),beforeKnown=fixedReply(s,'C03','后来前营领粮的回报到了吗');
 s=reach(s,d(2,5,6));const known=clone(s),afterKnown=fixedReply(s,'C03','后来前营领粮的回报到了吗');s=action(s,{type:'week-extend',date:d(2,5,6)});s=perform(s,'letter',d(2,5,6),'day',{actor:'C03',topic:'project',choice:'share'});const letter=s.weekly.plans.at(-1);
 s=reach(s,d(2,5,20));const beforeReply=clone(s),sh=s.weekly.activities.shipments.find(sh=>sh.planId===letter.id);s=action(s,{type:'activity-receive',shipmentId:sh.id});
 return {style,source,metadata:fixture.metadata,start:fixture.state,beforeFunds,afterFunds,beforeLast,beforeEnd,weekEnd,afterInvite,progress,reviewed,known,beforeReply,final:s,summary:{slots:usedSlots(s,'W06'),before:beforeFunds.stats.treasury,afterFunds:afterFunds.stats.treasury,afterExecution:beforeEnd.stats.treasury,militaryExpenses:s.weekly.projects.items['PR-MILITARY'].funds.reduce((n,f)=>n+f.amount,0),handling:s.weekly.projects.items['PR-MILITARY'].handling,due:s.weekly.projects.items['PR-MILITARY'].runs[0].dueDate,review:s.weekly.reports.find(r=>r.weekId==='W06').review,invitation:afterInvite.weekly.relationships.messages.find(m=>m.id==='IN-C05-2')||null,princeMemory:s.weekly.activities?.entries.filter(e=>e.actor==='C05'&&['chat','walk'].includes(e.kind)).map(e=>e.text)||[],beforeKnown,afterKnown,generalReply:s.weekly.activities.shipments.find(sh=>sh.planId===letter.id).text}};
}
