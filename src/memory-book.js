import{NAMES}from'./content.js';
import{RuleError}from'./rules.js';
import{validDate,ordinal}from'./calendar.js';
const cp=x=>structuredClone(x),refs=(kind,id)=>[{kind,id}],target=r=>r.kind+':'+r.id;
export const memoryTarget=target;
export function memoryChanges(s,sourceRefs){const keys=new Set(sourceRefs.map(target));return(s.memoryControl?.changes||[]).filter(c=>keys.has(c.target));}
export function memorySuppressed(s,kind,id){const c=memoryChanges(s,refs(kind,id)).at(-1);return !!c&&c.kind!=='restore';}
export function preferenceActive(s,m){return !m.deleted&&!m.supersededBy&&!memorySuppressed(s,'preference',m.id)&&!memorySuppressed(s,'message',m.sourceMessageId);}
export function memoryMessages(s,cid){
 const inactive=s.memories.filter(m=>!preferenceActive(s,m)||m.actor===cid&&!m.visibleTo.includes(cid)&&!m.visibleTo.includes('public')),retired=new Set(inactive.map(m=>m.sourceMessageId)),retiredPreferences=new Set(inactive.map(m=>m.id));
 for(const m of s.messages)if(memorySuppressed(s,'message',m.id))retired.add(m.id);
 const needles=s.messages.filter(m=>retired.has(m.id)&&m.actor===cid&&m.text.length>0).map(m=>m.text);
 // Previously saved replies can quote a retired preference or source sentence.
 // Exclude those derived echoes as well, while keeping all historical text intact.
 const rows=[];for(const m of s.messages){if(m.actor!==cid||m.status==='draft'||Array.isArray(m.visibleTo)&&!m.visibleTo.includes(cid)&&!m.visibleTo.includes('public')){if(m.actor===cid)retired.add(m.id);continue;}if(retired.has(m.id))continue;
  if(m.role==='npc'&&m.memorySources?.some(r=>r.kind==='message'?retired.has(r.id):r.kind==='preference'?retiredPreferences.has(r.id):memorySuppressed(s,r.kind,r.id))){retired.add(m.id);if(m.text.length>0)needles.push(m.text);continue;}
  if(m.role==='npc'&&needles.some(text=>m.text.includes(text)&&(text.length>=6||['「'+text+'」','“'+text+'”','『'+text+'』','"'+text+'"',"'"+text+"'"].some(quote=>m.text.includes(quote))))){retired.add(m.id);if(m.text.length>0)needles.push(m.text);continue;}rows.push(m);
 }return rows;
}

function item(s,x){const changes=memoryChanges(s,x.sourceRefs),last=changes.at(-1);return{...x,changes:cp(changes),retrievable:!x.inactive&&(!last||last.kind==='restore'),status:last&&last.kind!=='restore'?(last.kind==='stop'?'已停止检索':'待复核'):x.status};}
function base(id,layer,text,date,visibleTo,sourceRefs,status,more={}){return{id,layer,text,date:date?cp(date):null,visibleTo:cp(visibleTo),sourceRefs,status,...more};}
const important=/不|未|别|拒绝|暂缓|取消|仅合作|只谈公事|分歧|不同意|担心|可是|但是|尚待|待核|没|不能|不要/;
const unresolved=/[?？]|吗|如何|为什么|何时|什么时候|尚待|待核|没说定|未决定|再商量/;
function excerpts(text){
 const parts=text.match(/[^。！？!?\n]+[。！？!?]?/g)||[text];
 const selected=parts.map((text,i)=>({text,i,important:important.test(text)||unresolved.test(text)}));
 const kept=selected.filter(p=>p.important),ordinary=selected.filter(p=>!p.important).slice(0,2);
 return [...kept,...ordinary].sort((a,b)=>a.i-b.i).map(p=>p.text).join(' ');
}
function promiseItems(s){if(!s.weekly)return s.promises;const mappedPlans=new Map();for(const p of s.weekly.plans)mappedPlans.set(p.legacyPromiseId||p.id,{...p,memorySourceId:p.legacyPromiseId||p.id});const plans=[...mappedPlans.values()],mapped=new Set(plans.map(p=>p.memorySourceId));return [...plans,...(s.weekly.migration?.source.promises||[]).filter(p=>!mapped.has(p.id)).map(p=>({...p,visibleTo:['C01',p.actor]}))];}

