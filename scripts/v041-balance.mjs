import * as E from '../src/v2/engine.js';
import * as G from '../src/v2/government.js';
import {treasuryIndex} from '../src/v2/economy.js';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// 决策随机数与引擎骰子隔离。random保留0.41.0的不任命、不启动新政策略作压力对照。
export function replay(seed,mode='fixed'){
 const s=E.newGame(seed),random=mode.startsWith('random'),managed=mode==='randomManaged',legacy=mode==='fixedInspect';
 let prng=seed+17;const randomValue=()=>{prng=(Math.imul(prng,1664525)+1013904223)>>>0;return prng/4294967296;},pick=a=>a[Math.floor(randomValue()*a.length)];
 const metrics={treasuryIn:0,treasuryOut:0,publicOutgo:0,courtFullMonths:0,peopleZeroMonths:0,arrearsMonths:0,disasters:0,decisions:{},yearly:[]};
 for(let month=1;month<=72;month++){
  while(s.agenda.length){const sc=E.scene(s.agenda[0]),os=E.optionsFor(s,sc);let o=random?pick(os):os.find(x=>['warm','keep','council','pilot','audit','slow','alone','relief','develop'].includes(x.id))||os[0];if(sc.disaster&&o.id==='relief'&&s.stats.treasury<25)o=os.find(o=>o.id==='deny');E.choose(s,sc.id,o.id);}
  if((!random||managed)&&month<=3){const [id,office]=[['C30','henan'],['C31','zhili'],['C29','yungui']][month-1];E.appointPerson(s,id,office);}
  if(s.month===12)for(const r of E.assessmentRows(s))E.assessOfficial(s,r.id,'stay');
  for(const m of s.secrets.filter(m=>!m.done))E.judgeSecret(s,m.uid,random?pick(['keep','warn','investigate']):'investigate');
  E.archiveReports(s);
  while(s.ap){
   if(!random&&s.stats.health<55){E.rest(s);continue;}
   const reform=Object.keys(G.POLICIES).find(id=>!s.policies[id].active&&s.policies[id].progress<100);
   if((!random||managed)&&reform&&s.stats.treasury>100){const host={huohao:'C30',land:'C31',service:'C31',tusi:'C29'}[reform],pilot=reform==='service'?'直隶':G.POLICIES[reform].pilot;if(G.policyHostValid(s,reform,host,pilot)){E.launchPolicy(s,reform,host,pilot);continue;}}
   const available=()=>s.memorials.find(m=>!s.reviewSession?.held.includes(m.uid)&&!m.inspectionPending);
   if(s.memorials.some(m=>!m.inspectionPending)&&(!random||randomValue()<.65)){
    E.review(s);
    while(s.reviewSession.left){const m=available();if(!m)break;
     const choices=E.memorialOptions(m).map(x=>x[0]).filter(x=>s.stats.treasury>=E.memorialCost(m,x));
     let choice=random?pick(choices):m.result?'ack':m.disaster?'approve':G.needsFunding(m)?legacy&&!m.inspected?'inspect':mode==='fixedApprove'||s.provinces[m.province].livelihood<(mode==='fixedFrugal'?65:70)?'approve':'reject':'inspect';
     if(!choices.includes(choice))choice=choices.includes('inspect')?'inspect':choices.includes('department')?'department':'hold';
     metrics.decisions[choice]=(metrics.decisions[choice]||0)+1;E.judgeMemorial(s,m.uid,choice);
    }
   }else E.rest(s);
  }
  E.spendNight(s,null);const report=E.endMonth(s);metrics.treasuryIn+=report.ledger.treasury.in;metrics.treasuryOut+=report.ledger.treasury.out;metrics.publicOutgo+=report.publicOutgo||0;
  if(s.stats.court===100)metrics.courtFullMonths++;if(s.stats.people===0)metrics.peopleZeroMonths++;
  if(report.govNotes?.some(n=>n.includes('拖欠公项')))metrics.arrearsMonths++;
  metrics.disasters+=(report.govNotes||[]).filter(n=>n.includes('升级为要务')).length;
  if(month%12===0)metrics.yearly.push({month,...s.stats,backlog:s.memorials.length});
  if(s.ended&&month<72){if(month===24)E.startVolume2(s);if(month===48)E.startVolume3(s);}
 }
 const e=E.ending(s),low=Math.min(treasuryIndex(s),s.stats.people,s.stats.court,s.stats.palace,s.stats.health);
 return {...s.stats,score:e.score,best:e.score>=400&&low>=40&&e.governmentReady,metrics,backlog:s.memorials.length,provinceLife:Object.values(s.provinces).reduce((n,p)=>n+p.livelihood,0)/10,provinceIntegrity:Object.values(s.provinces).reduce((n,p)=>n+p.integrity,0)/10};
}
export function simulate(count=200){const root=path.resolve(import.meta.dirname,'..'),files=['src/v2/government.js','src/v2/engine.js','src/v2/appointments.js','src/v2/data.js','scripts/v041-balance.mjs'];
 const result={months:72,runsPerStrategy:count,AI:false,seedFormula:'41000 + i * 97',version:JSON.parse(readFileSync(path.join(root,'package.json'))).version,sourceHashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(path.join(root,f))).digest('hex')])),strategies:{}};
 for(const mode of ['fixed','random','fixedInspect','randomManaged','fixedApprove','fixedFrugal']){const rows=Array.from({length:count},(_,i)=>replay(41000+i*97,mode));const mean=f=>Math.round(rows.reduce((n,r)=>n+f(r),0)/count*100)/100;
 result.strategies[mode]={bestCount:rows.filter(x=>x.best).length,bestRate:rows.filter(x=>x.best).length/count,distribution:Object.fromEntries(['treasury','inner','people','court','provinceLife','provinceIntegrity','backlog'].map(key=>{const a=rows.map(r=>r[key]).sort((a,b)=>a-b);return [key,{min:a[0],p10:a[Math.max(0,Math.ceil(count*.1)-1)],median:a[Math.ceil(count*.5)-1],p90:a[Math.ceil(count*.9)-1],max:a[count-1],mean:mean(r=>r[key])}];})),meanFlows:Object.fromEntries(['treasuryIn','treasuryOut','publicOutgo','courtFullMonths','peopleZeroMonths','arrearsMonths','disasters'].map(k=>[k,mean(r=>r.metrics[k])])),rows};}
 return result;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const result=simulate(),dest=process.env.BALANCE_OUTPUT||'output/balance-v0411';mkdirSync(dest,{recursive:true});writeFileSync(path.join(dest,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(Object.fromEntries(Object.entries(result.strategies).map(([k,v])=>[k,{...v,rows:undefined}])),null,2));}
