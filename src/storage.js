import{SAVE_RAW_LIMIT}from'./storage-limits.js';
import {encodeSlot,decodeSlot} from './storage-codec.js';
import {createGame,validateSave,uid,RuleError} from './engine.js';
export const STORAGE_KEY='changyong-v12-auto';
const PREVIOUS='changyong-v12-previous';
const MANUAL='changyong-v12-manual-';
const BACKUP='changyong-v12-import-backup';
function writeSlot(storage,key,raw){try{storage.setItem(key,raw);}catch{throw new RuleError('浏览器存储已满或不可用；当前操作未保存。可先导出完整档案，再换一个空闲的浏览器来源继续。','STORAGE');}}
export function readEnvelope(storage=localStorage){const raw=storage.getItem(STORAGE_KEY);if(!raw)return null;let env;try{env=JSON.parse(raw);}catch{throw new RuleError('自动存档不是有效JSON；已停止自动覆盖，可先导出原始存档。');}if(typeof env.writeId!=='string')throw new RuleError('自动存档外层版本错误。');return {...env,state:validateSave(env.state)};}
export function saveEnvelope(state,expected,storage=localStorage,{force=false}={}){const priorRaw=storage.getItem(STORAGE_KEY);let prior;try{prior=priorRaw?JSON.parse(priorRaw):null;}catch{if(!force)throw new RuleError('原自动档损坏，未覆盖。');}
 if(!force&&(prior?.writeId||null)!==expected)throw new RuleError('另一标签页或窗口已更新存档。请先载入最新进度，当前操作未写入。','CONFLICT');
 const clean=validateSave(state);if(!force&&prior?.state&&(state.weekly?state.weekly.reports.length>(prior.state.weekly?.reports?.length||0):prior.state.turn!==state.turn))writeSlot(storage,PREVIOUS,priorRaw);
 const env={format:'changyong-save',writeId:uid(),savedAt:new Date().toISOString(),state:clean};
 writeSlot(storage,STORAGE_KEY,JSON.stringify(env));return env;
}
export async function exclusive(fn){if(globalThis.navigator?.locks)return navigator.locks.request('changyong-v12-write',async()=>fn());return fn();}
export function manualSlots(storage=localStorage){return Array.from({length:5},(_,i)=>{const raw=storage.getItem(MANUAL+i);if(raw===null)return null;try{const slot=JSON.parse(raw);return {...slot,state:validateSave(slot.state)};}catch{return {error:'记录损坏，原文已保留，可导出全部档案。'};}});}
export function saveManual(state,index,storage=localStorage){if(!Number.isInteger(index)||index<0||index>=5)throw new RuleError('存档槽位错误。');const slot={savedAt:new Date().toISOString(),state:validateSave(state)};writeSlot(storage,MANUAL+index,JSON.stringify(slot));return slot;}
export function loadManual(index,storage=localStorage){const raw=storage.getItem(MANUAL+index);if(!raw)throw new RuleError('该槽位尚无存档。');return validateSave(JSON.parse(raw).state);}
export function previousSave(storage=localStorage){const raw=storage.getItem(PREVIOUS);if(!raw)throw new RuleError('还没有上一回合自动档。');return validateSave(JSON.parse(raw).state);}
export function exportSave(state){return JSON.stringify({format:'changyong-save',exportedAt:new Date().toISOString(),state:validateSave(state)},null,2);}
export function exportArchive(storage=localStorage,origin=globalThis.location?.origin||'local'){
 const keys=[STORAGE_KEY,PREVIOUS,BACKUP,...Array.from({length:5},(_,i)=>MANUAL+i)];
 const records=keys.map(key=>({key,raw:storage.getItem(key)}));
 return JSON.stringify({format:'changyong-local-archive',archiveVersion:1,exportedAt:new Date().toISOString(),origin,records},null,2);
}
export function parseImport(raw){raw=decodeSlot(raw);if(typeof raw!=='string'||raw.length>SAVE_RAW_LIMIT)throw new RuleError('存档文件过大或格式错误。');let obj;try{obj=JSON.parse(raw);}catch{throw new RuleError('文件不是有效的JSON存档。');}return validateSave(obj.state||obj);}
export function backupBeforeRestore(storage=localStorage){const raw=storage.getItem(STORAGE_KEY);if(raw)writeSlot(storage,BACKUP,raw);}
export function importBackup(storage=localStorage){const raw=storage.getItem(BACKUP);if(!raw)throw new RuleError('暂无恢复前备份。');return validateSave(JSON.parse(raw).state);}

