import{factorJSON,unfactorJSON}from'./continuation-codec.js';
import {encodeSlot,decodeSlot,readSlot} from './storage-codec.js';
import {validateSave} from './engine.js';
import {hash,RuleError} from './rules.js';
import {installContinuation} from './longform.js';
import {parseImport,exclusive} from './storage.js';
const valid=id=>typeof id==='string'&&/^[a-f0-9]{64}$/.test(id),receiptKey=id=>'changyong-continuation-receipt-'+id,sourceKey=id=>'changyong-continuation-source-'+id;
export const continuationURL=id=>`?world=weekly&continuation=${id}`;
export function continuationPrefix(id){if(!valid(id))throw new RuleError('接续副本标识错误。');return'changyong-continuation-'+id;}
const keys=id=>['auto','previous','import-backup',...Array.from({length:5},(_,i)=>'manual-'+i)].map(k=>continuationPrefix(id)+'-'+k);
async function digest(raw){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw))),b=>b.toString(16).padStart(2,'0')).join('');}
export function continuationReceipt(id,storage=localStorage){if(!valid(id))return null;try{const r=JSON.parse(storage.getItem(receiptKey(id))||'null');return r?.format==='changyong-continuation-receipt'&&r.copyId===id&&r.status==='ready'?r:null;}catch{return null;}}
export function continuationCopies(storage=localStorage){const rows=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k?.startsWith('changyong-continuation-receipt-')){const r=continuationReceipt(k.slice('changyong-continuation-receipt-'.length),storage);if(r)rows.push(r);}}return rows;}
export async function prepareContinuation(raw,{key=null,storage=localStorage}={}){
 if(key&&readSlot(storage,key)!==raw)throw new RuleError('原槽已变化，请重新读取。','CONFLICT');
 const source=parseImport(raw),copyId=await digest(raw),target=validateSave(installContinuation(source,copyId));
 return{format:'changyong-continuation-plan',copyId,key,sourceRaw:raw,target,planHash:hash({raw,key,target})};
}
function publish(copyId,raw,records,storage){
 const prior=continuationReceipt(copyId,storage),existing=readSlot(storage,sourceKey(copyId));
 if(existing!==null&&existing!==raw)throw new RuleError('接续原JSON冲突，未覆盖。');
 if(prior){if(existing===null)storage.setItem(sourceKey(copyId),parseImport(raw).weekly?.continuation?encodeSlot(raw):raw);return{receipt:prior,duplicate:true,url:continuationURL(copyId)};}
 if(keys(copyId).some(k=>storage.getItem(k)!==null))throw new RuleError('接续副本有未完成的暂存槽，请先保全原始记录，未覆盖。');
 const written=[];try{if(existing===null)storage.setItem(sourceKey(copyId),parseImport(raw).weekly?.continuation?encodeSlot(raw):raw);for(const r of records)if(r.raw!==null){storage.setItem(r.key,encodeSlot(r.raw));written.push(r.key);}const receipt={format:'changyong-continuation-receipt',version:1,copyId,status:'ready',sourceDigest:copyId,sourceRawHash:hash(raw),volume:records.find(r=>r.key.endsWith('-auto')&&r.raw)&&JSON.parse(records.find(r=>r.key.endsWith('-auto')&&r.raw).raw).state.weekly.continuation.volume||3,createdAt:new Date().toISOString()};storage.setItem(receiptKey(copyId),JSON.stringify(receipt));return{receipt,duplicate:false,url:continuationURL(copyId)};}catch{for(const k of written)try{storage.removeItem(k);}catch{}try{storage.removeItem(receiptKey(copyId));}catch{}throw new RuleError('接续保存未完成，源槽未改；原JSON备份保留，可检查存储空间后重试。','STORAGE');}
}
export async function commitContinuation(plan,storage=localStorage){
 if(plan?.format!=='changyong-continuation-plan'||plan.planHash!==hash({raw:plan.sourceRaw,key:plan.key,target:plan.target})||await digest(plan.sourceRaw)!==plan.copyId)throw new RuleError('接续预览已变化，请重新核对。');
 const clean=validateSave(plan.target),expected=validateSave(installContinuation(parseImport(plan.sourceRaw),plan.copyId));if(hash(clean)!==hash(expected))throw new RuleError('接续副本与原稿不一致，未写入。');
 return exclusive(()=>{if(plan.key&&readSlot(storage,plan.key)!==plan.sourceRaw)throw new RuleError('另一窗口更新了原档，未覆盖。','CONFLICT');const env={format:'changyong-save',writeId:crypto.randomUUID(),savedAt:new Date().toISOString(),state:clean};return publish(plan.copyId,plan.sourceRaw,[{key:keys(plan.copyId)[0],raw:JSON.stringify(env)}],storage);});
}
export function continuationOriginal(id,storage=localStorage){const r=continuationReceipt(id,storage),raw=readSlot(storage,sourceKey(id));if(!r||raw===null||hash(raw)!==r.sourceRawHash)throw new RuleError('此设备缺少有效接续原稿，请保全当前档并从完整接续包恢复。');return raw;}
export function exportContinuationBundle(id,storage=localStorage){return JSON.stringify({format:'changyong-continuation-bundle',bundleVersion:1,copyId:id,sourceRaw:continuationOriginal(id,storage),records:keys(id).map(key=>({key,raw:readSlot(storage,key)}))},null,2);}
export async function inspectContinuationBundle(raw){
 raw=await expandCompactBundle(raw);
 if(typeof raw!=='string'||raw.length>120_000_000)throw new RuleError('接续包过大或格式错误。');let b;try{b=JSON.parse(raw);}catch{throw new RuleError('接续包不是有效JSON。');}
 if(b.format!=='changyong-continuation-bundle'||b.bundleVersion!==1||!valid(b.copyId)||typeof b.sourceRaw!=='string'||await digest(b.sourceRaw)!==b.copyId||!Array.isArray(b.records)||b.records.length!==8||new Set(b.records.map(r=>r.key)).size!==8||b.records.some(r=>!keys(b.copyId).includes(r.key)||r.raw!==null&&typeof r.raw!=='string')||!b.records.find(r=>r.key===keys(b.copyId)[0])?.raw)throw new RuleError('接续包来源或八槽不完整，未写入。');
 const source=parseImport(b.sourceRaw);installContinuation(source,b.copyId);
 for(const r of b.records)if(r.raw){const s=parseImport(r.raw);if(s.weekly?.continuation?.copyId!==b.copyId||s.weekly.continuation.sourceHash!==hash(source))throw new RuleError('接续包副本与原稿不对应。');}
 return b;
}
export async function importContinuationBundle(raw,storage=localStorage){const b=await inspectContinuationBundle(raw);return exclusive(()=>publish(b.copyId,b.sourceRaw,b.records,storage));}

