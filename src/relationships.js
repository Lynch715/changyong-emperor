import {EXTENSION_REPAIR} from './partner-life.js';
import {isFifth} from './volume5.js';
import {horizonDay} from './longform.js';
import {isExtensionActor} from './extension-activities.js';
import {recordExtensionInitiatives,applyExtensionInitiative,validateExtensionInitiatives} from './extension-initiatives.js';
import {initiativeStory} from './social-story.js';
import {RELATION_PROFILES,RELATION_STAGES,isBounded,NEGATIVE_INTENTS} from './relationship-content.js';
import {personPresence} from './relationship-schedule.js';
import {NAMES} from './content.js';
import {ordinal,addDays,validDate} from './calendar.js';
import {RuleError} from './rules.js';
const copy=x=>structuredClone(x),phase=x=>RELATION_STAGES.indexOf(x),day=s=>copy(s.date);
const row=s=>s.weekly?.relationships;
function fact(s,id,text,cid,source,publicFact=false){if(!s.facts.some(f=>f.id===id))s.facts.push({id,text,date:day(s),turn:s.turn,visibleTo:publicFact?['public']:['C01',cid],source});}
export function ensureRelationships(s,{fresh=false}={}){
 if(row(s))return row(s);
 if(fresh)for(const [cid,p] of Object.entries(RELATION_PROFILES))Object.assign(s.relations[cid],copy(p.initial));
 const b={version:1,origin:fresh?'new-game':'continued-save',cutover:day(s),cutoverRevision:s.revision,baseline:copy(s.relations),history:[],encounters:[],requests:[],messages:[],issues:[],agreements:[],rewarded:{},legacyPlanIds:s.weekly.plans.filter(p=>['accepted','executing','needs-reschedule'].includes(p.status)).map(p=>p.id)};
 s.weekly.relationships=b;return b;
}
export function relationshipRecord(s,cid){const b=row(s);return {history:b?.history.filter(x=>x.actor===cid)||[],encounters:b?.encounters.filter(x=>x.actor===cid)||[],requests:b?.requests.filter(x=>x.actor===cid)||[],messages:b?.messages.filter(x=>x.actor===cid)||[],issues:b?.issues.filter(x=>x.actor===cid&&x.status==='open')||[]};}
export function effectiveNode(s,id){if(!s.events[id]?.completed)return false;if((id==='R03-02'||s.events[id]?.channel==='letter')&&!s.weekly.migration?.source.events[id]?.completed)return s.weekly.notices.some(n=>n.source===id&&n.type==='delivery'&&n.status==='read');return true;}
function lastStage(s,cid,name=null){return row(s)?.history.filter(h=>h.actor===cid&&h.kind==='stage'&&(!name||h.to===name)).at(-1);}
export function relationshipRequirements(s,cid){
 const cfg=RELATION_PROFILES[cid],r=s.relations[cid];if(!cfg||!r)return {ready:false,reasons:['没有这条核心关系。']};
 const index=phase(r.stage)+1;if(index>4)return {ready:false,next:null,reasons:['已有相守记录，后续相处仍按当下意愿。']};
 const next=RELATION_STAGES[index],threshold=cfg.thresholds[index-1],rec=relationshipRecord(s,cid),reasons=[];
 const scores=['trust','intimacy','safety'];scores.forEach((k,i)=>{if(r[k]<threshold[i])reasons.push(`${{trust:'信任',intimacy:'亲密',safety:'安全感'}[k]}尚需${threshold[i]-r[k]}。`);});
 const nodes=cfg.nodes.slice(0,index===1?1:2);for(const id of nodes)if(!effectiveNode(s,id))reasons.push(id==='R03-02'&&s.events[id]?.completed?'边书仍待实际送达。':'先把本线尚未说完的相逢走完。');
 if(index>=2&&(r.playerIntent!=='愿发展'||r.npcIntent!=='愿发展'))reasons.push('这一步需要双方当前都愿发展。');
 if(rec.issues.length)reasons.push('先补谈那件尚未说明白的事。');
 const previous=lastStage(s,cid);if(previous&&ordinal(s.date)-ordinal(previous.date)<7)reasons.push('上一次说开的话，先一起过满七日再往下谈。');
 const heart=lastStage(s,cid,'倾心')||(phase(row(s)?.baseline[cid]?.stage)>=2?{date:row(s).cutover}:null),shared=heart?rec.encounters.filter(e=>ordinal(e.date)>ordinal(heart.date)):[];
 if(index>=3&&!shared.length)reasons.push('倾心之后还需一次真正赴约或送达的相处。');
 if(index===4&&(!heart||ordinal(s.date)-ordinal(heart.date)<14||new Set(shared.map(e=>ordinal(e.date))).size<2))reasons.push('相守之前，需倾心后相隔的两日相处，并走过至少十四日。');
 const pendingLetters=heart?s.weekly.plans.filter(p=>p.actor===cid&&p.kind==='letter'&&p.status==='completed'&&!p.deliveredAt&&ordinal(p.date)>ordinal(heart.date)):[];
 const temporal=reasons.every(x=>/七日|十四日|两日相处|倾心之后/.test(x));
 const needsOne=!!reasons.find(x=>x.includes('倾心之后')),needsTwo=index===4&&new Set(shared.map(e=>ordinal(e.date))).size<2;
 const potential=new Set([...shared.map(e=>ordinal(e.date)),...pendingLetters.map(p=>ordinal(addDays(p.date,7)))]).size;
 const remoteReady=!reasons.length||temporal&&(!needsOne||potential>=1)&&(!needsTwo||potential>=2);
 return {ready:!reasons.length,remoteReady,next,index,threshold,reasons:[...new Set(reasons)],nodes,shared:shared.map(e=>e.id)};
}
const due=(s,cid,days=1)=>addDays(s.date,cid==='C03'&&!personPresence(s,cid).available?Math.max(days,7):days);
function message(s,cid,num,source,sourceDate){const b=ensureRelationships(s),id=`IN-${cid}-${num}`;if(b.messages.some(m=>m.id===id)||ordinal(s.date)>713)return;const r=s.relations[cid];if(num===2&&(isBounded(r)||b.issues.some(i=>i.actor===cid&&i.status==='open')))return;b.messages.push({id,actor:cid,kind:num===1?'note':'invite',source,sourceDate:copy(sourceDate),date:due(s,cid,num===1?1:2),status:'pending',text:null});}
export function recordRelationshipEvent(s,e,choice,tx){if(isExtensionActor(e.actor)&&e.kind==='extension'){recordExtensionInitiatives(s,e.actor,'FACT_'+e.id,tx);return;}if(!RELATION_PROFILES[e.actor]||e.kind!=='relation')return;const b=ensureRelationships(s);if(e.id==='R03-02'||e.remoteRelation){if(ordinal(s.date)<=horizonDay(s)-14)b.requests.push({id:`NODE-REPLY-${tx}`,actor:e.actor,kind:'node-reply',sourceNode:e.id,nodeChoice:choice.id,date:day(s),deliveryDate:addDays(s.date,7),dueDate:addDays(s.date,14),remote:true,awaitDelivery:true,status:'pending'});return;}b.history.push({id:`SCENE-${tx}`,actor:e.actor,kind:'scene',source:e.id,date:day(s),choice:choice.id});message(s,e.actor,e.id.endsWith('01')?1:2,'FACT_'+e.id,s.date);}
export function recordRelationshipPlan(s,p,tx){
 if(isExtensionActor(p.actor)&&['chat','meet','walk'].includes(p.kind)){recordExtensionInitiatives(s,p.actor,p.activity?.entryId,tx);return;}
 if(p.kind==='banquet'&&p.activity){for(const actor of p.guests)recordRelationshipPlan(s,{...p,actor,kind:'meet'},tx);return;}
 if(!RELATION_PROFILES[p.actor]||!['meet','chat','letter','walk','bond'].includes(p.kind)||p.kind==='letter'&&!p.deliveredAt)return;
 const b=ensureRelationships(s),source=p.kind==='letter'?`DELIVERED_delivery-${p.id}`:`ACTIVITY_${p.id}`;
 if(b.encounters.some(e=>e.planId===p.id&&e.actor===p.actor))return;
 const known=s.facts.find(f=>f.id===source&&f.visibleTo.includes(p.actor));if(!known)return;
 b.encounters.push({id:`EN-${p.id}${p.guests?.length?'-'+p.actor:''}`,actor:p.actor,planId:p.id,source,date:day(s),kind:p.kind});
 const key=`${p.actor}@${p.weekId}`;if(!b.rewarded[key]&&!p.legacyPromiseId){const r=s.relations[p.actor];r.trust=Math.min(100,r.trust+2);r.safety=Math.min(100,r.safety+3);if(!isBounded(r)&&!p.activity?.paused)r.intimacy=Math.min(100,r.intimacy+4);b.rewarded[key]=tx;}
 if(effectiveNode(s,RELATION_PROFILES[p.actor].nodes[0]))message(s,p.actor,1,source,s.date);if(effectiveNode(s,RELATION_PROFILES[p.actor].nodes[1]))message(s,p.actor,2,source,s.date);
}
export function recordRelationshipDelivery(s,n,tx){
 n.socialReadAt=day(s);
 if(['R03-01','R03-02',...(s.weekly?.continuation?['R03-03',...([2,3,4,5,6].includes(s.weekly?.continuation?.version)?['R03-04',...([4,5,6].includes(s.weekly?.continuation?.version)?['R03-05']:[])]:[])]:[])].includes(n.source)){
  const b=ensureRelationships(s),e=s.events[n.source];message(s,'C03',n.source.endsWith('01')?1:2,'FACT_'+n.source,s.date);
  const waiting=b.requests.find(r=>r.kind==='node-reply'&&r.sourceNode===n.source&&r.status==='pending');if(waiting){waiting.deliveryDate=day(s);waiting.dueDate=addDays(s.date,7);waiting.awaitDelivery=false;}else if(ordinal(s.date)<=713&&!b.requests.some(r=>r.kind==='node-reply'&&r.sourceNode===n.source))b.requests.push({id:`NODE-REPLY-${n.id}`,actor:'C03',kind:'node-reply',sourceNode:n.source,nodeChoice:e.outcomeId,date:copy(e.date),deliveryDate:day(s),dueDate:addDays(s.date,7),remote:true,status:'pending'});
  return;
 }
 const p=s.weekly.plans.find(p=>p.id===n.source&&p.kind==='letter');if(p){p.deliveredAt=day(s);recordRelationshipPlan(s,p,tx);}
}
export function recordRelationshipBoundary(s,cid,intent,source){
 if(!s.weekly||s.sealed)return;const b=ensureRelationships(s);b.history.push({id:'BOUNDARY-'+source,actor:cid,kind:'boundary',intent,date:day(s),source});
 for(const m of b.messages.filter(m=>m.actor===cid&&m.kind==='invite'&&['pending','read'].includes(m.status))){m.status='declined';m.resolvedAt=day(s);m.reason='当下边界';}
}
export function recordAcceptedExpectation(s,p){if(isExtensionActor(p.actor)&&!p.expectationText){p.expectationText=p.actor==='C09'?'“时辰记下了，想留着自己的话到时再说。”':'“这段闲时记下了，不必夹带一份新差事。”';return;}if(!RELATION_PROFILES[p.actor]||p.kind==='letter'||p.expectationText)return;p.expectationText={C02:'“这一段我会交清班，再来。”',C03:'“时辰记下了，到京中照约见。”',C04:'“值诊交妥后，臣会按约来。”',C05:'“王府的事安排好，再依约往返。”',C06:'“这日的宫务会先交清，再坐下说。”',C07:'“说了来的日子，我可记着。”',C08:'“时辰记下了，届时想先说自己的那半句。”'}[p.actor];}
export function recordRelationshipBreach(s,p,tx){if((!RELATION_PROFILES[p.actor]&&!isExtensionActor(p.actor))||p.kind==='letter')return;openIssue(s,p.actor,'breach',p.id,`${NAMES[p.actor]}记得那次已接受却未履行的约定。`,tx);}
function openIssue(s,cid,kind,source,text,tx){const b=ensureRelationships(s);if(b.issues.some(i=>i.actor===cid&&i.kind===kind&&i.source===source))return;const issue={id:`ISSUE-${tx}-${cid}`,actor:cid,kind,source,text,date:day(s),status:'open'};b.issues.push(issue);for(const m of b.messages.filter(m=>m.actor===cid&&m.kind==='invite'&&['pending','read'].includes(m.status))){m.status='declined';m.resolvedAt=day(s);m.reason='先补谈原约';}fact(s,issue.id,text,cid,source);}
function writeStage(s,cid,g,tx,agreement='parallel',visibility='private'){
 const b=ensureRelationships(s),r=s.relations[cid],from=r.stage,old={trust:r.trust,intimacy:r.intimacy,safety:r.safety,playerIntent:r.playerIntent,npcIntent:r.npcIntent};
 const text=RELATION_PROFILES[cid].stages[g.index-1];r.stage=g.next;
 b.history.push({id:`STAGE-${tx}-${cid}`,actor:cid,kind:'stage',from,to:g.next,date:day(s),source:tx,nodes:copy(g.nodes),encounters:copy(g.shared),scores:old,text});
 // A newly lived conversation has a small, one-time relationship result; rereading never reclaims it.
 r.trust=Math.min(100,r.trust+2);r.intimacy=Math.min(100,r.intimacy+(g.index===1&&isBounded(r)?0:5));r.safety=Math.min(100,r.safety+4);
 fact(s,`RELATION_${tx}_${cid}`,`${from}至${g.next}。${text}`,cid,tx);
 if(g.next==='共担'){
  if(!['parallel','exclusive'].includes(agreement)||!['private','public'].includes(visibility))throw new RuleError('请说清共担约定的范围与知情。');
  b.agreements.push({id:`AGREEMENT-${tx}`,actor:cid,kind:agreement,visibility,date:day(s),status:'active'});
  fact(s,`AGREEMENT_${tx}`,agreement==='exclusive'?`双方明确约定只发展${NAMES[cid]}这一段感情。`:'双方说清可以并行相处，各自承诺与时辰仍须认真对待。',cid,tx,visibility==='public');
  if(visibility==='public')for(const old of b.agreements.filter(x=>x.actor!==cid&&x.kind==='exclusive'&&x.status==='active'))openIssue(s,old.actor,'exclusive',old.id,'你们先前说定的专一约定，与此后公开的发展说明相冲突，需要当事人补谈。',tx);
 }
 return text;
}
export function relationshipStops(s){return (row(s)?.requests||[]).filter(r=>r.status==='pending'&&ordinal(r.dueDate)>ordinal(s.date)).map(r=>({kind:'relationship',id:r.id,label:`${NAMES[r.actor]}的答复`,date:r.dueDate})).concat((row(s)?.messages||[]).filter(m=>m.status==='pending'&&ordinal(m.date)>ordinal(s.date)).map(m=>({kind:'relationship',id:m.id,label:`${NAMES[m.actor]}捎来的话`,date:m.date})));}
function request(s,cid,kind,tx,extra={}){const b=ensureRelationships(s);if(b.requests.some(r=>r.actor===cid&&r.status==='pending'))throw new RuleError('前一份话还待答复，先等它到来。');const remote=extra.remote??(cid==='C03'&&!personPresence(s,cid).available),travel=remote?14:1;const r={id:`ASK-${tx}-${cid}`,actor:cid,kind,date:day(s),dueDate:addDays(s.date,travel),deliveryDate:addDays(s.date,remote?7:0),remote,status:'pending',...extra};if(ordinal(r.dueDate)>horizonDay(s))throw new RuleError('这份答复将越出本卷，请留待下一卷；本次未扣费。');b.requests.push(r);return r;}
export function requestRelationshipResume(s,cid,tx){const r=s.relations[cid];const ask=request(s,cid,'resume',tx);r.playerIntent='愿发展';r.boundary=null;fact(s,`RESUME_${tx}`,`雍正重新表达愿发展；${NAMES[cid]}尚未作答。`,cid,tx);return {label:`向${NAMES[cid]}重新表明意愿`,detail:`这次只表达你的意愿。${ask.remote?'信送达至少7日，答复再走7日。':'留到次日听对方的答复。'}不跳阶段，不改对方当前意愿。`,actionCost:0,treasury:0};}
function npcResumeAnswer(s,cid){const r=s.relations[cid],rec=relationshipRecord(s,cid),cfg=RELATION_PROFILES[cid],boundary=rec.history.filter(h=>h.kind==='boundary').at(-1),newEncounters=rec.encounters.filter(e=>!boundary||ordinal(e.date)>ordinal(boundary.date));if(NEGATIVE_INTENTS.includes(r.playerIntent))return r.npcIntent;if(rec.issues.length)return '暂缓';if(r.npcIntent==='终止恋爱'&&new Set(newEncounters.map(e=>ordinal(e.date))).size<2)return '终止恋爱';if(r.npcIntent==='仅合作'&&!effectiveNode(s,cfg.nodes[1]))return '仅合作';return effectiveNode(s,cfg.nodes[0])&&r.trust>=cfg.thresholds[0][0]&&r.safety>=25?'愿发展':'暂缓';}
export function applyRelationshipAction(s,a,tx,{useSlot,createPlan}={}){
 if(s.sealed)throw new RuleError('本卷已封存，只能重读。');const cid=a.actor;if(isExtensionActor(cid)){if(a.type==='relationship-repair'){const b=ensureRelationships(s),issue=b.issues.find(i=>i.id===a.issueId&&i.actor===cid&&i.status==='open');if(Object.keys(a).some(k=>!['type','actor','issueId'].includes(k))||!issue)throw new RuleError('先核对本人真实未补谈的原约，补谈不接受代填心意。');if(s.weekly.plans.some(p=>p.actor===cid&&['accepted','executing','needs-reschedule'].includes(p.status)))throw new RuleError('先履行、改期或取消现有约定，再补谈原约。');const paid=useSlot(s,cid,'REL-REPAIR-'+issue.id,tx);resolveIssue(s,issue,tx);return{label:'把那一回说清',detail:EXTENSION_REPAIR[cid],dialogue:EXTENSION_REPAIR[cid],actor:cid,actionCost:paid.cost,treasury:0};}return applyExtensionInitiative(s,a,tx,{createPlan});}const cfg=RELATION_PROFILES[cid];if(!cfg)throw new RuleError('没有这条核心关系。');const b=ensureRelationships(s),r=s.relations[cid],rec=relationshipRecord(s,cid),res=(label,detail,extra={})=>({label,detail,actor:cid,actionCost:0,treasury:0,...extra});
 switch(a.type){
 case 'relationship-advance':{
  const g=relationshipRequirements(s,cid),remote=a.mode==='letter'||cid==='C03'&&!personPresence(s,cid).available;if(!(remote?g.remoteReady:g.ready))throw new RuleError(g.reasons.join(' '));
  if(b.requests.some(x=>x.actor===cid&&x.status==='pending'))throw new RuleError('先听完前一份答复。');
  const paid=useSlot(s,cid,`REL-${cid}-${g.index}`,tx,{letter:remote});
  if(remote){const ask=request(s,cid,'stage',tx,{remote:true,target:g.next,agreement:a.agreement||'parallel',visibility:a.visibility||'private'});return res('把心意写入信中',`一格已用于这封信；送达${ask.deliveryDate.month}月${ask.deliveryDate.day}日，答复最早${ask.dueDate.month}月${ask.dueDate.day}日。关系阶段尚未改变。`,{actionCost:paid.cost});}
  // The clock and the actual conversation date may have moved to the next free, legal slot.
  const current=relationshipRequirements(s,cid);if(!current.ready)throw new RuleError(current.reasons.join(' '));
  return res(`与${NAMES[cid]}说到${current.next}`,writeStage(s,cid,current,tx,a.agreement||'parallel',a.visibility||'private'),{actionCost:paid.cost,dialogue:cfg.stages[current.index-1]});
 }
 case 'relationship-answer':{
  const ask=b.requests.find(x=>x.id===a.requestId&&x.actor===cid&&x.status==='pending');if(!ask||ask.awaitDelivery||ordinal(s.date)<ordinal(ask.dueDate))throw new RuleError('答复尚未到期或已经收过。');
  let text;if(ask.kind==='resume'||ask.kind==='node-reply'&&ask.nodeChoice==='warm'){r.npcIntent=npcResumeAnswer(s,cid);text=r.npcIntent==='愿发展'?`${cfg.stages[0]} “这次愿意再往下谈，仍从已经走过的地方接着来。”`:r.npcIntent==='终止恋爱'?'“这件事暂且不再往下谈。眼前的职责照常，先尊重这份答复。”':`“旧话听到了。${rec.issues.length?'先把那件未说清的事谈完。':'眼下仍想留些时间。'}公务与待遇不因这份答复改变。”`;}
  else if(ask.kind==='node-reply')text='“那页舆图的边注，臣另抄在信里。公事照常，私下就按说定的分寸，不急着往别处写。”';
  else if(ask.kind==='repair'){const issue=b.issues.find(i=>i.id===ask.issueId&&i.status==='open');if(!issue)throw new RuleError('原问题已处理，请保留旧信重读。');resolveIssue(s,issue,tx);text=cfg.repair;}
  else{const g=relationshipRequirements(s,cid);if(g.ready&&g.next===ask.target){text=writeStage(s,cid,g,tx,ask.agreement,ask.visibility);b.history.at(-1).requestId=ask.id;}else text='“信已读过。眼下还有未说清的事，先留在这里，别替我把后半句答完。”';}
  ask.status='answered';ask.answeredAt=day(s);ask.text=text;ask.answerIntent=r.npcIntent;fact(s,`ANSWER_${ask.id}`,text,cid,ask.id);return res('收好这份答复',text,{dialogue:text});
 }
 case 'relationship-message':{
  const m=b.messages.find(x=>x.id===a.messageId&&x.actor===cid);if(!m||ordinal(s.date)<ordinal(m.date)||m.status==='declined')throw new RuleError('这份消息尚未送到或已谢绝。');
  if(!m.text){m.text=initiativeStory(s,m,cfg);m.readAt=day(s);m.status='read';fact(s,`INITIATIVE_${m.id}`,m.text,cid,m.source);}
  return res(`${NAMES[cid]}捎来的话`,m.text,{dialogue:m.text});
 }
 case 'relationship-decline':{const m=b.messages.find(x=>x.id===a.messageId&&x.actor===cid&&x.kind==='invite'&&['pending','read'].includes(x.status));if(!m||ordinal(m.date)>ordinal(s.date))throw new RuleError('没有这份待答的邀约。');m.status='declined';m.resolvedAt=day(s);return res('把谢意说清','未接受的邀约不算承诺，不扣钱、不记失约，也不减少关系或待遇。');}
 case 'relationship-invite':{
  const m=b.messages.find(x=>x.id===a.messageId&&x.actor===cid&&x.kind==='invite'&&['pending','read'].includes(x.status));if(!m||ordinal(m.date)>ordinal(s.date)||isBounded(r)||rec.issues.length)throw new RuleError('此邀约尚未送达、已答复或不合当下意愿。');
  const result=createPlan(s,{type:'week-plan',kind:a.kind||'meet',actor:cid,date:a.date,period:a.period,status:'accepted'},tx);const p=s.weekly.plans.at(-1);if(!['meet','chat','letter'].includes(p.kind))throw new RuleError('这份邀约只用于会面、交谈或通信。');if(!m.text){m.text=initiativeStory(s,m,cfg);m.readAt=day(s);fact(s,`INITIATIVE_${m.id}`,m.text,cid,m.source);}m.status='accepted';m.planId=p.id;m.resolvedAt=day(s);p.socialInviteId=m.id;return {...result,detail:result.detail+' 此时才成为正式约定；此前没有预占或失约。'};
 }
 case 'relationship-repair':{
  const issue=b.issues.find(i=>i.id===a.issueId&&i.actor===cid&&i.status==='open');if(!issue)throw new RuleError('没有这件待补谈的事。');if(s.weekly.plans.some(p=>p.actor===cid&&['accepted','executing','needs-reschedule'].includes(p.status)))throw new RuleError('先把现有约期履行、改期或取消，再补谈。');
  const remote=a.mode==='letter'||cid==='C03'&&!personPresence(s,cid).available,paid=useSlot(s,cid,'REL-REPAIR-'+issue.id,tx,{letter:remote});
  if(remote){const ask=request(s,cid,'repair',tx,{remote:true,issueId:issue.id});return res('把原约与解释一并寄出',`占${paid.cost}格；答复最早${ask.dueDate.month}月${ask.dueDate.day}日到，原问题仍未抹去。`,{actionCost:paid.cost});}
  resolveIssue(s,issue,tx);return res('把那一回说清',cfg.repair,{actionCost:paid.cost,dialogue:cfg.repair});
 }
 default:throw new RuleError('未知关系行动。');
 }
}
function resolveIssue(s,issue,tx){issue.status='resolved';issue.resolvedAt=day(s);issue.resolution=tx;for(const a of row(s).agreements.filter(a=>a.id===issue.source))a.status='released';fact(s,`REPAIR_REL_${tx}`,(issue.kind==='exclusive'?'把公开的新说明与原本的专一诺言逐句对照，明确解除相冲突的旧诺；当下恋爱意愿仍由各自表态。':'')+(RELATION_PROFILES[issue.actor]?.repair||EXTENSION_REPAIR[issue.actor]),issue.actor,issue.id);}
export function relationshipEcho(s,cid,input){if(!row(s)||!RELATION_PROFILES[cid]||!/关系|我们|心意|相处|上回|邀约|来信|分寸|失约/.test(input))return null;const rec=relationshipRecord(s,cid);if(rec.issues.length)return RELATION_PROFILES[cid].repair;const answer=rec.requests.filter(r=>r.status==='answered').at(-1);if(answer&&answer.answerIntent===s.relations[cid].npcIntent)return answer.text;if(isBounded(s.relations[cid]))return '说定的分寸仍在。眼前差事照常，私下相处先不催你。';return rec.history.filter(h=>h.kind==='stage').at(-1)?.text||rec.messages.filter(m=>m.readAt&&m.text).at(-1)?.text||null;}
export function validateRelationships(s){
 const b=row(s);if(b===undefined)return;if(!b||b.version!==1||!['new-game','continued-save'].includes(b.origin)||!validDate(b.cutover)||ordinal(b.cutover)>ordinal(s.date)||!Number.isInteger(b.cutoverRevision)||b.cutoverRevision>s.revision||!b.baseline||!b.rewarded||typeof b.rewarded!=='object')throw new RuleError('关系接续记录错误。');
 for(const key of ['history','encounters','requests','messages','issues','agreements','legacyPlanIds'])if(!Array.isArray(b[key])||b[key].length>20000)throw new RuleError('关系记录缺项或过长。');
 for(const key of ['history','encounters','requests','messages','issues','agreements']){const xs=b[key];if(new Set(xs.map(x=>x.id)).size!==xs.length)throw new RuleError('关系记录标识重复。');for(const x of xs)if(!RELATION_PROFILES[x.actor]&&!(['messages','issues'].includes(key)&&isExtensionActor(x.actor)))throw new RuleError('关系记录含未知人物。');}
 for(const x of [...b.history,...b.encounters,...b.requests,...b.issues,...b.agreements])if(!validDate(x.date)||ordinal(x.date)>ordinal(s.date))throw new RuleError('关系记录含未来经历。');
 for(const e of b.encounters){const p=s.weekly.plans.find(p=>p.id===e.planId&&(p.actor===e.actor||p.guests.includes(e.actor))&&p.status==='completed');if(!p||!['meet','chat','letter','walk','bond','banquet'].includes(p.kind)||!s.facts.some(f=>f.id===e.source&&f.visibleTo.includes(e.actor))||p.kind==='letter'&&(!p.deliveredAt||ordinal(p.deliveredAt)!==ordinal(e.date)))throw new RuleError('共同经历缺少真实履约或送达来源。');}
 for(const ask of b.requests){if(!['resume','stage','repair','node-reply'].includes(ask.kind)||!['pending','answered'].includes(ask.status)||!validDate(ask.dueDate)||!validDate(ask.deliveryDate)||ordinal(ask.dueDate)-ordinal(ask.date)<(ask.remote?14:1)||ordinal(ask.deliveryDate)-ordinal(ask.date)<(ask.remote?7:0))throw new RuleError('人物答复的实际递送日期错误。');if(ask.status==='answered'&&(!validDate(ask.answeredAt)||ordinal(ask.answeredAt)<ordinal(ask.dueDate)||ordinal(ask.answeredAt)>ordinal(s.date)||typeof ask.text!=='string'))throw new RuleError('人物尚未答复却有完成结果。');if(ask.kind==='node-reply'&&(!['R03-01','R03-02',...(s.weekly?.continuation?['R03-03',...([2,3,4,5,6].includes(s.weekly?.continuation?.version)?['R03-04',...([4,5,6].includes(s.weekly?.continuation?.version)?['R03-05']:[])]:[])]:[])].includes(ask.sourceNode)||s.events[ask.sourceNode]?.outcomeId!==ask.nodeChoice||(!ask.awaitDelivery||ask.status==='answered')&&!s.weekly.notices.some(n=>n.source===ask.sourceNode&&n.type==='delivery'&&n.status==='read')))throw new RuleError('边书答复缺少实际送达的原信。');if(ask.kind==='repair'&&!b.issues.some(i=>i.id===ask.issueId&&i.actor===ask.actor))throw new RuleError('补谈缺少原问题。');}
 for(const m of b.messages){if(!new RegExp(`^IN-${m.actor}-[12]$`).test(m.id)||!['note','invite'].includes(m.kind)||!['pending','read','accepted','declined'].includes(m.status)||!validDate(m.date)||!validDate(m.sourceDate)||ordinal(m.sourceDate)>ordinal(s.date)||ordinal(m.date)-ordinal(m.sourceDate)<1||!s.facts.some(f=>f.id===m.source&&f.visibleTo.includes(m.actor)))throw new RuleError('主动消息缺少人物知情的真实前事。');if(m.readAt&&(!validDate(m.readAt)||ordinal(m.readAt)<ordinal(m.date)||ordinal(m.readAt)>ordinal(s.date)))throw new RuleError('主动消息提前读到。');if(m.status==='accepted'&&!s.weekly.plans.some(p=>p.id===m.planId&&p.actor===m.actor&&p.socialInviteId===m.id))throw new RuleError('主动邀约缺少正式安排。');}
 for(const i of b.issues)if(!['breach','exclusive'].includes(i.kind)||!['open','resolved'].includes(i.status)||i.kind==='breach'&&!s.weekly.plans.some(p=>p.id===i.source&&p.status==='breached'&&p.actor===i.actor)||i.kind==='exclusive'&&!b.agreements.some(a=>a.id===i.source&&a.actor===i.actor))throw new RuleError('关系问题缺少真实来源。');
 for(const a of b.agreements)if(!['parallel','exclusive'].includes(a.kind)||!['public','private'].includes(a.visibility)||!['active','released'].includes(a.status)||phase(s.relations[a.actor].stage)<3)throw new RuleError('关系约定范围错误。');
 for(const [cid,cfg] of Object.entries(RELATION_PROFILES)){
  let current=b.baseline[cid]?.stage,previous=null,heart=phase(current)>=2?{date:b.cutover}:null;if(!RELATION_STAGES.includes(current))throw new RuleError('关系原阶段缺失。');
  for(const h of b.history.filter(h=>h.actor===cid&&h.kind==='stage')){const index=phase(h.to);if(h.from!==current||index!==phase(current)+1||!h.scores||['trust','intimacy','safety'].some((k,i)=>h.scores[k]<cfg.thresholds[index-1][i])||index>=2&&(h.scores.playerIntent!=='愿发展'||h.scores.npcIntent!=='愿发展')||!Array.isArray(h.nodes)||h.nodes.length!==(index===1?1:2)||h.nodes.some(id=>!cfg.nodes.includes(id)||!s.events[id]?.completed||ordinal(s.events[id].date)>ordinal(h.date)))throw new RuleError('关系阶段缺少顺序、阈值、节点或双方意愿。');if(index>=3&&(!Array.isArray(h.encounters)||!h.encounters.length||h.encounters.some(id=>!b.encounters.some(e=>e.id===id&&e.actor===cid&&ordinal(e.date)<=ordinal(h.date)))))throw new RuleError('共担或相守缺少真实相处。');if(previous&&ordinal(h.date)-ordinal(previous.date)<7)throw new RuleError('已确认阶段之间不足七日。');if(index>=3){const shared=b.encounters.filter(e=>h.encounters.includes(e.id)&&heart&&ordinal(e.date)>ordinal(heart.date));if(!shared.length||index===4&&(new Set(shared.map(e=>ordinal(e.date))).size<2||ordinal(h.date)-ordinal(heart.date)<14))throw new RuleError('共同生活或倾心后的相处间隔不足。');}if(h.requestId){const ask=b.requests.find(r=>r.id===h.requestId&&r.actor===cid&&r.kind==='stage'&&r.target===h.to&&r.status==='answered');if(!ask||ordinal(ask.dueDate)>ordinal(h.date))throw new RuleError('远方阶段确认早于实际答复。');}for(const node of h.nodes.filter(id=>id==='R03-02'||s.events[id]?.channel==='letter'))if(!s.weekly.migration?.source.events[node]?.completed){const delivered=s.weekly.notices.find(n=>n.type==='delivery'&&n.source===node&&n.status==='read');if(!delivered||ordinal(delivered.socialReadAt||delivered.date)>ordinal(h.date))throw new RuleError('未实际送达的边书不能作为关系经历。');}if(h.to==='倾心')heart=h;previous=h;current=h.to;}
  if(b.origin==='new-game'&&Object.entries(cfg.initial).some(([k,v])=>b.baseline[cid][k]!==v))throw new RuleError('新档原始起点被改写。');
  if(s.relations[cid].stage!==current)throw new RuleError('当前阶段与实际推进记录不一致。');
 }
 validateExtensionInitiatives(s);
}
