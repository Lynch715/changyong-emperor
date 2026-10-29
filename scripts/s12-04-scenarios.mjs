import * as E from '../src/engine.js';
import {act} from './s12-03-scenarios.mjs';
import {reach,settle} from './check-s08-06.mjs';
import {carryTo} from './check-s08-04.mjs';
export function beforeSeal(s){
 if(s.weekly)return settle(reach(s,{year:2,month:12,day:30},'evening'));
 if(!s.events.M12?.completed)s=carryTo(s,'M12');
 for(let i=0;i<50;i++){
  const e=E.requiredEvents(s)[0];if(!e)return s;
  s=act(s,{type:'event',eventId:e.id,choiceId:e.options[0].id});
 }
 throw Error('封卷前事项未收束');
}
export const seal=s=>act(beforeSeal(s),{type:'seal'});
