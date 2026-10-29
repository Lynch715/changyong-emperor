import * as currentEngine from '../src/engine.js';
import {ordinal} from '../src/calendar.js';
const active=[['R02-02'],['G02','R07-02'],['R06-02','P01'],['P09'],['R08-02','R04-02'],['R05-02','G05'],['R03-02','P10'],['P11']];
export const mainIds=Array.from({length:12},(_,i)=>'M'+String(i+1).padStart(2,'0'));
export function mainCheckpoints({weekly=true,choices={},engine=currentEngine}={}){
 const action=(s,a)=>{const n=engine.commit(s,engine.preview(s,[a])).state;engine.validateSave(n);return n;};
 const choose=(s,e)=>action(s,{type:'event',eventId:e.id,choiceId:choices[e.id]||e.options[0].id});
 let s=weekly?engine.createWeeklyGame():engine.createGame();const checkpoints={};
 if(!weekly){for(let turn=1;turn<=8;turn++){
  for(let guard=0;engine.requiredEvents(s).length;guard++){if(guard>30)throw Error('季度前置未收束');const e=engine.requiredEvents(s)[0];if(e.kind==='main')checkpoints[e.id]=structuredClone(s);s=choose(s,e);}
  for(const id of active[turn-1])s=choose(s,engine.getEvent(s,id));
  if(turn<8)s=action(s,{type:'advance'});
 }return {checkpoints,final:s};}
 for(let guard=0;guard<400;guard++){
  const notice=s.weekly.notices.find(n=>n.status==='pending'&&!n.suspended&&ordinal(n.date)<=ordinal(s.date));if(notice){s=action(s,{type:'week-resolve',noticeId:notice.id,choice:notice.choices?.[0]});continue;}
  const e=engine.requiredEvents(s)[0];if(e){if(e.kind==='main')checkpoints[e.id]=structuredClone(s);s=choose(s,e);continue;}
  if(ordinal(s.date)===720&&s.weekly.monthly.length===24)return {checkpoints,final:s};
  s=action(s,{type:'week-advance'});
 }
 throw Error('周制主线未收束');
}
export function ruleProjection(s,id){
 const t=s.transcripts[id],event=s.events[id];
 return {date:s.date,turn:s.turn,remaining:s.remaining,stats:s.stats,relations:s.relations,flags:s.flags,event:{id:event.id,completed:event.completed,outcomeId:event.outcomeId,date:event.date},transcript:{choice:t.choice,result:t.result,reward:t.reward},ledger:s.ledger.map(l=>({label:l.label,amount:l.amount,balance:l.balance,date:l.date})),facts:s.facts.filter(f=>f.source===id).map(f=>({id:f.id,text:f.text,visibleTo:f.visibleTo,date:f.date})),slots:s.weekly?Object.values(s.weekly.consumed).map(c=>({slots:c.slots,source:c.source,at:c.at})):null};
}
export function branchResults({weekly=true,engine=currentEngine}={}){const {checkpoints}=mainCheckpoints({weekly,engine});return Object.fromEntries(mainIds.map(id=>[id,Object.fromEntries(engine.getEvent(checkpoints[id],id).options.map(o=>{const s=engine.commit(checkpoints[id],engine.preview(checkpoints[id],[{type:'event',eventId:id,choiceId:o.id}])).state;engine.validateSave(s);return [o.id,ruleProjection(s,id)];}))]));}
