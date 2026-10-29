import {isExtensionActor,extensionActivitySuppressed} from './extension-activities.js';
import {extensionRelation,extensionWork} from './extension-routes.js';
import {EXTENSION_PEOPLE} from './extension-content.js';
import {ordinal,addDays,stamp,unstamp} from './calendar.js';
import {RuleError} from './rules.js';
import {memorySuppressed} from './memory-book.js';
const cp=x=>structuredClone(x);
export function extensionInvitationAllowed(s,cid){const r=extensionRelation(s,cid);return !!r&&!r.unresolvedGift&&![r.playerIntent,r.npcIntent].some(x=>['暂缓','终止恋爱'].includes(x));}
export function recordExtensionInitiatives(s,cid,source,tx){
 if(!isExtensionActor(cid)||!s.weekly?.relationships||ordinal(s.date)>713)return;
 const f=s.facts.find(f=>f.id===source&&f.visibleTo.includes(cid));if(!f||memorySuppressed(s,'fact',source))return;
 for(const n of [1,2]){const id=`IN-${cid}-${n}`,b=s.weekly.relationships;if(b.messages.some(m=>m.id===id)||n===2&&!extensionInvitationAllowed(s,cid))continue;b.messages.push({id,actor:cid,kind:n===1?'note':'invite',source,sourceDate:cp(s.date),createdTransaction:tx,date:addDays(s.date,n),status:'pending',text:null});}
}
export function syncExtensionInvitations(s,tx){for(const m of s.weekly?.relationships?.messages||[]){if(isExtensionActor(m.actor)&&m.kind==='invite'&&['pending','read'].includes(m.status)&&!extensionInvitationAllowed(s,m.actor)){m.status='declined';m.reason='尊重当下边界，未接受不记失约';m.resolvedAt=cp(s.date);m.resolvedTransaction=tx;}}}
function candidateWindow(s,cid,createPlan,tx){
 for(const w of s.weekly.weeks.filter(w=>w.status!=='ended'))for(let at=Math.max(s.weekly.clock,stamp(w.start,'day'));at<=stamp(w.end,'evening');at++){
  const x=unstamp(at);try{createPlan(cp(s),{type:'week-plan',actor:cid,kind:'chat',date:x.date,period:x.period,status:'accepted'},tx);return x;}catch{}
 }return null;
}
function material(s,m,window){
 const who=EXTENSION_PEOPLE[m.actor],fact=s.facts.find(f=>f.id===m.source),e=s.weekly.activities?.entries.find(e=>e.id===m.source),node=s.transcripts[fact?.source],title=e?.title||node?.title||'那次相谈';
 let text=`${m.sourceDate.month}月${m.sourceDate.day}日「${title}」之后，${who.name}捎来一张笺。\n\n`;
 if(m.actor==='C09')text+=m.kind==='note'?'“那一处转折又读了一遍，臣妾把重音往前挪了。意思未必就同皇上一样，却想让皇上知道，自己的答案也还在变。”\n她写的是这次真正相谈之后的新读法，没有附上一份必须回应的约定。':'“上回没有说成同一种意思，臣妾倒还想再听听。若愿意，再来坐一会儿；不愿也不必借赏物作答。”\n她请的是一次可以拒绝的相谈，没有让你承诺私情。';
 else text+=m.kind==='note'?'“今日那盆菊终于开了一朵。茶也试着泡淡些，想起上回坐着说话，便记了这两件小事。”\n她没有附上新差事，也没有替尚欠回执的账写下结论。':'“下回想留一杯不带账目的茶。喝完还想去看自己的花，不是请皇上再分一项差事。”\n她邀请一段友好的小坐，自己也有散后要去的地方。';
 if(m.actor==='C10'&&extensionWork(s))text+='\n\n那页份例仍依原簿复核，正式回执未至；短笺没有将待核改成已经查清。';
 if(m.kind==='invite')text+='\n\n'+(window?`可以先商量${window.date.year}年${window.date.month}月${window.date.day}日${window.period==='day'?'日间':'晚间'}，在${who.place}相谈。应下后会占一格。`:'这周已经排满，可以先读信，下周再约。');
 const r=extensionRelation(s,m.actor);if([r.playerIntent,r.npcIntent].includes('仅合作'))text+='\n\n往来照已经说清的合作分寸，不借这张笺另许私情。';
 return text;
}
export function applyExtensionInitiative(s,a,tx,{createPlan}){
 const b=s.weekly.relationships,m=b.messages.find(x=>x.id===a.messageId&&x.actor===a.actor),res=(label,detail,dialogue)=>({label,detail,...(dialogue?{dialogue}:{}),actor:a.actor,actionCost:0,treasury:0});
 if(!m||ordinal(m.date)>ordinal(s.date)||!['relationship-message','relationship-invite','relationship-decline'].includes(a.type))throw new RuleError('此人的主动消息尚未到达，或没有这项操作。');
 const read=()=>{if(m.text)return;if(extensionActivitySuppressed(s,m.source))throw new RuleError('这张笺的来源已停止检索，请先在记忆簿核对。');m.suggested=m.kind==='invite'?candidateWindow(s,m.actor,createPlan,tx):null;m.text=material(s,m,m.suggested);m.readAt=cp(s.date);m.readTransaction=tx;m.status='read';s.facts.push({id:'INITIATIVE_'+m.id,text:m.text,date:cp(s.date),turn:s.turn,source:m.source,visibleTo:['C01',m.actor]});};
 if(a.type==='relationship-message'){if(m.status==='declined'&&!m.text)throw new RuleError('这份未读邀约已谢过。');read();return res(EXTENSION_PEOPLE[a.actor].name+'捎来的话',m.text,m.text);}
 if(m.kind!=='invite'||!['pending','read'].includes(m.status))throw new RuleError('没有这份尚待答复的邀约。');
 if(a.type==='relationship-decline'){m.status='declined';m.resolvedAt=cp(s.date);m.resolvedTransaction=tx;return res('这次先谢过','没有接受便不是承诺，不记失约，不减少关系与待遇。');}
 if(!extensionInvitationAllowed(s,a.actor))throw new RuleError('先尊重当前答复，不能借旧邀约绕过边界。');
 if(a.kind&&!['chat','meet'].includes(a.kind))throw new RuleError('这份笺只商量交谈与小坐，其他活动须另问。');
 read();const result=createPlan(s,{type:'week-plan',kind:a.kind||'chat',actor:a.actor,date:a.date,period:a.period,status:'accepted',topic:a.topic||'shared',choice:a.choice||'listen'},tx),p=s.weekly.plans.at(-1);m.status='accepted';m.planId=p.id;m.resolvedAt=cp(s.date);m.resolvedTransaction=tx;p.socialInviteId=m.id;p.expectationText=a.actor==='C09'?'“时辰说定了，那半句想留到相见时再讲。”':'“这盏茶的时辰记下了，不另夹一份差事。”';return {...result,actor:a.actor,invitationText:m.text,detail:result.detail+' 读笺没有占格，此时接受才预留；履约、改期和取消沿这份原约办理。'};
}
export function validateExtensionInitiatives(s){
 const b=s.weekly.relationships,fail=()=>{throw new RuleError('扩展来信缺少本人前事、实际事务或原文。');};
 for(const m of b.messages.filter(m=>isExtensionActor(m.actor))){
  const f=s.facts.find(f=>f.id===m.source),e=s.weekly.activities?.entries.find(e=>e.id===m.source),node=s.transcripts[f?.source],tx=s.transactions.find(t=>t.id===m.createdTransaction);
  if(!tx||!f||ordinal(f.date)!==ordinal(m.sourceDate)||ordinal(tx.date)!==ordinal(m.sourceDate)||!f.visibleTo.includes(m.actor))fail();
  if(e){const p=s.weekly.plans.find(p=>p.id===e.source);if(e.actor!==m.actor||!['chat','meet','walk'].includes(e.kind)||p?.completedTransaction!==tx.id)fail();}
  else if(!node||node.actor!==m.actor||!node.eventId.startsWith('XR')||node.transactionId!==tx.id)fail();
  if(m.kind!==(m.id.endsWith('-1')?'note':'invite')||ordinal(m.date)-ordinal(m.sourceDate)!==(m.kind==='note'?1:2))fail();
  if(m.text){const read=s.transactions.find(t=>t.id===m.readTransaction),f=s.facts.find(f=>f.id==='INITIATIVE_'+m.id);if(!read||!read.actions.some(a=>['relationship-message','relationship-invite'].includes(a.type)&&a.actor===m.actor&&a.messageId===m.id)||ordinal(read.date)!==ordinal(m.readAt)||!read.results.some(r=>r.dialogue===m.text||r.invitationText===m.text)||!f||f.text!==m.text||JSON.stringify(f.visibleTo)!==JSON.stringify(['C01',m.actor])||ordinal(f.date)!==ordinal(m.readAt))fail();}
  else if(m.readAt||m.readTransaction||m.status==='read'||m.status==='accepted')fail();
  if(m.status==='accepted'){const p=s.weekly.plans.find(p=>p.id===m.planId),tx=s.transactions.find(t=>t.id===m.resolvedTransaction);if(!p||!tx||p.createdTransaction!==tx.id||!tx.actions.some(a=>a.type==='relationship-invite'&&a.messageId===m.id&&a.actor===m.actor))fail();}
 }
}
