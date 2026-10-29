import * as E from '../src/engine.js';
import {before} from './check-s08-04.mjs';
export const act=(s,a)=>E.validateSave(E.commit(s,E.preview(s,[a])).state);
export const ask=(s,pair,actor)=>act(s,{type:'cross-inquiry',pair,actor});
export function source(world='weekly'){
 let s=before[world].checkpoints.M09;s=act(s,{type:'event',eventId:'M09',choiceId:'listen'});
 for(const e of E.requiredEvents(s))if(e.parent==='M09')s=act(s,{type:'event',eventId:e.id,choiceId:'work'});
 return s;
}
export function allAccounts(){let s=source();for(const [pair,actor]of [['C05-C09','C05'],['C05-C09','C09'],['C04-C09','C04'],['C04-C09','C09'],['C09-C10','C09'],['C09-C10','C10']])s=ask(s,pair,actor);return s;}
