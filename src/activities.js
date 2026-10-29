import {partnerRelation,extensionBondReady,partnerBondText,validatePartnerLife} from './partner-life.js';
import {horizonDay} from './longform.js';
import {isExtensionActor,extensionActivityKinds,extensionActivityScene,extensionGift,extensionFollowup,extensionActivityEcho,validateExtensionActivities} from './extension-activities.js';
import {giftStory,banquetExchange,BANQUET_END} from './social-story.js';
import {knownRouteMoment,routeActivityEcho} from './relation-story.js';
import {ACTIVITY_TOPICS,TALK_CHOICES,WALK_PLACES,BANQUET_THEMES,BOND_MODES,GROWTH,ACTIVITY_VOICES,GIFTS} from './activity-content.js';
import {RELATION_STAGES,isBounded} from './relationship-content.js';
import {relationshipRecord,ensureRelationships} from './relationships.js';
import {relationshipUnlocked} from './relationship-schedule.js';
import {NAMES} from './content.js';
import {ordinal,addDays,validDate,season} from './calendar.js';
import {RuleError} from './rules.js';
const cp=x=>structuredClone(x),book=s=>s.weekly?.activities,uuid=()=>crypto.randomUUID();
const own=(o,k)=>Object.hasOwn(o,k),now=s=>cp(s.date);
export const giftById=id=>GIFTS.find(g=>g.id===id);
export function ensureActivities(s){if(!book(s))s.weekly.activities={version:1,cutover:now(s),entries:[],inventory:[],shipments:[],growth:[],giftRewards:{}};return book(s);}
function fact(s,id,text,actors,source){s.facts.push({id,text,date:now(s),turn:s.turn,visibleTo:[...new Set(['C01',...actors])],source});}
function entry(s,x){const b=ensureActivities(s),e={id:'AC-'+uuid(),date:now(s),...x};b.entries.push(e);fact(s,e.id,e.text,e.visibleTo,e.source);return e;}
const active=p=>['accepted','executing'].includes(p.status);
export function sameActivityMoment(s,p){return !s.sealed&&p.status==='completed'&&ordinal(p.date)===ordinal(s.date)&&Object.values(s.weekly.consumed).sort((a,b)=>a.at-b.at).at(-1)?.source===p.id;}
export function itemAvailable(s,id,exclude=null){const item=book(s)?.inventory.find(i=>i.id===id);return item?.status==='held'&&!s.weekly.plans.some(p=>p.id!==exclude&&active(p)&&p.activity?.itemId===id);}
export function bondAllowed(s,cid,mode){if(isExtensionActor(cid))return extensionBondReady(s,cid,mode);const cfg=BOND_MODES[mode],r=s.relations[cid];return !!cfg&&!!r&&r.playerIntent==='愿发展'&&r.npcIntent==='愿发展'&&RELATION_STAGES.indexOf(r.stage)>=RELATION_STAGES.indexOf(cfg.stage)&&!relationshipRecord(s,cid).issues.length&&!relationshipRecord(s,cid).requests.some(r=>r.status==='pending');}
export function configureActivity(s,p,a){
 if(p.legacyPromiseId||a.legacyPromiseId||p.eventId)return;
 a={...a.activity,...a};
 if(isExtensionActor(p.actor)&&!extensionActivityKinds.includes(p.kind))throw new RuleError('此处先安排交谈、散步或送礼；伴侣相处须等实际心意与阶段齐备。');
 ensureActivities(s);
 if(['chat','meet','letter','walk'].includes(p.kind)){
  const topic=a.topic||'recent',choice=a.choice||'listen',place=a.place||'garden';
  if(!own(ACTIVITY_TOPICS,topic)||!own(TALK_CHOICES,choice)||p.kind==='walk'&&!own(WALK_PLACES,place))throw new RuleError('请选择已开放的话题、回应或散步地点。');
  p.activity={version:1,topic,choice,place};
  if(p.kind==='letter'&&ordinal(p.date)>horizonDay(s)-14)throw new RuleError('信与回信需两程七日，请在本卷尚有递送时间时安排。');
 }
 if(p.kind==='banquet'){
  const theme=a.theme||'music',seats=a.seats||p.guests;
  if(!own(BANQUET_THEMES,theme)||!Array.isArray(seats)||seats.length!==p.guests.length||new Set(seats).size!==seats.length||seats.some(c=>!p.guests.includes(c)))throw new RuleError('主题或座次须对应本席宾客。');
  p.money=BANQUET_THEMES[theme].money;p.activity={version:1,theme,seats:cp(seats)};
 }
 if(['study','training','rest'].includes(p.kind)){
  const exercise=a.exercise||Object.keys(GROWTH[p.kind].steps)[0];if(!own(GROWTH[p.kind].steps,exercise))throw new RuleError('请选择本方向的练习。');p.activity={version:1,exercise};
 }
 if(p.kind==='bond'){
  const mode=a.mode||'quiet';if(!bondAllowed(s,p.actor,mode))throw new RuleError('双方当前意愿、阶段或未补谈事项尚不适合这段亲近，可以先普通相处。');
  if(['night','stay'].includes(mode)&&p.period!=='evening')throw new RuleError('夜谈与留宿请安排在晚间。');p.activity={version:1,mode,consent:true,agreedStage:partnerRelation(s,p.actor).stage,playerIntent:partnerRelation(s,p.actor).playerIntent,npcIntent:partnerRelation(s,p.actor).npcIntent,...(isExtensionActor(p.actor)||mode==='daily'?{partnerLifeVersion:1}:{})};
 }
 if(p.kind==='gift'){
  if(!itemAvailable(s,a.itemId,p.id))throw new RuleError('这件新物不在手中，或已留给另一份约定。');p.activity={version:1,itemId:a.itemId};
 }
 if(p.kind==='craft'){
  const gift=giftById(a.giftId);if(!gift)throw new RuleError('没有这份材料样式。');p.money=gift.price;p.activity={version:1,giftId:gift.id};
 }
}
export function assertActivityStart(s,p){
 if(!p.activity)return;
 if(p.kind==='gift'&&!itemAvailable(s,p.activity.itemId,p.id))throw new RuleError('约定中的礼物已不在手中，本次未扣费。');
 if(p.kind==='bond'&&!bondAllowed(s,p.actor,p.activity.mode))p.activity.paused=true;
}
function priorEntry(s,cid){return book(s)?.entries.filter(e=>e.visibleTo.includes(cid)&&['chat','meet','walk','letter-reply','bond'].includes(e.kind)).at(-1);}
function shared(s,cid){const prior=priorEntry(s,cid),t=knownRouteMoment(s,cid);if(prior&&(!t||ordinal(prior.date)>=ordinal(t.date)))return {text:`你提起${prior.date.month}月${prior.date.day}日的「${prior.title}」，那时你选的是「${prior.choiceLabel||'把话听完'}」。`,source:prior.id};const echo=routeActivityEcho(s,cid,t);return t?{text:`你提起真正走过的「${t.title}」，当时说的是「${t.choice}」。`+(echo?'\n\n'+echo.text:''),source:t.eventId}:null;}
function projectTopic(s,cid){const fs=s.facts.filter(f=>f.visibleTo.includes(cid)&&/项目|回报|轮值|签领|县库|取水/.test(f.text)&&!f.id.startsWith('AC-'));return fs.at(-1);}
function sceneText(s,p){
 if(isExtensionActor(p.actor))return extensionActivityScene(s,p);
 const cid=p.actor,v=ACTIVITY_VOICES[cid],a=p.activity,echo=shared(s,cid),related=projectTopic(s,cid),weather={春:'风掠过新芽，脚下的光细碎而明亮。',夏:'檐影把暑气隔开，远处一阵蝉声又停下来。',秋:'一片落叶沿着石阶翻过，衣袖间已有凉意。',冬:'寒意停在廊外，走到背风处，脚步便放得更慢。'}[season(s.date)],repeat=book(s)?.entries.some(e=>e.actor===cid&&e.topic===a.topic&&['chat','meet','walk','letter-reply'].includes(e.kind));
 if(p.kind==='walk'&&cid==='C01')return {text:`${season(s.date)}日的${WALK_PLACES[a.place]}。${weather}${a.place==='corridor'?'檐下风声渐轻，你没有召人来陪，独自把步子放慢。':'你绕过一处花影，看见日光从枝叶间一点点挪开。你在转角站了一会儿，才沿原路慢慢回去。'}`,sources:[]};
 let text=p.kind==='walk'?`${season(s.date)}日，${WALK_PLACES[a.place]}。${weather}\n\n${v.walk[a.place==='garden'?0:1]}`:v.seed;
 const sources=[];
 if(a.topic==='shared'&&!echo)text+='\n\n你们还没有可重提的共同片刻，便先从今日的小事说起。';
 else if(a.topic==='shared'){text+='\n\n'+echo.text;sources.push(echo.source);}
 if(a.topic==='project'){if(related){text+='\n\n你们只谈已送到他眼前的那份记录：'+related.text.slice(0,230);sources.push(related.id);}else text+='\n\n没有已经核实、可由他接着说的项目回报，这次只谈怎样把原始记录核清，不预告结果。';}
 if(repeat)text+='\n\n熟悉的话头再提起，不必重演第一次开口。';
 const t=a.topic==='shared'&&!echo?'recent':a.topic;text+='\n\n'+v[t][a.choice==='share'?1:0];
 if(isBounded(s.relations[cid]))text+='\n\n这段相处仍照已经说清的分寸。公务照常，私下不借一句体贴催成恋爱。';
 return {text,sources};
}
function makeItem(s,gift,source,paid){const i={id:'ITEM-'+uuid(),giftId:gift.id,name:gift.name,status:'held',source,paid,acquiredAt:now(s)};ensureActivities(s).inventory.push(i);return i;}
function give(s,cid,item,source,weekId){
 const b=ensureActivities(s),g=giftById(item.giftId),v=ACTIVITY_VOICES[cid],repeat=b.entries.some(e=>e.kind==='gift-result'&&e.actor===cid&&e.giftId===g.id&&e.accepted),willing=isExtensionActor(cid)||s.relations[cid].npcIntent!=='终止恋爱',extension=isExtensionActor(cid)?extensionGift(s,cid,g,{repeat}):null,accept=extension?extension.accept:g.likedBy.includes(cid)&&willing&&!repeat;
 const text=extension?.text||giftStory(s,cid,g,{accept,repeat,willing});
 item.status=accept?'given':'held';if(accept)item.recipient=cid;
 let reward=0;const key=`${cid}@${weekId}`,social=s.weekly.relationships?.rewarded[key]||s.events[source]?.completed;
 if(accept&&!isExtensionActor(cid)&&!b.giftRewards[key]){b.giftRewards[key]=source;if(!social){s.relations[cid].trust=Math.min(100,s.relations[cid].trust+2);reward=2;}}
 const e=entry(s,{kind:'gift-result',actor:cid,title:`${NAMES[cid]}${accept?'收下':'婉拒'}${g.name}`,text,source,visibleTo:[cid],itemId:item.id,giftId:g.id,accepted:accept,reward,weekId,...(extension?{variantId:extension.variantId,sources:extension.sources}:{})});
 return e;
}
export function finishActivity(s,p,tx,{paused=false}={}){
 if(!p.activity||p.legacyPromiseId)return null;
 const a=p.activity,b=ensureActivities(s),actors=p.actor==='C01'?[]:[p.actor];let text,title=p.label,sources=[],variantId;
 if(['chat','meet','walk'].includes(p.kind))({text,sources,variantId}=sceneText(s,p));
 if(p.kind==='letter'){
  const outgoing=sceneText(s,p);text=`你把「${ACTIVITY_TOPICS[a.topic]}」写入信中，选了「${TALK_CHOICES[a.choice]}」的说法。\n\n信已封好交驿，尚未送达；对方的原话，等回信到了再读。`;
  p.activity.outgoingSources=outgoing.sources;
 }
 if(p.kind==='banquet'){
  const theme=BANQUET_THEMES[a.theme];text=`${theme.name}设在一处明亮小厅。先按说定的位置落座：${a.seats.map(c=>NAMES[c]).join('、')}。\n\n`+a.seats.map((cid,i)=>`${NAMES[cid]}：${ACTIVITY_VOICES[cid].seat}\n${ACTIVITY_VOICES[cid][a.theme]}${i?' '+NAMES[a.seats[i-1]]+'听完，把后半句话留给对方说。':''}`).join('\n\n')+'\n\n'+banquetExchange(a.seats,a.theme)+'\n\n'+BANQUET_END[a.theme];
 }
 if(p.kind==='bond'){
  const stop=paused||a.paused||!bondAllowed(s,p.actor,a.mode);p.activity.paused=stop;
  text=stop?`${NAMES[p.actor]}听见你想先停一停，便把距离留好。你们只在原处坐了片刻，今晚不再继续亲近。茶还温着，谁也没有催下一步。`:isExtensionActor(p.actor)||a.mode==='daily'?partnerBondText(p.actor,a.mode):ACTIVITY_VOICES[p.actor].bond[Object.keys(BOND_MODES).indexOf(a.mode)];
 }
 if(p.kind==='gift'){const e=give(s,p.actor,b.inventory.find(i=>i.id===a.itemId),p.id,p.weekId);text=e.text;}
 if(p.kind==='craft'){const g=giftById(a.giftId),item=makeItem(s,g,p.id,p.money);text=`你照着新样式备好${g.name}，将材料账与成品一并记下。它还在你的匣中，想送给谁，可以另问对方的意思。`;a.producedItemId=item.id;}
 if(GROWTH[p.kind]){
  const g=GROWTH[p.kind],same=b.growth.some(x=>x.kind===p.kind&&x.exercise===a.exercise);b.growth.push({id:'GR-'+uuid(),kind:p.kind,exercise:a.exercise,date:now(s),planId:p.id});
  text=`${g.steps[a.exercise]}。${same?'熟悉的一遍做得更稳，不重领初次成果。':'你把这一次真正练过的地方记在页边，下一次换一处试试。'}`;
  const practiced=new Set(b.growth.filter(x=>x.kind===p.kind).map(x=>x.exercise));if(practiced.size===3&&!b.entries.some(e=>e.kind==='growth-result'&&e.direction===p.kind)){const e=entry(s,{kind:'growth-result',direction:p.kind,actor:'C01',title:g.result,text:`三种不同练习都留下了实际记录，今日整理成${g.result}。翻回第一页，起初拿不定的地方，如今已有自己的答案。`,source:p.id,visibleTo:[]});text+='\n\n'+e.text;}
 }
 if(typeof text!=='string')throw new RuleError('此活动尚无正文，未执行。');
 const e=entry(s,{kind:p.kind,actor:p.actor,title,text,source:p.id,visibleTo:p.kind==='letter'?[]:p.kind==='banquet'?cp(p.guests):actors,topic:a.topic||null,choiceLabel:a.choice?TALK_CHOICES[a.choice]:null,sources,...(variantId?{variantId}:{})});p.activity.entryId=e.id;return text;
}
export function recordActivityDelivery(s,n){
 const p=s.weekly.plans.find(p=>p.id===n.source&&p.kind==='letter'&&p.activity);if(!p)return;
 const b=ensureActivities(s);if(b.shipments.some(x=>x.planId===p.id))return;
 const v=ACTIVITY_VOICES[p.actor],echo=p.activity.topic==='shared'?shared(s,p.actor):null,project=p.activity.topic==='project'?projectTopic(s,p.actor):null,info={text:v[p.activity.topic==='shared'&&!echo?'recent':p.activity.topic][p.activity.choice==='share'?1:0]+(echo?'\n\n'+echo.text:'')+(project?'\n\n'+project.text:'')};if(p.actor==='C03'&&project?.id.startsWith('PROJECT_DELIVERED_')&&s.weekly.projects?.items['PR-MILITARY']?.reports.at(-1)?.issue===false)info.text='“前营签领的抄报到了。军册照常核，催粮信总算能少写一封。公事之外，那半页私信也想慢慢补齐。”\n\n'+project.text;entry(s,{kind:'letter-delivered',actor:p.actor,title:'写给'+NAMES[p.actor]+'的信已送达',text:`信已到${NAMES[p.actor]}手中，话题是「${ACTIVITY_TOPICS[p.activity.topic]}」。回信仍需一程。`,source:p.id,visibleTo:[p.actor],sources:p.activity.outgoingSources||[]});
 b.shipments.push({id:'MAIL-'+p.id,kind:'letter',actor:p.actor,planId:p.id,sentAt:cp(p.date),deliveryAt:now(s),dueDate:addDays(s.date,7),status:'delivered',replyMaterial:info.text});
}
export function activityStops(s){return (book(s)?.shipments||[]).filter(x=>x.status!=='answered'&&ordinal(x.kind==='gift'&&x.status==='sent'?x.deliveryAt:x.dueDate)>ordinal(s.date)).map(x=>({kind:'activity',id:x.id,label:x.kind==='gift'&&x.status==='sent'?'礼物送达':NAMES[x.actor]+'的回信',date:x.kind==='gift'&&x.status==='sent'?x.deliveryAt:x.dueDate}));}
export function activityInbox(s){return (book(s)?.shipments||[]).filter(x=>x.status!=='answered'&&ordinal(x.kind==='gift'&&x.status==='sent'?x.deliveryAt:x.dueDate)<=ordinal(s.date));}
export function applyActivityAction(s,a,tx,{useSlot,spendable,createPlan}={}){
 if(s.sealed)throw new RuleError('本卷已封存，只能重读。');const b=ensureActivities(s),res=(label,detail,dialogue=null,cost=0,money=0)=>({label,detail,...(dialogue?{dialogue}:{}),actionCost:cost,treasury:money});
 if(a.type==='activity-buy'){
  const g=giftById(a.giftId);if(!g)throw new RuleError('没有这件新物。');if(spendable(s)<g.price)throw new RuleError('扣除预约预算后余款不足。');
  s.stats.treasury-=g.price;const item=makeItem(s,g,'BUY-'+tx,g.price);s.ledger.push({id:'BUY-'+tx,date:now(s),turn:s.turn,label:'采买新物 · '+g.name,amount:-g.price,balance:s.stats.treasury});
  return res('把新物放入匣中',`${g.name}，${g.price}点，来源与成本已记。这是新备物件，不替代旧信物。`,null,0,-g.price);
 }
 if(a.type==='activity-gift-send'){
  if(isExtensionActor(a.actor)&&!s.transactions.some(t=>t.id===s.events.M06?.transactionId))throw new RuleError('先单独完成殿前相见，再向她递送新物。');
  if((!ACTIVITY_VOICES[a.actor]&&!isExtensionActor(a.actor))||!relationshipUnlocked(s,a.actor))throw new RuleError('人物尚未正式相见。');if(!itemAvailable(s,a.itemId))throw new RuleError('这件新物不在手中，或已被约定占用。');if(spendable(s)<1)throw new RuleError('代送需另付1点递送费。');if(ordinal(s.date)>horizonDay(s)-14)throw new RuleError('本卷余日不足递送及回执，请先留着。');
  const item=b.inventory.find(i=>i.id===a.itemId);item.status='in-transit';s.stats.treasury-=1;s.ledger.push({id:'POST-'+tx,date:now(s),turn:s.turn,label:'礼物递送费',amount:-1,balance:s.stats.treasury});
  b.shipments.push({id:'GIFT-'+tx,kind:'gift',actor:a.actor,itemId:item.id,sentAt:now(s),deliveryAt:addDays(s.date,7),dueDate:addDays(s.date,14),status:'sent'});
  fact(s,'SENT-GIFT-'+tx,`新备${item.name}已交递送，尚未送到。`,[],tx);return res('交人代送','本次0格、递送费1点。至少7日送达，再7日收到回执；尚不当作收礼或同意。',null,0,-1);
 }
 if(a.type==='activity-receive'){
  const sh=b.shipments.find(x=>x.id===a.shipmentId);if(!sh||!activityInbox(s).includes(sh))throw new RuleError('尚未到递送或回信日期，或已经阅过。');
  if(sh.kind==='gift'&&sh.status==='sent'){sh.status='delivered';sh.actualDeliveryAt=now(s);sh.dueDate=addDays(s.date,7);fact(s,'GIFT-DELIVERED-'+sh.id,`新备${giftById(b.inventory.find(i=>i.id===sh.itemId).giftId).name}已送到。收取与否尚待当事人回执。`,[sh.actor],sh.id);return res('礼物已送到','回执尚在路上，不提前写成收下或加分。');}
  let text;if(sh.kind==='gift'){const item=b.inventory.find(i=>i.id===sh.itemId);const week=s.weekly.weeks.find(w=>w.status!=='ended'&&ordinal(s.date)>=ordinal(w.start)&&ordinal(s.date)<=ordinal(w.end));const e=give(s,sh.actor,item,sh.id,week?.id||'regular-'+Math.floor((ordinal(s.date)-1)/7));text=e.text;sh.accepted=e.accepted;}
  else{const p=s.weekly.plans.find(p=>p.id===sh.planId),v=ACTIVITY_VOICES[sh.actor];text=v.letter+'\n\n'+sh.replyMaterial;if(isBounded(s.relations[sh.actor]))text+='\n\n仍按现在说定的分寸往来，不将这封回信当成恋爱同意。';entry(s,{kind:'letter-reply',actor:sh.actor,title:NAMES[sh.actor]+'的回信',text,source:p.id,visibleTo:[sh.actor],topic:p.activity.topic,choiceLabel:TALK_CHOICES[p.activity.choice]});}
  sh.status='answered';sh.answeredAt=now(s);sh.text=text;return res(NAMES[sh.actor]+'的回信',text,text);
 }
 if(a.type==='activity-followup'||a.type==='activity-gift-same'){
  const p=s.weekly.plans.find(p=>p.id===a.planId&&p.status==='completed'),scene=Object.values(s.transcripts).find(t=>t.transactionId===a.sceneTransaction&&t.actor===a.actor&&/^(R|XR)/.test(t.eventId));
  const cid=a.actor;if((!ACTIVITY_VOICES[cid]&&!isExtensionActor(cid))||!relationshipUnlocked(s,cid))throw new RuleError('人物尚未正式相见。');
  if(p&&!(p.actor===cid||p.guests.includes(cid))||!p&&!scene)throw new RuleError('没有这场实际相处的同场来源。');
  const source=p?.id||scene.eventId;if(p&&ordinal(p.date)!==ordinal(s.date)||scene&&ordinal(scene.date)!==ordinal(s.date))throw new RuleError('这段相处已散场，请另约时段。');
  // spendRelationshipSlot verifies this is still the latest paid scene; it must not silently open a new activity.
  const paid=useSlot(s,cid,'AC-FOLLOW-'+tx,tx,{sameOnly:true});if(paid.cost||p&&paid.planId!==p.id||scene&&paid.sceneId!==scene.eventId)throw new RuleError('同场已结束，请另约。');
  if(a.type==='activity-gift-same'){if(!itemAvailable(s,a.itemId))throw new RuleError('物品不在手中或另有预约。');const e=give(s,cid,b.inventory.find(i=>i.id===a.itemId),source,p?.weekId||s.weekly.weeks.find(w=>w.status!=='ended'&&ordinal(s.date)>=ordinal(w.start)&&ordinal(s.date)<=ordinal(w.end))?.id||'regular-'+Math.floor((ordinal(s.date)-1)/7));return res(e.title,e.text,e.text);}
  if(b.entries.some(e=>e.kind==='followup'&&e.source===source&&(p?.kind==='banquet'||e.actor===cid)))throw new RuleError('这场的短追问已经说过，可重读原话；长谈另约。');
  const choice=a.choice||'listen';if(!own(TALK_CHOICES,choice))throw new RuleError('没有这句追问。');
  const text=isExtensionActor(cid)?extensionFollowup(s,cid,choice):(p?.kind==='banquet'?ACTIVITY_VOICES[cid].private:ACTIVITY_VOICES[cid].wish[choice==='share'?1:0]);const e=entry(s,{kind:'followup',actor:cid,title:'散场前的半句话',text,source,visibleTo:[cid],choiceLabel:TALK_CHOICES[choice]});return res(e.title,text,text);
 }
 throw new RuleError('没有这项人物活动操作。');
}
export function activityEcho(s,cid,input){if(isExtensionActor(cid))return extensionActivityEcho(s,cid,input);if(isBounded(s.relations[cid])||relationshipRecord(s,cid).issues.length)return null;if(!/上回|上次|散步|送礼|那份|宴|回信|练习|还记得/.test(input))return null;return book(s)?.entries.filter(e=>e.visibleTo.includes(cid)&&e.actor===cid&&e.kind!=='letter-delivered').at(-1)?.text||null;}
export function validateActivities(s){
 const b=book(s);if(b===undefined)return;
 if(!b||b.version!==1||!validDate(b.cutover)||ordinal(b.cutover)>ordinal(s.date)||!b.giftRewards||Array.isArray(b.giftRewards))throw new RuleError('活动接续簿错误。');
 for(const key of ['entries','inventory','shipments','growth'])if(!Array.isArray(b[key])||b[key].length>20000||new Set(b[key].map(x=>x.id)).size!==b[key].length)throw new RuleError('活动记录缺项、过长或标识重复。');
 for(const i of b.inventory){if(!giftById(i.giftId)||i.name!==giftById(i.giftId).name||!['held','in-transit','given'].includes(i.status)||i.paid!==giftById(i.giftId).price||!validDate(i.acquiredAt)||ordinal(i.acquiredAt)>ordinal(s.date)||!s.ledger.some(l=>l.id===i.source&&l.amount===-i.paid)&&!s.weekly.plans.some(p=>p.id===i.source&&p.kind==='craft'&&p.status==='completed'&&p.activity?.producedItemId===i.id&&p.money===i.paid))throw new RuleError('新物来源、材料成本或持有状态错误。');}
 for(const e of b.entries){if(typeof e.text!=='string'||!e.text||!validDate(e.date)||ordinal(e.date)>ordinal(s.date)||!Array.isArray(e.visibleTo)||!s.facts.some(f=>f.id===e.id&&f.text===e.text&&JSON.stringify(f.visibleTo)===JSON.stringify([...new Set(['C01',...e.visibleTo])])) )throw new RuleError('活动正文、知情或真实日期错误。');if(e.source&&!s.weekly.plans.some(p=>p.id===e.source&&p.status==='completed')&&!b.shipments.some(sh=>sh.id===e.source)&&!s.events[e.source]?.completed)throw new RuleError('活动缺少实际安排来源。');}
 for(const sh of b.shipments){if((!ACTIVITY_VOICES[sh.actor]&&!isExtensionActor(sh.actor))||!validDate(sh.sentAt)||!validDate(sh.deliveryAt)||!validDate(sh.dueDate)||ordinal(sh.deliveryAt)-ordinal(sh.sentAt)<7||ordinal(sh.dueDate)-ordinal(sh.deliveryAt)<7||!['sent','delivered','answered'].includes(sh.status)||ordinal(sh.sentAt)>ordinal(s.date))throw new RuleError('递送实际日期错误。');if(sh.status!=='sent'&&ordinal(sh.actualDeliveryAt||sh.deliveryAt)>ordinal(s.date)||sh.status==='answered'&&(!validDate(sh.answeredAt)||ordinal(sh.answeredAt)<ordinal(sh.dueDate)||ordinal(sh.answeredAt)>ordinal(s.date)))throw new RuleError('回信提前到达。');if(sh.kind==='letter'&&!s.weekly.plans.some(p=>p.id===sh.planId&&p.kind==='letter'&&p.status==='completed'&&p.deliveredAt)||sh.kind==='gift'&&!b.inventory.some(i=>i.id===sh.itemId))throw new RuleError('递送缺少原信或实物。');}
 for(const g of b.growth)if(!GROWTH[g.kind]?.steps[g.exercise]||!s.weekly.plans.some(p=>p.id===g.planId&&p.status==='completed'&&p.activity?.exercise===g.exercise)||!validDate(g.date)||ordinal(g.date)>ordinal(s.date))throw new RuleError('成长缺少实际练习。');
 for(const p of s.weekly.plans.filter(p=>p.activity)){
  const a=p.activity;if(a.version!==1)throw new RuleError('活动配置版本错误。');
  if(['chat','meet','letter','walk'].includes(p.kind)&&(!own(ACTIVITY_TOPICS,a.topic)||!own(TALK_CHOICES,a.choice)||!own(WALK_PLACES,a.place)))throw new RuleError('活动话题或地点错误。');
  if(p.kind==='banquet'&&(!BANQUET_THEMES[a.theme]||p.money!==BANQUET_THEMES[a.theme].money||a.seats.length!==p.guests.length||new Set(a.seats).size!==a.seats.length||a.seats.some(cid=>!p.guests.includes(cid))))throw new RuleError('宴席主题座次或费用错误。');
  if(p.kind==='craft'&&(!giftById(a.giftId)||p.money!==giftById(a.giftId).price))throw new RuleError('备制材料费用错误。');
  if(p.kind==='gift'&&!b.inventory.some(i=>i.id===a.itemId))throw new RuleError('赠礼缺少新物来源。');
  if(p.kind==='bond'&&(!BOND_MODES[a.mode]||a.consent!==true||a.agreedStage&&RELATION_STAGES.indexOf(a.agreedStage)<RELATION_STAGES.indexOf(BOND_MODES[a.mode].stage)||a.playerIntent&&a.playerIntent!=='愿发展'||a.npcIntent&&a.npcIntent!=='愿发展'||['night','stay'].includes(a.mode)&&p.period!=='evening'))throw new RuleError('伴侣活动阶段或时段配置错误。');
  if(p.status==='completed'&&!b.entries.some(e=>e.id===a.entryId&&e.source===p.id&&e.text===p.dialogue))throw new RuleError('活动已完成却缺少原文快照。');
 }
 validateExtensionActivities(s);validatePartnerLife(s);
}
