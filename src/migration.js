import {createWeeklyGame,validateSave,hash,uid} from './engine.js';
import {EVENTS,TURNS,NAMES} from './content.js';
import {RuleError} from './rules.js';
import {legacyIncomeStart,legacyCarryCapacity} from './migration-policy.js';
import {ordinal,fromOrdinal,dateTurn,addDays,stamp,monthKey} from './calendar.js';
import {currentWeek,weekAt,syncWeek,weekCanMeet} from './week.js';
import {WEEK_EVENT_RULES} from './week-content.js';
import {exclusive,parseImport,storageForWorld} from './storage.js';
const clone=x=>structuredClone(x),isLegacy=s=>s.worldVersion==='changyong-v1.2-first-1'&&s.saveVersion===1;
const SOURCE_PREFIX='changyong-migration-source-',RECEIPT_PREFIX='changyong-migration-copy-';
export const validCopyId=id=>typeof id==='string'&&/^[a-f0-9]{64}$/.test(id);
export const copyPrefix=id=>{if(!validCopyId(id))throw new RuleError('迁移副本标识错误。');return 'changyong-week-copy-'+id;};
export const copyURL=id=>`?world=weekly&copy=${id}`;
export async function digestRaw(raw){const bytes=new TextEncoder().encode(raw);return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
export function migrationReceipt(id,storage=localStorage){if(!validCopyId(id))return null;try{const r=JSON.parse(storage.getItem(RECEIPT_PREFIX+id)||'null');return r?.format==='changyong-migration-receipt'&&r.copyId===id&&r.status==='ready'?r:null;}catch{return null;}}
export function listMigrationCopies(storage=localStorage){const out=[];for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key?.startsWith(RECEIPT_PREFIX)){const r=migrationReceipt(key.slice(RECEIPT_PREFIX.length),storage);if(r)out.push(r);}}return out.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
export function legacySources(storage=localStorage){const labels=[['changyong-v12-auto','当前季度自动档'],['changyong-v12-previous','上期季度备份'],['changyong-v12-import-backup','季度恢复前备份'],...Array.from({length:5},(_,i)=>['changyong-v12-manual-'+i,'季度手动档位'+(i+1)])];return labels.map(([key,label])=>{const raw=storage.getItem(key);if(!raw)return {key,label,empty:true};try{const state=parseImport(raw);if(!isLegacy(state))throw new RuleError('该记录不是季度旧档。');return {key,label,raw,state};}catch(error){return {key,label,raw,error:error.message};}});}
function assertLegacyCoherent(s){
 for(const p of s.promises)if(!['meet','letter','rest'].includes(p.purpose)||p.purpose==='rest'&&p.actor!=='C02')throw new RuleError('旧约活动类型或轮值休息对象不一致，未改写原档。');
 for(const t of TURNS.filter(t=>t.id<s.turn))for(const id of t.main)if(!s.events[id]?.completed)throw new RuleError(`旧档缺少已经跨过回合的主线「${id}」，无法无损接续；原文件保留。`);
 for(const [key,e] of Object.entries(s.events))if(!e.date||ordinal(e.date)>ordinal(s.date)||dateTurn(e.date)!==e.turn)throw new RuleError(`旧记录${key}日期超前或不一致，未改写原档。`);
 for(const q of s.queue)if(!s.events[q.source]?.completed||EVENTS[q.source]?.followup!==q.eventId)throw new RuleError('旧回访缺少实际执行来源，不能补造项目结果。');
}
function migrateState(source,copyId){
 assertLegacyCoherent(source);const target=createWeeklyGame({relationships:false});for(const [key,value] of Object.entries(source))if(!['saveVersion','worldVersion','remaining','closureRemaining','closureMode','gameId','revision'].includes(key))target[key]=clone(value);
 target.gameId='week-copy-'+copyId;target.revision=source.revision+1;target.closureRemaining=0;target.closureMode=false;target.weekly.clock=stamp(source.date);
 const m={version:1,copyId,sourceDigest:copyId,sourceHash:hash(source),source:clone(source),cutoverDate:clone(source.date),mode:source.sealed?'sealed':'continuing',firstIncomeMonth:legacyIncomeStart(source),carryWeekId:null,carryCapacity:0,eventWindows:{},aliases:{},knownActors:[],documentEvents:[],recoverableEventIds:[],deferredAdditions:[],legacyVisit:null};target.weekly.migration=m;
 for(const w of target.weekly.weeks)if(ordinal(w.end)<ordinal(source.date))w.status='ended';
 if(!source.sealed){
  let carry=currentWeek(target);if(!carry){const end=fromOrdinal(Math.min(ordinal(source.date)+6,source.turn*90,720));carry={id:'B-'+copyId.slice(0,12),start:clone(source.date),end,quarter:source.turn,type:'transition',status:'open'};target.weekly.weeks.push(carry);}
  m.carryWeekId=carry.id;m.carryCapacity=legacyCarryCapacity(source);if(m.carryCapacity>6)throw new RuleError('原余量和预约合计超过六格，需先核对旧档。');
  const overdue=TURNS[source.turn-1].main.filter(id=>!source.events[id]?.completed&&stamp({year:WEEK_EVENT_RULES[id].window.recommended[0],month:WEEK_EVENT_RULES[id].window.recommended[1],day:WEEK_EVENT_RULES[id].window.recommended[2]},WEEK_EVENT_RULES[id].period||'day')<stamp(source.date));
  overdue.forEach((id,i)=>{const d=fromOrdinal(Math.min(ordinal(source.date)+i,ordinal(carry.end)));m.eventWindows[id]={date:d,period:i?'evening':'day',reason:'旧版未完成主线，从迁移当日接续'};});
  for(const e of Object.values(EVENTS))if(!source.events[e.id]?.completed&&e.turn<=source.turn&&e.kind!=='main'&&e.kind!=='daily')m.recoverableEventIds.push(e.id);
  for(const e of Object.values(EVENTS))if(e.parent&&source.events[e.parent]?.completed&&!source.events[e.id]?.completed&&!target.deferred.includes(e.id)&&ordinal(source.events[e.parent].date)<ordinal(source.date)){target.deferred.push(e.id);m.deferredAdditions.push(e.id);}
  for(const [key,e] of Object.entries(source.events))if(e.completed&&e.turn===source.turn&&(EVENTS[e.id]?.kind==='daily'||e.id.startsWith('CHAT_')))m.aliases[`${e.id}@${carry.id}`]=key;
  if(source.turn===6){const baselineEnd=ordinal({year:2,month:4,day:9});m.legacyVisit={actor:'C03',start:clone(source.date),end:fromOrdinal(Math.min(source.turn*90,Math.max(ordinal(source.date)+2,baselineEnd))),reason:'承接旧版当前在京状态，之后按外任通信安排'};}
  m.documentEvents=['G04','G05'].filter(id=>!source.events[id]?.completed&&EVENTS[id].turn<=source.turn);
 }
 const known=new Set(['C02','C06','C07']);for(const item of [...Object.values(source.transcripts),...source.messages,...source.memories,...source.promises])if(NAMES[item.actor])known.add(item.actor);for(const f of source.facts)for(const actor of f.visibleTo)if(actor!=='C01'&&NAMES[actor]&&actor!=='public')known.add(actor);m.knownActors=[...known].sort();
 target.promises=[];target.queue=source.sealed?[]:source.queue.filter(q=>!source.events[q.eventId]?.completed).map(q=>{const days=q.eventId==='G06'?21:7,d=fromOrdinal(Math.max(ordinal(source.date),ordinal(source.events[q.source].date)+days));return {...clone(q),legacyDueTurn:q.dueTurn,dueDate:d,dueTurn:dateTurn(d),minimumDays:days};});
 for(const p of source.promises.filter(p=>p.status==='accepted'&&!source.sealed)){
  const w=weekAt(target,p.date),inRange=ordinal(p.date)>=ordinal(source.date)&&ordinal(p.date)<=720;let period='day';if(target.weekly.plans.some(x=>x.status==='accepted'&&ordinal(x.date)===ordinal(p.date)&&x.period==='day'))period='evening';
  const valid=inRange&&w&&(p.purpose!=='meet'||weekCanMeet(target,p.actor,p.date,{promised:p.actor==='C05'}))&&!target.weekly.plans.some(x=>x.status==='accepted'&&ordinal(x.date)===ordinal(p.date)&&x.period===period);
  target.weekly.plans.push({id:p.id,kind:p.purpose==='letter'?'letter':p.purpose==='rest'?'rest':'meet',actor:p.actor,label:`${NAMES[p.actor]} · 旧约${p.purpose==='letter'?'回信':p.purpose==='rest'?'轮值休息':'会面'}`,date:clone(p.date),period,slots:1,money:0,guests:[],eventId:null,costGroup:'LEGACY-PROMISE-'+p.id,weekId:valid?w.id:null,status:valid?'accepted':'needs-reschedule',createdTransaction:p.sourceTransaction||'legacy',history:[],purpose:p.purpose,dueTurn:p.dueTurn,visibleTo:clone(p.visibleTo||['C01',p.actor]),legacyPromiseId:p.id,carryHoldWeekId:!valid&&p.dueTurn===source.turn?m.carryWeekId:null,reviewReason:valid?null:!inRange?'原约期已过或超出首版':!w?'原日期没有可操作周':'人物当日不在或时段已满'});
 }
 syncWeek(target);return validateSave(target);
}
export async function prepareMigration(raw,{sourceKey=null,label='季度旧档',storage=localStorage}={}){
 if(sourceKey&&!legacySources(storage).some(s=>s.key===sourceKey&&s.raw===raw))throw new RuleError('原槽位已经变化，请重新读取。','CONFLICT');
 const source=parseImport(raw);if(!isLegacy(source))throw new RuleError('请选择季度旧档；已迁移副本通过迁移包或副本内单档恢复。');
 const copyId=await digestRaw(raw),target=migrateState(source,copyId),m=target.weekly.migration;
 const preserved=['stats','events','transcripts','ledger','turnReports','transactions','relations','memories','messages','facts','flags','ending',...(source.incenseCase?['incenseCase']:[]),...(source.memoryControl?['memoryControl']:[]),...(source.extensionRoutes?['extensionRoutes']:[]),...(source.crossRelations?['crossRelations']:[])].map(key=>({key,equal:hash(source[key])===hash(target[key])}));if(preserved.some(x=>!x.equal))throw new RuleError('历史映射校验失败，迁移未写入。');
 const report={copyId,label,date:clone(source.date),sealed:source.sealed,treasuryBefore:source.stats.treasury,treasuryAfter:target.stats.treasury,carryCapacity:m.carryCapacity,available:target.remaining,firstIncomeMonth:m.firstIncomeMonth,overdueMain:m.eventWindows,deferredRelations:m.deferredAdditions.filter(id=>EVENTS[id].kind==='relation'),promises:target.weekly.plans.map(p=>({id:p.id,actor:p.actor,date:p.date,status:p.status,period:p.period,reason:p.reviewReason})),pendingReports:target.queue.map(q=>({eventId:q.eventId,date:q.dueDate,legacyDueTurn:q.legacyDueTurn})),preserved};
 const plan={format:'changyong-migration-plan',version:1,copyId,sourceKey,label,sourceRaw:raw,target,report};plan.planHash=hash({raw,target,sourceKey});return plan;
}
function profileKeys(id){const p=copyPrefix(id);return [p+'-auto',p+'-previous',p+'-import-backup',...Array.from({length:5},(_,i)=>p+'-manual-'+i)];}
export function readMigrationOriginal(id,storage=localStorage){const receipt=migrationReceipt(id,storage);if(!receipt)throw new RuleError('迁移登记不存在。');const raw=storage.getItem(SOURCE_PREFIX+receipt.sourceDigest);if(raw===null)throw new RuleError('此设备缺少原JSON备份，请从保存的迁移包恢复。');if(hash(raw)!==receipt.sourceRawHash)throw new RuleError('原JSON备份校验不一致，请保留现有记录并从迁移包恢复。');return raw;}
function publishCopy({copyId,sourceRaw,records,report,label},storage){
 const sourceKey=SOURCE_PREFIX+copyId,receiptKey=RECEIPT_PREFIX+copyId,existing=migrationReceipt(copyId,storage);if(existing){const kept=storage.getItem(sourceKey);if(kept!==null&&kept!==sourceRaw)throw new RuleError('原JSON备份校验冲突，未覆盖。');if(kept===null)storage.setItem(sourceKey,sourceRaw);return {receipt:existing,duplicate:true,url:copyURL(copyId)};}
 const sourcePrior=storage.getItem(sourceKey);if(sourcePrior!==null&&sourcePrior!==sourceRaw)throw new RuleError('原JSON备份标识冲突，已停止覆盖。');
 const allowed=profileKeys(copyId);if(records.some(r=>!allowed.includes(r.key)))throw new RuleError('迁移包包含未知槽位。');if(allowed.some(k=>storage.getItem(k)!==null))throw new RuleError('发现未完成迁移的暂存槽，原档保留；请导出检查，未覆盖暂存内容。');
 const written=[];try{if(sourcePrior===null)storage.setItem(sourceKey,sourceRaw);for(const r of records)if(r.raw!==null){storage.setItem(r.key,r.raw);written.push(r.key);}const receipt={format:'changyong-migration-receipt',status:'ready',version:1,copyId,sourceDigest:copyId,sourceRawHash:hash(sourceRaw),label,createdAt:new Date().toISOString(),report};storage.setItem(receiptKey,JSON.stringify(receipt));return {receipt,duplicate:false,url:copyURL(copyId)};}catch(error){for(const key of written){try{storage.removeItem(key);}catch{}}try{storage.removeItem(receiptKey);}catch{}throw new RuleError('迁移保存未完成，原槽位未改写；已写入的原JSON备份保留。请检查本机存储空间后重试。','STORAGE');}
}
export async function commitMigration(plan,storage=localStorage){
 if(plan?.format!=='changyong-migration-plan'||plan.planHash!==hash({raw:plan.sourceRaw,target:plan.target,sourceKey:plan.sourceKey})||await digestRaw(plan.sourceRaw)!==plan.copyId)throw new RuleError('迁移预览已变化，请重新核对。');
 validateSave(plan.target);return exclusive(()=>{if(plan.sourceKey&&storage.getItem(plan.sourceKey)!==plan.sourceRaw)throw new RuleError('另一窗口已更新原档，请重新读取后迁移。','CONFLICT');const envelope={format:'changyong-save',writeId:uid(),savedAt:new Date().toISOString(),state:plan.target};return publishCopy({copyId:plan.copyId,sourceRaw:plan.sourceRaw,records:[{key:copyPrefix(plan.copyId)+'-auto',raw:JSON.stringify(envelope)}],report:plan.report,label:plan.label},storage);});
}
export function exportMigrationBundle(copyId,storage=localStorage){const receipt=migrationReceipt(copyId,storage);if(!receipt)throw new RuleError('迁移副本未登记。');return JSON.stringify({format:'changyong-migration-bundle',bundleVersion:1,copyId,sourceRaw:readMigrationOriginal(copyId,storage),receipt,records:profileKeys(copyId).map(key=>({key,raw:storage.getItem(key)}))},null,2);}
export async function inspectMigrationBundle(raw,storage=localStorage){
 if(typeof raw!=='string'||raw.length>120_000_000)throw new RuleError('迁移包过大或格式错误。');let b;try{b=JSON.parse(raw);}catch{throw new RuleError('迁移包不是有效JSON。');}
 if(b.format!=='changyong-migration-bundle'||b.bundleVersion!==1||!validCopyId(b.copyId)||typeof b.sourceRaw!=='string'||await digestRaw(b.sourceRaw)!==b.copyId)throw new RuleError('迁移包的原JSON校验不一致，未写入。');
 const source=parseImport(b.sourceRaw);if(!isLegacy(source))throw new RuleError('迁移包原稿须为季度档。');const allowed=profileKeys(b.copyId);if(!Array.isArray(b.records)||b.records.length!==8||new Set(b.records.map(r=>r.key)).size!==8||b.records.some(r=>!allowed.includes(r.key)||r.raw!==null&&typeof r.raw!=='string'))throw new RuleError('迁移包槽位不完整或含未知键。');
 for(const r of b.records)if(r.raw!==null){const s=parseImport(r.raw);if(s.weekly?.migration?.copyId!==b.copyId||s.weekly.migration.sourceHash!==hash(source))throw new RuleError('副本与原JSON不对应，未写入。');}
 if(!b.records.find(r=>r.key===allowed[0])?.raw)throw new RuleError('迁移包缺少自动档。');
 const plan=await prepareMigration(b.sourceRaw,{storage,label:b.receipt?.label||'迁移包恢复'});const auto=parseImport(b.records.find(r=>r.key===allowed[0]).raw);return {bundle:b,report:plan.report,current:{date:auto.date,sealed:auto.sealed,treasury:auto.stats.treasury},nonempty:b.records.filter(r=>r.raw!==null).length};
}

export async function importMigrationBundle(raw,storage=localStorage){const checked=await inspectMigrationBundle(raw,storage);const b=checked.bundle;return exclusive(()=>publishCopy({copyId:b.copyId,sourceRaw:b.sourceRaw,records:b.records,report:checked.report,label:b.receipt?.label||'迁移包恢复'},storage));}
