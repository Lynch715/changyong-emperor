import * as current from '../src/engine.js';
import {ordinal,stamp} from '../src/calendar.js';
export const projectIds=['WG-C01','WG-C02','WG-C03','G01','G02','G03','WG-P01','WG-P02','WG-P03','G04','G05','G06'];
export const sideIds=['P01','P09','P10','P11'];
export const dailyIds=Array.from({length:8},(_,i)=>'D0'+(i+1));
export const worldIds=[...projectIds,...sideIds,...dailyIds];
const schedule=[['WG-C01',[1,1,2]],['D01',[1,1,3]],['D02',[1,1,4]],['WG-C02',[1,1,8]],['R02-02',[1,1,8]],['R07-02',[1,4,5]],['G02',[1,4,8]],['D05',[1,7,3]],['R06-02',[1,7,5]],['P01',[1,7,6]],['WG-P01',[1,10,2]],['WG-P02',[1,10,3]],['P09',[1,10,4]],['D07',[1,10,5]],['D08',[1,10,6]],['R08-02',[2,1,3]],['R04-02',[2,1,8]],['D03',[2,4,3]],['R05-02',[2,4,4]],['D04',[2,4,5]],['G05',[2,4,8]],['R03-02',[2,7,4]],['P10',[2,7,5]],['D06',[2,7,6]],['P11',[2,10,3]]];
export function worldPath({engine=current,choices={}}={}){
 const checkpoints={},action=(s,a)=>{const n=engine.commit(s,engine.preview(s,[a])).state;engine.validateSave(n);return n;};
 const choose=(s,id)=>{checkpoints[id]=structuredClone(s);const e=engine.getEvent(s,id);try{return action(s,{type:'event',eventId:id,choiceId:choices[id]||(id==='G04'?'custom':e.options[0].id),...(id==='G04'&&!choices[id]?{params:{amount:6,officer:'C26',visibility:'private',escort:true}}:{})});}catch(error){error.message=id+' @ '+JSON.stringify(s.date)+': '+error.message;throw error;}};
 const settle=s=>{for(let i=0;i<50;i++){const n=s.weekly.notices.find(n=>n.status==='pending'&&!n.suspended&&ordinal(n.date)<=ordinal(s.date));if(n){s=action(s,{type:'week-resolve',noticeId:n.id,choice:n.choices?.[0]});continue;}const e=engine.requiredEvents(s)[0];if(!e)return s;s=choose(s,e.id);}throw Error('world settle');};
 const reach=(s,date,period='day')=>{for(let i=0;i<200;i++){s=settle(s);if(s.weekly.clock>=stamp(date,period))return s;s=action(s,{type:'week-advance',date,period});}throw Error('world reach');};
 let s=choose(engine.createWeeklyGame(),'M01');for(const [id,a] of schedule){s=reach(s,{year:a[0],month:a[1],day:a[2]});s=choose(s,id);}s=reach(s,{year:2,month:12,day:30},'evening');s=settle(s);return {checkpoints,final:s};
}
export function quarterWorld({engine=current}={}){
 const checkpoints={},action=(s,a)=>engine.commit(s,engine.preview(s,[a])).state;
 const choose=(s,id,c)=>action(s,{type:'event',eventId:id,choiceId:c||engine.getEvent(s,id).options[0].id});let s=engine.createGame();
 for(let turn=1;turn<=8;turn++){
  for(let i=0;engine.requiredEvents(s).length&&i<50;i++){const e=engine.requiredEvents(s)[0];checkpoints[e.id]=structuredClone(s);s=choose(s,e.id);}
  for(const id of [...sideIds,...dailyIds])if(engine.availableEvents(s).some(e=>e.id===id))checkpoints[id]=structuredClone(s);
  for(const id of turn===2?['G02']:turn===6?['G05']:[]){checkpoints[id]=structuredClone(s);s=choose(s,id);}
  if(turn<8)s=action(s,{type:'advance'});
 }
 return {checkpoints,final:s};
}
export function mechanical(s){
 // The added policy journal is checked by governance tests; keep this comparison on legacy effects.
 const omit=new Set(['governance','text','dialogue','body','result','detail','privateEcho','replyMaterial','storyVersion','review']);
 const clean=x=>typeof x==='string'?x.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,'<uuid>'):Array.isArray(x)?x.map(clean):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).filter(([k])=>!omit.has(k)&&!['gameId','revision','transactions','sceneDates'].includes(k)).map(([k,v])=>[k,clean(v)])):x;
 const out=clean(s);delete out.transcripts;delete out.messages;return out;
}
