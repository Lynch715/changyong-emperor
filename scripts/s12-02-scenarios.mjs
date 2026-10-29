import * as E from '../src/engine.js';
import {before,carryTo} from './check-s08-04.mjs';
import {reach} from './check-s08-06.mjs';
import {addDays} from '../src/calendar.js';
export const act=(s,a)=>E.validateSave(E.commit(s,E.preview(s,Array.isArray(a)?a:[a])).state);
export const node=(s,eventId,choiceId='develop')=>act(s,{type:'event',eventId,choiceId});
export const talk=(s,kind,choice)=>act(s,{type:'extension-talk',actor:'C09',kind,...(choice?{choice}:{})});
export function route({world='weekly',initial='open',first='develop',m11='open',second='develop'}={}){
 const source=before[world].checkpoints.M06;
 const afterM06=act(source,{type:'event',eventId:'M06',choiceId:'fair',params:{attitudes:{C09:initial,C10:'none'}}});
 const afterFirst=node(afterM06,'XR09-01',first),beforeM11=carryTo(afterFirst,'M11'),afterM11=node(beforeM11,'M11',m11),afterSecond=node(afterM11,'XR09-02',second);
 return {source,afterM06,afterFirst,beforeM11,afterM11,afterSecond};
}
export function repaired(){const r=route({m11:'vague'}),repair=talk(r.afterSecond,'repair');let later=reach(repair,addDays(repair.date,1));const kept=talk(later,'keep-word');later=reach(kept,addDays(repair.date,7));later=act(later,{type:'week-extend',date:later.date});const renewed=talk(later,'resume');return {...r,repair,kept,beforeResume:later,renewed};}
