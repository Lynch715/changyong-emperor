import * as E from '../src/v2/engine.js';
import {MAJOR_VARIANTS,MAJOR_BY_ID} from '../src/v2/major-event-data.js';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const pick=(a,rng)=>a[Math.floor(rng()*a.length)];
function majorChoice(s,sc,mode,rng){
 const e=s.majorEvent,v=MAJOR_VARIANTS.find(x=>x.id===e.variant),type=MAJOR_BY_ID[e.type],step=e.step;
 if(mode==='random')return pick(sc.options,rng).id;
 if(step===0)return mode==='careful'?'survey':'rescue';
 if(step===1){const xs=type.actions.filter(x=>sc.options.some(o=>o.id===x[0]));if(mode==='careful')return xs.find(x=>x[0]===v.focus)?.[0]||xs[0][0];return xs.sort((a,b)=>b[2]-a[2])[0][0];}
 if(step===2&&e.stages===5)return mode==='careful'?'correct':'correct';
 if(step===(e.stages===5?3:2))return mode==='careful'?'verify':'continue';
 return mode==='careful'?'praise':'investigate';
}
export function replay(seed,mode='careful'){
 let state=seed>>>0;const rng=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const s=E.newGame(seed),curve=[],metrics={starts:0,completed:0,unfinished:0,maxConcurrent:0,maxMajorScenesQueued:0,majorSpend:0,insufficientMajorFunds:0,missedStages:0,variants:new Set()};
 let low=s.stats.treasury;
 for(let month=1;month<=72;month++){
  const monthStart=s.stats.treasury,majorTotalSpent=()=>s.majorEventReports.reduce((a,r)=>a+(r.treasurySpent||0),0)+(s.majorEvent?.treasurySpent||0),spentBefore=majorTotalSpent();
  let guard=0;
  while(s.agenda.length&&guard++<120){
   const queued=s.agenda.filter(id=>id.startsWith('ME')).length;metrics.maxMajorScenesQueued=Math.max(metrics.maxMajorScenesQueued,queued);metrics.maxConcurrent=Math.max(metrics.maxConcurrent,s.majorEvent?1:0);
   const id=s.agenda[0],sc=E.scene(id);if(!sc)throw Error(`seed=${seed} mode=${mode}: 缺少场景 ${id}`);
   let opts=E.optionsFor(s,sc),chosen;
   if(sc.kind==='majorEvent'){
    if(id.endsWith('_0')){metrics.starts++;metrics.variants.add(s.majorEvent.variant);}
    chosen=majorChoice(s,sc,mode,rng);
   }else chosen=mode==='random'?pick(opts,rng).id:(opts.find(o=>['warm','keep','council','pilot','audit','slow','alone','relief','develop'].includes(o.id))||opts[0])?.id;
   const attempts=[chosen,...opts.map(o=>o.id).filter(x=>x!==chosen)];let settled=false;
   for(const option of attempts){try{E.choose(s,id,option);settled=true;break;}catch(error){if(sc.kind==='majorEvent'&&/国库不足/.test(error.message))metrics.insufficientMajorFunds++;}}
   if(!settled)throw Error(`seed=${seed}: 所有选项均失败 ${id}`);
   metrics.maxConcurrent=Math.max(metrics.maxConcurrent,s.majorEvent?1:0);
   metrics.maxMajorScenesQueued=Math.max(metrics.maxMajorScenesQueued,s.agenda.filter(x=>x.startsWith('ME')).length);
   low=Math.min(low,s.stats.treasury);
  }
  if(guard>=120)throw Error(`seed=${seed}: agenda 未收束`);
  while(s.ap>0)E.rest(s);
  E.spendNight(s,null);const report=E.endMonth(s);
  const spentAfter=majorTotalSpent(),monthlyMajorSpend=spentAfter-spentBefore;
  metrics.majorSpend+=monthlyMajorSpend;
  metrics.completed=s.majorEventReports.length;
  metrics.maxConcurrent=Math.max(metrics.maxConcurrent,s.majorEvent?1:0);
  low=Math.min(low,s.stats.treasury);
  curve.push({month,treasuryStart:monthStart,treasuryEnd:s.stats.treasury,treasuryIn:report.ledger.treasury.in,treasuryOut:report.ledger.treasury.out,majorSpend:monthlyMajorSpend,activeMajor:s.majorEvent?1:0,backlog:s.memorials.length});
  if(s.ended&&month<72){if(month===24)E.startVolume2(s);else if(month===48)E.startVolume3(s);}
 }
 metrics.unfinished=s.majorEvent?1:0;
 return {seed,mode,finalTreasury:s.stats.treasury,minTreasury:low,finalPeople:s.stats.people,finalCourt:s.stats.court,curve,metrics:{...metrics,variants:[...metrics.variants]}};
}
const percentile=(xs,q)=>xs.slice().sort((a,b)=>a-b)[Math.max(0,Math.ceil(xs.length*q)-1)];
export function simulate(count=100){
 const strategies={};for(const mode of ['careful','random','stress']){
  const rows=Array.from({length:count},(_,i)=>replay(842000+i*131,mode));
  const vals=k=>rows.map(r=>r[k]);
  const eventCounts=rows.map(r=>r.metrics.completed);
  strategies[mode]={runs:count,finalTreasury:{min:Math.min(...vals('finalTreasury')),p10:percentile(vals('finalTreasury'),.1),median:percentile(vals('finalTreasury'),.5),mean:Math.round(vals('finalTreasury').reduce((a,b)=>a+b,0)/count*100)/100,max:Math.max(...vals('finalTreasury'))},minTreasury:{min:Math.min(...vals('minTreasury')),p10:percentile(vals('minTreasury'),.1),median:percentile(vals('minTreasury'),.5),mean:Math.round(vals('minTreasury').reduce((a,b)=>a+b,0)/count*100)/100},events:{min:Math.min(...eventCounts),p10:percentile(eventCounts,.1),median:percentile(eventCounts,.5),p90:percentile(eventCounts,.9),max:Math.max(...eventCounts),mean:Math.round(eventCounts.reduce((a,b)=>a+b,0)/count*100)/100,total:eventCounts.reduce((a,b)=>a+b,0),unfinished:rows.reduce((a,r)=>a+r.metrics.unfinished,0),maxConcurrent:Math.max(...rows.map(r=>r.metrics.maxConcurrent)),maxQueued:Math.max(...rows.map(r=>r.metrics.maxMajorScenesQueued)),meanSpend:Math.round(rows.reduce((a,r)=>a+r.metrics.majorSpend,0)/count*100)/100,insufficientFunds:rows.reduce((a,r)=>a+r.metrics.insufficientMajorFunds,0),uniqueVariants:[...new Set(rows.flatMap(r=>r.metrics.variants))].length},rows};
 }
 return {months:72,runsPerStrategy:count,AI:false,strategies};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=simulate(Number(process.env.MAJOR_EVENT_RUNS)||100),dest='output/major-events-v042';mkdirSync(dest,{recursive:true});writeFileSync(path.join(dest,'results.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify(Object.fromEntries(Object.entries(result.strategies).map(([k,v])=>[k,{...v,rows:undefined}])),null,2));
}