// Native weekly worlds and every S03 migration copy have separate slots.
export function storageForWorld(world='quarter',storage=globalThis.localStorage,copyId=null,continuationId=null){
 if(continuationId&&(!/^[a-f0-9]{64}$/.test(continuationId)||world!=='weekly'||copyId))throw new RuleError('接续副本标识错误。');
 if(copyId&&(!/^[a-f0-9]{64}$/.test(copyId)||world!=='weekly'))throw new RuleError('迁移副本标识错误。');
 const weekly=world==='weekly',prefix=continuationId?'changyong-continuation-'+continuationId:copyId?'changyong-week-copy-'+copyId:weekly?'changyong-week-s02':'changyong-v12';
 const mapped={getItem:key=>{const raw=storage.getItem(key.replace('changyong-v12',prefix));if(!continuationId)return raw;try{return decodeSlot(raw);}catch{return raw;}},setItem:(key,value)=>storage.setItem(key.replace('changyong-v12',prefix),continuationId?encodeSlot(value):value)};
 const guard=state=>{if(continuationId&&state.weekly?.continuation?.copyId!==continuationId||!continuationId&&state.weekly?.continuation)throw new RuleError('接续档须在对应独立副本恢复，未覆盖原槽。');if(copyId&&state.weekly?.migration?.copyId!==copyId)throw new RuleError('请选择此迁移副本对应的存档，未覆盖。');if(!copyId&&!continuationId&&state.weekly?.migration)throw new RuleError('此文件属于独立迁移副本，请从迁移管理继续或导入完整迁移包。');if((state.worldVersion==='changyong-week-s02-1')!==weekly)throw new RuleError('这是另一套时间规则的存档；可在S03迁移入口复制旧档，当前槽位不会跨规则覆盖。');return state;};
 return {STORAGE_KEY:prefix+'-auto',readEnvelope:()=>{if(continuationId){let r;try{r=JSON.parse(storage.getItem('changyong-continuation-receipt-'+continuationId)||'null');}catch{}if(r?.status!=='ready'||r.copyId!==continuationId)throw new RuleError('接续副本尚未登记完成，请返回接续管理。');}if(copyId){let r;try{r=JSON.parse(storage.getItem('changyong-migration-copy-'+copyId)||'null');}catch{}if(r?.status!=='ready'||r.copyId!==copyId)throw new RuleError('迁移副本尚未登记完成，请返回迁移管理。','MIGRATION_MISSING');}const e=readEnvelope(mapped);if(e)guard(e.state);return e;},saveEnvelope:(state,expected,_unused,options)=>saveEnvelope(guard(state),expected,mapped,options),manualSlots:()=>manualSlots(mapped),saveManual:(state,index)=>saveManual(guard(state),index,mapped),loadManual:index=>guard(loadManual(index,mapped)),previousSave:()=>guard(previousSave(mapped)),backupBeforeRestore:()=>backupBeforeRestore(mapped),importBackup:()=>guard(importBackup(mapped)),exportSave:state=>exportSave(guard(state)),parseImport:raw=>guard(parseImport(raw)),exportArchive:()=>{const out=JSON.parse(exportArchive(mapped));out.world=world;for(const r of out.records)r.key=r.key.replace('changyong-v12',prefix);return JSON.stringify(out,null,2);}};
}
