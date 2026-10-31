import * as E from '../src/v2/engine.js';
import * as G from '../src/v2/government.js';
import * as Fiscal from '../src/v2/fiscal.js';
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

import {screenLike} from '../tests/support/fiscal-fixture.mjs';
export {screenLike};
function chooseAgenda(s){E.bind(s);while(s.agenda.length){const sc=E.scene(s.agenda[0]),options=E.optionsFor(s,sc);let o=sc.disaster?options.find(o=>o.id==='relief')||options[0]:options.find(o=>['warm','keep','council','pilot','audit','slow','alone','relief','develop'].includes(o.id))||options[0];try{E.choose(s,sc.id,o.id);}catch(e){if(!/国库不足/.test(e.message))throw e;const free=options.find(o=>['local','wait','close','deny'].includes(o.id));if(!free)throw e;E.choose(s,sc.id,free.id);}}}
export function runScenario(seed=432,{fiscal=true,screen=false,months=72}={}){
 const s=screen?screenLike(seed):E.newGame(seed),initial=s.stats.treasury;let income=0,outgo=0,minimum=initial,arrearsMonths=0,firstClear=null,approved=0;const yearly=[];
 for(let n=0;n<months;n++){
  chooseAgenda(s);E.archiveReports(s);
  // 一时辰处理政务，剩余留给经营或日常。不是把三个时辰全用来批折。
  if(E.memorialCounts(s).pending&&E.canAct(s)){
   E.review(s);while(s.reviewSession.left){const m=s.memorials.find(m=>!m.result&&!m.inspectionPending&&!s.reviewSession.held.includes(m.uid));if(!m)break;
    const choice=s.stats.treasury>=E.memorialCost(m,'approve')?'approve':'hold';E.judgeMemorial(s,m.uid,choice);if(choice==='approve')approved++;
   }
  }
  if(fiscal&&E.canAct(s)){
   const project=Fiscal.projectOptions(s).find(o=>!o.reason&&s.stats.treasury>=o.cost+30);
   if(project)E.investFiscal(s,project.id);
   else if(s.stats.treasury<100&&!Fiscal.collectionInfo(s).reason)E.collectFiscal(s);
  }
  while(E.canAct(s))E.rest(s);
  E.spendNight(s,null);const report=E.endMonth(s);income+=report.ledger.treasury.in;outgo+=report.ledger.treasury.out;minimum=Math.min(minimum,report.balances.treasury);if(report.publicArrears)arrearsMonths++;
  if(screen&&!firstClear&&E.memorialCounts(s).pending<=3)firstClear=n+1;
  if(n%12===11)yearly.push({afterMonths:n+1,treasury:report.balances.treasury,backlog:E.memorialCounts(s).pending,projects:Fiscal.projectReceipts(s)});
  if(s.ended&&n<months-1){if(s.year===2)E.startVolume2(s);else if(s.year===4)E.startVolume3(s);else E.continueFamily(s);}
 }
 // endMonth 会开下个月，期间的真实追缴入账也须计入，不能漏掉这段新月现金。
 if(!s.ended){income+=s.ledger.treasury.in;outgo+=s.ledger.treasury.out;}
 const adjustment=s.stats.treasury-(initial+income-outgo);
 return {seed,initial,final:s.stats.treasury,minimum,income:Math.round(income*100)/100,outgo:Math.round(outgo*100)/100,arrearsMonths,firstClear,approved,backlog:E.memorialCounts(s).pending,accountingError:Math.round(adjustment*100)/100||0,yearly};
}
export function simulate(count=30){const result={version:'0.43.2',sampleNote:'截图压力样本只复现已知资源和60道积压，并非实际玩家存档',strategies:{}};for(const [name,options]of Object.entries({ordinary:{fiscal:false},managed:{fiscal:true},screenshot:{fiscal:true,screen:true,months:24}})){const rows=Array.from({length:count},(_,i)=>runScenario(43200+i*97,options));const values=key=>rows.map(r=>r[key]).sort((a,b)=>a-b);const summary=key=>{const a=values(key);return {min:a[0],median:a[Math.floor(a.length/2)],max:a.at(-1)}};result.strategies[name]={runs:count,final:summary('final'),minimum:summary('minimum'),backlog:summary('backlog'),arrearsMonths:summary('arrearsMonths'),firstClear:summary('firstClear'),maxAccountingError:Math.max(...rows.map(r=>Math.abs(r.accountingError))),rows};}return result;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const result=simulate(),destination=process.env.BALANCE_OUTPUT||'output/balance-v0432';mkdirSync(destination,{recursive:true});writeFileSync(path.join(destination,'results.json'),JSON.stringify(result,null,2));for(const[name,v]of Object.entries(result.strategies))console.log(JSON.stringify({name,...v,rows:undefined}));}
