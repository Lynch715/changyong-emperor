import * as E from '../src/v2/engine.js';
import * as F from '../src/v2/family.js';
import * as Fiscal from '../src/v2/fiscal.js';
import {LONG_STORIES} from '../src/v2/long-stories.js';
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export const longStoryList=()=>Array.isArray(LONG_STORIES)?LONG_STORIES:Object.values(LONG_STORIES);
const round=n=>Math.round(n*100)/100||0;
const monthIndex=s=>(s.year-1)*12+s.month;
const priority=['warm','keep','council','pilot','audit','slow','alone','relief','develop','quiet','listen','expose','verify','praise'];
const observe=(s,m)=>{if(!('minimum'in m))return;m.minimum=Math.min(m.minimum,s.stats.treasury);m.minHealth=Math.min(m.minHealth,s.stats.health);m.minPalace=Math.min(m.minPalace,s.stats.palace);};

// 使用真实剧情选项及皇嗣向导，不通过清空要事或改写日期跳过流程。
export function settleLongAgenda(s, metrics = { stories: {}, family: [] }) {
  E.bind(s);
  let guard = 0;
  while (s.agenda.length || s.pendingBirth || s.familyArt?.required) {
    if (++guard > 100)
      throw Error('本月要事未收束：' + JSON.stringify({ year: s.year, month: s.month, agenda: s.agenda }));
    if (s.pendingBirth) {
      if (!s.pendingBirth.name) E.nameChild(s, '长宁' + String.fromCharCode(0x4e00 + s.children.length));
      E.completeBirth(s, s.pendingBirth.sex === '男' ? 'k_infant_01' : 'k_infant_04');
      continue;
    }
    if (s.familyArt?.required) {
      const c = F.childById(s, s.familyArt.child);
      E.changeChildArt(s, c.id, F.defaultChildArt(F.childStage(s, c), c.sex));
      continue;
    }
    const id = E.pendingScene(s),
      sc = E.scene(s, id);
    if (!sc) throw Error('找不到剧情：' + id);
    const meta = longStoryList().find((story) => story.id === id);
    if (meta?.dep && !s.done[meta.dep]) throw Error('故事先后顺序错误：' + id + '早于' + meta.dep);
    const os = E.optionsFor(s, sc);
    if (!os.length) throw Error('剧情没有选项：' + id);
    let opt =
      sc.familyType === 'birth'
        ? os.find((o) => o.id === 'girl')
        : sc.familyType === 'news'
          ? os.find((o) => o.id === 'quiet')
          : sc.familyType === 'threat'
            ? os.find((o) => o.id === 'expose')
            : sc.kind === 'festival' && s.children.length
              ? os.find((o) => o.id === 'all')
              : null;
    opt ??= priority.map((p) => os.find((o) => o.id === p)).find(Boolean) || os[0];
    try {
      E.choose(s, id, opt.id);
    } catch (error) {
      if (!/国库不足|内帑不足/.test(error.message)) throw error;
      const free = os.find(
        (o) =>
          o !== opt &&
          (o.effects?.treasury ?? 0) >= 0 &&
          (o.effects?.inner ?? 0) >= 0 &&
          !o.cost &&
          !o.redeem,
      );
      if (!free) throw error;
      E.choose(s, id, free.id);
    }
    if (longStoryList().some((story) => story.id === id))
      metrics.stories[id] = (metrics.stories[id] || 0) + 1;
    if (sc.familyType) metrics.family.push({ id, type: sc.familyType, year: s.year, month: s.month });
    observe(s, metrics);
  }
}

export function continueLongCampaign(s){
 if(!s.ended)return;
 if(s.year===2)E.startVolume2(s);else if(s.year===4)E.startVolume3(s);else E.continueFamily(s);
}

