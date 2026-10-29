import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as engine from '../src/engine.js';
import {exportSave} from '../src/storage.js';
import {mainCheckpoints} from './s08-main-scenarios.mjs';
import {buildAIContext,buildReactionContext} from '../src/input.js';
export const dir=fileURLToPath(new URL('../docs/施工/证据/2026-10-24-S08-04/',import.meta.url));
export const before=JSON.parse(fs.readFileSync(path.join(dir,'施工前剧情与分支基线.json'),'utf8'));
export const act=(s,a)=>engine.commit(s,engine.preview(s,[a])).state;
export const choose=(s,id,choiceId,params)=>act(s,{type:'event',eventId:id,choiceId,...(params?{params}:{})});
export function carryTo(s,id){for(let i=0;i<400;i++){if(engine.requiredEvents(s).some(e=>e.id===id))return s;if(s.weekly){const n=s.weekly.notices.find(n=>n.status==='pending'&&!n.suspended&&engine.ordinal(n.date)<=engine.ordinal(s.date));const e=engine.requiredEvents(s)[0];s=act(s,n?{type:'week-resolve',noticeId:n.id,choice:n.choices?.[0]}:e?{type:'event',eventId:e.id,choiceId:e.options[0].id}:{type:'week-advance'});}else{const e=engine.requiredEvents(s)[0];s=act(s,e?{type:'event',eventId:e.id,choiceId:e.options[0].id}:{type:'advance'});}}throw Error('未到目标场景');}
export function branch(weekly=true,intents={C09:'open',C10:'none'},m11='open'){
 let s=choose(before[weekly?'weekly':'quarter'].checkpoints.M06,'M06','ability',{attitudes:intents});const afterM06=s;s=carryTo(s,'M11');const beforeM11=s;s=choose(s,'M11',m11);return {afterM06,beforeM11,afterM11:s};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const save=(name,s)=>{engine.validateSave(s);fs.writeFileSync(path.join(dir,name+'.json'),exportSave(s));};
 for(const world of ['weekly','quarter']){
  save(world+'_M06_施工前起点',before[world].checkpoints.M06);
  for(const tone of ['open','none','unsure']){const b=branch(world==='weekly',{C09:tone,C10:tone},tone==='none'?'polite':tone);save(world+'_M11_'+tone+'_起点',b.beforeM11);save(world+'_M11_'+tone+'_结果',b.afterM11);}
  save(world+'_M11_旧影原档',before[world].checkpoints.M11);
 }
 const mixed=branch(true,{C09:'open',C10:'none'},'vague');save('甄愿了解_沈明确无意_殿前后',mixed.afterM06);save('含混赏赐_结果',mixed.afterM11);
 fs.writeFileSync(path.join(dir,'人物上下文隔离.json'),JSON.stringify({C09:buildAIContext(mixed.afterM06,'C09','M06'),C10:buildAIContext(mixed.afterM06,'C10','M06'),C08:buildReactionContext(mixed.afterM06,'C08','M06')},null,2));
 let final=carryTo(mixed.afterM11,'M12');final=choose(final,'M12','system');for(let i=0;i<150&&!final.sealed;i++){const n=final.weekly.notices.find(n=>n.status==='pending'&&!n.suspended&&engine.ordinal(n.date)<=engine.ordinal(final.date));const e=engine.requiredEvents(final)[0];const end=engine.ordinal(final.date)===720&&final.weekly.monthly.length===24;final=act(final,n?{type:'week-resolve',noticeId:n.id,choice:n.choices?.[0]}:e?{type:'event',eventId:e.id,choiceId:e.options[0].id}:end?{type:'seal'}:{type:'week-advance'});}save('含混赏赐_两年封卷',final);
 console.log(JSON.stringify({version:'0.8.4',fixtureFiles:fs.readdirSync(dir).filter(n=>n.endsWith('.json')).length,ending:final.ending.counts,monthly:final.weekly.monthly.length}));
}
