import * as E from '../src/engine.js';
import {before} from './check-s08-04.mjs';
import {nextFreeMoment} from '../src/week.js';
export const act=(s,a)=>E.validateSave(E.commit(s,E.preview(s,Array.isArray(a)?a:[a])).state);
export function initial(tone='open') {let s=act(before.weekly.checkpoints.M06,{type:'event',eventId:'M06',choiceId:'fair',params:{attitudes:{C09:tone,C10:tone}}});for(const e of E.requiredEvents(s))if(e.parent==='M06')s=act(s,{type:'event',eventId:e.id,choiceId:'work'});return s;}
export const node=(s,cid,choiceId='develop')=>act(s,{type:'event',eventId:`XR${cid.slice(1)}-01`,choiceId});
export function perform(s,cid,kind,extra={}) {const m=nextFreeMoment(s);s=act(s,{type:'week-plan',actor:cid,kind,date:m.date,period:m.period,...extra});return act(s,{type:'week-fulfill',planId:s.weekly.plans.at(-1).id});}
export const buy=(s,giftId)=>act(s,{type:'activity-buy',giftId});
export function gifted(cid,phase=1){let s=initial();if(phase===2)s=node(s,cid);s=buy(s,cid==='C09'?'GF10':'GF01');return perform(s,cid,'gift',{itemId:s.weekly.activities.inventory.at(-1).id});}
