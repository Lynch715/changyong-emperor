import{lifeAction,recordLifeYear,validateLife}from'./volume-life.js';
import {isEighth,eighthAction,eighthStage,makeFinalChronicle} from './volume8.js';
import {V8_IDS} from './volume8-content.js';
import {isSeventh,seventhAction} from './volume7.js';
import {V7_IDS} from './volume7-content.js';
import {isSixth} from './volume6.js';
import {V6_IDS} from './volume6-content.js';
import {isFifth,fifthAction} from './volume5.js';
import {V5_IDS} from './volume5-content.js';
import {familyAction,acceptFourthVisit,isFourth} from './volume4.js';
import {V4_IDS} from './volume4-content.js';
import {hasContinuation,horizonDay,horizonStamp,volumeTurn,validateContinuation,recordVolumeChoice,applyVolumeReview,makeVolumeReport,volumeDecisionCount,horizonDate,volumeEventView} from './longform.js';
import {V3_IDS} from './volume3-content.js';
import {extensionActivitySuppressed} from './extension-activities.js';
import {syncExtensionInvitations} from './extension-initiatives.js';
import {applyCrossInquiry,crossContext,crossReply,validateCrossRelations} from './cross-relations.js';
import {extensionEnding} from './extension-ending.js';
import {extensionRelation,extensionContext,extensionEventView,recordExtensionNode,applyExtensionAction,validateExtensions} from './extension-routes.js';
import {validateReactionRequests} from './reaction-lifecycle.js';
import {memoryLayers,memoryContext,memoryMessages,memorySuppressed,preferenceActive,changeMemoryRecord,validateMemoryControl} from './memory-book.js';
export {changeMemoryRecord} from './memory-book.js';
import {actionConfirmation} from './interaction-policy.js';
import {claimProjectEvent,focusProjects,governanceStatus} from './governance.js';
import {continuationView,deferStory} from './week-continuation-story.js';
import {incenseEventView,incenseReuse,recordIncenseEvent,applyIncenseAction,syncIncense,incenseKnowledge,incenseFacts,epistemicFact,incenseReply,validateIncense} from './incense.js';
import {validateAttitudeParams,bridgeEntries,bridgeDialogue,bridgeContext,bridgeReply,validateBridges} from './extension-bridge.js';
import {applyActivityAction,activityEcho} from './activities.js';
import {PROJECT_EVENTS,PROJECT_FOR_EVENT} from './project-content.js';
import {ensureRelationships,recordRelationshipEvent,recordRelationshipBoundary,requestRelationshipResume,applyRelationshipAction,relationshipEcho,relationshipRecord} from './relationships.js';
import {personPresence} from './relationship-schedule.js';
import {prepareProjectEvent,recordProjectEvent,projectOutcome,assignedProjectOfficer,projectEventAudience,applyProjectAction,projectEcho,projectBook} from './projects.js';
import {CHARACTERS,character,EVENTS,TURNS,STAT_NAMES,NAMES} from './content.js';
import {sceneText,sceneReply,sceneReward,promiseStory,STORY_VERSION} from './story.js';
import {RuleError} from './rules.js';
export {RuleError} from './rules.js';
import {ordinal,fromOrdinal,addDays,dateTurn} from './calendar.js';
export {ordinal,fromOrdinal,addDays,dateTurn} from './calendar.js';
import {isWeekly,initializeWeekly,weekActorUnlocked,weekCanMeet,weekEvent,weekEventDate,weekEventKey,weekPendingEmbedded,weekDueItems,weekRequired,weekAvailable,assertWeeklyEvent,moveWeekly,spendWeeklyEvent,finishWeeklyEvent,applyWeeklyAction,validateWeekly,spendableMoney,weeklyKey,weeklyActivityKey,monthlyGoal,syncWeek,spendLegacyRepair,spendProjectSlot,spendRelationshipSlot} from './week.js';
export const clone=x=>structuredClone(x);
export const uid=()=>globalThis.crypto.randomUUID();
export {stable,hash} from './rules.js';
import {hash} from './rules.js';
export function turn(s){return volumeTurn(s)||TURNS[s.turn-1];}
export function dateText(d){return `雍正${d.year===1?'元':d.year===2?'二':d.year}年${d.month}月${d.day}日`;}
export const done=(s,id)=>!!s.events[id]?.completed;
export function createGame(){
 const s={saveVersion:1,worldVersion:'changyong-v1.2-first-1',gameId:uid(),revision:0,turn:1,date:{year:1,month:1,day:2},remaining:2,closureRemaining:3,closureMode:false,sealed:false,stats:{treasury:60,people:55,execution:50,stability:55,defense:50,palace:45,health:70,mood:40},relations:{},events:{},sceneDates:{},deferred:[],queue:[],promises:[],memories:[],messages:[],transactions:[],facts:[],flags:{},ledger:[],turnReports:[],transcripts:{},crises:{},ending:null};
 for(const c of CHARACTERS)s.relations[c.id]={trust:c.trust,intimacy:10,safety:25,stage:'相识',playerIntent:'未表态',npcIntent:'未表态',boundary:null};
 s.facts.push({id:'FACT_REBIRTH',text:'雍正记得前世，今生尚未向任何人披露。',visibleTo:['C01'],turn:1,source:'opening'});
 return s;
}
export function createWeeklyGame({relationships=true}={}){const s=initializeWeekly(createGame());if(relationships)ensureRelationships(s,{fresh:true});return s;}
export function getEvent(s,id){const e=EVENTS[id]||(isWeekly(s)?PROJECT_EVENTS[id]:null);return e?volumeEventView(s,extensionEventView(s,isWeekly(s)?continuationView(s,incenseEventView(s,weekEvent(s,e))):incenseEventView(s,e))):e;}
export function actorUnlocked(s,id){if(['C09','C10'].includes(id))return done(s,'M06');if(isWeekly(s))return weekActorUnlocked(s,id);const c=character(id);if(!c)return Object.hasOwn(NAMES,id);if(id==='C08')return done(s,'M06');if(id==='C04')return s.turn>=5;if(id==='C05'||id==='C03')return s.turn>=6;return true;}
export function actorPlace(s,id){if(['C09','C10'].includes(id))return actorUnlocked(s,id)?(id==='C09'?'碎玉轩':'宫中茶室'):'尚待相见';if(isWeekly(s)){if(!actorUnlocked(s,id))return '尚待相见';if(s.weekly.relationships&&s.relations[id]){const p=personPresence(s,id);return p.place+' · '+p.state;}if(id==='C03')return weekCanMeet(s,id,s.date)?'在京短驻':'西北外任 · 书信往来';if(id==='C05')return '果郡王府 · 约定入宫';}if(id==='C03')return s.turn<6?'西北外任':s.turn===6?'在京':'西北外任 · 书信往来';if(id==='C05')return '果郡王府 · 奉事入宫';if(!actorUnlocked(s,id))return '尚待登场';return character(id)?.place==='待召'?'太医院':id==='C06'?'景仁宫':id==='C07'?'翊坤宫':'在宫';}
export function canMeetOn(s,id,date){if(isWeekly(s))return weekCanMeet(s,id,date);return actorUnlocked(s,id)&&(id!=='C03'||dateTurn(date)===6);}
export function eventOptions(s,e){return e.id==='G05'&&s.flags.militaryRecord?.escort?e.options.map(o=>o.id==='escort'?{...o,effects:{...o.effects,treasury:0},detail:'沿用已付的押运，本次不再收费；边防 +2。'}:o):e.options;}
function eventFactReaders(s,e,outcome){
 const projectReaders=projectEventAudience(s,e);if(projectReaders)return projectReaders;
 if(isWeekly(s)&&(e.id==='R03-02'||s.events[e.id]?.channel==='letter')&&!s.weekly.migration?.source.events[e.id]?.completed&&!s.weekly.notices.some(n=>n.source===e.id&&n.type==='delivery'&&n.status==='read'))return ['C01'];
 if(e.id==='M03'&&outcome==='quiet')return ['C01'];
 if(isWeekly(s)&&['G04','G05'].includes(e.id)&&s.flags.militaryRecord&&!weekCanMeet(s,'C03',s.events[e.id]?.date||s.date)){const r=s.flags.militaryRecord;return r.visibility==='public'?['public']:[...new Set(['C01',r.officer])];}
 if(['G04','G05','G06'].includes(e.id)&&s.flags.militaryRecord){const r=s.flags.militaryRecord;return r.visibility==='public'?['public']:[...new Set(['C01','C03',r.officer].filter(Boolean))];}
 return e.factAudience||[...new Set(['C01',e.actor].filter(Boolean))];
}
export function factReaders(s,f){
 const key=f.id.startsWith('FACT_')?f.id.slice(5):null,entry=key&&s.events[key],e=entry&&getEvent(s,entry.id);
 // Old saves keep their original text; audience checks also cover facts formerly marked public.
 return e?eventFactReaders(s,e,entry.outcomeId):f.visibleTo;
}
export function canReadFact(s,cid,f){const readers=factReaders(s,f);return readers.includes('public')||readers.includes(cid);}
export function eventDate(s,e){if(isWeekly(s))return weekEventDate(s,e);if(incenseReuse(s,e.id))return clone(s.date);const cached=s.sceneDates?.[eventKey(s,e.id)];if(cached)return ordinal(cached)<ordinal(s.date)?clone(s.date):clone(cached);const t=turn(s);let day=2;let month=t.month;
 if(e.kind==='main'){day=2+t.main.indexOf(e.id)*5;}
 else if(e.parent&&!s.deferred.includes(e.id)){const ep=s.events[e.parent];if(ep?.date)return clone(ep.date);}
 else {day=Math.max(s.date.day+1,12);month=s.date.month;}
 return ordinal({year:t.year,month,day})<ordinal(s.date)?clone(s.date):fromOrdinal(ordinal({year:t.year,month,day}));
}
export function eventKey(s,id){if(isWeekly(s))return weekEventKey(s,getEvent(s,id));return EVENTS[id]?.kind==='daily'?`${id}@${s.turn}`:id;}
export function eventDone(s,id){return done(s,eventKey(s,id));}
export function pendingEmbedded(s){if(isWeekly(s))return weekPendingEmbedded(s);return Object.values(EVENTS).filter(e=>e.parent&&done(s,e.parent)&&!eventDone(s,e.id)&&!s.deferred.includes(e.id)&&e.turn<=s.turn);}
export function dueItems(s){if(isWeekly(s))return weekDueItems(s);return s.queue.filter(q=>q.dueTurn<=s.turn&&!done(s,q.eventId)).slice().sort((a,b)=>a.dueTurn-b.dueTurn);}
export function requiredEvents(s){if(isWeekly(s))return weekRequired(s);
 const due=dueItems(s).map(q=>EVENTS[q.eventId]);
 const embeds=pendingEmbedded(s);
 const mains=turn(s).main.filter(id=>!done(s,id)).map(id=>EVENTS[id]);
 // Dependencies on deferred relation conversations do not block government: R03-01 is only required to be handled or explicitly deferred.
 return [...due,...embeds,...mains.slice(0,1)];
}
export function availableEvents(s){if(isWeekly(s))return weekAvailable(s);
 if(s.sealed)return [];
 return Object.values(EVENTS).filter(e=>{
  if(e.kind==='main'||e.kind==='followup'||eventDone(s,e.id)||e.turn>s.turn)return false;
  if(e.parent&&!s.deferred.includes(e.id))return false;
  if(e.requires?.some(id=>!done(s,id)&&!s.deferred.includes(id)))return false;
  if(e.kind==='relation'&&e.id.endsWith('02')&&!done(s,e.id.replace(/02$/,'01')))return false;
  if(e.kind==='daily'&&(e.season!==turn(s).season||s.closureMode))return false;
  if(e.actor&&!actorUnlocked(s,e.actor))return false;
  return true;
 });
}
export function assertEvent(s,id){
 const e=getEvent(s,id);if(!e)throw new RuleError('找不到这一事件。');
 if(isWeekly(s))return assertWeeklyEvent(s,e);
 if(s.sealed)throw new RuleError('本卷已封存；可重读旧事或另开存档。');
 if(eventDone(s,id))throw new RuleError('此节点已经结算，请在旧事簿重读。');
 if(![...requiredEvents(s),...availableEvents(s)].some(x=>x.id===id))throw new RuleError('这件事尚未满足前置，或不在当前窗口。');
 if(e.parent&&!done(s,e.parent))throw new RuleError('须先处理所属主线。');
 if(e.requires?.some(x=>!done(s,x)&&!s.deferred.includes(x)))throw new RuleError('前置节点尚未处理。');
 if(e.kind==='relation'&&id.endsWith('02')&&!done(s,id.replace(/02$/,'01')))throw new RuleError('须先处理这条关系的第一节点。');
 if(e.actor&&!actorUnlocked(s,e.actor)&&e.id!=='M06')throw new RuleError('人物尚未登场，不能提前见面。');
 const d=eventDate(s,e),limit=ordinal({year:turn(s).year,month:turn(s).month+2,day:30});
 if(ordinal(d)>limit)throw new RuleError('本期已没有足够日历时间，请留待后续窗口。');
 return e;
}
export function enterScene(s,id){const e=assertEvent(s,id);const next=clone(s),d=eventDate(s,e);if(isWeekly(next)){const planned=next.weekly.plans.find(p=>p.status==='accepted'&&p.eventId===id);moveWeekly(next,planned?.date||d,planned?.period||(ordinal(d)===ordinal(next.date)&&next.weekly.clock%2?'evening':'day'),{allowEventId:id,ignorePlanId:planned?.id});}else moveDate(next,d);next.sceneDates??={};next.sceneDates[eventKey(next,id)]=clone(next.date);next.revision++;return next;}
function actionCost(s,e){if(incenseReuse(s,e.id))return 0;return e.kind==='main'||e.kind==='followup'||e.parent&&!s.deferred.includes(e.id)?0:1;}
function applyEffects(s,effects){
 for(const [key,n] of Object.entries(effects||{})){
  if(!Object.hasOwn(STAT_NAMES,key)||!Number.isFinite(n))throw new RuleError('结果包含未配置的指标。');
  if(key==='treasury'&&(isWeekly(s)?spendableMoney(s):s.stats[key])+n<0)throw new RuleError(`国库不足：${isWeekly(s)?'扣除预占预算后':''}还需${-(isWeekly(s)?spendableMoney(s):s.stats[key])-n}点。`,'FUNDS');
  s.stats[key]=key==='treasury'?s.stats[key]+n:Math.max(0,Math.min(100,s.stats[key]+n));
 }
}
function spendAction(s,n){if(!n)return; if(s.closureMode){if(s.closureRemaining<n)throw new RuleError('本卷3次补叙额度已用尽。');s.closureRemaining-=n;}else{if(s.remaining<n)throw new RuleError('本回合主动安排不足；可推进回合或在卷末使用有限补叙。');s.remaining-=n;}}
function moveDate(s,d){if(isWeekly(s)){moveWeekly(s,d);return;}if(s.promises.some(p=>p.status==='accepted'&&p.dueTurn===s.turn&&ordinal(p.date)<ordinal(d)))throw new RuleError('将跨过本期约定日期，请先赴约或协商取消。');if(dateTurn(d)!==s.turn)throw new RuleError('该日期已越出当前战略回合。');if(ordinal(d)>ordinal(s.date))s.date=clone(d);}
function bumpRelation(s,cid,changes){const r=s.relations[cid];if(!r)return;for(const [k,n] of Object.entries(changes))r[k]=Math.max(0,Math.min(100,r[k]+n));}
function recordFact(s,id,text,visibleTo=['public'],source=id){if(!s.facts.some(f=>f.id===id))s.facts.push({id,text,visibleTo,source,turn:s.turn,date:clone(s.date)});}
function nextEventResult(s,e,choice,params={}){
 let effects=clone(choice.effects||{}),notes=[],relationChanges={};
 if(e.kind==='relation'){
  const r=s.relations[e.actor];
  if(isWeekly(s)&&choice.id==='warm'&&s.weekly.relationships?.issues.some(i=>i.actor===e.actor&&i.status==='open'))throw new RuleError('你们之间还有一件事没说开，先找时间补谈，再往亲近处走。合作照常。');
  if(choice.id==='warm'&&['仅合作','终止恋爱','暂缓'].includes(r.playerIntent))throw new RuleError('当前关系意愿不允许推进，请选合作回应；若想恢复，请先在人物页主动协商。');
  if(choice.id==='warm'&&['仅合作','终止恋爱','暂缓'].includes(r.npcIntent))throw new RuleError('对方当前尚未愿意恢复亲近，请尊重其答复，先保留合作。');
  if(choice.id==='warm'){relationChanges={trust:5,safety:2};r.playerIntent='愿发展';r.npcIntent='愿发展';}
  else if(choice.id==='work'){relationChanges={trust:3};}
  else {relationChanges={trust:1};r.playerIntent='仅合作';r.boundary={text:'只保持合作关系',source:e.id,date:clone(s.date)};}
  bumpRelation(s,e.actor,relationChanges);
  if(!isWeekly(s)&&s.relations[e.actor].trust>=35)r.stage='信任';
  notes.push(`${NAMES[e.actor]}：信任 +${relationChanges.trust}${relationChanges.safety?'，安全感 +2':''}`);
 }
 if(e.kind==='dilemma'){for(const[cid,ch]of Object.entries(choice.bonds||{}))bumpRelation(s,cid,ch);const near=Object.keys(choice.bonds||{}).map(c=>NAMES[c]).join('、');if(near)notes.push(near+'记着你这一回的选择');if(choice.slight)notes.push(NAMES[choice.slight]+'心里有了一个结，须找时间说开');}
 if(e.id==='G05'&&choice.id==='escort'&&s.flags.militaryRecord?.escort)notes.push('沿用前账已付的押运，本次不再收取押运费。');
 if(e.id==='G04'){
  const p=params;
  if(choice.id==='custom'){
   const amount=p.amount;
   if(!Number.isInteger(amount)||amount<0||amount>12)throw new RuleError('拨款须为0至12的整数财政点。');
   if(!['C28','C26','C32'].includes(p.officer))throw new RuleError('承办人须为张廷玉、允祥或岳钟琪。');
   if(!['private','public'].includes(p.visibility)||typeof p.escort!=='boolean')throw new RuleError('请明确知情范围和押运选择。');
   effects={treasury:-amount-(p.escort?2:0),defense:amount===0?-4:amount>=8?3:1,execution:2};
   s.flags.military='custom';
  }
  const record=choice.id==='custom'?{amount:p.amount,officer:p.officer,visibility:p.visibility,escort:p.escort,audit:'required'}:{amount:{emergency:8,pause:0,full:12}[choice.id],officer:assignedProjectOfficer(s,e.id)||'C28',visibility:'private',escort:false,audit:choice.id==='full'?'waived':'required'};
  s.flags.militaryRecord=record;
  if(choice.id==='emergency')bumpRelation(s,'C03',{trust:2});
  if(choice.id==='pause')bumpRelation(s,'C03',{safety:-3});
  notes.push(`军费${record.amount}点，${record.escort?'押运另2点，':''}${NAMES[record.officer]}核账，${record.visibility==='public'?'公开待查疑点':'军需工作组知情'}，${record.audit==='waived'?'未审风险保留':'保留核验'}`);
 }
 if(e.id==='G03'){
  if(s.flags.collection==='strict'){effects={people:-2,execution:1};s.flags.fiscalReview='发现摊派，须保留追责与修复';}else{effects={people:2,execution:2};s.flags.fiscalReview='回访未见新增摊派，县库周转留存';}
  notes.push(s.flags.fiscalReview);
 }
 if(e.id==='G06'){
  if(s.flags.militaryRecord?.audit==='waived'){effects={execution:-2,defense:1};s.flags.militaryReview='未经审计的军账尚有风险，不能写成核验圆满';}
  else if(s.flags.militaryRecord?.amount===0){effects={defense:-2,execution:1};s.flags.militaryReview='补给延误已发生，核验不能抹除损失';}
  else{effects={defense:2,execution:2};s.flags.militaryReview='领粮回执已核实，军账与执行分别留存';}
  notes.push(s.flags.militaryReview);
 }
 if(e.projectStage==='report'){const outcome=projectOutcome(s,e.projectId);effects=outcome.effects;notes.push(outcome.text);}
 return {effects,notes,relationChanges};
}
function effectSummary(effects){return Object.entries(effects).filter(([,n])=>n).map(([k,n])=>`${STAT_NAMES[k]} ${n>0?'+':'−'}${Math.abs(n)}`).join('，')||'无国政数值变化';}
function applyEvent(s,a,tx){
 const e=assertEvent(s,a.eventId);const choice=a.choiceId==='custom'&&e.id==='G04'?{id:'custom',label:'自由拟定军需方案',effects:{},flags:{}}:eventOptions(s,e).find(x=>x.id===a.choiceId);
 if(!choice)throw new RuleError('此方案不在当前事件能力清单中。');
 if(!['M36','P12'].includes(e.id))validateAttitudeParams(e.id,a.params);
 if(a.params&&e.id!=='G04'&&e.id!=='M06'&&e.id!=='M36'&&e.id!=='P12'&&Object.keys(a.params).length)throw new RuleError('本场景没有这些可编辑参数。');
 prepareProjectEvent(s,e);
 const paid=isWeekly(s)?spendWeeklyEvent(s,e,a):null;const cost=paid?paid.cost:actionCost(s,e);if(!paid){spendAction(s,cost);moveDate(s,eventDate(s,e));}else moveWeekly(s,eventDate(s,e),s.weekly.clock%2?'evening':'day',{ignorePlanId:paid.plan?.id,allowEventId:e.id});const narratedBody=e.remoteRelation?e.body:sceneText(s,e);
 claimProjectEvent(s,e,tx);
 if(e.volume)recordVolumeChoice(s,e,choice,tx,{active:focusProjects(s),decisions:governanceStatus(s).decisions.length+volumeDecisionCount(s,weeklyKey(s)),params:a.params||{},canListen:cid=>actorUnlocked(s,cid)&&weekCanMeet(s,cid,s.date,{scene:true})});
 const remoteBefore=isWeekly(s)&&(e.id==='R03-02'||e.remoteRelation)?clone(s.relations[e.actor]):null;
 const result=nextEventResult(s,e,choice,a.params);if(remoteBefore){paid.pendingRelation={changes:clone(result.relationChanges),intent:choice.id==='warm'?'愿发展':null};for(const k of ['trust','intimacy','safety','stage','npcIntent'])s.relations[e.actor][k]=remoteBefore[k];result.notes.push('此封回信的关系结果待实际送达后结算，不提前替对方回应。');}applyEffects(s,result.effects);Object.assign(s.flags,clone(choice.flags||{}));
 const bridge=bridgeEntries(s,e,choice,a.params);
 const key=eventKey(s,e.id),r=s.relations[e.actor];
 s.events[key]={id:e.id,processed:true,completed:true,advanced:e.kind==='relation'&&choice.id==='warm',outcomeId:choice.id,date:clone(s.date),turn:s.turn,transactionId:tx,...(e.remoteRelation?{channel:'letter'}:{})};
 s.deferred=s.deferred.filter(id=>id!==e.id);
 if(!isWeekly(s)&&e.followup&&!s.queue.some(q=>q.eventId===e.followup)){const dueTurn=s.turn+1;if(s.queue.filter(q=>q.dueTurn===dueTurn&&!done(s,q.eventId)).length>=2)throw new RuleError('下回合回访名额已满，请调整执行窗口。');s.queue.push({eventId:e.followup,dueTurn,source:e.id});}
 let resultText=[`你决定：${choice.label}。`,effectSummary(result.effects),...result.notes].join('\n');
 const publicDialogue=recordExtensionNode(s,e,choice,tx)||sceneReply(s,e,choice),dialogue=bridgeDialogue(publicDialogue,bridge,e.id),reward=e.remoteRelation?null:sceneReward(s,e,choice);
 s.transcripts[key]={eventId:e.id,title:e.title,...(e.documentContinuation?{location:e.location}:{}),body:narratedBody,actor:e.actor,choice:choice.label,result:resultText,dialogue,reward,storyVersion:STORY_VERSION,date:clone(s.date),transactionId:tx,...(bridge.length?{bridge,...(e.id==='M06'?{publicDialogue}:{})}:{})};
 if(reward)recordFact(s,`MOMENT_${key}`,`${e.title}：${reward.title}。${choice.label}`,remoteBefore?['C01']:['C01',e.actor],e.id);
 const visible=eventFactReaders(s,e,choice.id);
 recordFact(s,`FACT_${key}`,`${e.title}：${choice.label}。${result.notes.join('；')}`,visible,e.id);
 if(result.effects.treasury)s.ledger.push({id:tx+'-'+e.id,turn:s.turn,date:clone(s.date),label:e.title,amount:result.effects.treasury,balance:s.stats.treasury});
 if(paid)finishWeeklyEvent(s,e,paid,tx);
 const projectResult=recordProjectEvent(s,e,choice,tx);if(projectResult?.detail){resultText+='\n'+projectResult.detail;s.transcripts[key].result=resultText;}if(projectResult?.dialogue)s.transcripts[key].dialogue=projectResult.dialogue;
 recordIncenseEvent(s,e,choice,tx);
 if(isWeekly(s))recordRelationshipEvent(s,e,choice,tx);
 return {label:e.title,detail:resultText,actionCost:cost,treasury:result.effects.treasury||0,actor:e.actor,eventId:e.id};
}
function applyDefer(s,a){
 const e=isWeekly(s)?getEvent(s,a.eventId):assertEvent(s,a.eventId);
 if(s.sealed||!e?.parent||s.events[e.id]?.completed||!s.events[e.parent]?.completed||s.deferred.includes(e.id)||isWeekly(s)&&!weekPendingEmbedded(s).some(x=>x.id===e.id))throw new RuleError('只有尚未说完的当前内嵌节点可以转入稍后谈。');
 if(Object.keys(a).some(k=>!['type','eventId'].includes(k)))throw new RuleError('延期只留下未谈事项，不接受奖励或代替本人答应。');
 if(isWeekly(s)&&s.weekly.plans.some(p=>p.eventId===e.id&&['accepted','executing'].includes(p.status)))throw new RuleError('这场已有正式约期，请先协商改期或取消，不能另记未约的延期。');
 s.deferred.push(e.id);return {label:`稍后谈：${e.title}`,detail:isWeekly(s)?'先留着这句话。另约时核对实际日程和一格安排，不替任何人答应。':'主线不受阻；独立补谈将占1次主动安排。',...(isWeekly(s)?{dialogue:deferStory(s,e)}:{}),actionCost:0,treasury:0};
}
function promiseDate(s,when){if(when==='tomorrow')return addDays(s.date,1);if(when==='next-month')return addDays(s.date,30);if(when==='next-turn')return {year:turn(s).year+(s.turn%4===0?1:0),month:s.turn%4===0?1:turn(s).month+3,day:12};throw new RuleError('请选择明日、下月或下回合。');}
function reserved(s,turnIndex){return s.promises.filter(p=>p.dueTurn===turnIndex&&p.status==='accepted').length;}
function applyPromise(s,a,tx){
 if(!s.relations[a.actor]||!actorUnlocked(s,a.actor))throw new RuleError('当前无法向此人提出约见。');
 if(!['meet','letter','rest'].includes(a.purpose)||!['tomorrow','next-month','next-turn'].includes(a.when))throw new RuleError('约定参数超出本版支持范围。');
 if(a.purpose==='rest'&&a.actor!=='C02')throw new RuleError('本版休假安排只支持苏培盛的御前轮值。');
 if(s.promises.some(p=>p.actor===a.actor&&p.status==='accepted'))throw new RuleError('此人已有待履行安排，请先完成或协商取消。');
 if(s.closureMode)throw new RuleError('补叙仅处理已解锁节点，本版不在补叙新增约见。');
 const d=promiseDate(s,a.when),dt=dateTurn(d);
 if(dt>8)throw new RuleError('约定超出首版两年范围，可在后续版本继续；当前不会写入正式承诺。');
 if(a.purpose==='meet'&&!canMeetOn(s,a.actor,d))throw new RuleError('约定当日将军正在外任，可改约在京日期或安排书信往来。');
 const nextMain=requiredEvents(s).find(e=>e.kind==='main');
 if(nextMain&&dt===s.turn&&ordinal(d)<ordinal(eventDate(s,nextMain)))throw new RuleError('请先处理眼前主线，再安排这场约见，避免跨过其日期。');
 if(dt===s.turn)spendAction(s,1);else if(reserved(s,dt)>=2)throw new RuleError('目标回合的两次主动安排已预约满。');
 if(s.promises.filter(p=>p.status==='accepted'&&ordinal(p.date)===ordinal(d)).length>=2)throw new RuleError('该日期已有两项约定，请改期。');
 const promise={id:uid(),actor:a.actor,purpose:a.purpose,date:d,dueTurn:dt,status:'accepted',sourceTransaction:tx,actionReserved:true,createdTurn:s.turn,visibleTo:['C01',a.actor]};
 s.promises.push(promise);recordFact(s,`PROMISE_${promise.id}`,`已接受${dateText(d)}的${a.purpose==='letter'?'回信':a.purpose==='rest'?'轮值休假':'会面'}安排。`,['C01',a.actor],tx);
 return {label:`与${NAMES[a.actor]}约定`,detail:`${dateText(d)} · ${a.purpose==='letter'?'书信往来':a.purpose==='rest'?'轮值后休息':'会面'}；已预留${dt===s.turn?'本期':'目标回合'}1次安排，赴约不再扣。`,actionCost:dt===s.turn?1:0,treasury:0};
}
export function duePromises(s){if(isWeekly(s))return s.weekly.plans.filter(p=>p.status==='accepted'&&ordinal(p.date)<=ordinal(s.date));return s.promises.filter(p=>p.status==='accepted'&&p.dueTurn<=s.turn).slice().sort((a,b)=>ordinal(a.date)-ordinal(b.date));}
function applyFulfill(s,a,tx){
 const p=s.promises.find(p=>p.id===a.promiseId&&p.status==='accepted');if(!p||p.dueTurn!==s.turn)throw new RuleError('这项安排尚未到期或已经处理。');
 if(a.type==='fulfill'){
  if(p.purpose==='meet'&&!canMeetOn(s,p.actor,p.date))throw new RuleError('约定当日将军正在外任，不能当面会见；请先协商取消，再改约在京日期或书信往来。');
  const blocking=requiredEvents(s).find(e=>e.kind==='main'&&ordinal(eventDate(s,e))<ordinal(p.date));
  if(blocking)throw new RuleError(`请先处理较早的主线「${blocking.title}」。`);
  if(ordinal(p.date)<ordinal(s.date))throw new RuleError('约定日期已经跨过，请记录失约或协商改期。');
  moveDate(s,p.date);p.status='fulfilled';p.result='按约履行';
 }else{p.status='cancelled';p.result='已协商取消，保留原先约定记录';}
 p.resolvedTransaction=tx;p.dialogue=promiseStory(p.actor,p.purpose,a.type!=='fulfill');recordFact(s,`RESOLVE_${p.id}`,`${NAMES[p.actor]}的约定：${p.result}。`,['C01',p.actor],tx);
 return {label:p.result,detail:`${NAMES[p.actor]} · ${dateText(p.date)}；不重复扣行动。`,dialogue:p.dialogue,actor:p.actor,promiseId:p.id,actionCost:0,treasury:0};
}
function applyDisclosure(s,a,tx){
 if(!s.relations[a.actor]||!actorUnlocked(s,a.actor))throw new RuleError('不能向尚未登场的人披露。');
 if(!['partial','full'].includes(a.scope))throw new RuleError('请明确披露范围。');
 const old=isSixth(s)||isSeventh(s)||isEighth(s)?s.facts.filter(f=>f.id.startsWith('DISCLOSE_')&&f.visibleTo.includes(a.actor)).at(-1):s.facts.find(f=>f.id===`DISCLOSE_${a.actor}`);
 if(old&&old.scope===a.scope)throw new RuleError('这一范围已经向此人说过，重读不会重复披露。');
 if(isSixth(s)||isSeventh(s)||isEighth(s)){s.facts.push({id:`DISCLOSE_LATER_${tx}`,text:a.scope==='full'?'已听雍正讲述重生与部分旧日经历，仍需分别核实本世事实。':'已听雍正说起旧梦与似曾经历的事，尚不确信重生。',scope:a.scope,belief:'听过，未确信',visibleTo:['C01',a.actor],source:tx,turn:s.turn,date:clone(s.date)});}
 else if(old){old.scope=a.scope==='full'?'full':old.scope;old.text=old.scope==='full'?'已听雍正讲述重生与部分旧日经历，仍需分别核实本世事实。':'已听雍正说起旧梦与似曾经历的事，尚不确信重生。';}
 else s.facts.push({id:`DISCLOSE_${a.actor}`,text:a.scope==='full'?'已听雍正讲述重生与部分旧日经历，仍需分别核实本世事实。':'已听雍正说起旧梦与似曾经历的事，尚不确信重生。',scope:a.scope,belief:'听过，未确信',visibleTo:['C01',a.actor],source:tx,turn:s.turn,date:clone(s.date)});
 return {label:`向${NAMES[a.actor]}披露`,detail:`${a.scope==='full'?'说明重生经历':'仅谈似曾经历的旧梦'}；听过不等于确信，也不会自动知道其他私聊。`,actionCost:0,treasury:0};
}
function applyResume(s,a,tx){const r=s.relations[a.actor];if(!r||!actorUnlocked(s,a.actor))throw new RuleError('人物尚未可交谈。');if((isWeekly(s)?s.weekly.plans:s.promises).some(p=>p.actor===a.actor&&['accepted','needs-reschedule'].includes(p.status)))throw new RuleError('请先处理与此人的既有约定，再协商恢复。');if(isWeekly(s))return requestRelationshipResume(s,a.actor,tx);r.playerIntent='愿发展';r.boundary=null;const reply=r.npcIntent==='愿发展'?'对方原有的发展意愿仍保留，可从现有经历继续。':`对方当前意愿仍为「${r.npcIntent}」，这次表态不替对方答应。`;recordFact(s,`RESUME_${tx}`,`雍正重新表达愿意发展。${reply}原有拒绝记录仍保留。`,['C01',a.actor],tx);return {label:`向${NAMES[a.actor]}重新表明意愿`,detail:`${reply}不跳关系阶段，不重复补发旧节点奖励。`,actionCost:0,treasury:0};}
function applyAdvance(s){
 if(s.turn===8)throw new RuleError('二年冬请使用封卷，或处理有限补叙。');
 if(requiredEvents(s).length)throw new RuleError('眼前主线或到期回访尚未处理。');
 if(duePromises(s).length)throw new RuleError('请先赴约或协商取消本期约定。');
 if(s.closureMode)throw new RuleError('补叙中不能普通推进。');
 const income=8,expense=6;applyEffects(s,{treasury:income-expense});
 const report={turn:s.turn,date:clone(s.date),income,expense,balance:s.stats.treasury,actionUsed:2-s.remaining,remaining:s.remaining};s.turnReports.push(report);
 s.ledger.push({id:uid(),turn:s.turn,date:clone(s.date),label:'季度常规收支（收入8／支出6）',amount:income-expense,balance:s.stats.treasury});
 for(const key of ['people','execution','defense']){const c=s.crises[key]||{low:0,active:false,repaired:false};c.low=s.stats[key]<30?c.low+1:0;if(c.low>=2)c.active=true;if(c.active&&c.repaired&&s.stats[key]>=45)c.active=false;s.crises[key]=c;}
 s.turn++;s.date={year:turn(s).year,month:turn(s).month,day:2};s.remaining=2-reserved(s,s.turn);
 return {label:`进入雍正${turn(s).year===1?'元':'二'}年${turn(s).season}`,detail:`本期核准收入8点、常规支出6点，只结算一次。已预留约见占用后剩${s.remaining}次安排。`,actionCost:0,treasury:2};
}
function applyRepair(s,a,tx){if(!['people','execution','defense'].includes(a.stat)||!s.crises[a.stat]?.active)throw new RuleError('没有此项已触发危机。');if(isWeekly(s))spendLegacyRepair(s,a.stat,tx);else spendAction(s,1);applyEffects(s,{treasury:-3,[a.stat]:Math.max(0,45-s.stats[a.stat])});if(isWeekly(s))s.ledger.push({id:'REPAIR-'+tx+'-'+a.stat,date:clone(s.date),turn:s.turn,label:'旧危机专项修复',amount:-3,balance:s.stats.treasury});s.crises[a.stat].repaired=true;s.crises[a.stat].active=false;return {label:`修复${STAT_NAMES[a.stat]}危机`,detail:`国库 −3；占1${isWeekly(s)?'格':'次安排'}，完成配置的专项复核并恢复至至少45。既往低谷保留。`,actionCost:1,treasury:-3};}
function applyChatOpen(s,a,tx){if(isWeekly(s)){const key=weeklyActivityKey(s,`CHAT_${a.actor}`);if(s.events[key])throw new RuleError('本周交谈已开放，可继续原对话。');const before=s.weekly.plans.length;applyWeeklyAction(s,{type:'week-plan',kind:a.actor==='C03'&&!weekCanMeet(s,a.actor,s.date)?'letter':'chat',actor:a.actor},tx);const p=s.weekly.plans[before],r=applyWeeklyAction(s,{type:'week-fulfill',planId:p.id},tx);s.events[key]={id:'CHAT_'+a.actor,processed:true,completed:true,advanced:false,outcomeId:'opened',date:clone(p.date),turn:s.turn,transactionId:tx};return r;}if(s.sealed||!s.relations[a.actor]||!actorUnlocked(s,a.actor))throw new RuleError('当前无法与此人交谈。');const key=`CHAT_${a.actor}@${s.turn}`;if(s.events[key])throw new RuleError('本期交谈已开放，可继续原对话。');if(s.closureMode)throw new RuleError('补叙只处理待办，不新增日常交谈。');spendAction(s,1);const day=addDays(s.date,1);moveDate(s,day);s.events[key]={id:'CHAT_'+a.actor,processed:true,completed:true,advanced:false,outcomeId:'opened',date:clone(s.date),turn:s.turn,transactionId:tx};return {label:`与${NAMES[a.actor]}交谈`,detail:`占1次主动安排；同场问答不重复扣，不自动加关系数值。`,actionCost:1,treasury:0};}
function applyClosure(s){if(s.turn!==8||s.closureMode||s.sealed)throw new RuleError('当前不能进入补叙。');if(requiredEvents(s).length)throw new RuleError('先处理本期主线和已到期回访。');s.closureMode=true;return {label:'进入卷末补叙',detail:`另有${s.closureRemaining}次有限补叙，只处理已解锁待办；不追加年度收入。`,actionCost:0,treasury:0};}
function currentRelationshipEnding(s,cid){if(!isWeekly(s)||!s.weekly.relationships)return null;const r=s.relations[cid],rec=relationshipRecord(s,cid);if(rec.issues.length)return '还有一件说定的事未补谈，原话留在前页，不拿一时温言替它收尾。';if(rec.requests.some(q=>q.status==='pending'))return '有一句话仍在等答复，已经走过的片刻留在册中，未到的后半句不替对方写。';if(['仅合作','暂缓','终止恋爱'].includes(r.playerIntent)||['仅合作','暂缓','终止恋爱'].includes(r.npcIntent))return '眼下按各自说清的分寸相处，一起办过的事仍好好留着。';const h=rec.history.filter(h=>h.kind==='stage').at(-1);return h&&r.playerIntent==='愿发展'&&r.npcIntent==='愿发展'?h.text:null;}
function makeEnding(s){
 const firstEvents=Object.values(EVENTS).filter(e=>!e.volume);const main=firstEvents.filter(e=>e.kind==='main');const rel=firstEvents.filter(e=>e.kind==='relation');const gov=[...firstEvents.filter(e=>e.kind==='government'||e.kind==='followup'),...(isWeekly(s)?Object.values(PROJECT_EVENTS):[])];const side=firstEvents.filter(e=>e.kind==='side');
 const extensions=firstEvents.filter(e=>e.kind==='extension');
 const all=[...main,...rel,...gov,...side,...extensions];const pending=all.filter(e=>!done(s,e.id));
 const routeEnd={C02:'案侧的椅子不再总是空着。有时只要你抬头，他就会接着说起值房里那件小事。',C03:'西北的信多了一页近况，拆开时，细沙仍会落在案边。你认得那几行不那么端正的字。',C04:'新抄的脉案里夹着他的批注。下回见面，他还想把后来那一段说给你听。',C05:'两份旧谱收在一起，页角的墨点没有擦去。你们争过的那半拍，仍各自留着自己的唱法。',C06:'景仁宫的宫账翻到末页，她给你留的那张纸上，添过两种笔迹。',C07:'翊坤宫窗边的花仍由她自己挑。你来时，她偶尔会先问一句：今日看见了没有。',C08:'曲谱页角署着她的名字，家书放在一旁。那一回，她终于把关于自己的话说完。'};
 const passages=['雍正二年冬，又到了添炭的时节。你将这一卷旧事慢慢合起，才发觉有些从前总来不及说的话，如今已留在灯下。',s.flags.palaceRules==='written'?'宜修收好了正副两份新规，案上终于空出一小块可以放茶的地方。':'景仁宫还夹着几张待议的纸签。你知道，往后仍有要一起看完的页。',s.flags.fiscalReview?(s.flags.collection==='strict'?'县里的回报仍带着摊派的忧虑，那几个名字被重新圈进待办。':'县库回报里添了周转与米价，几处担心过的地方，终于传来平稳的消息。'):'地方的回报尚未齐全，你将那册账留在下一卷旁边。',s.flags.militaryReview?(s.flags.militaryRecord?.audit==='waived'?'粮道有了回音，未核的军账却还压在案角。':s.flags.militaryRecord?.amount===0?'领粮的回报来得迟，耽误的几日仍写在纸上，等你接着处理。':'粮道回执送进宫，你核到最后一个名字，才将那份催粮折放下。'):'西北还有待回的信，案边的舆图便没有收起。',...CHARACTERS.map(c=>{const t=Object.values(s.transcripts).filter(t=>t.actor===c.id&&t.reward).at(-1);return `${c.name}：${currentRelationshipEnding(s,c.id)||(!t?'有些话还未开口，宫门内外仍有待续的相逢。':['仅合作','终止恋爱','暂缓'].includes(s.relations[c.id].playerIntent)||['仅合作','终止恋爱','暂缓'].includes(s.relations[c.id].npcIntent)||t.reward.tone==='calm'?'你们将相处分寸说清，也留住了一起做过的事。':done(s,`R${c.id.slice(1)}-02`)&&s.facts.some(f=>f.id===`MOMENT_R${c.id.slice(1)}-02`&&canReadFact(s,c.id,f))?routeEnd[c.id]:`你记得「${t.reward.title}」那一回：${t.dialogue.split('\n\n').filter(Boolean).at(-1)}`)}`;}),pending.length?'未完的事夹着纸签，已见的人留着回声。这一卷暂收，余下的路还长。':'灯火照着书脊。两年并不长，却已经与你记得的从前，有了一点不同。'];
 if(isWeekly(s)){for(const p of Object.values(projectBook(s).items)){const r=p.reports.at(-1);if(r&&p.id==='PR-FISCAL')passages[2]=r.text;if(r&&p.id==='PR-MILITARY')passages[3]=r.text;if(r&&['PR-COURT','PR-WATER'].includes(p.id))passages.push(r.text);if(['paused','needs-repair','executing','repairing','review'].includes(p.status))passages.push((p.id==='PR-COURT'?'御前轮值':p.id==='PR-FISCAL'?'地方周转':p.id==='PR-WATER'?'京郊取水':'西北军需')+'仍有未竟，原账与待办留到下一卷。');}}
 for(const cid of ['C09','C10']){const text=extensionEnding(s,cid);if(text)passages.push(text);}
 if(s.incenseCase){const c=s.incenseCase;passages.push(c.review?(c.shared?'旧香的核对副单已有两份落款，年世兰也亲自留过一份。对上的领用日期和未补的原方用量仍分开记着，没有被写成病因或谁的罪责。':'旧香回单已在御案读过，副单还没交到年世兰手里。纸上已经查过与尚待补的，仍须当面说给她听。'):c.arrivedAt?'太医院的旧香回单已送到御案，却还没有展开。未读的一页，不在封卷时补成已经查明。':'旧香已经停用，原方核对尚待回单。先做的保护没有撤，未查清的也仍留在待续里。');}
 return {id:'F00',date:clone(s.date),title:pending.length?'两载灯火 · 仍有未尽':'两载灯火 · 初卷已收',passages,pending:pending.map(e=>e.id),counts:{main:main.filter(e=>done(s,e.id)).length,relation:rel.filter(e=>done(s,e.id)).length,government:gov.filter(e=>done(s,e.id)).length,side:side.filter(e=>done(s,e.id)).length,extension:extensions.filter(e=>done(s,e.id)).length}};
}
function applySeal(s,tx){if(isWeekly(s)&&hasContinuation(s)){if(s.sealed||s.weekly.clock!==horizonStamp(s)||s.weekly.monthly.length!==monthlyGoal(s)||requiredEvents(s).length||duePromises(s).length||s.weekly.notices.some(n=>n.status==='pending'&&!n.suspended&&ordinal(n.date)<=horizonDay(s))||s.weekly.continuation.runs.some(r=>r.status==='pending')||isFifth(s)&&s.weekly.continuation.salon?.status==='pending'||(isFourth(s)||isFifth(s)||isSixth(s)||isSeventh(s)||isEighth(s))&&(draftFamilyPending(s))||(isSeventh(s)||isEighth(s))&&(s.weekly.continuation.lateRequests.some(q=>q.status==='pending'&&ordinal(q.dueDate)<=horizonDay(s))||s.weekly.continuation.career?.status==='pending'))throw new RuleError(`先行至${horizonDate(s).year}年${horizonDate(s).month}月${horizonDate(s).day}日，核完月账、主线与到期回报。`);if(isEighth(s)){if(!eighthStage(s,'M47#complete')||!eighthStage(s,'M46#complete'))throw new RuleError('先收好交班与三次独立探望完成页。');s.weekly.continuation.chronicles.push(makeFinalChronicle(s,tx));if(!s.weekly.continuation.repairTail)s.weekly.continuation.volumeReport=makeVolumeReport(s,tx);}else s.weekly.continuation.volumeReport=makeVolumeReport(s,tx);s.sealed=true;return {label:isEighth(s)?'据实封存最终史册':isSeventh(s)?'收存第七卷':isSixth(s)?'收存第六卷':isFifth(s)?'收存第五卷':isFourth(s)?'收存第四卷':'收存第三卷',detail:'只生成本卷回报，初卷F00、此前卷报与历史正文保留，不重复结算收入。',actionCost:0,treasury:0};}if(isWeekly(s)){if(s.sealed||ordinal(s.date)!==720||s.weekly.monthly.length!==monthlyGoal(s)||requiredEvents(s).length||duePromises(s).length||s.weekly.notices.some(n=>n.status==='pending'&&!n.suspended&&ordinal(n.date)<=720))throw new RuleError('先行至二年十二月底，核完本档应记月账与眼前到期事项。');s.ending=makeEnding(s);s.sealed=true;return {label:'封存第一卷',detail:'据实收存，封卷不再追加季度或年度收益。',actionCost:0,treasury:0};}if(s.turn!==8||s.sealed)throw new RuleError('当前不在可封卷状态。');if(requiredEvents(s).length||duePromises(s).length)throw new RuleError('先处理主线、已到期回访与约定。');applyEffects(s,{treasury:2});s.ledger.push({id:uid(),turn:8,date:clone(s.date),label:'二年冬常规收支（收入8／支出6）',amount:2,balance:s.stats.treasury});s.turnReports.push({turn:8,income:8,expense:6,balance:s.stats.treasury});s.ending=makeEnding(s);s.sealed=true;return {label:'封存第一卷',detail:'F00已按实际决定生成。可重读，不能重复结算。',actionCost:0,treasury:2};}
function simulate(s,actions,tx){if(!Array.isArray(actions)||actions.length<1||actions.length>3)throw new RuleError('每次提交1至3个受支持子行动。');if(actions.length>1&&actions.some(a=>a?.type?.startsWith('life-')))throw new RuleError('逐卷手记请单独确认，保留本次整理的实际落笔日期。');if(actions.length>1&&actions.some(a=>a?.type==='week-plan'&&a.kind==='bond'&&(['C09','C10'].includes(a.actor)||a.mode==='daily')))throw new RuleError('这份新的伴侣安排请单独确认，保留当时双方答复。');const draft=clone(s),results=[];if(isWeekly(draft)&&!draft.sealed)ensureRelationships(draft);for(const a of actions){if(!a||typeof a!=='object')throw new RuleError('命令格式错误。');let result;if(typeof a.type!=='string')throw new RuleError('命令缺少类型。');if(isEighth(draft)&&draft.weekly.continuation.repairTail&&!['week-advance','week-end','volume3-review','volume8-tail-start','seal'].includes(a.type))throw new RuleError('有限修复只推进真实日期、执行已配置危机核件、亲阅回执或另立史册。');if(a.type.startsWith('life-')){results.push(lifeAction(draft,a,tx));continue;}if(a.type.startsWith('volume8-')){results.push(eighthAction(draft,a,tx,{spend:(cid,key)=>spendRelationshipSlot(draft,cid,key,tx,{independent:true}).cost,move:(date,period)=>moveWeekly(draft,date,period)}));continue;}if(a.type.startsWith('volume7-')){results.push(seventhAction(draft,a,tx,{spend:(cid,key)=>spendRelationshipSlot(draft,cid,key,tx,{independent:true}).cost}));continue;}if(a.type==='cross-inquiry'){if(actions.length!==1)throw new RuleError('分别问本人须单独确认这一场相谈。');results.push(applyCrossInquiry(draft,a,tx,{spend:actor=>{if(isWeekly(draft))return spendRelationshipSlot(draft,actor,'CROSS-'+tx,tx);if(!actorUnlocked(draft,actor)||!canMeetOn(draft,actor,draft.date)||draft.closureMode)throw new RuleError('先留出本人可相见的正常时段。');spendAction(draft,1);moveDate(draft,addDays(draft.date,1));return {cost:1};}}));continue;}if(a.type==='extension-talk'){results.push(applyExtensionAction(draft,a,tx,{spend:()=>{if(isWeekly(draft)){spendProjectSlot(draft,'XR-TALK-'+tx,tx);return 1;}spendAction(draft,1);moveDate(draft,addDays(draft.date,1));return 1;}}));continue;}if(a.type.startsWith('incense-')){results.push(applyIncenseAction(draft,a,tx,{spendShare:()=>{if(isWeekly(draft))return spendRelationshipSlot(draft,'C07','IC-SHARE-'+tx,tx);const last=Object.values(draft.transcripts).at(-1),same=last?.actor==='C07'&&/^R07/.test(last.eventId)&&ordinal(last.date)===ordinal(draft.date)&&!draft.transactions.slice(draft.transactions.findIndex(t=>t.id===last.transactionId)+1).some(t=>t.results.some(r=>r.actionCost>0));if(!same){spendAction(draft,1);moveDate(draft,addDays(draft.date,1));}return {cost:same?0:1};}}));continue;}if(isWeekly(draft)&&a.type.startsWith('activity-')){result=applyActivityAction(draft,a,tx,{useSlot:spendRelationshipSlot,spendable:spendableMoney,createPlan:applyWeeklyAction});results.push(result);continue;}if(isWeekly(draft)&&a.type.startsWith('relationship-')){result=applyRelationshipAction(draft,a,tx,{useSlot:spendRelationshipSlot,createPlan:applyWeeklyAction});results.push(result);continue;}if(isWeekly(draft)&&a.type.startsWith('project-')){result=applyProjectAction(draft,a,tx,{useSlot:(s,key)=>spendProjectSlot(s,key,tx),spendable:spendableMoney});results.push(result);continue;}if(isWeekly(draft)&&a.type.startsWith('week-')){result=applyWeeklyAction(draft,a,tx);results.push(result);continue;}if(isWeekly(draft)&&['promise','fulfill','cancel-promise','advance','closure'].includes(a.type))throw new RuleError('请使用周计划中的日期、预占和到期操作。');switch(a.type){case 'volume5-visit':case 'volume5-birthday':case 'volume5-birthday-note':case 'volume5-salon-answer':case 'volume5-publication':result=fifthAction(draft,a,tx);break;case 'volume4-visit':result=acceptFourthVisit(draft,a,tx);break;case 'family-discuss':case 'family-answer':case 'family-care':case 'family-start':case 'family-birth':result=familyAction(draft,a,tx,{move:d=>moveWeekly(draft,d),spend:key=>spendRelationshipSlot(draft,'C07',key,tx,{independent:true}).cost});break;case 'volume3-review':result=applyVolumeReview(draft,a,tx);break;case 'chat-open':result=applyChatOpen(draft,a,tx);break;case 'event':result=applyEvent(draft,a,tx);break;case 'defer':result=applyDefer(draft,a);break;case 'promise':result=applyPromise(draft,a,tx);break;case 'fulfill':case 'cancel-promise':result=applyFulfill(draft,a,tx);break;case 'disclose':result=applyDisclosure(draft,a,tx);break;case 'resume':result=applyResume(draft,a,tx);break;case 'advance':result=applyAdvance(draft);break;case 'repair':result=applyRepair(draft,a,tx);break;case 'closure':result=applyClosure(draft);break;case 'seal':result=applySeal(draft,tx);break;default:throw new RuleError('命令不在当前能力白名单。');}results.push(result);}if(draft.weekly?.life&&draft.weekly.monthly.some(m=>m.date.month===12&&m.date.year>=draft.weekly.life.enabled.date.year&&m.date.year<draft.date.year&&!draft.weekly.life.records.some(r=>r.kind==='year'&&r.year===m.date.year)))throw new RuleError('先单独核过本年十二月月账、收好回望，再开始新年；本次组合未提交。');syncIncense(draft,tx);syncExtensionInvitations(draft,tx);recordLifeYear(draft,tx);return {draft,results};}
export function preview(s,actions){const id=uid();const {results}=simulate(s,actions,id);return {id,gameId:s.gameId,revision:s.revision,actions:clone(actions),planHash:hash(actions),stateHash:hash(s),results,totalCost:results.reduce((n,r)=>n-r.treasury,0),actionCost:results.reduce((n,r)=>n+r.actionCost,0)};}
export function previewInteraction(s,actions){const id=uid(),{draft,results}=simulate(s,actions,id);return {plan:{id,gameId:s.gameId,revision:s.revision,actions:clone(actions),planHash:hash(actions),stateHash:hash(s),results,totalCost:results.reduce((n,r)=>n-r.treasury,0),actionCost:results.reduce((n,r)=>n+r.actionCost,0)},confirmation:actionConfirmation(s,actions,results,draft)};}
export function commit(s,plan){const prior=s.transactions.find(t=>t.id===plan.id);if(prior)return {state:clone(s),receipt:clone(prior),duplicate:true};if(plan.gameId!==s.gameId||plan.revision!==s.revision||plan.stateHash!==hash(s))throw new RuleError('状态已变化，请重新核对预览。','STALE');if(plan.planHash!==hash(plan.actions))throw new RuleError('方案已被改动，请重新生成预览。','PLAN');const {draft,results}=simulate(s,plan.actions,plan.id);draft.revision++;const receipt={id:plan.id,revisionBefore:s.revision,revisionAfter:draft.revision,actions:clone(plan.actions),results,turn:draft.turn,date:clone(draft.date)};draft.transactions.push(receipt);return {state:draft,receipt,duplicate:false};}
export function setBoundary(s,cid,intent,sourceMessageId){if(!s.relations[cid])throw new RuleError('当前角色没有核心关系。');if(!['仅合作','暂缓','终止恋爱'].includes(intent))throw new RuleError('未知关系边界。');const n=clone(s);n.relations[cid].playerIntent=intent;n.relations[cid].boundary={text:intent,source:sourceMessageId,date:clone(n.date)};if(isWeekly(n))recordRelationshipBoundary(n,cid,intent,sourceMessageId);recordFact(n,`BOUNDARY_${sourceMessageId}`,`玩家明确表示${intent}，后续不得反复推送亲密。`,['C01',cid],sourceMessageId);n.revision++;return n;}
export function savePreference(s,cid,text,sourceId){if(!s.relations[cid]||!text||text.length>180)throw new RuleError('偏好超出可记录范围。');const n=clone(s);const tea=/茶/.test(text);const scope=tea?'夜间饮茶':'相处偏好';const older=n.memories.filter(m=>m.actor===cid&&m.scope===scope&&!m.deleted&&!m.supersededBy);const id=uid();for(const o of older)o.supersededBy=id;n.memories.push({id,actor:cid,scope,text,sourceMessageId:sourceId,visibleTo:['C01',cid],status:'明确偏好',supersedes:older.map(m=>m.id),turn:n.turn,date:clone(n.date),deleted:false});n.revision++;return n;}
export function correctPreference(s,id,text,sourceId){const old=s.memories.find(m=>m.id===id);if(!old||!preferenceActive(s,old))throw new RuleError('这条偏好已被更正或停止，请从当前记录继续。');if(typeof text!=='string'||!text.trim()||text.length>180)throw new RuleError('偏好超出可记录范围。');const n=clone(s),nextId=uid();n.memories.find(m=>m.id===id).supersededBy=nextId;n.memories.push({id:nextId,actor:old.actor,scope:/茶/.test(text)?'夜间饮茶':'相处偏好',text,sourceMessageId:sourceId,visibleTo:['C01',old.actor],status:'明确偏好',supersedes:[id],corrects:[id],turn:n.turn,date:clone(n.date),deleted:false});n.revision++;return n;}
export function forgetPreference(s,id){const n=clone(s),m=n.memories.find(m=>m.id===id);if(!m)throw new RuleError('未找到这条偏好。');m.deleted=true;n.revision++;return n;}
export function recordMessage(s,cid,role,text,meta={}){const n=clone(s);if(!NAMES[cid]||!['player','npc','system'].includes(role)||typeof text!=='string'||text.length>5000)throw new RuleError('消息格式不合法。');n.messages.push({id:uid(),actor:cid,role,text,date:clone(n.date),turn:n.turn,...meta});n.revision++;return n;}
export function attachReaction(s,key,transactionId,text){const t=s.transcripts[key];if(!t||t.transactionId!==transactionId)throw new RuleError('这段经历已经变化。');if(t.aiReaction)return clone(s);if(t.reactionRequest)throw new RuleError('请由原接话请求核对场景后保存。');if(typeof text!=='string'||text.length<2||text.length>1500)throw new RuleError('接话内容不完整。');const n=clone(s);n.transcripts[key].aiReaction=text;n.revision++;return n;}
export function visibleContext(s,cid,{forRetrieval=false}={}){
 if(!actorUnlocked(s,cid))throw new RuleError('人物尚未登场。');
 const visible=f=>canReadFact(s,cid,f);
 const inquiry=incenseKnowledge(s,cid),bridge=bridgeContext(s,cid),extension=extensionContext(s,cid);
 if(forRetrieval&&extension?.work&&(memorySuppressed(s,'fact','FACT_'+extension.work.source)||memorySuppressed(s,'experience',extension.work.source)))delete extension.work;
 if(forRetrieval&&extension)extension.history=extension.history.filter(h=>!memorySuppressed(s,'fact',h.eventId?'FACT_'+h.eventId:'XR-TALK-'+h.transactionId)&&(!h.eventId||!memorySuppressed(s,'experience',h.eventId)));
 if(forRetrieval&&inquiry)inquiry.observations=inquiry.observations.filter(o=>!o.source.eventId||!memorySuppressed(s,'fact','FACT_'+o.source.eventId));
 if(forRetrieval&&bridge)bridge.history=bridge.history.filter(h=>!memorySuppressed(s,'fact','FACT_'+h.eventId));
 const facts=[...s.facts.filter(visible).filter(f=>!memorySuppressed(s,'fact',f.id)&&!extensionActivitySuppressed(s,f.id)).map(f=>({...clone(f),visibleTo:factReaders(s,f),epistemic:epistemicFact(f)})),...incenseFacts(s,cid,inquiry).filter(f=>!memorySuppressed(s,'fact',f.id))];const rel=s.relations[cid];
 const memories=s.memories.filter(m=>m.actor===cid&&preferenceActive(s,m)&&(m.visibleTo.includes(cid)||m.visibleTo.includes('public'))).slice(forRetrieval?0:-12);
 const personal=isWeekly(s)&&rel&&s.weekly.relationships?relationshipRecord(s,cid):null;
 const dialogue=memoryMessages(s,cid).slice(-16).map(m=>({id:m.id,role:m.role,text:forRetrieval?m.text:m.text.slice(0,1000)}));
 const layers=memoryLayers(s,cid,facts);
 return {conversationMemory:memoryContext(layers,{all:forRetrieval}),worldVersion:s.worldVersion,date:dateText(s.date),actorId:cid,actorName:NAMES[cid],persona:character(cid)||(cid==='C09'?{name:'甄嬛',goal:'被当作本人，能提出不同意见，自己的心意由自己回答',voice:'聪敏、会问也会停，不以礼遇或收礼代替私情'}:cid==='C10'?{name:'沈眉庄',goal:'公平与志业不换私情，能批评并拒绝新增长差，也有自己的闲时',voice:'温稳但不含糊；可不同意，不把疑点说成查明，不自动谢恩'}:null)||{name:NAMES[cid],goal:'按职责与已核实信息回应'},location:actorPlace(s,cid),availability:isWeekly(s)?personPresence(s,cid):null,mandatory:{crossRelations:crossContext(s,cid,id=>memorySuppressed(s,'fact',id)),incenseKnowledge:inquiry,extensionAttitude:bridge,extensionRoute:extension,relation:rel?clone(rel):null,activityMoments:isWeekly(s)?s.weekly.activities?.entries.filter(e=>e.visibleTo.includes(cid)&&e.kind!=='letter-delivered'&&!extensionActivitySuppressed(s,e.id)&&!memorySuppressed(s,'activity',e.id)&&!memorySuppressed(s,'fact',e.id)).slice(-4).map(e=>({id:e.id,date:clone(e.date),title:e.title,text:e.text}))||[]:[],relationshipProgress:personal?{stage:rel.stage,openIssues:personal.issues.slice(-5).map(i=>({id:i.id,...(forRetrieval&&memorySuppressed(s,'issue',i.id)?{status:'待补谈，原文已停止检索'}:{text:i.text})})),openIssueCount:personal.issues.length,awaitingAnswer:personal.requests.filter(r=>r.status==='pending'&&!r.awaitDelivery&&ordinal(r.deliveryDate)<=ordinal(s.date)).map(r=>({id:r.id,kind:r.kind,dueDate:clone(r.dueDate)})),confirmed:personal.history.filter(h=>h.kind==='stage'&&(!forRetrieval||!memorySuppressed(s,'stage',h.id))).slice(-3).map(h=>({stage:h.to,date:clone(h.date),text:h.text}))}:null,promises:(isWeekly(s)?s.weekly.plans:s.promises).filter(p=>['accepted','needs-reschedule'].includes(p.status)&&(p.actor===cid||p.guests?.includes(cid))&&(!isWeekly(s)||p.visibleTo.includes(cid))),secretDisclosure:facts.filter(f=>f.id.startsWith('DISCLOSE_')),rules:['不能替玩家答应、执行命令或更改世界状态','未核验说法不能作为本世证据','前世记忆与听过的叙述只作线索；选择记录只证明处置，不自动证明动机、病因或罪责','未知私聊与重生细节不得猜测补全','关系意愿用于约束相处，不代表角色已经读到尚在递送的信；未补谈与待答事项不能说成已和好或已答应']},facts:forRetrieval?facts:facts.slice(-30),memories,dialogue};
}
export function memoryBook(s,cid){const facts=s.facts.filter(f=>canReadFact(s,cid,f)).map(f=>({...clone(f),visibleTo:factReaders(s,f),epistemic:epistemicFact(f)}));return memoryLayers(s,cid,facts);}
export function fixedReply(s,cid,input,eventId=null){
 const c=character(cid),ctx=visibleContext(s,cid),mem=ctx.memories.at(-1),r=s.relations[cid];
 if(/重生|前世/.test(input)){const knows=ctx.mandatory.secretDisclosure.length;return knows?'你说过的那些旧梦，我记得；至于今生的人与事，还是要依眼前证据慢慢核实。':'这件事我尚不知情，不能把猜测说成已经知道的旧事。';}
 const cross=crossReply(s,cid,input,id=>memorySuppressed(s,'fact',id));if(cross)return cross;
 const incense=incenseReply(s,cid,input);if(incense)return incense;
 if(['C09','C10'].includes(cid)&&s.extensionRoutes?.history.some(h=>h.actor===cid)&&/心意|私情|喜欢|爱|旧影|赏|怎么想|恢复/.test(input)){const r=extensionRelation(s,cid);return r.unresolvedGift?'那日的赏物与未答的话都还在。先把回避的事说明，添赏不能替它作答。':r.requiresRenewal?'新的意思臣妾听见了，先前的分寸也还记得。须看后来怎样相处，再由臣妾自己答复。':r.npcIntent==='愿发展'?'臣妾愿意再往下认识，仍保留自己的意见。愿意再谈不等于已经许下相守。':'今日按已说明的分寸来往，私情须两个人各自回答。';}const bridge=bridgeReply(s,cid,input);if(bridge)return bridge;
 if(/说过|谈过|之前|那次|以前|还记得/.test(input)&&!/茶|偏好/.test(input)){const entries=ctx.conversationMemory.summaries.flatMap(x=>x.atoms),prefSources=new Set(s.memories.map(m=>m.sourceMessageId)),words=['散步','回信','分歧','不同意','担心'].filter(w=>input.includes(w)),a=entries.find(x=>words.some(w=>x.text.includes(w)))||entries.find(x=>x.kind!=='谈话摘记'&&!prefSources.has(x.sourceId))||entries.at(-1),pr=ctx.mandatory.promises[0];if(a)return `那句话我记着：${a.role==='player'?'你当时说':'当时回的话是'}「${a.text.replace(/[。！？!?]+$/,'')}」。${pr?'约在'+dateText(pr.date)+'的那一段还留着，等那天一起走过去。':'那时没说完的，你肯再谈，我便听着。'}`;}
 if(/茶|记得|记住|偏好/.test(input)&&mem)return `${NAMES[cid]}将杯盏放稳，轻声道：“${cid==='C05'?'皇兄':'皇上'}说过的，记着呢。”`;
 if(/答应|看灯|约定|什么时候/.test(input)){const pr=ctx.mandatory.promises[0];return pr?.status==='needs-reschedule'?`原先约的是${dateText(pr.date)}。现在需要另行协商，还没有替你接受新的约期。`:pr?`已确认的是${dateText(pr.date)}的安排，届时仍按说清的方式履行。`:'这件事我们可以谈，但眼下还没有经过确认的正式约定。';}
 if(/怎么想|想做|累|心愿|愿望|不同意|担心/.test(input))return c?.request||'先把原始记录查明，再决定下一步，才不辜负经手这件事的人。';
 if(r&&['仅合作','终止恋爱','暂缓'].includes(r.playerIntent))return `${c?.request||'先把眼前职责办妥。'} 你说明的${r.playerIntent==='暂缓'?'暂缓相处':'合作'}边界，我会照着办。`;
 const lived=activityEcho(s,cid,input);if(lived)return lived;
 const personal=relationshipEcho(s,cid,input);if(personal)return personal;
 const echo=projectEcho(s,cid,input);if(echo)return echo;
 if(/拨|银|军饷|承办|核账/.test(input))return eventId==='G04'&&/一半|半额/.test(input)?'若先给六点，眼前能缓一口气；余下的粮，仍得接着筹。臣想让经手的把数报清，别到最后，银在路上，守关的人还等着。':'账上的疑处，拿原簿来便能接着核。眼前最急的，还是粮能否送到人手里。';
 return c?.request||'我会依照眼前已知的事实回话；尚待核实的地方，先留在待查项里。';
}
export function validateSave(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new RuleError('存档须为对象。');
 const weekly=isWeekly(value);
 if(!weekly&&(value.saveVersion!==1||value.worldVersion!=='changyong-v1.2-first-1'))throw new RuleError('存档版本不受此首版支持；原文件不会被覆盖。');
 if(typeof value.gameId!=='string'||!Number.isInteger(value.revision)||value.revision<0||!Number.isInteger(value.turn)||value.turn<1||value.turn>(isEighth(value)?(value.weekly.continuation.repairTail?121:120):isSeventh(value)?104:isSixth(value)?80:isFifth(value)?48:isFourth(value)?24:hasContinuation(value)?16:8))throw new RuleError('存档身份、版本或回合字段错误。');
 if(!Number.isInteger(value.remaining)||value.remaining<0||value.remaining>(weekly?6:2)||!Number.isInteger(value.closureRemaining)||value.closureRemaining<0||value.closureRemaining>3)throw new RuleError('行动或补叙余量错误。');
 if(typeof value.sealed!=='boolean'||typeof value.closureMode!=='boolean')throw new RuleError('封卷状态不合法。');
 if(!value.date||!Number.isInteger(value.date.day)||value.date.day<1||value.date.day>30||!Number.isInteger(value.date.month)||value.date.month<1||value.date.month>12||dateTurn(value.date)!==value.turn)throw new RuleError('场景日期与回合不一致。');
 for(const key of Object.keys(STAT_NAMES))if(!Number.isFinite(value.stats?.[key])||value.stats[key]<0||value.stats[key]>(key==='treasury'?1e8:100))throw new RuleError(`指标字段错误：${key}`);
 for(const cid of CHARACTERS.map(c=>c.id)){const r=value.relations?.[cid];if(!r||['trust','intimacy','safety'].some(k=>!Number.isFinite(r[k])||r[k]<0||r[k]>100)||!['相识','信任','倾心','共担','相守'].includes(r.stage)||!['未表态','愿发展','暂缓','仅合作','终止恋爱'].includes(r.playerIntent)||!['未表态','愿发展','暂缓','仅合作','终止恋爱'].includes(r.npcIntent))throw new RuleError(`关系字段错误：${cid}`);}
 for(const key of ['queue','promises','memories','messages','transactions','facts','ledger','turnReports','deferred'])if(!Array.isArray(value[key])||value[key].length>20000)throw new RuleError(`记录字段错误：${key}`);
 for(const key of ['events','flags','transcripts','crises'])if(!value[key]||typeof value[key]!=='object'||Array.isArray(value[key]))throw new RuleError(`记录对象错误：${key}`);
 for(const [key,e] of Object.entries(value.events)){if((V8_IDS.includes(e?.id)&&!isEighth(value)||V7_IDS.includes(e?.id)&&!isSeventh(value)&&!isEighth(value)||V6_IDS.includes(e?.id)&&!isSixth(value)&&!isSeventh(value)&&!isEighth(value)||V5_IDS.includes(e?.id)&&!isFifth(value)&&!isSixth(value)&&!isSeventh(value)&&!isEighth(value)||V4_IDS.includes(e?.id)&&!isFourth(value)&&!isFifth(value)&&!isSixth(value)&&!isSeventh(value)&&!isEighth(value)||V3_IDS.includes(e?.id)&&!hasContinuation(value)||!EVENTS[e?.id]&&!(weekly&&PROJECT_EVENTS[e?.id])&&!/^CHAT_C0[2-8]$/.test(e?.id||'')&&!(weekly&&/^CHAT_(C09|C10)$/.test(e?.id||'')))||typeof e.completed!=='boolean'||!Number.isInteger(e.turn)||e.turn>value.turn||!key.startsWith(e.id))throw new RuleError('事件记录包含未知节点或未来结果。');}
 for(const m of value.memories)if(typeof m.id!=='string'||typeof m.text!=='string'||m.text.length>180||!value.relations[m.actor]||!Array.isArray(m.visibleTo))throw new RuleError('对话记忆字段错误。');
 for(const m of value.messages)if(typeof m.text!=='string'||m.text.length>5000||!NAMES[m.actor]||!['player','npc','system'].includes(m.role))throw new RuleError('对话原文字段错误。');
 for(const m of value.messages)if(m.memorySources!==undefined&&(!Array.isArray(m.memorySources)||m.role!=='npc'||m.memorySources.length>512||m.memorySources.some(r=>!r||!['fact','message','preference','activity','stage','issue','promise','experience'].includes(r.kind)||typeof r.id!=='string'||!r.id||r.id.length>200||Object.keys(r).some(k=>!['kind','id'].includes(k)))))throw new RuleError('对白来源记录格式错误。');
 for(const f of value.facts)if(typeof f.id!=='string'||typeof f.text!=='string'||f.text.length>3000||!Array.isArray(f.visibleTo))throw new RuleError('事实字段错误。');
 for(const q of value.queue)if(V8_IDS.includes(q.eventId)&&!isEighth(value)||V7_IDS.includes(q.eventId)&&!isSeventh(value)&&!isEighth(value)||V6_IDS.includes(q.eventId)&&!isSixth(value)&&!isSeventh(value)&&!isEighth(value)||V5_IDS.includes(q.eventId)&&!isFifth(value)&&!isSixth(value)&&!isSeventh(value)&&!isEighth(value)||V4_IDS.includes(q.eventId)&&!isFourth(value)&&!isFifth(value)&&!isSixth(value)&&!isSeventh(value)&&!isEighth(value)||V3_IDS.includes(q.eventId)&&!hasContinuation(value)||!(EVENTS[q.eventId]||weekly&&PROJECT_EVENTS[q.eventId])||!Number.isInteger(q.dueTurn)||q.dueTurn<1||q.dueTurn>(isEighth(value)?(value.weekly.continuation.repairTail?121:120):isSeventh(value)?104:isSixth(value)?80:isFifth(value)?48:isFourth(value)?24:hasContinuation(value)?16:9))throw new RuleError('事件队列字段错误。');
 for(const p of value.promises)if(!value.relations[p.actor]||typeof p.id!=='string'||!['accepted','fulfilled','cancelled'].includes(p.status)||!Number.isInteger(p.dueTurn)||p.dueTurn<1||p.dueTurn>8||dateTurn(p.date)!==p.dueTurn)throw new RuleError('承诺日期或对象字段错误。');
 if(new Set(value.transactions.map(t=>t.id)).size!==value.transactions.length)throw new RuleError('事务标识重复。');
 if(value.sealed&&value.ending?.id!=='F00')throw new RuleError('封卷存档缺少阶段报告。');
 // Construct a clean allowlisted state rather than importing arbitrary properties (including credentials).
 validateCrossRelations(value);validateBridges(value);validateExtensions(value);validateIncense(value);validateMemoryControl(value);validateReactionRequests(value);validateLife(value);
 if(weekly){validateContinuation(value,validateSave);validateWeekly(value);}
 const keys=Object.keys(weekly?createWeeklyGame():createGame());const clean={};for(const k of keys){if(k==='sceneDates'&&!Object.hasOwn(value,k)){clean[k]={};continue;}if(!Object.hasOwn(value,k))throw new RuleError(`存档缺少字段：${k}`);clean[k]=clone(value[k]);}if(Object.hasOwn(value,'incenseCase'))clean.incenseCase=clone(value.incenseCase);if(Object.hasOwn(value,'memoryControl'))clean.memoryControl=clone(value.memoryControl);if(Object.hasOwn(value,'extensionRoutes'))clean.extensionRoutes=clone(value.extensionRoutes);if(Object.hasOwn(value,'crossRelations'))clean.crossRelations=clone(value.crossRelations);return clean;
}

function draftFamilyPending(s){const f=s.weekly.continuation.family;return f.discussions.some(d=>d.status==='pending')||f.conception&&!f.child&&ordinal(f.conception.dueDate)<=horizonDay(s);}
