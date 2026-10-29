import {isEighth,installEighth,eighthChoice,eighthReview,eighthRunLabel,eighthStops,makeEighthReport,eighthEventView} from './volume8.js';
import {validateEighth} from './volume8-validation.js';
import {V8_WEEKS,V8_MAINS,V8_EVENTS} from './volume8-content.js';
import {isSeventh,installSeventh,seventhChoice,seventhReview,seventhRunLabel,seventhStops,makeSeventhReport,seventhEventView} from './volume7.js';
import {validateSeventh} from './volume7-validation.js';
import {V7_WEEKS,V7_MAINS,V7_EVENTS} from './volume7-content.js';
import {isSixth,installSixth,validateSixth,sixthChoice,sixthReview,sixthRunLabel,makeSixthReport,sixthEventView} from './volume6.js';
import {V6_WEEKS,V6_MAINS,V6_EVENTS} from './volume6-content.js';
import {isFifth,installFifth,validateFifth,fifthChoice,fifthReview,fifthStops,makeFifthReport,fifthEventView} from './volume5.js';
import {V5_WEEKS,V5_MAINS,V5_EVENTS} from './volume5-content.js';
import {isFourth,installFourth,validateFourth,fourthChoice,fourthReview,fourthStops,makeFourthReport,fourthEventView,validateFamily,validateFourthEvents} from './volume4.js';
import {V4_WEEKS,V4_MAINS,V4_EVENTS} from './volume4-content.js';
export {isFourth,isFifth,isSixth,isSeventh,isEighth};
export const activeVolume=s=>isEighth(s)?8:isSeventh(s)?7:isSixth(s)?6:isFifth(s)?5:isFourth(s)?4:hasContinuation(s)?3:2;
export const continuationWeeks=s=>[...V3_WEEKS,...(isFourth(s)||isFifth(s)||isSixth(s)||isSeventh(s)||isEighth(s)?V4_WEEKS:[]),...(isFifth(s)||isSixth(s)||isSeventh(s)||isEighth(s)?V5_WEEKS:[]),...(isSixth(s)||isSeventh(s)||isEighth(s)?V6_WEEKS:[]),...(isSeventh(s)||isEighth(s)?V7_WEEKS:[]),...(isEighth(s)?V8_WEEKS:[])];
import {ordinal,stamp,dateTurn,addDays,validDate} from './calendar.js';
import {RuleError,hash} from './rules.js';
import {V3_WEEKS,V3_MAINS,V3_EVENTS,V3_RULES} from './volume3-content.js';
export const hasContinuation=s=>s?.worldVersion==='changyong-week-s02-1'&&!!s.weekly?.continuation;
export const horizonDay=s=>isEighth(s)?(s.weekly.continuation.repairTail?10830:10800):isSeventh(s)?9360:isSixth(s)?7200:isFifth(s)?4320:isFourth(s)?2160:hasContinuation(s)?1440:720;
export const horizonDate=s=>isEighth(s)?(s.weekly.continuation.repairTail?{year:31,month:1,day:30}:{year:30,month:12,day:30}):isSeventh(s)?{year:26,month:12,day:30}:isSixth(s)?{year:20,month:12,day:30}:isFifth(s)?{year:12,month:12,day:30}:isFourth(s)?{year:6,month:12,day:30}:hasContinuation(s)?{year:4,month:12,day:30}:{year:2,month:12,day:30};
export const horizonStamp=s=>stamp(horizonDate(s),'evening');
export const horizonMonths=s=>isEighth(s)?360:isSeventh(s)?312:isSixth(s)?240:isFifth(s)?144:isFourth(s)?72:hasContinuation(s)?48:24;
export function volumeTurn(s){if(!hasContinuation(s)||s.turn<=8)return null;const year=Math.floor((s.turn-1)/4)+1,month=((s.turn-1)%4)*3+1;return{id:s.turn,year,month,season:['春','夏','秋','冬'][(s.turn-1)%4],title:isEighth(s)?'山河长明':isSeventh(s)?'新旧之间':isSixth(s)?'共治风雨':isFifth(s)?'太平有隙':isFourth(s)?'改命成局':'信任有价',main:(isEighth(s)?V8_MAINS:isSeventh(s)?V7_MAINS:isSixth(s)?V6_MAINS:isFifth(s)?V5_MAINS:isFourth(s)?V4_MAINS:V3_MAINS).filter(id=>(V8_EVENTS[id]||V7_EVENTS[id]||V6_EVENTS[id]||V5_EVENTS[id]||V4_EVENTS[id]||V3_EVENTS[id]).turn===s.turn)};}
export function installContinuation(source,copyId){
 if(source.weekly?.continuation?.version===5)return installEighth(source,copyId);
 if(source.weekly?.continuation?.version===4)return installSeventh(source,copyId);
 if(source.weekly?.continuation?.version===3)return installSixth(source,copyId);
 if(source.weekly?.continuation?.version===2)return installFifth(source,copyId);
 if(source.weekly?.continuation?.version===1)return installFourth(source,copyId);
 if(source.weekly?.continuation)throw new RuleError('这已是第三卷接续档，请进入其原副本继续，不重复复制。');
 if(!source.weekly||!source.sealed||source.ending?.id!=='F00'||Array.from({length:12},(_,i)=>'M'+String(i+1).padStart(2,'0')).some(id=>!source.events[id]?.completed))throw new RuleError('请先在原入口完成并封存初卷，再显式复制接续；未改写原档。');
 const s=structuredClone(source);s.gameId='continuation-'+copyId;s.revision=source.revision+1;s.sealed=false;s.closureMode=false;s.closureRemaining=0;
 s.weekly.clock=stamp({year:3,month:1,day:1});s.date={year:3,month:1,day:1};s.turn=9;s.remaining=0;
 for(const w of s.weekly.weeks)w.status='ended';s.weekly.weeks.push(...structuredClone(V3_WEEKS));s.weekly.stop=null;
 s.weekly.continuation={version:1,copyId,sourceHash:hash(source),source:structuredClone(source),openedAt:{year:3,month:1,day:1},horizon:4,runs:[],reviews:[],volumeReport:null};
 return s;
}
export function validateContinuation(s,validateSource){
 const c=s.weekly?.continuation;if(c===undefined)return;
 const fail=()=>{throw new RuleError('第三卷接续来源、历史前缀或阶段记录不一致，原档未覆盖。');};
 if(!c||Object.keys(c).some(k=>!['version','copyId','sourceHash','source','openedAt','horizon','runs','reviews','volumeReport',...(isEighth(s)?['volume','family','visit','birthday','birthdayNotes','salon','publication','education','secret','longProject','adult','lateRequests','companions','career','private','arrival','departure','stages','pages','chronicles','repairTail']:isSeventh(s)?['volume','family','visit','birthday','birthdayNotes','salon','publication','education','secret','longProject','adult','lateRequests','companions','career','private']:isSixth(s)?['volume','family','visit','birthday','birthdayNotes','salon','publication','education','secret']:isFifth(s)?['volume','family','visit','birthday','birthdayNotes','salon','publication']:isFourth(s)?['volume','family','visit','appointments']:[])].includes(k))||c.version!==(isEighth(s)?6:isSeventh(s)?5:isSixth(s)?4:isFifth(s)?3:isFourth(s)?2:1)||c.horizon!==(isEighth(s)?30:isSeventh(s)?26:isSixth(s)?20:isFifth(s)?12:isFourth(s)?6:4)||!/^[a-f0-9]{64}$/.test(c.copyId)||s.gameId!=='continuation-'+c.copyId||(!isFourth(s)&&!isFifth(s)&&!isSixth(s)&&!isSeventh(s)&&!isEighth(s)&&c.source?.weekly?.continuation)||!c.source?.weekly||!c.source.sealed||c.source.ending?.id!=='F00'||c.sourceHash!==hash(c.source)||s.revision<c.source.revision+1||ordinal(s.date)<(isEighth(s)?9361:isSeventh(s)?7201:isSixth(s)?4321:isFifth(s)?2161:isFourth(s)?1441:721)||ordinal(s.date)>horizonDay(s)||!Array.isArray(c.runs)||!Array.isArray(c.reviews)||JSON.stringify(c.openedAt)!==JSON.stringify({year:isEighth(s)?27:isSeventh(s)?21:isSixth(s)?13:isFifth(s)?7:isFourth(s)?5:3,month:1,day:1}))fail();
 validateSource(c.source);
 if(hash(s.ending)!==hash(c.source.ending))fail();
 for(const k of ['transactions','ledger','turnReports'])if(c.source[k].some((x,i)=>hash(x)!==hash(s[k][i])))fail();
 for(const[k,v]of Object.entries(c.source.transcripts))if(hash(v)!==hash(s.transcripts[k]))fail();
 for(const[k,v]of Object.entries(c.source.events))if(hash(v)!==hash(s.events[k]))fail();
 for(let i=0;i<c.source.weekly.reports.length;i++)if(hash(c.source.weekly.reports[i])!==hash(s.weekly.reports[i]))fail();
 for(let i=0;i<c.source.weekly.monthly.length;i++)if(hash(c.source.weekly.monthly[i])!==hash(s.weekly.monthly[i]))fail();
 const unique=xs=>new Set(xs.map(x=>x.id)).size===xs.length;if(!unique(c.runs)||!unique(c.reviews))fail();
 if(isEighth(s)){validateEighth(s,validateFamily,validateFourthEvents);return;}
 if(isSeventh(s)){validateSeventh(s,validateFamily,validateFourthEvents);return;}
 if(isSixth(s)){validateSixth(s,validateFamily,validateFourthEvents);return;}
 if(isFifth(s)){validateFifth(s,validateFamily,validateFourthEvents);return;}
 for(const id of Object.keys(V3_EVENTS)){const e=s.events[id];if(!e)continue;const spec=V3_EVENTS[id],tx=s.transactions.find(t=>t.id===e.transactionId),t=s.transcripts[id];if(!e.completed||!validDate(e.date)||ordinal(e.date)<ordinal({year:V3_RULES[id].window.earliest[0],month:V3_RULES[id].window.earliest[1],day:V3_RULES[id].window.earliest[2]})||ordinal(e.date)>ordinal(s.date)||!spec.options.some(o=>o.id===e.outcomeId)||!tx?.actions.some(a=>a.type==='event'&&a.eventId===id&&a.choiceId===e.outcomeId)||!t||t.transactionId!==tx.id||ordinal(t.date)!==ordinal(e.date)||spec.requires.some(k=>!s.events[k]?.completed||ordinal(s.events[k].date)>ordinal(e.date)))fail();}
 if(isFourth(s)){validateFourth(s);return;}
 for(const id of ['M13','M14'])if((id==='M13'?!!s.events[id]?.completed:s.events[id]?.outcomeId==='hold')!==c.runs.some(r=>r.eventId===id)||c.runs.filter(r=>r.eventId===id).length>1)fail();
 for(const r of c.runs){const e=s.events[r.eventId],tx=s.transactions.find(t=>t.id===r.transactionId);if(!['M13','M14'].includes(r.eventId)||!e?.completed||e.transactionId!==r.transactionId||!tx||!validDate(r.date)||!validDate(r.dueDate)||ordinal(r.date)!==ordinal(e.date)||ordinal(r.dueDate)-ordinal(r.date)!==(r.eventId==='M13'?21:3)||r.choice!==e.outcomeId||r.focus!==(r.eventId==='M13'&&r.choice!=='pause')||!['pending','read'].includes(r.status))fail();}
 for(const r of c.reviews){const run=c.runs.find(x=>x.id===r.runId),tx=s.transactions.find(t=>t.id===r.transactionId);if(!run||run.status!=='read'||!tx?.actions.some(a=>a.type==='volume3-review'&&a.runId===run.id)||!validDate(r.date)||ordinal(r.date)<ordinal(run.dueDate)||ordinal(r.date)>ordinal(s.date)||r.text!==reviewText(run)||!s.facts.some(f=>f.id==='V3_REPORT_'+r.id&&f.text===r.text&&f.source===r.transactionId))fail();}
 for(const r of c.runs)if((r.status==='read')!==c.reviews.some(x=>x.runId===r.id))fail();
 if(c.volumeReport){const tx=s.transactions.find(t=>t.id===c.volumeReport.transactionId);if(!s.sealed||s.weekly.clock!==horizonStamp(s)||!tx?.actions.some(a=>a.type==='seal')||hash(c.volumeReport)!==hash(makeVolumeReport(s,c.volumeReport.transactionId)))fail();}
 else if(s.sealed)fail();
}
function reviewText(run){if(run.eventId==='M14')return '补回的封发簿与交班签名已经核过，本次传旨次序可按原件对应，未见苏培盛改旨的凭据。原来曾留案待核的正文保留；这是后来实际补页的结果，不改写当日选择。';return run.choice==='supply'?'二十一实际日后，本批六点粮款的出仓、转运与收领单回到御案。能对应的本批签领据实归档，伤亡抚恤仍按另一份名册核；这份回执不免除以后任何一批军账，也不是年羹尧已经作出的私情答复。':run.choice==='audit'?'本轮两点核转运的回执已到，几站损耗与经手签押逐项列出。核查范围能说明的只到这些原件，未拨足的补给仍列待办；没有把调查费写成已送到将士手里的冬粮。':'常规核册的回执已到，现有登记可供接着查，未补粮款仍是实际缺口。本轮没有新增拨款，也没有独立抽检的成果；不以一份准时回单冒充粮已到账。';}
export function longformStops(s){return [...eighthStops(s),...seventhStops(s),...fifthStops(s),...fourthStops(s),...(s.weekly?.continuation?.runs||[]).filter(r=>r.status==='pending').map(r=>({kind:'volume-review',id:r.id,label:r.id.startsWith('V8-')?eighthRunLabel(r):r.id.startsWith('V7-')?seventhRunLabel(r):r.id.startsWith('V6-')?sixthRunLabel(r):r.eventId==='M26'?'春荒本批实领核验':r.eventId==='M30'?'香事本批实际回执':r.eventId==='M22'?'眉庄疑账本批回执':r.eventId==='M13'?'本批西北补给回执':'内廷封发补页回报',at:Math.max(s.weekly.clock,stamp(r.dueDate))}))];}
export function recordVolumeChoice(s,e,choice,tx,{active=[],decisions=0,params={},canListen}={}){
 if(!e.volume)return;if(!hasContinuation(s))throw new RuleError('后期事件仅在显式第三卷副本内开放。');
 let c=s.weekly.continuation;while(c.version!==1&&c.source?.weekly?.continuation)c=c.source.weekly.continuation;
 if(e.kind==='relation'&&choice.id==='warm'){
  const r=s.relations[e.actor];if(r.playerIntent!=='愿发展'||r.npcIntent!=='愿发展'||r.trust<35||!['信任','倾心','共担','相守'].includes(r.stage))throw new RuleError('先由双方实际说清愿意并建立信任，今日仍可合作，不以主线替本人答应。');
  if(e.id==='R02-03'&&s.flags.v3Accusation!=='verified'&&!c.reviews.some(r=>c.runs.find(x=>x.id===r.runId)?.eventId==='M14'))throw new RuleError('诬案仍未核清，请先留合作与实际补页，不拿亲近替代澄清。');
  if(e.id==='R08-03'&&s.flags.v3Family==='favor')throw new RuleError('本次私授责任仍在，请先按程序补办，不能把它写成已经拒绝私授。');
 }
 if(e.volume===8)return eighthChoice(s,e,choice,tx,{active,decisions,params});
 if(e.volume===7)return seventhChoice(s,e,choice,tx,{active,decisions,params});
 if(e.volume===6)return sixthChoice(s,e,choice,tx,{active,decisions,params,canListen});
 if(e.volume===5)return fifthChoice(s,e,choice,tx,{active,decisions});
 if(e.volume===4)return fourthChoice(s,e,choice,tx,{active,decisions});
 const makesRun=e.id==='M13'||e.id==='M14'&&choice.id==='hold';
 if((e.id==='M13'&&choice.id!=='pause'||e.id==='G20')&&active.length>=2)throw new RuleError('已有两项重点差事在办，可先选择不新增拨款的核册，或核完已有回报。');
 if(['M13','G20'].includes(e.id)&&decisions>=2)throw new RuleError('本周已定两次项目办法，请另留合法时段。');
 if(makesRun)c.runs.push({id:'V3-'+tx,eventId:e.id,transactionId:tx,date:structuredClone(s.date),dueDate:addDays(s.date,e.id==='M13'?21:3),choice:choice.id,focus:e.id==='M13'&&choice.id!=='pause',status:'pending'});
}
export function applyVolumeReview(s,a,tx){
 if(isEighth(s))return eighthReview(s,a,tx);
 if(isSeventh(s))return seventhReview(s,a,tx);
 if(isSixth(s))return sixthReview(s,a,tx);
 if(isFifth(s))return fifthReview(s,a,tx);
 if(isFourth(s)){if(s.sealed)throw new RuleError('本卷已收存。');return fourthReview(s,a,tx);}
 if(!hasContinuation(s)||s.sealed)throw new RuleError('当前没有可接续的第三卷回报。');const c=s.weekly.continuation,r=c.runs.find(r=>r.id===a.runId&&r.status==='pending');
 if(!r||ordinal(s.date)<ordinal(r.dueDate))throw new RuleError('回报未到实际日期或已阅核。');r.status='read';const text=reviewText(r),review={id:'READ-'+tx,runId:r.id,date:structuredClone(s.date),transactionId:tx,text};c.reviews.push(review);s.facts.push({id:'V3_REPORT_'+review.id,text,source:tx,date:structuredClone(s.date),turn:s.turn,visibleTo:r.eventId==='M13'?['C01','C28']:['C01','C02']});s.weekly.stop=null;
 return {label:r.eventId==='M13'?'本批西北补给回执':'内廷补页核验',detail:text,actionCost:0,treasury:0};
}
export function volumeProjectIds(s){if(!hasContinuation(s))return[];const ids=s.weekly.continuation.runs.filter(r=>r.focus&&r.status==='pending').map(r=>r.id);if((isSeventh(s)||isEighth(s))&&!s.events.G24?.completed&&s.events.G23?.completed&&s.events.G23.outcomeId!=='register')ids.push('V7-INHERITANCE');if((isSixth(s)||isSeventh(s)||isEighth(s))&&s.events.G11?.completed&&!s.events.G12?.completed)ids.push('V6-RIVER');if(isFifth(s)||isSixth(s)||isSeventh(s)||isEighth(s)){for(const id of ['G08','G14'])if(s.events[id]?.completed&&!s.events[id==='G08'?'G09':'G15']?.completed)ids.push('V5-'+id);}
 if((isFourth(s)||isFifth(s)||isSixth(s)||isSeventh(s)||isEighth(s))&&s.events.G17?.completed&&!s.events.G18?.completed)ids.push('V4-OFFICIAL');if(s.events.G20?.completed&&!s.events.G21?.completed)ids.push('V3-MEDICAL');return ids;}
