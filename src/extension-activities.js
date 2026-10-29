// New experiences share the existing appointment/inventory ledger. Old text is never regenerated.
import {extensionRelation,extensionWork} from './extension-routes.js';
import {EXTENSION_PEOPLE} from './extension-content.js';
import {RuleError} from './rules.js';
import {season,ordinal} from './calendar.js';
import {memorySuppressed} from './memory-book.js';
export const isExtensionActor=cid=>Object.hasOwn(EXTENSION_PEOPLE,cid);
export const extensionActivityKinds=['chat','meet','walk','gift','bond'];
const past=(s,cid,kind)=>(s.weekly?.activities?.entries||[]).filter(e=>e.actor===cid&&e.visibleTo.includes(cid)&&(!kind||e.kind===kind)&&!extensionActivitySuppressed(s,e.id));
export function extensionActivityPhase(s,cid){return extensionRelation(s,cid).nodes.includes(EXTENSION_PEOPLE[cid].first)?2:1;}
const bounded=r=>['仅合作','暂缓','终止恋爱'].includes(r.playerIntent)||['仅合作','暂缓','终止恋爱'].includes(r.npcIntent);
function boundary(s,cid){const r=extensionRelation(s,cid);return r.unresolvedGift?'暖阁中曾回避的疑问仍在，她没有把今日能说笑当成已经得到回答。':bounded(r)||r.requiresRenewal?'这段相处照已经说清的分寸进行。愿意谈诗、喝茶或同行，不替任何一方更改私情答复。':'这一刻愿意相谈，往后的心意仍须分别问过。';}
export function extensionActivityScene(s,p){
 const cid=p.actor,a=p.activity,phase=extensionActivityPhase(s,cid),walk=p.kind==='walk',sources=[],variantId=`AC-${cid}-${walk?'W':'T'}${phase}`,old=past(s,cid,walk&&a.topic!=='shared'?'walk':null).filter(e=>['chat','meet','walk'].includes(e.kind)).at(-1);
 const first=s.transcripts[EXTENSION_PEOPLE[cid].first],knownFirst=first&&!memorySuppressed(s,'experience',first.eventId)&&!memorySuppressed(s,'fact','FACT_'+first.eventId);
 let text;
 if(cid==='C09'){
  text=walk?(phase===1?'甄嬛在岔路前停住，指了指靠水的一边：“臣妾今日想走这里。皇上看那枝花像在等春，臣妾倒觉得，是它自己先开了。”她说完笑起来，没有等你替这处景色定下唯一的意思。':'走到转角，甄嬛先把脚步放慢：“今日看它，又与从前想的不同。人总可以换一种读法，不必为上回说过的话，把自己定住。”'):(phase===1?'甄嬛翻开今日读的一首诗，却没有先问你喜欢什么：“这一句写得安静，臣妾读来倒有些不甘。皇上听出来的是哪一种？”她把两句连起来读了一遍，留着自己的重音。':'甄嬛将诗页转向你，指出一个被略过的转折：“这一处臣妾改了读法。上次可以不同意，这次也一样；只是想把为什么改了，讲完。”她没有拿相熟换一句敷衍的赞许。');
 }else{
  text=walk?(phase===1?'路旁两名宫人正交接灯油，沈眉庄没有将她们叫来候问，只等原有的交班做完。“皇上今日愿听一句不顺耳的话，还是只看花？”她指向墙边的菊影，“臣妾可以说真话，也有只想走走的时候。”':'沈眉庄把袖中一张记事纸收好：“今日不带账。上回意见不同，也不妨碍这一段路好好走完。”她选了较静的方向，问你是否也愿把急着回答的那句话先放一放。'):(phase===1?'沈眉庄将杯盖揭开，先闻了闻茶：“今日想先听一件小事，还是问账？”她没有因你坐下便领一份新差事。窗下的菊还未全开，她倒先说起自己如何挑那盆花。':'沈眉庄将茶推到光里，笑说昨日看错了一片叶影，白等它开花。说完又认真问：“皇上也会为一件小事猜错么？”她愿意听你的解释，仍不必把不同意见改成附和。');
 }
 if(walk)text=`${season(s.date)}日，${a.place==='corridor'?'避风长廊':'御园小径'}。${{春:'新芽从檐边探出。',夏:'走在阴影里，暑气渐轻。',秋:'落叶沿石阶翻过。',冬:'寒风留在廊外，脚步慢下来。'}[season(s.date)]}\n\n`+text;
 if(phase===2&&knownFirst){sources.push(first.eventId);text+=`\n\n你提到真正说过的「${first.choice}」。她记着那次回答，今日仍能有自己的意见。`;}
 if((a.topic==='shared'||walk)&&old){sources.push(old.id);text+=`\n\n你们提起${old.date.month}月${old.date.day}日的「${old.title}」。她认得当时的那句话：“${old.text.split('\n\n')[0]}”\n旧话仍留着，今日没有被当成第一次相见。`;}
 else if(a.topic==='shared')text+='\n\n没有另外一段已经共同走过的日常，便只谈今日，不补写从前的同行。';
 if(a.topic==='project')text+='\n\n'+(cid==='C10'?(extensionWork(s)?.review||'眼下没有她已经提出并核过的账务回报')+'。她说，公事依证据核验，是否愿意另接差事须再问本人。':'她没有亲眼核过的回报，便不替旁人定论：“有原始记录，再谈它能说明什么。”');
 if(a.topic==='wish')text+='\n\n'+(cid==='C09'?'“下回想挑一首自己还没读懂的。可以承认不懂，不急着给它一个好听的答案。”':'“想有半日不被夸勤勉，只照自己的心意喝完一盏茶。”她说得很平常，并不觉得这愿望需要请罪。');
 text+='\n\n'+(a.choice==='share'?(cid==='C09'?'你说出另一种理解。她摇头笑道：“臣妾还是不这样想。两种意思都留着，倒比改成一句更有趣。”':'你也说起自己的看法。她先听完，再指出其中不赞同的一处：“能听批评，与每回都想得周全，是两件事。”'):(cid==='C09'?'你没有替她补上末句，等她把不同的意思说完。她将诗页收回：“今日说到这里便好，下一次想不想再谈，到时再问。”':'你听她把话说完，没有顺势添一件差事。她将杯盖放稳：“茶喝完了，臣妾还有自己想做的事。”'));
 text+='\n\n'+boundary(s,cid);return {text,sources,variantId};
}
export function extensionGift(s,cid,g,{repeat}){
 const r=extensionRelation(s,cid),phase=extensionActivityPhase(s,cid),old=past(s,cid,'gift-result').filter(e=>e.accepted).at(-1),accept=g.likedBy.includes(cid)&&!repeat&&!r.unresolvedGift&&r.playerIntent!=='终止恋爱'&&r.npcIntent!=='终止恋爱';
 let text=cid==='C09'?(phase===1?'甄嬛先看了新物的样式：“颜色想自己挑，写什么也想自己定。皇上不必拿旁人的喜好替臣妾作答。”':'甄嬛先问这次的用途，没有把又一份礼当成已经回答旧问题。'):(phase===1?'沈眉庄没有立刻谢赏，先问这件新物预备怎样用：“茶想自己定浓淡，册页也想留几页写窗下的花。若是另有差事，还请分开说。”':'沈眉庄看了一眼新物，笑说自己的册页也可以写花，不必每一页都是宫账。');
 if(old)text+=`\n\n她提到${old.date.month}月${old.date.day}日实际收下的那件新物，至于怎样用了，仍由她自己说，不补成已经完成的作品。`;
 text+='\n\n'+(accept?(cid==='C09'?`她答应收下这件${g.name}，保留自己选择用途与题字的余地：“这一件先留着，往后的话另说。”`:`她收下${g.name}：“这是臣妾自己愿收的物件，不是接下新差事的凭据。”`):r.unresolvedGift?'她将新物轻轻推回：“暖阁里未答的话，还想先听明白。请别再用添赏换一个话题。”东西仍在匣中，旧赏与旧话并未抹去。':repeat?'她记得已经收过同样的新物：“那一份还在，这一件先留着吧。”这次没有再收，也没有重领初次的回应。':r.playerIntent==='终止恋爱'||r.npcIntent==='终止恋爱'?'她按已经说清的距离婉拒：“今日不想收，请先留在皇上那里。”原有职责与待遇不因此改变。':'她坦言这一件眼下不合用，请你留着。拒收后物品仍在匣中，不换成一份虚记的人情。');
 text+='\n\n'+boundary(s,cid);return {text,accept,variantId:`AC-${cid}-G${phase}`,sources:old?[old.id]:[]};
}
export function extensionFollowup(s,cid,choice){return (cid==='C09'?(choice==='share'?'你补上方才不同意的一处。甄嬛没有改口：“听见了，不过臣妾仍想留自己的答案。”':'甄嬛把方才的末句说完：“不必急着赞同，先让我自己说明白。”'):(choice==='share'?'你将自己的看法说清。沈眉庄听过仍指出疑处：“能坐着说不同的话，已比各自猜测好。”':'沈眉庄轻声补了一句：“今日的茶是今日的茶。没有回执的账，仍不能替它写上已清。”'))+'\n\n'+boundary(s,cid);}
export function extensionActivityEcho(s,cid,input){if(!/上回|上次|散步|送礼|那份|还记得/.test(input))return null;return past(s,cid).filter(e=>['chat','meet','walk','gift-result','followup'].includes(e.kind)).at(-1)?.text||null;}