// Optional transport only. The existing ordinary bundle and its exact raw slots
// remain unchanged; decompression is bounded before any source/slot writes.
export async function compactContinuationBundle(raw){const bundle=await inspectContinuationBundle(raw);const pack=value=>{const parsed=JSON.parse(value);return JSON.stringify(parsed)===value?{kind:'json',value:parsed}:{kind:'text',value};};const expanded=JSON.stringify({...bundle,sourceRaw:pack(bundle.sourceRaw),records:bundle.records.map(r=>({...r,raw:r.raw===null?null:pack(r.raw)}))});raw=factorJSON(expanded);if(typeof CompressionStream!=='function')throw new RuleError('此环境暂不支持紧凑传送，请使用普通完整接续包。');const bytes=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return JSON.stringify({format:'changyong-continuation-gzip',bundleVersion:1,slotEncoding:'shared-json-v1',expandedChars:expanded.length,rawChars:raw.length,rawHash:hash(raw),data:btoa(binary)});}
export const exportCompactContinuationBundle=(id,storage=localStorage)=>compactContinuationBundle(exportContinuationBundle(id,storage));
async function expandCompactBundle(raw){if(typeof raw!=='string'||raw.length>120_000_000)return raw;let obj;try{obj=JSON.parse(raw);}catch{return raw;}if(obj?.format!=='changyong-continuation-gzip')return raw;try{if(obj.slotEncoding!==undefined&&!['changyong-storage-lz','shared-json-v1'].includes(obj.slotEncoding)||obj.bundleVersion!==1||!Number.isInteger(obj.rawChars)||obj.rawChars<1||obj.rawChars>120_000_000||typeof obj.rawHash!=='string'||typeof obj.data!=='string'||obj.data.length>20_000_000||!/^[A-Za-z0-9+/]*={0,2}$/.test(obj.data)||typeof DecompressionStream!=='function')throw Error('header');const binary=atob(obj.data),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0)),reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(),decoder=new TextDecoder('utf-8',{fatal:true}),parts=[];let chars=0;try{for(;;){const part=await reader.read();if(part.done)break;const text=decoder.decode(part.value,{stream:true});chars+=text.length;if(chars>obj.rawChars)throw Error('limit');parts.push(text);}const tail=decoder.decode();chars+=tail.length;parts.push(tail);}catch(e){await reader.cancel().catch(()=>{});throw e;}const text=parts.join('');if(chars!==obj.rawChars||hash(text)!==obj.rawHash)throw Error('checksum');if(obj.slotEncoding){if(obj.slotEncoding==='shared-json-v1'&&(!Number.isInteger(obj.expandedChars)||obj.expandedChars<1||obj.expandedChars>120_000_000))throw Error('expanded');const b=JSON.parse(obj.slotEncoding==='shared-json-v1'?unfactorJSON(text,obj.expandedChars):text);if(!b.sourceRaw||!Array.isArray(b.records)||b.records.length!==8)throw Error('slots');const unpack=v=>{if(obj.slotEncoding==='changyong-storage-lz')return decodeSlot(v);if(v?.kind==='json')return JSON.stringify(v.value);if(v?.kind==='text'&&typeof v.value==='string')return v.value;throw Error('raw');};b.sourceRaw=unpack(b.sourceRaw);b.records=b.records.map(r=>({...r,raw:r.raw===null?null:unpack(r.raw)}));return JSON.stringify(b);}return text;}catch{throw new RuleError('紧凑接续包不完整、超限或校验不符，原稿与八槽未覆盖。');}}
