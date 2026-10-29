import {RuleError} from './rules.js';
import {ordinal,validDate} from './calendar.js';
const copy=x=>structuredClone(x),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const CROSS_PAIRS={
 'C05-C09':{name:'允礼与甄嬛',actors:['C05','C09'],requires:['M06','M09']},
 'C04-C09':{name:'温实初与甄嬛',actors:['C04','C09'],requires:['M06','M08']},
 'C09-C10':{name:'甄嬛与沈眉庄',actors:['C09','C10'],requires:['M06']}
};
// Each account is heard from one person, not simultaneous knowledge of the pair.
// These scenes neither establish exclusivity nor terminate a pre-existing bond.
const accounts={
 'C05-C09/C05':{claim:'contact-not-romantic-proof',summary:'允礼亲口说与甄嬛有过诗书往来；这次没有披露恋爱承诺，也不替她回答私情。',text:'你问起甄嬛时，允礼没有把手边的笛子递来作答。\n\n“臣弟与她有过诗书往来。”他将谱页合起，“认识是谁，与心里怎样想，是两件事。若皇兄问臣弟今日说了什么，臣弟可以答；若要臣弟替她答，便越了分寸。”\n\n你没有追问一个现成的称谓。他看过案边那张谱，补道：“也不能见了笛谱，便替它添一个私下的约定。”\n\n他没有宣告从此断绝来往，也没有承认未曾说出的誓约。今日听到的是他亲口交代的往来范围；甄嬛不在此处，这段话没有自动送到她那里。'},
 'C05-C09/C09':{claim:'contact-not-romantic-proof',summary:'甄嬛亲口说与允礼有过诗书往来；认识与私情不同，她没有代答允礼的心意。',text:'你问起允礼，甄嬛先将书签压回书页。\n\n“臣妾与果郡王有过诗书往来。”她没有回避名字，“可读过同一首诗，不等于已经向彼此许下什么。臣妾自己的话，可以由臣妾说；他的心意，还须听他自己回答。”\n\n你把先入为主的问法收住，改问今日愿说到哪里。她指了一下合着的书：“便先说到认识。没有亲口说过的，不必为旁人的猜测补成一段故事。”\n\n她没有拿这次回答证明任何人已放下，也没有替允礼答应或拒绝。她说过的往来仍留着，尚未说明的部分仍未知。'},
 'C04-C09/C04':{claim:'own-affection-unresolved',summary:'温实初亲口承认自己对甄嬛有过情意，不能说已经放下；他不替她答复，并坚持医职不得换取亲密。',text:'你问起甄嬛，温实初将药箱扣好，隔了一会儿才抬眼。\n\n“臣与她是旧识。臣自己的情意，不能因今日有人问起，就答一句已经没有了。”\n\n他说得慢，也没有把自己的心意接成她曾经答应的凭据。“她如何想，应由她自己说。臣为病人尽责，不该拿诊治去换一个私下的回应。”\n\n你让他把这句话说完，没有叫他当场表忠，也没有许他以多做差事换谁回心。他再提起药箱时，手已放稳，却仍没有说自己从此放下。\n\n今日只是把他愿意承认的旧情与医职分开。往后是否改变，须看他实际怎样选择，不能由这一问替他走完。'},
 'C04-C09/C09':{claim:'own-boundary-not-others-answer',summary:'甄嬛亲口确认与温实初是旧识，说明诊治与私人答应应分开；没有代答他的当前心意。',text:'说到温实初，甄嬛没有先替他解释。\n\n“臣妾与温太医是旧识。”她将杯盏放下，“但一个人认真问诊，不该就算另一个人已经答应私情。臣妾能答的是自己说过的话，不能代他说他如今已经放下，或仍在等谁。”\n\n你问她是否愿多说，她摇了摇头：“旁的话，今日先不谈。诊治该怎样办，仍依医事的规矩。”\n\n你没有把这次止步记成她欠了一份答案。旧识仍是她亲口确认的旧识；没有说出的往事和心意，既没有被补成相爱，也没有被删成从未发生。'},
 'C09-C10/C09':{claim:'friendship-with-independent-views',summary:'甄嬛亲口把眉庄视为朋友，愿听不同意见；未披露眉庄的私情，也不替她作决定。',text:'你问起眉庄，甄嬛想了一会儿，先笑说她劝人时从不肯只拣好听的。\n\n“臣妾拿她当朋友，并不是只因她肯顺着臣妾。”她把茶推离书边，“有些事我们想得不同，也仍能把话听完。”\n\n你再问眉庄自己的打算，她没有替人作答：“那是她的话，该由她决定对谁说。臣妾可以告诉皇上自己怎样看这份交情，却不该把她私下说过的都搬到这里。”\n\n你没有继续索问。她说起自己想整理的几页散稿，语气仍从容。今日留下了她对友谊的态度，没有替两人编出一次决裂，也没有把眉庄未在场的答复添进来。'},
 'C09-C10/C10':{claim:'friendship-with-independent-views',summary:'沈眉庄亲口把甄嬛视为朋友，认为不同意见不必背弃；她不替甄嬛披露或承诺私情。',text:'提起甄嬛，沈眉庄先将手边的纸收齐，留出放茶的地方。\n\n“臣妾与她有交情，也未必每件事都同意。”她说，“朋友若只许说一样的话，倒不必来往了。”\n\n你问分歧会不会让两人生疏，她没有许下永不争执的保证：“要看是哪件事，怎样说，又怎样做。不能只因御前亲疏有变，便替我们定下互相背弃。”\n\n至于甄嬛私下的心意，她止住了话：“那一句请问她本人。臣妾今日说的，只是自己的交情与分寸。”\n\n茶仍能照常喝完。她没有以多做差事来证明友情，也没有替不在场的人表态。'}
};
const recordId=(pair,actor)=>'CROSS-'+pair+'-'+actor;
export function crossHistory(s){return s.crossRelations?.history||[];}
export function crossStatus(s,pair,actor){
 const p=CROSS_PAIRS[pair];if(!p||!p.actors.includes(actor))return {ready:false,reason:'请向这段来往的本人询问。'};
 if(crossHistory(s).some(h=>h.pair===pair&&h.actor===actor))return {ready:false,reason:'这次本人原话已记，可重读。'};
 if(s.sealed)return {ready:false,reason:'本卷已封存，只读原有记录。'};
 if(p.requires.some(id=>!s.events[id]?.completed))return {ready:false,reason:'先随主线实际见过相关人物，再问本人。'};
 return {ready:true,reason:'另谈须留合法时段；同场接问不重复占格。'};
}
export function applyCrossInquiry(s,a,tx,{spend}){
 if(Object.keys(a).some(k=>!['type','pair','actor'].includes(k)))throw new RuleError('本人相谈不接受指定结论、改心意或公开范围。');
 const status=crossStatus(s,a.pair,a.actor);if(!status.ready)throw new RuleError(status.reason);
 if(CROSS_PAIRS[a.pair].requires.some(id=>s.events[id].transactionId===tx))throw new RuleError('先提交正式相见，再另问本人。');
 if(crossHistory(s).some(h=>h.transactionId===tx))throw new RuleError('一次先听一人的原话，再分别确认其他相谈。');
 const paid=spend(a.actor),p=CROSS_PAIRS[a.pair],account=accounts[a.pair+'/'+a.actor],id=recordId(a.pair,a.actor);
 const h={id,pair:a.pair,actor:a.actor,kind:'statement',claim:account.claim,date:copy(s.date),transactionId:tx,encounter:copy(paid),visibleTo:['C01',a.actor],summary:account.summary,text:account.text};
 if(!s.crossRelations)s.crossRelations={version:1,history:[]};s.crossRelations.history.push(h);
 s.facts.push({id,text:h.summary,source:tx,date:copy(s.date),turn:s.turn,visibleTo:copy(h.visibleTo)});
 return {label:'分别听本人说 · '+p.name,detail:'只记本次实际听到的原话；不改变任何人的意愿、关系分数或旧事。',dialogue:h.text,actor:a.actor,actionCost:paid.cost,treasury:0,crossId:id};
}
export function crossContext(s,cid,suppressed=()=>false){
 const relevant=Object.entries(CROSS_PAIRS).filter(([,p])=>p.actors.includes(cid));if(!relevant.length)return null;
 return {pairs:relevant.map(([id,p])=>({id,name:p.name})),accounts:crossHistory(s).filter(h=>h.visibleTo.includes(cid)&&!suppressed(h.id)).map(h=>({id:h.id,pair:h.pair,speaker:h.actor,kind:h.kind,claim:h.claim,date:copy(h.date),transactionId:h.transactionId,text:h.summary})),rules:['只知道实际向自己说过的话；同属一段关系不代表听过另一人的私谈','本人陈述证明本人说过，不自动证明另一人的心意','前世和流言不能抹掉今生旧识、未终止的情意或友谊','未发生的婚姻、子女、相爱、背叛与放下不能补写；不同意见不等于友情破裂']};
}
export function crossReply(s,cid,input,suppressed=()=>false){
 const names={C04:'温实初|温太医',C05:'允礼|果郡王',C09:'甄嬛',C10:'眉庄|沈眉庄'};
 const p=Object.entries(CROSS_PAIRS).find(([,p])=>p.actors.includes(cid)&&new RegExp(names[p.actors.find(x=>x!==cid)]).test(input));
 if(!p)return '';
 const h=crossHistory(s).find(h=>h.pair===p[0]&&h.actor===cid&&!suppressed(h.id));
 return h?'我这次亲口说明的是：'+h.summary+' 没有替另一个人答过的话，不能添成已经知道。':'这段来往还没有在眼前分别问明。请听本人愿说的话，不凭流言或另一人的私谈替谁下结论。';
}
export function validateCrossRelations(s){
 const actions=s.transactions.flatMap(tx=>tx.actions.filter(a=>a.type==='cross-inquiry').map(a=>({tx,a})));
 if(s.crossRelations===undefined){if(actions.length||s.facts.some(f=>f.id.startsWith('CROSS-')))throw new RuleError('本世相谈缺少原话记录。');return;}
 const b=s.crossRelations;
 if(!b||b.version!==1||Object.keys(b).some(k=>!['version','history'].includes(k))||!Array.isArray(b.history)||b.history.length>6||b.history.length!==actions.length)throw new RuleError('本世相谈记录不完整。');
 const ids=new Set(),txs=new Set();let previous=-1;
 for(const h of b.history){
  const p=CROSS_PAIRS[h?.pair],account=accounts[h?.pair+'/'+h?.actor];
  if(!p||!account||h.kind!=='statement'||h.claim!==account.claim||h.id!==recordId(h.pair,h.actor)||ids.has(h.id)||txs.has(h.transactionId)||Object.keys(h).some(k=>!['id','pair','actor','kind','claim','date','transactionId','encounter','visibleTo','summary','text'].includes(k))||!same(h.visibleTo,['C01',h.actor])||!validDate(h.date)||ordinal(h.date)>ordinal(s.date)||typeof h.text!=='string'||h.text.length>3000||typeof h.summary!=='string'||h.summary.length>600)throw new RuleError('本世相谈对象、范围或原话字段错误。');
  const index=s.transactions.findIndex(t=>t.id===h.transactionId),tx=s.transactions[index],a=tx?.actions.find(a=>a.type==='cross-inquiry'),result=tx?.results.find(r=>r.crossId===h.id),fact=s.facts.filter(f=>f.id===h.id);
  if(index<=previous||!a||tx.actions.length!==1||a.pair!==h.pair||a.actor!==h.actor||Object.keys(a).length!==3||!result||result.actor!==h.actor||result.dialogue!==h.text||![0,1].includes(result.actionCost)||result.treasury!==0||!same(tx.date,h.date)||fact.length!==1||fact[0].source!==tx.id||fact[0].text!==h.summary||!same(fact[0].date,h.date)||!same(fact[0].visibleTo,h.visibleTo))throw new RuleError('本世相谈缺少同日真实事务和知情来源。');
  for(const id of p.requires){const e=s.events[id],t=s.transactions.findIndex(t=>t.id===e?.transactionId);if(!e?.completed||t<0||t>=index||ordinal(e.date)>ordinal(h.date))throw new RuleError('本世相谈不能早于正式相见。');}
  if(!h.encounter||h.encounter.cost!==result.actionCost||Object.keys(h.encounter).some(k=>!['cost','sceneId','planId'].includes(k)))throw new RuleError('本世相谈缺少实际时段。');
  const inherited=s.weekly?.migration?.source.crossRelations?.history.find(x=>x.id===h.id);
  if(inherited){if(!same(h,inherited))throw new RuleError('季度相谈原记录不能在迁移后改写。');}
  else if(h.encounter.cost===1){
   if(Object.keys(h.encounter).length!==1)throw new RuleError('另谈时段不能伪作同场。');
   if(s.weekly){const used=Object.values(s.weekly.consumed).filter(c=>c.source==='CROSS-'+h.transactionId);if(used.length!==1||used[0].slots!==1||Math.floor(used[0].at/2)+1!==ordinal(h.date))throw new RuleError('另谈未留下实际一格核销。');}
  }else{
   if(!s.weekly||Object.keys(h.encounter).length!==2)throw new RuleError('同场接问须有实际相见来源。');
   const scene=h.encounter.sceneId&&s.transcripts[h.encounter.sceneId],plan=h.encounter.planId&&s.weekly.plans.find(p=>p.id===h.encounter.planId),sourceTx=scene?.transactionId||plan?.completedTransaction,sourceIndex=s.transactions.findIndex(t=>t.id===sourceTx);
   if(sourceIndex<0||sourceIndex>=index||scene&&(scene.actor!==h.actor||!/^(R|XR)/.test(scene.eventId)||!same(scene.date,h.date))||plan&&(plan.status!=='completed'||plan.actor!==h.actor&&!plan.guests?.includes(h.actor)||!same(plan.date,h.date))||!scene&&!plan||s.transactions.slice(sourceIndex+1,index).some(t=>t.results.some(r=>r.actionCost>0)))throw new RuleError('同场接问与实际相见不符。');
  }
  ids.add(h.id);txs.add(h.transactionId);previous=index;
 }
 if(s.facts.some(f=>f.id.startsWith('CROSS-')&&!ids.has(f.id)))throw new RuleError('本世相谈事实没有原话来源。');
}
export function assertCrossNarrative(value,ctx){
 if(!ctx.mandatory.crossRelations)return;
 // Bounded guard for explicit unsupported conclusions; the context also carries
 // the epistemic limits. It is not a claim of complete natural-language proof.
 for(const clause of value.text.split(/[。！？；\n]/)){
  if(!/甄嬛|眉庄|允礼|果郡王|温实初|温太医/.test(clause))continue;
  if(/不能|并未|没有|尚未|未曾|不等于|不代表|未知|不得/.test(clause))continue;
  if(/已(?:经)?(?:相爱|成婚|定情|有了孩子|放下|背叛|出轨|断绝|决裂)|早已放下|私定终身|(?:出轨|背叛|私通)(?:了|过)|是(?:我的)?恋人|不再有情意|从未有过情意/.test(clause))throw new RuleError('这段本世关系没有支持该结论的实际记录，保留本人原话。');
 }
}
