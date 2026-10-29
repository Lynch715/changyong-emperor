import * as currentEngine from '../src/engine.js';
import {ordinal,stamp,unstamp,addDays} from '../src/calendar.js';
import {currentWeek} from '../src/week.js';
export const routeActors=['C02','C03','C04','C05','C06','C07','C08'];
export const routeIds=routeActors.flatMap(cid=>['R'+cid.slice(1)+'-01','R'+cid.slice(1)+'-02']);
const schedule=[['WG-C01',[1,1,2]],['WG-C02',[1,1,8]],['R02-02',[1,1,8]],['R07-02',[1,4,5]],['G02',[1,4,8]],['P01',[1,7,3]],['R06-02',[1,7,5]],['WG-P01',[1,10,2]],['WG-P02',[1,10,3]],['P09',[1,10,4]],['R08-02',[2,1,3]],['R04-02',[2,1,8]],['R05-02',[2,4,4]],['G05',[2,4,8]],['R03-02',[2,7,4]],['P10',[2,7,5]],['P11',[2,10,3]]];
const quarterActive=[['R02-02'],['G02','R07-02'],['R06-02','P01'],['P09'],['R08-02','R04-02'],['R05-02','G05'],['R03-02','P10'],['P11']];
const d=a=>({year:a[0],month:a[1],day:a[2]});
export function relationPath({engine=currentEngine,weekly=true,choices={},tone='warm'}={}){
 const action=(s,a)=>{const n=engine.commit(s,engine.preview(s,[a])).state;engine.validateSave(n);return n;},checkpoints={};
 const choose=(s,e)=>{if(e.kind==='relation')checkpoints[e.id]=structuredClone(s);return action(s,{type:'event',eventId:e.id,choiceId:choices[e.id]||(e.kind==='relation'?tone:e.id==='G04'?'custom':e.options[0].id),...(e.id==='G04'?{params:{amount:6,officer:'C26',visibility:'private',escort:true}}:{})});};
 const settle=s=>{for(let guard=0;guard<50;guard++){const n=s.weekly?.notices.find(n=>n.status==='pending'&&!n.suspended&&ordinal(n.date)<=ordinal(s.date));if(n){s=action(s,{type:'week-resolve',noticeId:n.id,choice:n.choices?.[0]});continue;}const e=engine.requiredEvents(s)[0];if(!e)return s;s=choose(s,e);}throw Error('前置未收束');};
 const reach=(s,target)=>{for(let guard=0;guard<200;guard++){s=settle(s);if(s.weekly.clock>=stamp(target,'day'))return s;s=action(s,{type:'week-advance',date:target});}throw Error('日期未收束');};
 let s=weekly?engine.createWeeklyGame():engine.createGame();
 if(!weekly){for(let turn=1;turn<=8;turn++){s=settle(s);for(const id of quarterActive[turn-1])s=choose(s,engine.getEvent(s,id));if(turn<8)s=action(s,{type:'advance'});}return {checkpoints,final:s};}
 s=choose(s,engine.getEvent(s,'M01'));for(const [id,day] of schedule){s=reach(s,d(day));s=choose(s,engine.getEvent(s,id));}
 s=reach(s,d([2,12,30]));for(let guard=0;s.weekly.monthly.length<24&&guard<10;guard++){s=settle(s);s=action(s,{type:'week-advance',date:d([2,12,30]),period:'evening'});}s=settle(s);return {checkpoints,final:s};
}
const step=(s,a)=>{const n=currentEngine.commit(s,currentEngine.preview(s,[a])).state;currentEngine.validateSave(n);return n;};
export function settleRoute(s){for(let guard=0;guard<50;guard++){const n=s.weekly.notices.find(n=>n.status==='pending'&&!n.suspended&&ordinal(n.date)<=ordinal(s.date));if(n){s=step(s,{type:'week-resolve',noticeId:n.id,choice:n.choices?.[0]});continue;}const e=currentEngine.requiredEvents(s)[0];if(!e)return s;s=step(s,{type:'event',eventId:e.id,choiceId:e.options[0].id});}throw Error('活动前置未收束');}
export function reachRoute(s,target){for(let guard=0;guard<220;guard++){s=settleRoute(s);if(ordinal(s.date)>=ordinal(target))return s;s=step(s,{type:'week-advance',date:target});}throw Error('活动日期未收束');}
export function routeFollowup(source,cid){let s=settleRoute(source),planned=false;const kind=cid==='C03'?'letter':cid==='C05'?'walk':'chat';
 for(let round=0;round<2&&!planned;round++){
  const w=currentWeek(s);if(w)for(let at=s.weekly.clock;at<=stamp(w.end,'evening');at++){const m=unstamp(at);try{s=step(s,{type:'week-plan',kind,actor:cid,date:m.date,period:m.period,topic:'shared',choice:'listen',place:'corridor'});planned=true;break;}catch(e){if(e.code!=='RULE'&&e.code!=='FUNDS')throw e;}}
  if(!planned){const focus=s.weekly.weeks.find(w=>w.type==='focus'&&w.quarter===s.turn);s=step(s,{type:'week-extend',date:addDays(focus.end,1)});s=reachRoute(s,addDays(focus.end,1));}
 }
 if(!planned)throw Error(cid+'没有合法活动时段');const planId=s.weekly.plans.at(-1).id,beforeActivity=structuredClone(s);s=reachRoute(s,s.weekly.plans.at(-1).date);s=step(s,{type:'week-fulfill',planId});const afterActivity=structuredClone(s),plan=s.weekly.plans.find(p=>p.id===planId);let beforeReceive=null;
 if(kind==='letter'){s=reachRoute(s,addDays(plan.date,14));beforeReceive=structuredClone(s);const shipment=s.weekly.activities.shipments.find(sh=>sh.planId===planId);s=step(s,{type:'activity-receive',shipmentId:shipment.id});}
 return {beforeActivity,afterActivity,beforeReceive,final:s,planId,text:kind==='letter'?s.weekly.activities.shipments.find(sh=>sh.planId===planId).text:s.weekly.plans.find(p=>p.id===planId).dialogue};
}