export function validateExtensionActivities(s){
 const b=s.weekly?.activities;if(!b)return;
 const fail=()=>{throw new RuleError('扩展活动缺少本人、实际前置、原文或知情来源。');};
 const index=id=>s.transactions.findIndex(t=>t.id===id);
 for(const p of s.weekly.plans.filter(p=>isExtensionActor(p.actor)&&p.activity)){
  if(!extensionActivityKinds.includes(p.kind)||!s.events.M06?.completed||index(s.events.M06.transactionId)<0||index(p.createdTransaction)<=index(s.events.M06.transactionId))fail();
 }
 for(const e of b.entries.filter(e=>isExtensionActor(e.actor))){
  if(!['chat','meet','walk','gift','gift-result','followup','bond'].includes(e.kind)||JSON.stringify(e.visibleTo)!==JSON.stringify([e.actor]))fail();
  const p=s.weekly.plans.find(p=>p.id===e.source&&p.actor===e.actor&&p.status==='completed'),t=s.transcripts[e.source],sh=b.shipments.find(sh=>sh.id===e.source&&sh.actor===e.actor&&sh.kind==='gift'&&sh.status==='answered');
  if(!p&&!sh&&!(t?.actor===e.actor&&t.eventId.startsWith('XR')))fail();
  const receipt=p&&['chat','meet','walk','gift','bond'].includes(e.kind)?s.transactions.find(tx=>tx.id===p.completedTransaction):s.transactions.find(tx=>tx.results.some(r=>r.dialogue===e.text)&&tx.actions.some(a=>a.actor===e.actor&&a.type.startsWith('activity-')||sh&&a.type==='activity-receive'&&a.shipmentId===sh.id))||s.transactions.find(tx=>tx.id===p?.completedTransaction);
  if(!receipt||!receipt.results.some(r=>r.dialogue===e.text)||ordinal(receipt.date)!==ordinal(e.date)||index(receipt.id)<=index(s.events.M06?.transactionId))fail();
  if(e.kind!=='followup'&&e.kind!=='gift'&&e.kind!=='bond'){
   const first=s.events[EXTENSION_PEOPLE[e.actor].first],phase=first&&index(first.transactionId)<index(receipt.id)?2:1,type=e.kind==='walk'?'W':e.kind==='gift-result'?'G':'T';
   if(e.variantId!==`AC-${e.actor}-${type}${phase}`)fail();
  }
  if(!Array.isArray(e.sources)&&e.kind!=='followup')fail();
  for(const id of e.sources||[]){const old=b.entries.find(x=>x.id===id),scene=s.transcripts[id];if(old?old.actor!==e.actor||!old.visibleTo.includes(e.actor)||b.entries.indexOf(old)>=b.entries.indexOf(e):!scene||scene.actor!==e.actor||index(scene.transactionId)>=index(receipt.id))fail();}
  if(e.kind==='gift-result'&&(e.reward!==0||!b.inventory.some(i=>i.id===e.itemId&&i.giftId===e.giftId&&ordinal(i.acquiredAt)<=ordinal(e.date))))fail();
 }
}

// Retrieval follows sources; the stored original remains available for deliberate rereading.
export function extensionActivitySuppressed(s,id,seen=new Set()){
 if(seen.has(id))return true;seen.add(id);
 if(memorySuppressed(s,'fact',id)||memorySuppressed(s,'activity',id)||memorySuppressed(s,'experience',id))return true;
 const e=s.weekly?.activities?.entries.find(e=>e.id===id&&isExtensionActor(e.actor));
 const m=s.weekly?.relationships?.messages.find(m=>'INITIATIVE_'+m.id===id&&isExtensionActor(m.actor));
 return (e?.sources||m&&[m.source]||[]).some(source=>extensionActivitySuppressed(s,source,new Set(seen)));
}