export function volumeDecisionCount(s,weekId){return s.transactions.filter(t=>t.actions.some(a=>a.type==='event'&&['M13','G20','G16','G17','M22','G07','G08','G13','G14','M26','M30','G10','G11','M32','M34','M35','G22','G23','M41','M42','M47'].includes(a.eventId))&&s.weekly.weeks.some(w=>w.id===weekId&&ordinal(t.date)>=ordinal(w.start)&&ordinal(t.date)<=ordinal(w.end))).length;}
export function makeVolumeReport(s,tx){if(isEighth(s))return makeEighthReport(s,tx);if(isSeventh(s))return makeSeventhReport(s,tx);if(isSixth(s))return makeSixthReport(s,tx);if(isFifth(s))return makeFifthReport(s,tx);if(isFourth(s))return makeFourthReport(s,tx);const ids=Object.keys(V3_EVENTS),finished=ids.filter(id=>s.events[id]?.completed),pending=ids.filter(id=>!s.events[id]?.completed);return{version:1,title:'信任有价 · 第三卷已收',date:structuredClone(s.date),transactionId:tx,completed:finished,pending,passages:['四年冬，案上的新卷慢慢合起。西北的回单、内廷的更簿和家书各有自己的落款，未核的仍没有被好听的话遮去。',...V3_MAINS.map(id=>s.transcripts[id]?`${s.transcripts[id].title}：${s.transcripts[id].choice}`:`${V3_EVENTS[id].title}仍待续。`),...s.weekly.continuation.reviews.map(r=>r.text),...(s.transcripts.G21?['医事本批回访：'+s.transcripts.G21.dialogue]:[]),`本卷亲自完成${s.weekly.plans.filter(p=>p.status==='completed'&&p.actor==='C01'&&['study','training','rest'].includes(p.kind)&&ordinal(p.date)>=721).length}次学习、习武或休养安排，实际练习仍可在旧事簿重读。`,`本卷实际留下${finished.length}项记录。${pending.length?'未办部分继续按原样列在页后。':'已发生的相处与差事都能回到原页重读。'}`,'初卷F00及更早的正文仍在原页，不因接续重写；五年以后尚待下一卷。']};}

export const volumeEventView=(s,e)=>eighthEventView(s,seventhEventView(s,sixthEventView(s,fifthEventView(s,fourthEventView(s,e)))));
export function continuationRoot(s){while(s.weekly?.continuation)s=s.weekly.continuation.source;return s;}
