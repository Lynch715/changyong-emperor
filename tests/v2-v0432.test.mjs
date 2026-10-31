import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/v2/engine.js';
import * as G from '../src/v2/government.js';
import * as Fiscal from '../src/v2/fiscal.js';
import {funds} from '../src/v2/economy.js';
import {runScenario,screenLike} from '../scripts/v0432-balance.mjs';
const ready=()=>{const s=E.newGame(432);s.agenda=[];s.memorials=[];s.followups=[];return E.bind(s);};
const api={applyStats:E.applyStats,funds,rand:()=>0};
const next=s=>{s.agenda=[];E.endMonth(s);s.agenda=[];};

test('0.43.2 旧档只补经营账面，不加现金、不发历史收入、不改原折与旧排期',()=>{
 const s=ready();delete s.fiscal;s.year=3;s.month=2;s.stats.treasury=786.62;s.followups=[{id:'decision',at:30,data:{ruleVersion:2,province:'河南',title:'库银亏空',choice:'approve'}}];G.addMemorial(s,{title:'旧核查',province:'河南',type:'河工',inspectionPending:true});
 const original=JSON.stringify(s),l=E.load({getItem:()=>original,setItem:()=>assert.fail('读档不能写回')});
 assert.equal(l.stats.treasury,786.62);assert.deepEqual(l.people,s.people);assert.deepEqual(l.followups,s.followups);assert.deepEqual(l.memorials,s.memorials);assert.equal(l.fiscal.projects.salt.level,0);assert.equal(l.fiscal.arrearsPool,60);assert.equal(Fiscal.projectReceipts(l),0);assert.equal(JSON.stringify(s),original);
});

test('0.43.2 立项真实扣银和AP，下月才产生收益，同月不能重复安排',()=>{
 const s=ready(),cash=s.stats.treasury;E.investFiscal(s,'salt');assert.equal(s.stats.treasury,cash-8);assert.equal(s.ap,2);assert.equal(s.fiscal.projects.salt.level,0);assert.equal(Fiscal.projectReceipts(s),0);const before=JSON.stringify(s);assert.throws(()=>E.investFiscal(s,'trade'),/本月/);assert.equal(JSON.stringify(s),before);
 const first=E.endMonth(s);assert.equal(first.fiscal.projects,0);assert.equal(s.fiscal.projects.salt.level,1);assert.equal(Fiscal.projectReceipts(s),4);s.agenda=[];const second=E.endMonth(s);assert.equal(second.fiscal.projects,4);assert.ok(second.ledger.treasury.in>=second.fiscal.base+4);
});

test('0.43.2 升级替代旧级收益，封顶三级；不足或无AP均不产生半次立项',()=>{
 const s=ready();for(let level=1;level<=3;level++){s.agenda=[];E.investFiscal(s,'salt');next(s);assert.equal(s.fiscal.projects.salt.level,level);assert.equal(Fiscal.projectReceipts(s),level*4);}
 const old=JSON.stringify(s);assert.throws(()=>E.investFiscal(s,'salt'),/三级/);assert.equal(JSON.stringify(s),old);
 for(const situation of ['cash','ap']){const q=ready();if(situation==='cash')q.stats.treasury=0;else q.ap=0;const before=JSON.stringify(q);assert.throws(()=>E.investFiscal(q,'trade'));assert.equal(JSON.stringify(q),before);}
});

test('0.43.2 催解旧欠延后实收、额度有限、有三个月间隔，读档及重复开月不重发',()=>{
 const s=ready(),cash=s.stats.treasury;E.collectFiscal(s);assert.equal(s.stats.treasury,cash);const amount=s.fiscal.collectionPending.amount;assert.equal(s.ap,2);assert.equal(s.fiscal.arrearsPool,60);assert.throws(()=>E.collectFiscal(s),/路上/);
 s.month++;Fiscal.openFiscalMonth(s,E.log);assert.equal(s.stats.treasury,cash+amount);assert.equal(s.fiscal.arrearsPool,60-amount);assert.equal(s.fiscal.collectedThisMonth,amount);const before=JSON.stringify(s);Fiscal.openFiscalMonth(s,E.log);assert.equal(JSON.stringify(s),before);assert.throws(()=>E.collectFiscal(s),/三个月/);
 const l=E.load({getItem:()=>JSON.stringify(s)}),beforeCash=l.stats.treasury;Fiscal.openFiscalMonth(l,E.log);assert.equal(l.stats.treasury,beforeCash);
 while(s.fiscal.arrearsPool){s.month+=3;if(s.month>12){s.year++;s.month-=12;}s.ap=3;E.collectFiscal(s);s.month++;if(s.month>12){s.year++;s.month=1;}Fiscal.openFiscalMonth(s,E.log);}
 assert.equal(s.stats.treasury,cash+60);assert.equal(s.fiscal.arrearsPool,0);assert.throws(()=>E.collectFiscal(s),/清完/);
});

