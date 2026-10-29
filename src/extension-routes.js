import {MEIZHUANG_ACTION_TEXT} from './extension-meizhuang.js';
import {EXTENSION_EVENTS,EXTENSION_REPLIES,EXTENSION_PEOPLE,EXTENSION_WEEK_RULES} from './extension-content.js';
import {ordinal,validDate} from './calendar.js';
import {RuleError} from './rules.js';
const copy=x=>structuredClone(x),negative=x=>['仅合作','暂缓','终止恋爱'].includes(x);
const intent=x=>({open:'愿发展',none:'仅合作',unsure:'暂缓'})[x]||null;
const initial=(actor='C09')=>({actor,stage:'相识',playerIntent:'未表态',npcIntent:'未表态',identityClarified:false,unresolvedGift:false,requiresRenewal:false,renewalDate:null,keptWordDate:null,nodes:[]});
function transition(r,h){
 const n=copy(r),hold=()=>{n.requiresRenewal=true;n.renewalDate=copy(h.date);n.keptWordDate=null;};
 if(h.kind==='bridge'){
  if(intent(h.intent)){n.playerIntent=intent(h.intent);if(negative(n.playerIntent))hold();}
  if(h.eventId==='M11'){n.identityClarified=['clear','open','unsure'].includes(h.choice);n.unresolvedGift=h.choice==='vague';if(n.unresolvedGift)hold();}
 }else if(h.kind==='node'){
  n.nodes.push(h.eventId);if(!['倾心','共担','相守'].includes(n.stage))n.stage='信任';
  if(/XR(?:09|10)-0[56]$/.test(h.eventId)){n.playerIntent=({develop:'愿发展',cooperate:'仅合作',unsure:'暂缓'})[h.choice];if(h.choice!=='develop'){n.npcIntent=n.playerIntent;hold();}return n;}
  if(['XR09-03','XR10-03','XR09-04','XR10-04'].includes(h.eventId)){if(h.choice==='develop'){n.playerIntent='愿发展';if(n.requiresRenewal||n.unresolvedGift)n.npcIntent='暂缓';}if(h.choice==='cooperate'){n.playerIntent='仅合作';n.npcIntent='仅合作';hold();}else if(h.choice==='unsure'){n.playerIntent='暂缓';n.npcIntent='暂缓';hold();}return n;}
  n.playerIntent=({develop:'愿发展',cooperate:'仅合作',unsure:'暂缓'})[h.choice];
  if(h.eventId==='XR09-02')n.identityClarified=true;
  if(h.choice!=='develop'){n.npcIntent=h.choice==='cooperate'?'仅合作':'暂缓';hold();}
  else if(n.unresolvedGift||n.requiresRenewal)n.npcIntent='暂缓';
  else n.npcIntent=h.eventId===EXTENSION_PEOPLE[r.actor].second?'愿发展':'未表态';
 }else if(h.kind==='main'){if(h.eventId==='M39'){if(h.choice==='open')n.playerIntent='愿发展';else if(h.choice==='admit'){n.identityClarified=true;n.unresolvedGift=false;}else{n.playerIntent=h.choice==='none'?'仅合作':'暂缓';hold();}}else{n.playerIntent=({open:'愿发展',work:'仅合作',unsure:'暂缓',end:'终止恋爱'})[h.choice];if(h.choice!=='open')hold();}}else if(h.kind==='stage'){if(['倾心','共担','相守'].includes(h.choice)){const ranks=['相识','信任','倾心','共担','相守'];if(ranks.indexOf(h.choice)>ranks.indexOf(n.stage))n.stage=h.choice;n.npcIntent='愿发展';}else n.npcIntent='暂缓';}
 else if(h.kind==='boundary'){n.playerIntent=h.choice;hold();}
 else if(h.kind==='repair'){n.identityClarified=true;n.unresolvedGift=false;n.npcIntent='暂缓';hold();}
 else if(h.kind==='keep-word')n.keptWordDate=copy(h.date);
 else if(h.kind==='resume'){n.playerIntent='愿发展';n.npcIntent='愿发展';n.requiresRenewal=false;}
 return n;
}
function sources(s,cid='C09'){
 const rows=[];
 for(const eventId of (cid==='C09'?['M06','M11']:['M06'])){const e=s.events[eventId],t=s.transcripts[eventId];if(!e?.completed||!t)continue;const b=t.bridge?.find(b=>b.actor===cid);rows.push({kind:'bridge',eventId,choice:e.outcomeId,intent:b?.intent||(eventId==='M11'&&e.outcomeId==='polite'?'none':'unspoken'),date:t.date,transactionId:t.transactionId});}
 rows.push(...(s.extensionRoutes?.history||[]).filter(h=>h.actor===cid));
 const order=id=>{const n=s.transactions.findIndex(t=>t.id===id);return n<0?s.transactions.length:n;};
 return rows.sort((a,b)=>order(a.transactionId)-order(b.transactionId));
}
export function extensionRelation(s,cid='C09'){return EXTENSION_PEOPLE[cid]?sources(s,cid).reduce(transition,initial(cid)):null;}
export function extensionRelationAt(s,cid,transactionId){const cut=s.transactions.findIndex(t=>t.id===transactionId);return EXTENSION_PEOPLE[cid]?sources(s,cid).filter(h=>{const i=s.transactions.findIndex(t=>t.id===h.transactionId);return i>=0&&i<=cut;}).reduce(transition,initial(cid)):null;}
export function extensionContext(s,cid){if(!EXTENSION_PEOPLE[cid]||!s.extensionRoutes?.history.some(h=>h.actor===cid))return null;return {...extensionRelation(s,cid),...(cid==='C10'?{work:extensionWork(s)}:{}),history:s.extensionRoutes.history.filter(h=>h.actor===cid).slice(-8).map(copy),rules:[(['倾心','共担','相守'].includes(extensionRelation(s,cid).stage)?'正式私人阶段由真实时长、另日相处与本人答复确立，具体亲近仍可拒绝':'愿发展只表示愿继续了解，当前未进入倾心或相守'),'只知本人实际听到的话，不知另一人的私谈','原赏赐、拒绝和旧正文保留；补谈是后来真实经历']};}
export function extensionEventView(s,e){if(!EXTENSION_EVENTS[e?.id])return e;const cid=e.actor,r=extensionRelation(s,cid),prior=s.transcripts.M06?.bridge?.find(b=>b.actor===cid),lines=[];
 if(e.id.endsWith('01')&&prior)lines.push(({open:'殿前散后你曾说愿意了解，她记得，却仍要听见今日具体的回答。',none:'殿前散后已说清不另许私情。她记着这份距离，今日的相谈并非已经恢复亲近。',unsure:'殿前散后你说尚未想定，她没有把这段日子当作必须等候的约期。'})[prior.intent]||'');
 if(e.id==='XR09-02'){const first=s.transcripts['XR09-01'];if(first)lines.push(`你们上次说到「${first.choice}」。当时的回答没有因今日再来便消失。`);if(r.unresolvedGift)lines.push('暖阁里的赏物和那笔花费还在。她没有把收到赏赐当成旧影已经说清，今日须正面回答曾经回避的事。');else if(s.events.M11?.outcomeId==='polite')lines.push('暖阁中已说明疏离。她今日要确认的是分寸，不是默认你已收回那句话。');else lines.push('暖阁里关于旧影的回答仍留在旧事中；尊重本人，尚不能替她决定私情。');}
 if(e.id==='XR10-02'){const first=s.transcripts['XR10-01'];if(first)lines.push(`上回你选择「${first.choice}」。她提出疑点、拒绝新增长差与当时的私话，各自留着原来的回答。`);}
 const body=[...lines.filter(Boolean),e.body].join('\n\n');return {...e,body,sceneVisible:body};
}
function append(s,h){if(s.extensionRoutes?.history.some(x=>x.transactionId===h.transactionId))throw new RuleError('每次只提交一段独立扩展相谈，请先听完本人答复。');s.extensionRoutes??={version:1,history:[]};s.extensionRoutes.history.push(copy(h));}
export function recordExtensionNode(s,e,choice,tx){
 if(!EXTENSION_EVENTS[e.id])return null;
 if(e.requires.some(id=>!s.transactions.some(t=>t.id===s.events[id]?.transactionId)))throw new RuleError('先单独完成前置场景，再开始这次相谈。');
 const person=EXTENSION_PEOPLE[e.actor];
 if(e.id===person.second&&ordinal(s.date)<ordinal(s.events[person.first].date)+7)throw new RuleError('两次相谈至少相隔七日，请另约时日。');
 const before=extensionRelation(s,e.actor),h={actor:e.actor,kind:'node',eventId:e.id,choice:choice.id,date:copy(s.date),transactionId:tx};
 const after=transition(before,h);let text=EXTENSION_REPLIES[e.id][choice.id];
 if(choice.id==='develop'&&/XR(?:09|10)-0[56]$/.test(e.id)){h.text=text;append(s,h);return text;}
 if(choice.id==='develop'&&e.actor==='C09')text+='\n\n'+(after.unresolvedGift?'她没有答应继续私情：“旧影这句话说到了，可先前为什么避开，还须说清。那份赏物，也不能当成已经赔过的话。”这次只留下你愿继续了解的态度，含混的旧事仍待补谈。':after.requiresRenewal?'她提醒你：“先前说过的分寸，臣妾没有忘。今日换了意思，也请留些时间，看以后怎样相处。”她暂缓答复，没有因你提出发展便自动恢复亲近。':e.id==='XR09-02'?'甄嬛将杯盖放回去：“那便再认识下去。只是愿意再谈，并不是已经许了往后。”她这回明确愿继续了解你，仍保留对具体亲近说不的余地。':'她愿意把诗讲完，却没有替往后作过保证。自己的心意，仍须由她慢慢确定。');
 if(choice.id==='develop'&&e.actor==='C10')text+='\n\n'+(after.requiresRenewal?'她没有因这次换了意思便恢复亲近：“先前的分寸臣妾记得。以后是否愿意，还要看看怎样相处，再由臣妾自己答。”':e.id===person.second?'沈眉庄将杯向自己面前挪了些：“那便再坐一会儿。臣妾也愿再了解皇上，不过不是为了替御前多做差事。”她明确愿继续认识，仍没有答应倾心或相守。':'她愿把自己的小事讲完，没有将这份愿意说话写成恋爱答复。');
 h.text=text;append(s,h);return text;
}
const actionKinds=['boundary','repair','keep-word','resume'];
function actionAllowed(r,a,d){
 const p=EXTENSION_PEOPLE[r.actor];
 if(!r.nodes.includes(p.first))throw new RuleError(`先实际完成「${EXTENSION_EVENTS[p.first].title}」，再商量这段关系。`);
 if(a.kind==='boundary'){if(!negative(a.choice))throw new RuleError('请明确选择仅合作、暂缓或终止恋爱。');return;}
 if(!r.nodes.includes(p.second))throw new RuleError(`先把「${EXTENSION_EVENTS[p.second].title}」当面说完，再续这段补谈。`);
 if(a.kind==='repair'){if(r.actor!=='C09'||!r.unresolvedGift)throw new RuleError('眼下没有尚待补谈的含混赏赐。');return;}
 if(r.unresolvedGift)throw new RuleError('先说明含混赏赐时没有回答的旧问题。');
 if(!r.requiresRenewal)throw new RuleError('当前没有需要重新协商的边界，不必重复领取答复。');
 if(a.kind==='keep-word'){if(r.keptWordDate)throw new RuleError('这次兑现已留在记录中，下一步听她自己的答复。');if(ordinal(d)<=ordinal(r.renewalDate))throw new RuleError('先留出另一天，再以实际相处兑现这句话。');}
 if(a.kind==='resume'){if(!r.keptWordDate||ordinal(d)<ordinal(r.renewalDate)+7||ordinal(d)<=ordinal(r.keptWordDate))throw new RuleError('须先另日兑现尊重不同意见，距前次边界或补谈至少七日，再在之后听本人答复。');}
}
const actionText={
 repair:'你没有再添赏物，先承认暖阁那日借赏赐避开了回答。\n\n“朕当时不愿面对你的疑问，便想用另一件事将它压下。这是朕没有说明白，不是你问得太多。”\n\n甄嬛听完，问往后若她不像任何旧人、也不照你的意思答，是否仍能把话说完。你明确说可以，不要求她改成谁的模样。\n\n她没有立即答应亲近：“这些话，臣妾今日听见了。以后怎样，仍要看以后的事。”原花费和原回答保留，具体疑问已有新答复；信任与心意还须用后来相处重新确认。',
 'keep-word':'这一次，甄嬛换了另一首诗。你听到末句仍不赞同，却先请她把前后两句接着讲完。\n\n她指出你略过的一个转折。你重新读了一遍，承认那处方才读得急；对于最后的判断，两人仍未一致。\n\n“那就各留各的。”她把笔收起，没有被催着替御前的答案署名。你没有添赏，也没有请她立刻回报一份心意。\n\n这一日确实听完了她不同的意见，未被写成已经相爱。等她愿答的时候，还要另行问过本人。',
 resume:'你重新问她，是否愿在原来已经说清的分寸之外，继续了解彼此。\n\n甄嬛提起那次读诗：“臣妾没有改成皇上的答案，皇上也没有因此收回让臣妾说话的余地。那一回，臣妾记着。”\n\n她没有将旧事抹去，也没有说自己从来不曾迟疑。过了一会儿，她才道：“今日臣妾愿意再往下认识。若以后不愿，也会自己说。”\n\n这份答复来自今日。两人当前都愿继续了解，尚未因此成为相守，更没有替往后的具体亲近作永久承诺。'
};
export function applyExtensionAction(s,a,tx,{spend}){
 if(s.sealed)throw new RuleError('本卷已封存，只能重读。');
 if(!EXTENSION_PEOPLE[a.actor]||!actionKinds.includes(a.kind)||Object.keys(a).some(k=>!['type','actor','kind','choice'].includes(k))||a.kind!=='boundary'&&a.choice!==undefined)throw new RuleError('这项扩展相谈不在当前能力范围内。');
 const r=extensionRelation(s,a.actor);actionAllowed(r,a,s.date);const paid=a.kind==='boundary'?0:spend();actionAllowed(r,a,s.date);
 const text=a.kind==='boundary'?`你清楚说明这次选择${a.choice}。${EXTENSION_PEOPLE[a.actor].name}听完，将原话记在心里：“臣妾听见了。往后的来往，便照眼前的分寸。”\n\n旧日说过的话和已经办过的事仍留在记录里，没有因今天的选择被删去。`:(a.actor==='C10'?MEIZHUANG_ACTION_TEXT:actionText)[a.kind];
 const h={actor:a.actor,kind:a.kind,...(a.choice?{choice:a.choice}:{}),date:copy(s.date),transactionId:tx,text};append(s,h);
 s.facts.push({id:'XR-TALK-'+tx,source:'XR-TALK-'+tx,date:copy(s.date),turn:s.turn,visibleTo:['C01',a.actor],text});
 return {label:{boundary:'说明与甄嬛的分寸',repair:'向甄嬛补谈旧影', 'keep-word':'听完她不同的意见',resume:'重新听甄嬛答复'}[a.kind].replaceAll('甄嬛',EXTENSION_PEOPLE[a.actor].name),detail:text,dialogue:text,actor:a.actor,actionCost:paid,treasury:0};
}
export function validateExtensions(s){
 const book=s.extensionRoutes,events=Object.values(s.events).filter(e=>EXTENSION_EVENTS[e.id]);
 if(!book){if(events.length)throw new RuleError('扩展节点缺少本人原话记录。');return;}
 const fail=()=>{throw new RuleError('扩展关系缺少合法的实际事务、日期或原话来源。');};
 if(!book||book.version!==1||Object.keys(book).some(k=>!['version','history'].includes(k))||!Array.isArray(book.history)||!book.history.length||book.history.length>1000)fail();
 const seen=new Set();let lastIndex=-1;
 for(const h of book.history){if(!h||!EXTENSION_PEOPLE[h.actor]||!['node','main','stage',...actionKinds].includes(h.kind)||!validDate(h.date)||ordinal(h.date)>ordinal(s.date)||typeof h.text!=='string'||!h.text||h.text.length>5000||seen.has(h.transactionId)||Object.keys(h).some(k=>!['actor','kind','eventId','choice','date','transactionId','text'].includes(k)))fail();seen.add(h.transactionId);const index=s.transactions.findIndex(t=>t.id===h.transactionId),t=s.transactions[index];if(index<lastIndex||index<0||JSON.stringify(t.date)!==JSON.stringify(h.date))fail();lastIndex=index;
  if(h.kind==='node'){const e=s.events[h.eventId],tr=s.transcripts[h.eventId];if(!EXTENSION_EVENTS[h.eventId]||EXTENSION_EVENTS[h.eventId].actor!==h.actor||tr?.actor!==h.actor||!['develop','cooperate','unsure'].includes(h.choice)||!e?.completed||e.transactionId!==h.transactionId||e.outcomeId!==h.choice||tr?.dialogue!==h.text||JSON.stringify(tr.date)!==JSON.stringify(h.date)||!t.actions.some(a=>a.type==='event'&&a.eventId===h.eventId&&a.choiceId===h.choice))fail();}
  else if(['main','stage'].includes(h.kind)){if(h.kind==='main'){if(h.actor==='C09'){if(h.eventId!=='M39'||s.events.M39?.transactionId!==h.transactionId||s.events.M39.outcomeId!==h.choice||!t.actions.some(a=>a.type==='event'&&a.eventId==='M39'&&a.choiceId===h.choice))fail();}else if(h.eventId!=='M40'||!t.actions.some(a=>a.type==='volume7-private'&&a.choice===h.choice))fail();}else{let q;for(let c=s.weekly?.continuation;c;c=c.source?.weekly?.continuation)q??=c.lateRequests?.find(q=>q.answer?.transactionId===h.transactionId);if(!q||q.actor!==h.actor||q.answer.text!==h.text||h.choice!==(q.answer.accepted?q.target:'保留')||!t.actions.some(a=>a.type==='volume7-answer'&&a.id===q.id))fail();}}
  else {if(h.eventId||!t.actions.some(a=>a.type==='extension-talk'&&a.actor===h.actor&&a.kind===h.kind&&a.choice===h.choice)||!t.results.some(r=>r.actor===h.actor&&r.dialogue===h.text))fail();const facts=s.facts.filter(f=>f.id==='XR-TALK-'+h.transactionId);if(facts.length!==1||facts[0].source!==facts[0].id||facts[0].text!==h.text||JSON.stringify(facts[0].date)!==JSON.stringify(h.date)||JSON.stringify(facts[0].visibleTo)!==JSON.stringify(['C01',h.actor]))fail();}
 }
 for(const e of events)if(book.history.filter(h=>h.eventId===e.id&&h.transactionId===e.transactionId).length!==1)fail();
 for(const t of s.transactions)for(const a of t.actions)if(a.type==='extension-talk'&&!book.history.some(h=>h.transactionId===t.id&&h.kind===a.kind&&h.actor===a.actor))fail();
 for(const cid of Object.keys(EXTENSION_PEOPLE)){
  let r=initial(cid);const p=EXTENSION_PEOPLE[cid];for(const h of sources(s,cid)){
   if(h.kind==='node'){
    const rule=EXTENSION_WEEK_RULES[h.eventId],d=rule.window.earliest;
    if(r.nodes.includes(h.eventId)||h.eventId===p.second&&!r.nodes.includes(p.first))fail();
    if(ordinal(h.date)<ordinal({year:d[0],month:d[1],day:d[2]})||h.eventId===p.second&&ordinal(h.date)<ordinal(s.events[p.first].date)+7)fail();
    if(!EXTENSION_EVENTS[h.eventId].requires.every(id=>s.events[id]?.completed&&s.transactions.findIndex(t=>t.id===s.events[id].transactionId)<s.transactions.findIndex(t=>t.id===h.transactionId)))fail();
   }else if(!['bridge','main','stage'].includes(h.kind)){try{actionAllowed(r,h,h.date);}catch{fail();}}r=transition(r,h);
  }
 }
}
// A recorded referral is not a verified audit finding or a grant of office.
export function extensionWork(s){const later=[];for(let b=s.weekly?.continuation;b;b=b.source?.weekly?.continuation)for(const r of b.reviews||[]){const run=b.runs.find(x=>x.id===r.runId);if(['M22','M26'].includes(run?.eventId))later.push({source:run.eventId,transactionId:r.transactionId,date:copy(r.date),text:r.text});}later.sort((a,b)=>ordinal(a.date)-ordinal(b.date));const h=s.extensionRoutes?.history.find(h=>h.actor==='C10'&&h.eventId==='XR10-01');return h?{source:'XR10-01',transactionId:h.transactionId,date:copy(h.date),issue:'冬衣同名份例两数不符，尚不能判定舞弊',credit:'沈眉庄指出疑点',review:later.length?'初年疑点原页保持；后来本批实际回执：'+later.map(r=>r.text).join('；'):'已交掌册处依原簿复核，正式回执未至',...(later.length?{laterReviews:later}:{}),undertaking:'本人拒绝新增长差，另循现有职掌办理'}:null;}

export const appendLateHistory=(s,h)=>append(s,h);
