import {RuleError} from './rules.js';

// Limits apply to a disposable model context, never to the saved source text.
export const AI_CONTEXT_LIMIT=40000;
export const AI_WIRE_LIMIT=44000;
const copy=x=>structuredClone(x);
const size=x=>JSON.stringify(x).length;
const important=/不|未|别|拒绝|暂缓|取消|仅合作|只谈公事|分歧|不同意|担心|尚待|待核|没|不能|不要|[？?]/;
const pick=(x,keys)=>Object.fromEntries(keys.filter(k=>x[k]!==undefined).map(k=>[k,copy(x[k])]));
export function contextSources(ctx){
 const refs=[...ctx.facts.map(f=>({kind:'fact',id:f.id})),...ctx.memories.map(m=>({kind:'preference',id:m.id})),...ctx.dialogue.map(m=>({kind:'message',id:m.id})),...ctx.conversationMemory.personal.flatMap(m=>m.sourceRefs),...ctx.conversationMemory.summaries.flatMap(m=>m.sourceRefs)];
 return [...new Map(refs.map(r=>[r.kind+':'+r.id,{kind:r.kind,id:r.id}])).values()];
}
const memoryKeys=['id','layer','actor','kind','text','date','fromDate','visibleTo','sourceRefs','status','epistemic','origin','sourceMessageId','corrects','supersededBy','planStatus','scheduledDate','fulfilledDate','fulfilled','open'];
function memory(x){return pick(x,memoryKeys);}
function summary(x){
 // The atoms already contain the sourced excerpts. Do not send a second copy
 // of the same prose in `text`, or the player's private correction notes.
 return {...pick(x,memoryKeys.filter(k=>k!=='text')),atoms:x.atoms.map(a=>pick(a,['sourceId','role','date','text','kind']))};
}
function terms(input,event){
 const text=(input+' '+(event?.title||'')).normalize('NFKC').replace(/你还记得|还记得|你记得|我们|你们|之前|以前|说过|谈过|怎么|如何|这件事|那件事|这些|那些/g,' ');
 const found=new Set();
 for(const word of text.match(/[\p{Script=Han}]{2,}|[A-Za-z_][A-Za-z_\d-]{2,}/gu)||[]){
  if(/^[A-Za-z_]/.test(word))found.add(word.toLowerCase());
  else for(let i=0;i<word.length-1;i++)found.add(word.slice(i,i+2));
 }
 return [...found];
}
function compactPromise(p){return pick(p,['id','actor','guests','kind','purpose','label','status','date','period','eventId','slots','money','visibleTo','legacyPromiseId']);}

export function fitAIContext(context,{kind='chat',input='',maxChars=AI_CONTEXT_LIMIT,measure=c=>size({kind,context:c,input})}={}){
 const original=context.conversationMemory||{version:1,personal:[],summaries:[],rules:[]};
 const source={facts:context.facts||[],memories:context.memories||[],dialogue:context.dialogue||[],personal:original.personal||[],summaries:original.summaries||[]};
 const mandatory=copy(context.mandatory);
 mandatory.promises=(mandatory.promises||[]).map(compactPromise);
 mandatory.rules=[...new Set([...(mandatory.rules||[]),'未纳入的旧话视为未知；摘记只证明说过，不能据省略推定同意、和好或已履约'])];
 const out={...pick(context,['worldVersion','date','actorId','actorName','persona','location','availability','event','reaction','actionCatalog']),mandatory,facts:[],memories:[],dialogue:[],conversationMemory:{...pick(original,['version','method','rules']),personal:[],summaries:[],summaryCount:original.summaryCount??source.summaries.length,omittedSummaryCount:0},contextBudget:{version:1,maxChars,requestChars:0,omitted:{facts:0,memories:0,dialogue:0,personal:0,summaries:0},method:'当前约束及场景来源优先，按本次话题检索完整摘记，再取近期记录；历史原文保持'}};
 const current=context.event?.id;
 const isCurrent=f=>current&&(f.id==='FACT_'+current||f.id.startsWith('FACT_'+current+'@')||f.source===current||f.source?.startsWith(current+'@'));
 out.facts=source.facts.filter(isCurrent).map(copy);
 // A core larger than the budget is not made safe by removing a boundary,
 // pending promise, exact candidate, current outcome, or its source evidence.
 const ceiling=maxChars-160;
 if(measure(out)>ceiling)throw new RuleError('本次必须保留的场景、边界或约定较多，暂用固定文本；可在旧事簿核对原文后再分段询问。');
 const needles=terms(input,context.event),relevance=text=>needles.reduce((n,t)=>n+(text.toLowerCase().includes(t)?1:0),0);
 const limits={facts:30+out.facts.length,memories:12,dialogue:16,personal:24,summaries:15};
 const arrays={facts:out.facts,memories:out.memories,dialogue:out.dialogue,personal:out.conversationMemory.personal,summaries:out.conversationMemory.summaries};
 const candidates=[];
 for(const [type,rows]of Object.entries(source)){
  const list=rows.map((row,index)=>{
   const x=type==='summaries'?summary(row):type==='personal'?memory(row):copy(row);
   const text=type==='summaries'?x.atoms.map(a=>a.text).join('\n'):x.text||'';
   const base=type==='memories'?140:type==='dialogue'?100:type==='personal'?(row.open||row.locked?150:70):type==='summaries'?(important.test(text)?110:10):20;
   return{type,index,item:x,score:relevance(text)*160+base+index/Math.max(1,rows.length)*20};
  }).sort((a,b)=>b.score-a.score||b.index-a.index).slice(0,limits[type]*2);
  candidates.push(...list);
 }
 candidates.sort((a,b)=>b.score-a.score||b.index-a.index);
 const factMap=new Map(source.facts.map(f=>[f.id,f]));
 for(const c of candidates){
  const list=arrays[c.type];if(list.length>=limits[c.type]||list.some(x=>x.id===c.item.id))continue;
  // A personal experience carries its visible world source in the same bundle.
  const extra=c.type==='personal'?(c.item.sourceRefs||[]).filter(r=>r.kind==='fact'&&!out.facts.some(f=>f.id===r.id)).map(r=>factMap.get(r.id)).filter(Boolean):[];
  list.push(c.item);out.facts.push(...extra.map(copy));
  if(measure(out)>ceiling){list.pop();if(extra.length)out.facts.splice(-extra.length);}
 }
 // Recent dialogue and excerpt groups remain in their actual source order.
 for(const type of ['dialogue','summaries']){const order=new Map(source[type].map((x,i)=>[x.id,i]));arrays[type].sort((a,b)=>order.get(a.id)-order.get(b.id));}
 for(const type of Object.keys(source))out.contextBudget.omitted[type]=(context.contextBudget?.omitted?.[type]||0)+Math.max(0,source[type].length-arrays[type].length);
 out.conversationMemory.omittedSummaryCount=Math.max(0,out.conversationMemory.summaryCount-out.conversationMemory.summaries.length);
 for(let i=0;i<3;i++)out.contextBudget.requestChars=measure(out);
 if(measure(out)>maxChars)throw new RuleError('本次对话材料超过安全长度，请使用固定选项或分段询问。');
 return out;
}
