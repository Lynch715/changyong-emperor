import * as E from '../src/engine.js';import {before,carryTo} from './check-s08-04.mjs';import {reach} from './check-s08-06.mjs';import {addDays} from '../src/calendar.js';
export const act=(s,a)=>E.validateSave(E.commit(s,E.preview(s,Array.isArray(a)?a:[a])).state);
export const node=(s,eventId,choiceId='develop')=>act(s,{type:'event',eventId,choiceId});
export const talk=(s,kind,choice,actor='C10')=>act(s,{type:'extension-talk',actor,kind,...(choice?{choice}:{})});
export function route({world='weekly',initial='open',first='develop',second='develop',c09='none'}={}){
 const source=before[world].checkpoints.M06,afterM06=act(source,{type:'event',eventId:'M06',choiceId:'fair',params:{attitudes:{C09:c09,C10:initial}}}),afterFirst=node(afterM06,'XR10-01',first);
 let beforeSecond=carryTo(afterFirst,'M07');beforeSecond=node(beforeSecond,'M07',E.getEvent(beforeSecond,'M07').options[0].id);for(const e of E.requiredEvents(beforeSecond))if(e.parent==='M07')beforeSecond=node(beforeSecond,e.id,e.options[0].id);
 const afterSecond=node(beforeSecond,'XR10-02',second);return {source,afterM06,afterFirst,beforeSecond,afterSecond};
}
export function renewed(){const r=route({initial:'none'});let later=reach(r.afterSecond,addDays(r.afterSecond.date,1));const kept=talk(later,'keep-word');later=reach(kept,addDays(kept.date,1));
 const beforeResume=later,afterResume=talk(later,'resume');return {...r,kept,beforeResume,afterResume};}