test('0.43.2 新清欠朱批查实才回款，仅一次；失败、仅核查和非清欠题不冒充进项',()=>{
 for(const [title,choice,success,returned]of [['库银亏空','approve',true,12],['知县侵渔','approve',true,10],['库银亏空','inspect',true,0],['养廉核支','approve',true,0],['库银亏空','approve',false,0]]){
  const s=ready(),m=G.addMemorial(s,{title,province:'河南',type:title==='知县侵渔'?'吏治':'钱粮'});E.review(s);const initial=s.stats.treasury;E.judgeMemorial(s,m.uid,choice);const cost=E.memorialCost(m,choice);assert.equal(s.followups[0].data.ruleVersion,3);s.month+=2;G.regionalMonth(s,{...api,rand:()=>success?0:1});assert.equal(s.stats.treasury,initial-cost+returned,title);const cash=s.stats.treasury;G.regionalMonth(s,api);assert.equal(s.stats.treasury,cash);if(returned)assert.ok(s.govReports.some(r=>r.body.includes(returned+'万两已实际')));
 }
});

test('0.43.2 已付费的旧版朱批仍按旧规则兑现，不追溯生成额外银子',()=>{
 const s=ready();s.followups=[{id:'decision',at:2,data:{ruleVersion:2,province:'河南',type:'钱粮',title:'库银亏空',choice:'approve',needsFunding:false,authorId:null,funding:18,source:'准'}}];s.month=2;const cash=s.stats.treasury;G.regionalMonth(s,api);assert.equal(s.stats.treasury,cash);assert.ok(s.provinces.河南.revenue>55);
});

test('0.43.2 已交核查和办结回报不算待批积压，原折与回报内容均保留',()=>{
 const s=ready();for(let i=0;i<10;i++)G.addMemorial(s,{title:'已交查勘'+i,province:'河南',type:'河工',inspectionPending:true});const report=G.addMemorial(s,{title:'已办回报',province:'河南',type:'回报',body:'旧回报原文',result:true});assert.deepEqual(E.memorialCounts(s),{pending:0,waiting:10});const court=s.stats.court,health=s.stats.health;G.backlog(s,E.applyStats);assert.equal(s.stats.court,court);assert.equal(s.stats.health,health);
 s.month++;G.memorialMonth(s,()=>0);assert.equal(s.memorials.filter(m=>m.inspectionPending).length,10);assert.ok(s.govReports.some(r=>r.uid===report.uid&&r.body==='旧回报原文'));assert.equal(E.memorialCounts(s).pending,2);
});

test('0.43.2 查看预算不改状态，月结按真实常例、任职、地方与经营进账记账',()=>{
 const s=ready(),before=JSON.stringify(s);Fiscal.forecast(s);Fiscal.projectOptions(s);Fiscal.collectionInfo(s);assert.equal(JSON.stringify(s),before);E.investFiscal(s,'trade');next(s);s.agenda=[];const opening=s.stats.treasury,report=E.endMonth(s);assert.equal(report.fiscal.projects,5);assert.equal(report.balances.treasury,Math.round((opening+report.ledger.treasury.in-report.ledger.treasury.out)*100)/100);assert.equal(s.fiscal.lastReport.balance,report.balances.treasury);assert.equal(s.fiscal.lastReport.projects,5);assert.equal(Fiscal.dueProjectReceipts({...s,fiscal:{...s.fiscal,settledAt:Fiscal.fiscalMonth(s)}}),0);
});

test('0.43.2 截图同等压力样本60道原折保留，单时辰批阅可逐步恢复且现金守恒',()=>{
 const s=screenLike();assert.equal(s.year,3);assert.equal(s.month,2);assert.equal(s.ap,0);assert.equal(s.stats.treasury,786.62);assert.equal(E.memorialCounts(s).pending,60);
 for(const seed of [43200,43297,43394]){const r=runScenario(seed,{screen:true,months:24,fiscal:true});assert.ok(r.minimum>400,JSON.stringify(r));assert.equal(r.arrearsMonths,0);assert.ok(r.firstClear<=24);assert.equal(r.accountingError,0);assert.ok(r.final>786.62);}
});

test('0.43.2 两条常见六年路线可持续，经营有清楚的额外收益且不突破满库阈值',()=>{
 const ordinary=runScenario(43200,{fiscal:false}),managed=runScenario(43200,{fiscal:true});for(const r of [ordinary,managed]){assert.equal(r.accountingError,0);assert.equal(r.arrearsMonths,0);assert.ok(r.final>800&&r.final<6000);assert.ok(r.backlog<=4);}assert.ok(managed.final-ordinary.final>1000);
});
