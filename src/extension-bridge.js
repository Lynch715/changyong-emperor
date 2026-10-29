import {RuleError} from './rules.js';
import {extensionRelation} from './extension-routes.js';

// Preparatory mainline choices only. Full XR routes and their consent stages belong to S12.
export const BRIDGE_ACTORS={C09:'甄嬛',C10:'沈眉庄'};
export const ATTITUDE_LABELS={unspoken:'私下的话，留待以后',open:'愿意慢慢了解你本人',none:'依礼相待，不另许私情',unsure:'眼下未定，不请你等候'};
const replies={
 C09:{
  open:'散后，你单独叫住甄嬛：“方才问的是宫里的事。若论私下，朕愿听你自己的话，慢慢了解你。”\n\n她原已迈出一步，听见“自己的话”，才回过身：“那下回臣妾若答得不合皇上心意，也请容臣妾说完。”你应了，她却没有因此靠近，只将想读的一本书名告诉你。相识多了一句话，离交心还远。',
  none:'散后，你单独向甄嬛说明：“份例与礼遇照旧。私情上，朕不另许你一句话。”\n\n她的笑停了片刻，随即问：“那臣妾往后有话，还能照实说么？”你说能。她欠身告退，没有谢赏，也没有追问如何才能讨得欢心。这句话并不轻快，却让她不必日日猜哪一次召见另有含义。',
  unsure:'散后，你单独向甄嬛说道：“朕眼下尚未想定。不能为留住今日的好意，叫你等一个未定的答复。”\n\n她看着你，过了一会儿才道：“臣妾听明白了。臣妾自己的心意，也还须自己想。”她将手从袖中松开，依礼退下。今日没有约期，也没有谁替谁许下等候。'
 },
 C10:{
  open:'散后，你单独问沈眉庄：“除了殿前的答问，朕也愿慢慢了解你这个人。”\n\n她先看了一眼案上名册：“臣妾能做什么，与臣妾愿不愿亲近，应是两件事。”你将名册合上。她这才说起家中窗下的一盆菊，语气松了一点：“皇上若愿听，也容臣妾有不愿说的时候。”她留下一件小事，没有交出自己的决定。',
  none:'散后，你单独向沈眉庄说明，礼遇如常，私情不另作许诺。\n\n她安静听完，将衣袖理齐：“臣妾明白。若日后问到宫账，臣妾仍会照实答；不妥的，也仍会指出。”你点头，她才告退。她的本领没有因这句话被收走，也不必拿多做一份差事换一个私下的回心。',
  unsure:'散后，你单独向沈眉庄坦言：“眼下尚未确定，朕不请你替朕等候。”\n\n她望着庭中日影，回道：“人心确有不能催的时候。那便各自想清楚，再说各自的话。”你再问起理账，她没有借此表忠，只说须见原簿才知难处。她保留了批评与拒绝的余地，今日的一句坦白也没有变成一桩差事。'
 }
};