export function conversationSummaries(s,cid){
 const messages=memoryMessages(s,cid),older=messages.slice(0,-16),summaries=[];
 for(let i=0;i<older.length;i+=8){const group=older.slice(i,i+8),atoms=group.map(m=>({sourceId:m.id,role:m.role,date:m.date?cp(m.date):null,text:excerpts(m.text),kind:important.test(m.text)?'否定或分歧':unresolved.test(m.text)?'问题或未决表达':'谈话摘记'}));
  summaries.push(item(s,base('summary:'+cid+':'+group[0].id+':'+group.at(-1).id,'summary',atoms.map(a=>(a.role==='player'?'你说':a.role==='npc'?'对方说':'当时提示')+'：“'+a.text+'”').join('\n'),group.at(-1).date,['C01',cid],group.map(m=>({kind:'message',id:m.id})),'原话摘记',{actor:cid,fromDate:group[0].date?cp(group[0].date):null,atoms,epistemic:'仅证明说过，不证明其中声称的事实或承诺已履行'})));
 }return summaries;
}
export function memoryLayers(s,cid,facts){
 const world=facts.map(f=>item(s,base('fact:'+f.id,'world',f.text,f.date,f.visibleTo,refs('fact',f.id),f.epistemic?.kind==='heard-account'?'听过，未核实':f.epistemic?.kind==='past-life-lead'?'前世线索':f.epistemic?.kind==='action-record'?'处置记录':'本世记录',{actor:cid,epistemic:cp(f.epistemic||{kind:'world-record'}),origin:f.source||f.id})));
 const personal=[];
 for(const m of s.memories.filter(m=>m.actor===cid)){personal.push(item(s,base('preference:'+m.id,'personal',m.text,m.date,m.visibleTo,refs('preference',m.id),m.deleted?'已停止检索':m.supersededBy?'已被更正':'明确偏好',{actor:cid,kind:'preference',inactive:!preferenceActive(s,m),sourceMessageId:m.sourceMessageId,corrects:m.corrects||m.supersedes||[],supersededBy:m.supersededBy||null})));}
 const r=s.relations[cid];if(r?.boundary)personal.push(item(s,base('boundary:'+r.boundary.source,'personal','当前相处分寸：'+r.playerIntent,r.boundary.date,['C01',cid],refs('message',r.boundary.source),'当前意愿',{actor:cid,kind:'boundary',locked:true})));
 const allowedFacts=new Set(facts.filter(f=>!memorySuppressed(s,'fact',f.id)).map(f=>f.id));
 for(const[key,t]of Object.entries(s.transcripts)){if(t.actor!==cid||!s.events[key]?.completed||!allowedFacts.has('FACT_'+key))continue;personal.push(item(s,base('experience:'+key,'personal','在「'+t.title+'」中，你选了「'+t.choice+'」。'+(t.reward?'留下「'+t.reward.title+'」。':''),t.date,['C01',cid],[{kind:'experience',id:key},{kind:'fact',id:'FACT_'+key}],'实际经历',{actor:cid,kind:'experience',origin:key})));}
 for(const e of s.weekly?.activities?.entries||[]){if(!e.visibleTo.includes(cid)||!allowedFacts.has(e.id))continue;personal.push(item(s,base('activity:'+e.id,'personal',e.text,e.date,e.visibleTo,[{kind:'activity',id:e.id},{kind:'fact',id:e.id}],'实际片刻',{actor:cid,kind:'activity',title:e.title,origin:e.source})));}
 for(const h of s.weekly?.relationships?.history||[]){if(h.actor===cid&&h.kind==='stage')personal.push(item(s,base('stage:'+h.id,'personal',h.text,h.date,['C01',cid],refs('stage',h.id),'已确认阶段',{actor:cid,kind:'stage'})));}
 for(const i of s.weekly?.relationships?.issues||[]){if(i.actor===cid)personal.push(item(s,base('issue:'+i.id,'personal',i.text,i.date,['C01',cid],refs('issue',i.id),i.status==='open'?'待补谈':'已有处理记录',{actor:cid,kind:'issue',open:i.status==='open',locked:true})));}
 for(const p of promiseItems(s)){const readers=p.kind==='letter'&&p.deliveredAt?[...new Set([...(p.visibleTo||['C01']),p.actor])]:p.visibleTo||['C01',p.actor];if(cid==='C01'){if(!s.weekly||!readers.includes('C01')||readers.includes(p.actor))continue;}else if(p.actor!==cid&&!p.guests?.includes(cid)||s.weekly&&!readers.includes(cid))continue;const delivered=p.kind!=='letter'||!!p.deliveredAt,fulfilled=(p.status==='fulfilled'||p.status==='completed')&&delivered;
  personal.push(item(s,base('promise:'+(p.memorySourceId||p.id),'personal',('「'+(p.label||({meet:'相见',letter:'通信',rest:'轮值休息'}[p.purpose])||'原约')+'」：')+(fulfilled?'这份约定已有实际履行记录。':p.status==='completed'&&!delivered?'信已写成，仍待实际送达，不能记作对方已收到。':p.status==='cancelled'?'这份约定已取消，不算赴约。':p.status==='rescheduled'?'原时段已改期，另查新的约定。':p.status==='breached'?'原约确已失约，仍需补谈，不能说成已和好。':['candidate','draft'].includes(p.status)?'这只是候选或草稿，没有正式说定。':p.status==='needs-reschedule'?'原约仍待另行商量，没有接受新约。':'这份约定尚未履行，不算守诺。'),p.deliveredAt||p.fulfilledAt||p.date,readers,refs('promise',p.memorySourceId||p.id),fulfilled?'已履行':p.status==='cancelled'?'已取消':p.status==='rescheduled'?'已改期':p.status==='breached'?'失约待补谈':['candidate','draft'].includes(p.status)?'未说定':'尚未履行',{actor:p.actor,kind:'promise',planStatus:p.status,scheduledDate:cp(p.date),fulfilledDate:fulfilled?cp(p.deliveredAt||p.fulfilledAt||p.date):null,fulfilled,locked:!fulfilled})));
 }
 return{version:1,world,personal,summaries:conversationSummaries(s,cid)};
}
const contextEntry=x=>({...x,changes:x.changes.map(({id,target,kind,date})=>({id,target,kind,date}))});
export function memoryContext(layers,{all:includeAll=false}={}){
 const all=layers.summaries,selected=new Set(includeAll?all:[...all.slice(-3),...all.filter(x=>x.atoms.some(a=>a.kind!=='谈话摘记')).slice(-12)]);
 return{version:1,method:'程序按实际原文摘记，不由模型补写事实',personal:layers.personal.filter(x=>x.retrievable&&(x.visibleTo.includes(x.actor)||x.visibleTo.includes('public'))).slice(includeAll?0:-24).map(contextEntry),summaries:[...selected].filter(x=>x.retrievable).map(contextEntry),summaryCount:all.length,omittedSummaryCount:all.length-selected.size,rules:['摘要里的话只说明当时说过；不作本世事实、意愿或守诺凭据','否定、分歧、未决问题不自动改为同意、和好或已处理','更正与停止检索不重写历史原话、已发生事务和当前双方意愿']};
}
function knownTarget(s,t){const split=t.indexOf(':'),kind=t.slice(0,split),id=t.slice(split+1);if(!id)return false;return({message:()=>s.messages.some(x=>x.id===id),preference:()=>s.memories.some(x=>x.id===id),fact:()=>s.facts.some(x=>x.id===id),experience:()=>!!s.transcripts[id],activity:()=>s.weekly?.activities?.entries.some(x=>x.id===id),stage:()=>s.weekly?.relationships?.history.some(x=>x.id===id),issue:()=>s.weekly?.relationships?.issues.some(x=>x.id===id),promise:()=>promiseItems(s).some(x=>x.id===id||x.memorySourceId===id)})[kind]?.()||false;}
export function changeMemoryRecord(s,t,kind,note=''){
 if(!['stop','dispute','restore'].includes(kind)||typeof t!=='string'||!knownTarget(s,t)||typeof note!=='string'||note.length>300)throw new RuleError('记忆修订来源或范围不合法。');
 const n=cp(s);n.memoryControl??={version:1,changes:[]};if(n.memoryControl.changes.length>=20000)throw new RuleError('记忆修订记录已满，请先导出进度。');
 n.memoryControl.changes.push({id:crypto.randomUUID(),target:t,kind,note,date:cp(s.date),actor:'C01'});n.revision++;return n;
}
export function validateMemoryControl(s){
 if(!Object.hasOwn(s,'memoryControl'))return;
 const b=s.memoryControl;if(!b||b.version!==1||!Array.isArray(b.changes)||b.changes.length>20000||Object.keys(b).some(k=>!['version','changes'].includes(k)))throw new RuleError('记忆修订版本错误。');
 const ids=new Set();for(const c of b.changes){if(!c||typeof c.id!=='string'||ids.has(c.id)||typeof c.target!=='string'||!knownTarget(s,c.target)||!['stop','dispute','restore'].includes(c.kind)||typeof c.note!=='string'||c.note.length>300||c.actor!=='C01'||!validDate(c.date)||ordinal(c.date)>ordinal(s.date)||Object.keys(c).some(k=>!['id','target','kind','note','date','actor'].includes(k)))throw new RuleError('记忆修订记录错误。');ids.add(c.id);}
}
