// 户部经营：银子只在实际到账时入库，旧档不补发历史收入。
import {ECONOMY} from './data.js';
import {silver,funds} from './economy.js';
export const fiscalMonth=s=>(s.year-1)*12+s.month;
export const FISCAL_PROJECTS={
 salt:{name:'清理盐课',description:'核清引额和解运，减少截留，不另向百姓加派。',costs:[8,14,20],receipts:[4,8,12]},
 trade:{name:'疏通商路',description:'清理关卡与运路，让现有商税按册解库。',costs:[12,20,28],receipts:[5,10,16]}
};
export function initFiscal(s){
 s.fiscal??={};const f=s.fiscal;f.projects??={};
 for(const id of Object.keys(FISCAL_PROJECTS))f.projects[id]??={level:0,pending:null};
 // 六十万两是待核旧欠的游戏账面额度，不是现金，不在读档时领取。
 f.arrearsPool??=60;f.lastCollection??=null;f.collectionPending??=null;f.investedAt??=null;f.settledAt??=null;
 return s;
}
export function projectReceipts(s){return Object.entries(FISCAL_PROJECTS).reduce((sum,[id,p])=>sum+(p.receipts[(s.fiscal?.projects?.[id]?.level||0)-1]||0),0);}
export function projectOptions(s){const at=fiscalMonth(s);return Object.entries(FISCAL_PROJECTS).map(([id,p])=>{const level=s.fiscal?.projects?.[id]?.level||0,pending=s.fiscal?.projects?.[id]?.pending;let reason='';if(pending)reason='正在办理，下月见效';else if(level>=3)reason='已整顿至三级';else if(s.fiscal?.investedAt===at)reason='本月已安排一项，先等回报';else if(s.stats.treasury<p.costs[level])reason='国库不足';return {id,...p,level,pending,cost:p.costs[level]??0,monthly:p.receipts[level-1]||0,nextMonthly:p.receipts[level]??p.receipts.at(-1),reason};});}
export function invest(s, id, spend, log) {
  const o = projectOptions(s).find((x) => x.id === id);
  if (!o) throw Error('没有这项理财安排。');
  if (o.reason) throw Error(o.reason + '。');
  spend(s);
  const stats = funds(s, { treasury: -o.cost }, '理财');
  s.fiscal.investedAt = fiscalMonth(s);
  s.fiscal.projects[id].pending = { level: o.level + 1, due: fiscalMonth(s) + 1 };
  log(s, `户部安排${o.name}，实付${o.cost}万两，下月起每月解库${o.nextMonthly}万两。`, '银');
  return {
    title: o.name,
    text: `已用一个时辰，国库支出${o.cost}万两。下月办妥后，这一项每月解库${o.nextMonthly}万两，替代原来的${o.monthly}万两，不重复叠加旧级收益。`,
    stats,
    people: {},
  };
}
export function collectionInfo(s){const f=s.fiscal,at=fiscalMonth(s),pool=f?.arrearsPool??60;let reason='';if(f?.collectionPending)reason='前次催解还在路上';else if(pool<=0)reason='这批旧欠已清完';else if(f?.lastCollection!=null&&at-f.lastCollection<3)reason='每三个月最多催解一次';const integrity=Object.values(s.provinces||{}).reduce((n,p)=>n+p.integrity,0)/Math.max(1,Object.keys(s.provinces||{}).length);return {pool,amount:Math.min(pool,12+Math.floor(integrity/10)),reason};}
export function collect(s,spend,log){const info=collectionInfo(s);if(info.reason)throw Error(info.reason+'。');spend(s);s.fiscal.lastCollection=fiscalMonth(s);s.fiscal.collectionPending={amount:info.amount,due:fiscalMonth(s)+1};log(s,`催解旧欠${info.amount}万两，待下月实收。`,'银');return {title:'催解旧欠',text:`户部已核定这批旧欠${info.amount}万两，催地方下月解送。用一个时辰，不另花银；到账前不计入国库。这批旧欠总额有限，不能反复凭空领银。`,stats:{},people:{}};}
export function openFiscalMonth(s,log){
 initFiscal(s);const f=s.fiscal,at=fiscalMonth(s);if(f.openedAt===at)return;f.openedAt=at;f.collectedThisMonth=0;
 for(const [id,p]of Object.entries(f.projects))if(p.pending&&p.pending.due<=at){p.level=p.pending.level;p.pending=null;const text=FISCAL_PROJECTS[id].name+`已办妥，每月解库${FISCAL_PROJECTS[id].receipts[p.level-1]}万两。`;s.govNotes.push(text);log(s,text,'银');}
 if(f.collectionPending?.due<=at){const amount=Math.min(f.arrearsPool,f.collectionPending.amount);funds(s,{treasury:amount});f.arrearsPool=silver(f.arrearsPool-amount);f.collectedThisMonth=amount;f.collectionPending=null;const text=`前次催解的旧欠${amount}万两已实际入库，尚有${f.arrearsPool}万两待清。`;s.govNotes.push(text);log(s,text,'银');}
}
export const dueProjectReceipts=s=>s.fiscal?.settledAt===fiscalMonth(s)?0:projectReceipts(s);
export function forecast(s){const vol=(s.vol||1)-1,province=silver(Object.values(s.provinces||{}).reduce((n,p)=>n+(p.revenue-55)*.09,0));const policy=Object.entries(s.policies||{}).reduce((n,[id,p])=>n+(p.progress>=100?1:p.active?6:0),0);return {base:ECONOMY.income[vol],province,projects:projectReceipts(s),publicOutgo:ECONOMY.publicOutgo[vol],policy,arrears:s.publicArrears||0};}

// 后期可选择把积银用于地方，无硬性削财，也不改变旧档现金。
export function publicWorksInfo(s){const now=fiscalMonth(s);let reason='';if(s.year<7)reason='七年起可安排地方修缮';else if(s.fiscal?.lastWorksAt!=null&&now-s.fiscal.lastWorksAt<3)reason='每三个月最多修缮一省';else if(s.stats.treasury<60)reason='国库不足六十万两';return {cost:60,reason,provinces:Object.keys(s.provinces||{})};}