export function validateAttitudeParams(eventId,params){
 if(eventId!=='M06')return;
 if(params===undefined)return;
 if(!params||typeof params!=='object'||Array.isArray(params)||Object.keys(params).some(k=>k!=='attitudes'))throw new RuleError('请分别选择散后想对两人说的话。');
 const a=params.attitudes;if(a===undefined)return;
 if(!a||typeof a!=='object'||Array.isArray(a)||Object.keys(a).some(k=>!Object.hasOwn(BRIDGE_ACTORS,k))||Object.values(a).some(v=>!Object.hasOwn(ATTITUDE_LABELS,v)))throw new RuleError('散后表态的对象或措辞不在本场选择中。');
}
function savedEntries(s,cid){
 return ['M06','M11'].flatMap(id=>{const e=s.events[id],t=s.transcripts[id];if(!e?.completed||!t?.bridge||t.transactionId!==e.transactionId)return [];return t.bridge.filter(b=>b.actor===cid).map(b=>({...b,eventId:id,choiceId:e.outcomeId,date:structuredClone(t.date),transactionId:t.transactionId}));});
}
export function bridgeContext(s,cid){
 if(!Object.hasOwn(BRIDGE_ACTORS,cid))return null;
 const history=savedEntries(s,cid),m11=s.events.M11?.completed?s.events.M11:null;
 let intent='unspoken';for(const b of history)if(['open','none','unsure'].includes(b.intent))intent=b.intent;
 // Older clear only establishes respect for her identity, never an unrecorded romantic decision.
 if(cid==='C09'&&m11&&!s.transcripts.M11?.bridge&&m11.outcomeId==='polite')intent='none';
 const ambiguous=cid==='C09'&&m11?.outcomeId==='vague',identityClarified=cid==='C09'&&m11&&['clear','open','unsure'].includes(m11.outcomeId);
 if(!history.length&&!m11&&!s.events.M06?.completed)return null;
 return {playerIntent:intent,npcConsent:'尚未建立恋爱关系',identityClarified:!!identityClarified,unresolvedGift:!!ambiguous,history,
  rules:['这些是本人实际听到的话，不能推断另一人的私谈','愿意了解仅是玩家态度；NPC可以保留、拒绝和改变想法','礼遇、职业成果、友谊及赏物不代表答应恋爱','只说明不比较旧人，不代表明确无意或已经相爱','含混赏赐的花费与未答问题保留，后续须实际补谈']};
}
export function bridgeEntries(s,e,choice,params){
 if(e.id==='M06')return Object.entries(params?.attitudes||{}).filter(([,v])=>v!=='unspoken').map(([actor,intent])=>({actor,intent,reply:replies[actor][intent]}));
 if(e.id!=='M11')return [];
 const prior=bridgeContext(s,'C09'),intent=({polite:'none',open:'open',unsure:'unsure'})[choice.id]||'unspoken';
 // A later poem or boundary is more recent than the palace introduction. Read it
 // before this M11 transaction, without editing either stored conversation.
 const priorIntent=s.extensionRoutes?.history.some(h=>h.actor==='C09')
  ?({'愿发展':'open','仅合作':'none','终止恋爱':'none','暂缓':'unsure'})[extensionRelation(s,'C09').playerIntent]
  :prior?.playerIntent;
 const changed=['open','none','unsure'].includes(priorIntent)&&intent!=='unspoken'&&intent!==priorIntent;
 const reply=changed?'甄嬛没有立刻接过这句新话：“上次皇上说的，臣妾还记得。今日改了意思，也请容臣妾自己再想一想。”你没有催她照新的意思答应。先前那句话仍留在你们说过的旧事里。':'';
 return [{actor:'C09',intent,reply}];
}
export function bridgeDialogue(base,entries,eventId){
 const additions=entries.map(b=>b.reply).filter(Boolean);if(!additions.length)return base;
 if(eventId==='M11'){const [first,...rest]=base.split('\n\n');return [first,...additions,...rest].join('\n\n');}
 return [base,...additions].join('\n\n');
}
export function attitudeEcho(s,e){
 if(e.id!=='M11')return '';
 const first=s.transcripts['XR09-01'];
 if(s.events['XR09-01']?.completed&&first){
  const r=extensionRelation(s,'C09'),distance={
   '愿发展':'读诗后，你说愿意慢慢了解她；她留下了自己的读法，没有因此许下私情。今日的新衣不能替她作第二次回答。',
   '仅合作':'后来你们已把私情的距离说清。她今日问旧影，是要被当作自己看待，不是在请求你收回合作的分寸。',
   '暂缓':'后来你说尚未想定，不请她等候。她没有将未定当成许诺；今日仍可以问清自己是否被当作旁人的影子。',
   '终止恋爱':'后来你已明确停止私情。那句话没有因今日再见便撤回；她仍有权问清旧影，也不欠一个重新亲近的答复。'
  }[r.playerIntent];
  return ['碎玉轩读诗那一回，你们说过两种不同的解释。她没有改成你的读法，你也没有替她收走那一页。',distance].filter(Boolean).join('\n\n');
 }
 const b=bridgeContext(s,'C09');if(!b?.history.length)return '';
 return ({open:'她进来时，记起殿前散后你说愿意慢慢了解。正因记着，她才不愿将今日的疑问轻轻放过。',none:'殿前散后，你曾清楚说过不另许私情。她今日问的是自己是否被当作旧影，不是来要求你收回那句话。',unsure:'殿前散后，你曾说心意尚未确定，不请她等候。她没有拿今日的新衣当成答案，却仍想问清你究竟看见了谁。'})[b.playerIntent]||'';
}
export function bridgeSummary(s,cid){
 const b=bridgeContext(s,cid);if(!b)return '';
 if(b.unresolvedGift)return '甄嬛收下的赏物仍在，暖阁里没喝完的那盏茶也留在旧事中。你没有回答她问的是谁，花去的钱与那句未答都没有因合卷消失；下一回仍欠一次坦白，而非一份更重的赏。';
 const lead=cid==='C09'?'甄嬛':'沈眉庄';
 return lead+'：'+({open:'你说过愿意了解她本人。她也说过自己的顾虑；如今只是留下一次可以继续谈的开头，谁也没有替她答应往后。',none:'你把不另许私情的话说清。来往仍可依礼，才能与应得的份例也不因此减去；不发展感情，同样是有落款的选择。',unsure:'你没有把未定说成许诺，她也保留着自己的想法。往后若再谈，要重新听双方的答复，不能把这一段留白写成已在等候。',unspoken:cid==='C09'&&b.identityClarified?'你说明她不该成为旁人的影子。这个回答还没有替你们决定私情，旧影之外的她，仍待真正相识。':'这段时日见过面，也有各自说过的话。私情尚未表明，往后的一页仍空着，不必靠猜测填满。'})[b.playerIntent];
}
export function bridgeReply(s,cid,input){
 if(!BRIDGE_ACTORS[cid]||!/心意|私情|喜欢|爱|旧影|纯元|赏|怎么想|记得/.test(input))return '';
 const b=bridgeContext(s,cid);if(!b)return '你还没有向我说过这件事。若要相问，先从眼前的话说起吧。';
 if(b.unresolvedGift)return '那日的赏物臣妾收到了。可臣妾问皇上看见的是谁，至今没有得到回答。添一份赏，不能替那句话作答。';
 return ({open:cid==='C09'?'皇上说愿意听臣妾自己的话，臣妾记得。只是认识一个人，总得容她有不合心意的答复；此刻还没有谁替往后作过保证。':'臣妾记得皇上愿意慢慢了解。可理账归理账，人心归人心；臣妾愿说的会自己说，也请留着不愿的余地。',none:'皇上说过不另许私情，臣妾听明白了。往后照实说话、依礼来往便好，不必拿赏赐催谁换一种回答。',unsure:'皇上说尚未确定，臣妾记得。臣妾也有自己的想法；没有约定过等候，便不把留白当作许诺。',unspoken:b.identityClarified?'皇上说不拿臣妾与旧人相比，臣妾听见了。可这与往后怎样相处，仍是两句话。':'私下的心意还没有说清，臣妾不敢只凭礼遇替皇上猜。'})[b.playerIntent];
}
export function validateBridges(s){
 for(const [id,t] of Object.entries(s.transcripts)){
  if(t.bridge===undefined)continue;
  const e=s.events[id];
  if(!['M06','M11'].includes(id)||!e?.completed||t.eventId!==id||t.transactionId!==e.transactionId||JSON.stringify(t.date)!==JSON.stringify(e.date)||!Array.isArray(t.bridge)||t.bridge.length>(id==='M06'?2:1)||t.bridge.some(b=>!b||typeof b!=='object'||Array.isArray(b))||new Set(t.bridge.map(b=>b.actor)).size!==t.bridge.length)throw new RuleError('散后表态缺少实际场景来源。');
  const tx=s.transactions.find(tx=>tx.id===t.transactionId),a=tx?.actions.find(a=>a.type==='event'&&a.eventId===id&&a.choiceId===e.outcomeId);
  if(!a)throw new RuleError('散后表态缺少已提交的原话。');
  validateAttitudeParams(id,a.params);
  for(const b of t.bridge){const expected=id==='M06'?a.params?.attitudes?.[b.actor]:({polite:'none',open:'open',unsure:'unsure'})[e.outcomeId]||'unspoken';if(!Object.hasOwn(BRIDGE_ACTORS,b.actor)||id==='M11'&&b.actor!=='C09'||b.intent!==expected||id==='M06'&&b.intent==='unspoken'||typeof b.reply!=='string'||b.reply.length>1500)throw new RuleError('人物表态与实际选择不符。');}
  if(id==='M06'&&t.bridge.length!==Object.values(a.params?.attitudes||{}).filter(v=>v!=='unspoken').length)throw new RuleError('散后表态记录不完整。');
  if(id==='M11'&&t.bridge.length!==1)throw new RuleError('暖阁表态记录不完整。');
  if(id==='M06'&&(typeof t.publicDialogue!=='string'||!t.dialogue.startsWith(t.publicDialogue)))throw new RuleError('殿前与私谈原文不一致。');
 }
}
