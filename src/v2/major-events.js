// 大型政务事件以存档内的小型状态机推进；新字段均可从旧存档惰性初始化。
import {MAJOR_VARIANTS,MAJOR_BY_ID} from './major-event-data.js';
import * as G from './government.js';

const idx=s=>(s.year-1)*12+s.month;
export const initMajorEvents=s=>{
 s.majorEventSerial??=0;if(!Array.isArray(s.majorEventUsed))s.majorEventUsed=[];if(s.majorEvent===undefined)s.majorEvent=null;if(!Array.isArray(s.majorEventReports))s.majorEventReports=[];
 if(s.majorEvent&&typeof s.majorEvent==='object'){
  const e=s.majorEvent,v=MAJOR_VARIANTS.find(x=>x.id===e.variant);
  if(!v){s.majorEvent=null;}else{e.n=Number.isInteger(e.n)?e.n:s.majorEventSerial||1;e.type=v.type;e.step=Number.isInteger(e.step)?Math.max(0,Math.min(v.stages-1,e.step)):0;e.stages=v.stages;e.nextAt=Number.isFinite(e.nextAt)?e.nextAt:idx(s);e.inspected=!!e.inspected;e.delay=!!e.delay;e.authorId=e.authorId||null;s.majorEventSerial=Math.max(s.majorEventSerial,e.n);}
 }
 return s;
};
const makeId=(e,step)=>`ME${e.n}_${step}`;
const canStart=s=>!s.majorEvent&&s.majorEventAt!==idx(s)&&s.majorEventReports.length<120;
export function scheduleMajorEvent(s,rng,chance=.27){
 initMajorEvents(s);
 if(s.majorEvent){const e=s.majorEvent;if(e.nextAt<=idx(s)){e.step++;e.nextAt=null;return makeId(e,e.step);}return null;}
 if(!canStart(s)||rng(s)>=chance)return null;
 let left=MAJOR_VARIANTS.filter(v=>!s.majorEventUsed.includes(v.id));
 if(!left.length){s.majorEventUsed=[];left=MAJOR_VARIANTS;}
 const v=left[Math.floor(rng(s)*left.length)],type=MAJOR_BY_ID[v.type];
 s.majorEventUsed.push(v.id);s.majorEventSerial++;
 const province=type.provinces[Math.floor(rng(s)*type.provinces.length)];
 s.majorEvent={n:s.majorEventSerial,variant:v.id,type:v.type,province,step:0,stages:v.stages,startedAt:idx(s),nextAt:null,inspected:false,action:null,adjustment:null,delay:false,authorId:G.authorOf(s,province),treasurySpent:0};
 s.majorEventAt=idx(s);
 return makeId(s.majorEvent,0);
}
function eventFor(s){const e=s?.majorEvent;if(!e)return null;const v=MAJOR_VARIANTS.find(x=>x.id===e.variant);if(!v)return null;return {e,v,type:MAJOR_BY_ID[e.type]};}
const choice=(id,label)=>({id,label,effects:{},reply:''});
export function majorScene(s,id){
 const found=eventFor(s);if(!found)return null;const {e,v,type}=found;
 const step=Number(id?.slice(id.lastIndexOf('_')+1));if(!Number.isInteger(step)||id!==makeId(e,step)||step!==e.step)return null;
 const base={id,kind:'majorEvent',actor:'C28',place:'养心殿',title:`${type.name} · ${['急报','勘情','中报','善后','回奏'][step]||'回奏'}`};
 if(step===0)return {...base,body:`${type.opening}\n\n${v.body}\n\n${e.province}巡抚的急折已到。${v.index===2?'此案牵涉多处交割，后续还要逐站复核。':''}`,options:[choice('survey','派员查勘，先核实情（耗银2万两）'),choice('rescue','先行调度抢险赈济（耗银8万两）'),choice('delay','暂缓处置，等地方续报')]};
 if(step===1){const evidence=e.inspected?`勘察所见：${v.clue}\n\n初步判断：${v.cause}`:'现场续报：'+v.clue+'\n\n来报只列眼前情形，症结仍未完全查明。';return {...base,body:`${evidence}\n\n${type.aftermath}`,options:[...type.actions.map(([id,label,cost])=>choice(id,`${label}（耗银${cost}万两）`)),choice('local','交地方自行处置，暂不拨银')]};}
 const adjustStep=e.stages===5?3:2;
 if(step===2&&e.stages===5)return {...base,body:`${e.action===v.focus?'前次处置已见成效，但仍有遗漏。':'前次处置未能对准要害，地方回报出现新的缺口。'}\n\n${v.clue}\n\n要不要调整？`,options:[choice('correct','按查明的症结补救（耗银6万两）'),choice('audit','复核账册与灾户名册（耗银2万两）'),choice('continue','仍按原办法办理')]};
 if(step===adjustStep)return {...base,title:`${type.name} · 善后`,body:`${type.aftermath}\n\n${e.adjustment==='correct'?'已经按症结补救，眼下要核验受灾户是否真正得到安置。':e.adjustment==='audit'?'清册与经办账目正在复核，眼前的安置仍需继续。':'地方请求按原办法收尾，是否另行核验，尚待朱批。'}`,options:[choice('verify','派员核验灾户与工程（耗银3万两）'),choice('close','据现有回报结案'),choice('continue','再拨急用银两（耗银5万两）')]};
 if(step===e.stages-1){const success=eventSucceeded(s,e,v);const officer=e.authorId;return {...base,title:`${type.name} · 回奏`,body:`${success?'处置已有成效。':'灾损仍未尽数挽回。'}${e.inspected?'前期勘察使症结较早查明。':'前期未能充分勘察，部分损失已难追回。'}\n\n${v.remedy}。${officer?'经办官员的履历与本次表现将一并存档。':'地方主官尚未任命，回奏仅据各县清册核验。'}\n\n${v.index===2?'此事还查出跨县交割与账册衔接问题。':''}`,options:[choice('praise','据实结案，核叙经办'),choice('investigate','留案追查责任（耗银2万两）')]};}
 return null;
}
function eventSucceeded(s,e,v){
 const p=s.provinces?.[e.province]||{},officer=e.authorId&&s.appointments?.[e.authorId];
 const competence=officer?.ability>=8&&officer?.loyalty>=65?1:0;
 const score=(e.inspected?1:0)+(e.action===v.focus?1:0)+(['correct','audit','verify'].includes(e.adjustment)?1:0)+competence-(e.delay?1:0);
 return score>=2||(score===1&&(p.integrity||50)>=68);
}
function pay(s,n,funds,e){if(s.stats.treasury<n)throw Error(`国库不足${n}万两。`);const result=funds(s,{treasury:-n});if(e)e.treasurySpent=(e.treasurySpent||0)+n;return result;}
function scheduleNext(s,e,delay=1){e.nextAt=idx(s)+delay;}
export function applyMajorChoice(s,id,optId,{funds,applyStats,log}){
 const sc=majorScene(s,id);if(!sc)return null;const found=eventFor(s),{e,v}=found,step=e.step;let stats={},text='',completed=false;
 if(!sc.options.some(o=>o.id===optId))throw Error('没有这个处置选项。');
 if(step===0){
  if(optId==='survey'){stats=pay(s,2,funds,e);e.inspected=true;text='已派员勘察，后续奏报将附上现场核验结果。';}
  else if(optId==='rescue'){stats=pay(s,8,funds,e);e.prepared=true;text='先行调度了人手与急用物资，仍须查明损失与责任。';}
  else {e.delay=true;text='暂缓处置。地方续报仍会送来，但拖延留下的损失无法倒转。';}
  scheduleNext(s,e,1);
 }else if(step===1){
  const action=MAJOR_BY_ID[e.type].actions.find(x=>x[0]===optId);
  if(action){stats=pay(s,action[2],funds,e);e.action=optId;text=`已按“${action[1]}”办理，限地方逐项回报。`;}
  else{e.action='local';e.delay=true;text='交由地方自行办理，未拨专项经费。';}
  scheduleNext(s,e,1);
 }else if(step===2&&e.stages===5){
  if(optId==='correct'){stats=pay(s,6,funds,e);e.adjustment='correct';text='按现场症结补救，要求另报受灾户与工程验收清册。';}
  else if(optId==='audit'){stats=pay(s,2,funds,e);e.adjustment='audit';text='账册与灾户名册已交专员复核。';}
  else{e.adjustment='continue';e.delay=true;text='沿用原办法，可能错过进一步补救的时机。';}
  scheduleNext(s,e,1);
 }else if(step===(e.stages===5?3:2)){
  if(optId==='verify'){stats=pay(s,3,funds,e);e.adjustment='verify';text='已派员核验灾户与工程，按实情补足安置。';}
  else if(optId==='continue'){stats=pay(s,5,funds,e);e.adjustment='correct';text='追加急用银两，要求经办按查明的症结继续处置。';}
  else{e.adjustment=e.adjustment||'close';text='据现有回报收束善后，未另拨经费。';}
  scheduleNext(s,e,1);
 }else if(step===e.stages-1){
  const success=eventSucceeded(s,e,v),p=e.province;
  if(optId==='investigate')stats=pay(s,2,funds,e);
  const before={people:s.stats.people,court:s.stats.court};
  const local=success?{livelihood:e.prepared?4:3,integrity:1,revenue:-1}:{livelihood:-4,integrity:-2,revenue:-2};
  if(e.delay){local.livelihood-=2;local.integrity-=1;}
  G.regionChange(s,p,local,{applyStats});
  const regionalStats={};for(const k of ['people','court'])if(s.stats[k]!==before[k])regionalStats[k]=s.stats[k]-before[k];
  const report=`${e.province}「${MAJOR_BY_ID[e.type].name}」${success?'处置见效':'未能尽复'}：${success?'民生与地方账目已有改善':'灾损、积欠或官府失信仍在'}。`;
  s.majorEventReports.push({at:idx(s),province:p,type:e.type,variant:e.variant,success,inspected:e.inspected,action:e.action,adjustment:e.adjustment,treasurySpent:e.treasurySpent||0,report});
  if(s.majorEventReports.length>120)s.majorEventReports.shift();
  s.govNotes??=[];s.govNotes.push(report);s.govReports??=[];s.govReports.push({title:`${MAJOR_BY_ID[e.type].name}·回报`,province:p,type:'大型事件',body:report,result:true,at:idx(s)});if(s.govReports.length>120)s.govReports.shift();
  if(optId==='praise'){Object.assign(stats,applyStats(s,{court:success?1:-1}));text=success?'据实存档，并核叙经办官员。':'如实结案，灾损与迟延一并记入地方考绩。';}
  else{Object.assign(stats,applyStats(s,{court:1}));text='留案追查责任，灾情回报与经费清册分别封存。';}
  for(const[k,v]of Object.entries(regionalStats))stats[k]=(stats[k]||0)+v;
  log(s,report,'政');s.majorEvent=null;completed=true;
 }else throw Error('大型事件的处置次序已变，请重新打开奏报。');
 if(!completed)log(s,`${e.province}·${MAJOR_BY_ID[e.type].name}：${text}`,'政');
 return {title:sc.title,text,stats,people:{},completed};
}