export function runLongJourney(seed=44000,{months=360,state=null,publicWorks=true,onMonth=null}={}){
 const s=state||E.newGame(seed),initial=s.stats.treasury;
 const metrics={seed,months:0,initial,minimum:initial,minHealth:s.stats.health,minPalace:s.stats.palace,income:0,outgo:0,arrearsMonths:0,approved:0,works:0,stories:{},family:[],checkpoints:[],yearly:[]};
 let previous=monthIndex(s)-(s.ended?0:1);
 for(let n=0;n<months;n++){
  continueLongCampaign(s);
  if(monthIndex(s)!==previous+1)throw Error('月历跳跃或重复：'+s.year+'-'+s.month);previous=monthIndex(s);
  settleLongAgenda(s,metrics);onMonth?.(s,metrics);
  E.archiveReports(s);
  // 仅花一时辰批折，其余留给经营、公共工程与日常休养。
  if(E.memorialCounts(s).pending&&E.canAct(s)){
   E.review(s);
   while(s.reviewSession.left){const m=s.memorials.find(m=>!m.result&&!m.inspectionPending&&!s.reviewSession.held.includes(m.uid));if(!m)break;const choice=s.stats.treasury>=E.memorialCost(m,'approve')?'approve':'hold';E.judgeMemorial(s,m.uid,choice);if(choice==='approve')metrics.approved++;observe(s,metrics);}
  }
  if(E.canAct(s)){
   const project=Fiscal.projectOptions(s).find(o=>!o.reason&&s.stats.treasury>=o.cost+100);
   if(project)E.investFiscal(s,project.id);
   else if(publicWorks&&s.year>=7&&s.stats.treasury>500&&!Fiscal.publicWorksInfo(s).reason){
    const province=Object.entries(s.provinces).sort((a,b)=>a[1].livelihood+a[1].integrity-b[1].livelihood-b[1].integrity)[0][0];E.publicWorks(s,province);metrics.works++;
   }else if(s.stats.treasury<100&&!Fiscal.collectionInfo(s).reason)E.collectFiscal(s);
  }
  observe(s,metrics);while(E.canAct(s)){E.rest(s);observe(s,metrics);}
  E.spendNight(s,null);const report=E.endMonth(s);metrics.months++;
  metrics.income+=report.ledger.treasury.in;metrics.outgo+=report.ledger.treasury.out;
  metrics.minimum=Math.min(metrics.minimum,report.balances.treasury);metrics.minHealth=Math.min(metrics.minHealth,s.stats.health);metrics.minPalace=Math.min(metrics.minPalace,s.stats.palace);
  if(report.publicArrears)metrics.arrearsMonths++;
  if(s.ended)metrics.checkpoints.push({year:s.year,month:s.month,info:E.campaignInfo(s)});
  if(report.m===12)metrics.yearly.push({year:report.y,treasury:report.balances.treasury,health:s.stats.health,palace:s.stats.palace,backlog:E.memorialCounts(s).pending,works:metrics.works});
  if(!Number.isFinite(s.stats.treasury)||!Number.isFinite(report.fiscal.base)||!Number.isFinite(report.publicOutgo))throw Error('月结出现无效数值');
 }
 // endMonth 已开下个月时，将新月开月的真实解库计入累计账簿。
 if(!s.ended){metrics.income+=s.ledger.treasury.in;metrics.outgo+=s.ledger.treasury.out;}
 metrics.income=round(metrics.income);metrics.outgo=round(metrics.outgo);metrics.final=s.stats.treasury;metrics.accountingError=round(s.stats.treasury-(initial+metrics.income-metrics.outgo));metrics.backlog=E.memorialCounts(s).pending;
 return {s,metrics};
}

export function simulateLong(count=10){
 const rows=Array.from({length:count},(_,i)=>runLongJourney(44000+i*97,{months:i<2?480:360}).metrics);
 return {version:'0.44.0',note:'元年新档逐月推进，单时辰批折、经营及每季自愿公共工程，未调满资源或跳月；前两组继续至四十年。',rows};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=simulateLong(),destination=process.env.BALANCE_OUTPUT||'output/balance-v044';mkdirSync(destination,{recursive:true});writeFileSync(path.join(destination,'results.json'),JSON.stringify(result,null,2));
 for(const r of result.rows)console.log(JSON.stringify({...r,stories:Object.keys(r.stories).length,family:r.family.length,yearly:undefined}));
}
