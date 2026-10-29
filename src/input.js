import {readingText} from './reading-copy.js';
import {assertCrossNarrative} from './cross-relations.js';
import {fitAIContext} from './context-budget.js';
import {memorySuppressed} from './memory-book.js';
import {sameAction,deniedAction,reportedIntent,negatedBoundary,ownsPreference,activityParaphrase,optionEvidence,PARSE_CLARIFICATIONS} from './candidate-evidence.js';
import {assertNarrativeAuthority} from './narrative-authority.js';
import {CHARACTERS,NAMES,EVENTS} from './content.js';
import {PROJECT_EVENTS} from './project-content.js';
import {RuleError,visibleContext,actorUnlocked,canReadFact,getEvent,preview} from './engine.js';
import {parseActivityClause,actionInputLabel,inputFollowup} from './activity-input.js';
import {parseProjectClause} from './project-input.js';
const chineseNum={零:0,一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10,十一:11,十二:12};
const getNumber=s=>/^\d+$/.test(s)?Number(s):chineseNum[s];
const isConsultation=text=>/[？?]\s*$/.test(text)||/^(?:朕|我)?(?:想|要)?(?:问问|请问|打听)/.test(text)||/^(?:给我|替我|跟我|和我)?(?:说说|谈谈|讲讲)(?:这个|这份|一下|你的)?(?:安排|办法|方案|意见)/.test(text)||/(?:如果|假如|若是|会怎样|会如何|是否|是不是|愿不愿意|想不想|要不要|可好|能不能|可不可以|可否|能否|怎么办|为什么|如何|好不好|行不行|[吗么]\s*[？?]?$)/.test(text);
function parseLegacy(text,context={}){
 const input=text.trim();if(!input)throw new RuleError('先写一句想问或想办的事。');if(input.length>1500)throw new RuleError('单次输入最多1500字，请分段。');
 const out={segments:[],actions:[],clarifications:[],consultation:false,recognized:false};
 // Sensitive disclosure is always intercepted before any NPC receives the mixed sentence.
 if(/(?:朕|我).{0,8}(?:重生|活过一世|记得前世)|(?:告诉|坦白).{0,8}(?:重生|前世)/.test(input)&&!/(?:如果|假如|若是|是不是|能否|如何)/.test(input)){
  out.actions.push({type:'disclose',actor:context.actor,scope:'full'});out.segments.push({kind:'disclosure',text:input});out.recognized=true;out.disclosure=true;return out;
 }
 const phrases=input.split(/[，,；;。\n]/).map(x=>x.trim()).filter(Boolean);
 const boundary=phrases.find(x=>!reportedIntent(x)&&!negatedBoundary(x)&&(/(?:只|仅).*(?:公事|君臣|合作)|(?:不要|别再|不想).*(?:亲近|亲密|谈情|恋爱)|(?:到此为止|终止恋爱)|(?:暂缓|先不谈).*(?:感情|亲近|恋爱)/.test(x)));
 if(boundary){out.segments.push({kind:'boundary',text:boundary,intent:/到此为止|终止/.test(boundary)?'终止恋爱':/暂缓|先不谈/.test(boundary)?'暂缓':'仅合作'});out.recognized=true;}
 const pref=phrases.find(x=>ownsPreference(x)&&/茶/.test(x)&&/(?:不爱|不喜|别给|不要|并非|不是|喜欢|改成|换成)/.test(x));
 if(pref){out.segments.push({kind:'preference',text:pref});out.recognized=true;}
 const consultation=isConsultation(input);
 out.consultation=consultation;
 const financial=/(?:拨|发|给|批).{0,8}(?:一半|半额|\d+|[零一二两三四五六七八九十]+).{0,5}(?:点|军饷|粮饷|银)|(?:拨一半|先发一半)/.test(input);
 if(financial&&!consultation){
  if(context.eventId!=='G04')out.clarifications.push('拨款参数目前在「军需册中的重复支领」场景开放，请进入该场景再拟旨。');
  else{
   let amount=/一半|半额/.test(input)?6:undefined;
   const match=input.match(/(?:拨|发|给|批)(?:款)?(?:给)?\s*(\d+|[零一二两三四五六七八九十]+)(?:\s*点|军饷|粮饷|银)/);if(match)amount=getNumber(match[1]);
   if(amount===undefined)out.clarifications.push('请说明拨款金额。本次申请为12点，可以写“拨6点”或“先拨一半”。');
   const officer=/张廷玉/.test(input)?'C28':/允祥/.test(input)?'C26':/岳钟琪/.test(input)?'C32':'C28';
   const incompatible=['年羹尧','苏培盛','宜修','甄嬛','允礼'].find(name=>new RegExp(`(?:派|让|由)${name}.{0,5}(?:核账|承办|查账)`).test(input));
   const named=input.match(/(?:派|让|由)([\u4e00-\u9fa5]{2,4})(?:来)?(?:核账|查账)/);if(named&&!['张廷玉','允祥','岳钟琪'].includes(named[1])&&!incompatible)out.clarifications.push(`指定承办人${named[1]}不在可用清单，请重新选择。`);
   if(incompatible)out.clarifications.push(`当前可用核账承办人为张廷玉、允祥、岳钟琪，不能默换你指定的${incompatible}。`);
   if(/(?:公开|公示)/.test(input)&&/(?:保密|不公开|暂不公开)/.test(input)&&/(?:同时|也要|又要|又)/.test(input))out.clarifications.push('公开和保密要求相互冲突，请明确未核验前的知情范围。');
   if(amount!==undefined)out.actions.push({type:'event',eventId:'G04',choiceId:'custom',params:{amount,officer,visibility:/(?:保密|不公开|暂不公开)/.test(input)?'private':/公开|公示/.test(input)?'public':'private',escort:/押运/.test(input)&&!/(?:不|无需|不要)押运/.test(input)}});
  }
  out.recognized=true;
 }
 const meeting=phrases.find(x=>/(?:明日|明天|下月|下回合).*(?:陪|约|见|看灯|寄信|回信|休息|休假)/.test(x));
 if(meeting&&!consultation){const when=/下月/.test(meeting)?'next-month':/下回合/.test(meeting)?'next-turn':'tomorrow';out.actions.push({type:'promise',actor:context.actor,when,purpose:/寄信|回信/.test(meeting)?'letter':/休息|休假/.test(meeting)?'rest':'meet'});out.recognized=true;}
 const event=EVENTS[context.eventId]||PROJECT_EVENTS[context.eventId];
 const exactOption=event?.options.find(o=>input.replace(/[“”‘’\s]/g,'')===o.label.replace(/[“”‘’\s]/g,''));
 if(!financial&&!meeting&&!consultation&&exactOption){out.actions.push({type:'event',eventId:event.id,choiceId:exactOption.id});out.recognized=true;}
 if(/任命|赐官|加钱|凭空|跳过|立储|处死|借银|封王|删除存档|赦免/.test(input)&&!consultation){out.clarifications.push('这部分没有在当前事件开放执行能力，请移除或改为询问。');out.recognized=true;}
 if(!consultation&&out.actions.length&&/(?:再|并且|同时|另外|又)(?:任命|赐官|处死|封王|赏|给|派|下旨)/.test(input)&&!financial)out.clarifications.push('检测到尚未识别的附加命令，请分开说明，系统不会默默舍弃。');
 if(out.actions.length>3)out.clarifications.push('每次最多提交3个子行动，请分批。');
 if(consultation)out.segments.push({kind:'query',text:input});
 if(!out.recognized&&!consultation)out.segments.push({kind:'chat',text:input});
 // Recognizing one preference must not conceal the rest of a mixed sentence.
 const handled=new Set([boundary,pref,meeting].filter(Boolean));
 const unknown=exactOption&&out.actions.some(a=>a.type==='event'&&a.eventId===event.id)?[]:phrases.filter(p=>!handled.has(p)&&!(financial&&/(?:拨|军饷|粮饷|核账|查账|押运|公开|保密)/.test(p))&&!(event&&event.options.some(o=>p.replace(/[“”‘’\s]/g,'')===o.label.replace(/[“”‘’\s]/g,''))));
 out.unresolved=unknown;
 out.needsAI=!consultation&&(!out.recognized||unknown.length>0);
 return out;
}
// Keep interrogative punctuation attached to its clause. A following action
// still needs its own explicit date/person; conjunctions never grant defaults.
const phrasesOf=text=>text.replace(/([！？!?])(?=.)/g,'$1\n').split(/[，,；;。\n]|(?:并且|并|然后|另外|顺便)(?=安排|明日|明天|明晚|后日|后天|今天|今日|今晚|取消|撤销|改期|改日再谈|先拨|再拨|宴请|小宴|送|赠|陪|与你|和你|同你|写信|休养|习武|学习)/).map(x=>x.trim()).filter(Boolean);
const smallTalkRequest=p=>/^(?:请|先|再)?(?:陪|和|跟|同)(?:朕|我|你)(?:说(?:两句|几句|点|些)(?:闲话|话|家常)?|说说(?:话|家常)|聊(?:聊|一会儿|会儿|会|几句)?(?:闲话|家常|心事)?|谈(?:谈|一会儿|会儿|会)?(?:心|家常))[吧呀呢啊]*$/.test(p);
const commandLike=p=>!smallTalkRequest(p)&&(/(?:明日|明天|明晚|后天|后日|今日|今天|今晚).*(?:陪|与你|和你|同你|去|走|约|来)/.test(p)||/按第|照第|选第|就按|就照|第一项|第二项|第三项|第四项|第五项|交班.*(?:歇|睡)/.test(p)||/^(?:再|先|请|朕要|我要|朕想|我想)?(?:去|来|约|陪|给|备|开)/.test(p)||/依你|照你|就这样|安排|下旨|办理|照办|任命|赐官|处死|封王|删除存档|加钱|凭空|跳过|立储|借银|赦免|^(?:再|先|请|让|派|朕要|我要|朕想|我想)*(?:拨|发|送|赠|约|取消|改期|买|备制|宴请|习武|学习|休养|散步|私聊|写信)/.test(p));
function validateCandidates(out,context){
 if(out.actions.length>3)out.clarifications.push('一次最多核对三个安排，请分开说。');
 if(!out.clarifications.length&&out.actions.length&&context.state){try{preview(context.state,out.actions);}catch(err){out.clarifications.push(err.message);}}
 return out;
}
export function parseLocal(text,context={}){
 const input=inputFollowup(text.trim(),context.pendingInput)||text.trim();let initial=parseLegacy(input,context);
 if(!initial.disclosure){const explicit=phrasesOf(input).map(p=>parseLegacy(p,context)).find(p=>p.disclosure);if(explicit)initial=explicit;}
 if(initial.disclosure){
  const extra=phrasesOf(input).filter(p=>!/(?:重生|前世|活过一世)/.test(p));
  const recipient=input.match(/(?:告诉|告知|向|对)(.+?)(?=(?:说|坦白|透露|披露|朕|我|重生|前世))/)?.[1]?.trim();
  const listener=CHARACTERS.find(c=>c.id===context.actor)?.name;
  const denied=/(?:不要|别|不必|无需|先不|不想|暂不).{0,20}(?:告诉|告知|坦白|透露|披露)/.test(input);
  if(extra.length||denied||recipient&&recipient!=='你'&&recipient!==listener){initial.actions=[];initial.clarifications=['这句话含有重生秘密，请单独确认要向谁披露；其余的话仍留在草稿中，尚未投递。'];}return initial;
 }
 const e=EVENTS[context.eventId]||PROJECT_EVENTS[context.eventId],clean=x=>x.replace(/[“”‘’\s]/g,'');
 const exact=e?.options.find(o=>clean(o.label)===clean(input));
 if(exact)return validateCandidates({segments:[],actions:[{type:'event',eventId:e.id,choiceId:exact.id}],clarifications:[],consultation:false,recognized:true,needsAI:false,unresolved:[]},context);
 const out={segments:[],actions:[],clarifications:[],consultation:false,recognized:false,needsAI:false,unresolved:[]},phrases=phrasesOf(input);
 // A leading hypothetical governs the whole thought, including subsequent clauses.
 if(/^(?:如果|假如|若是)/.test(input))return {...out,segments:[{kind:'query',text:input}],consultation:true,recognized:true};
 const financial=phrases.filter(p=>!isConsultation(p)&&!deniedAction(p)&&!reportedIntent(p)&&!/(?:散步|看灯|私聊|写信|宴请|送礼|习武|学习|陪你)/.test(p)&&/(?:拨|军饷|粮饷|核账|查账|押运|公开|保密)/.test(p)),financialSet=new Set();
 if(financial.some(p=>/(?:拨|发|给|批).*(?:一半|半额|\d|[零一二两三四五六七八九十])/.test(p))){
  const f=parseLegacy(financial.join('，'),context);out.actions.push(...f.actions.filter(a=>a.type==='event'));out.clarifications.push(...f.clarifications);financial.forEach(p=>financialSet.add(p));out.recognized=true;
  const amounts=financial.join('，').match(/(?:拨|发|给|批)(?:款)?(?:给)?\s*(?:\d+|[零一二两三四五六七八九十]+)(?:\s*点|军饷|粮饷|银)|一半|半额/g)||[];
  if(amounts.length>1)out.clarifications.push('这一笔有不止一种金额说法，请保留一个最终金额。');
 }
 for(const p of phrases){
  if(financialSet.has(p))continue;
  if(isConsultation(p)||/[?？]$/.test(p)||/^(?:请问|想问|问问)/.test(p)){out.segments.push({kind:'query',text:p});continue;}
  if(negatedBoundary(p)){out.clarifications.push('这句是在否定终止或合作限定，不能据此替你改变当前分寸；若想恢复亲近，请主动协商。');out.recognized=true;continue;}
  if(deniedAction(p)){out.segments.push({kind:'chat',text:p});out.recognized=true;continue;}
  if(reportedIntent(p)&&/^(?:听说|据说|上回|上次|从前|此前|(?:你|他|她|他们|她们).{0,5}(?:说过|提过|说要)|[“「『])/.test(p)){out.segments.push({kind:'chat',text:p});out.recognized=true;continue;}
  const part=parseLegacy(p,context),localSegments=part.segments.filter(x=>['preference','boundary'].includes(x.kind));
  out.clarifications.push(...part.clarifications);
  if(localSegments.length){out.segments.push(...localSegments);out.recognized=true;continue;}
  if(/聊聊|聊一会|说会儿话|说说话/.test(p)&&!/(?:明日|明天|明晚|后天|后日|[\d一二三四五六七八九十]+日|(?:今日|今天).*(?:日间|白天|晚间|晚上)|今晚|安排|预约|约你|私聊)/.test(p)){out.segments.push({kind:'chat',text:p});out.recognized=true;continue;}
  if(/^(?:这件事)?改日再谈$/.test(p)&&e){out.actions.push({type:'defer',eventId:e.id});out.recognized=true;continue;}
  const project=parseProjectClause(p,context);if(project){out.actions.push(...project.actions);out.clarifications.push(...project.clarifications);out.recognized=true;continue;}
  const activity=parseActivityClause(p,context);
  if(activity){out.actions.push(...activity.actions);out.clarifications.push(...activity.clarifications);if(activity.draft){out.activityDrafts??=[];out.activityDrafts.push(activity.draft);}out.recognized=true;continue;}
  if(part.actions.length&&!context.state?.weekly){out.actions.push(...part.actions);out.recognized=true;continue;}
  if(part.actions.some(a=>a.type==='event')){out.actions.push(...part.actions.filter(a=>a.type==='event'));out.recognized=true;continue;}
  if(part.clarifications.length)out.recognized=true;
  out.unresolved.push(p);out.segments.push({kind:'chat',text:p});
 }
 out.consultation=out.segments.some(s=>s.kind==='query')&&!out.actions.length&&!out.unresolved.some(commandLike);
 out.needsAI=!out.consultation&&out.unresolved.length>0;
 if(out.activityDrafts?.length===1&&!out.actions.length&&!out.unresolved.length)out.pendingInput=out.activityDrafts[0];
 return validateCandidates(out,context);
}
export function inputActionCatalog(s,actor,eventId,input){
 const local=parseLocal(input,{state:s,actor,eventId});if(local.disclosure||local.clarifications.length)return [];
 const scene=buildAIContext(s,actor,eventId).event,e=getEvent(s,eventId),event=scene&&e?.actor===actor?e:null,entries=[];
 const add=(action,sourceText,label)=>{if(action.type==='event'&&(!event||action.eventId!==event.id))return;try{preview(s,[action]);}catch{return;}if(!entries.some(x=>sameAction(x.action,action)&&x.sourceText===sourceText))entries.push({action:structuredClone(action),sourceText,label});};
 // Build per-clause capabilities. A scene's other options are context, not grants.
 const fullExact=event?.options.find(o=>input.replace(/[“”‘’\s]/g,'')===o.label.replace(/[“”‘’\s]/g,''));
 if(fullExact)add({type:'event',eventId:event.id,choiceId:fullExact.id},input,fullExact.label);
 for(const source of phrasesOf(input)){
  if(isConsultation(source)||deniedAction(source)||reportedIntent(source)||negatedBoundary(source))continue;
  const part=parseLocal(source,{state:s,actor,eventId});if(part.clarifications.length)continue;
  let known=false;
  for(const action of local.actions){const matched=part.actions.some(a=>sameAction(a,action)||a.type==='event'&&action.type==='event'&&a.eventId==='G04'&&a.choiceId==='custom'&&action.choiceId==='custom');if(matched){add(action,source,actionInputLabel(action)||event?.options.find(o=>o.id===action.choiceId)?.label||'核对原句中的方案');known=true;}}
  if(known||part.segments.some(x=>['preference','boundary'].includes(x.kind)))continue;
  const normalized=activityParaphrase(source);if(normalized!==source){const p=parseActivityClause(normalized,{state:s,actor});if(p&&!p.clarifications.length)for(const action of p.actions)add(action,source,actionInputLabel(action));}
  for(const option of optionEvidence(event,source))add({type:'event',eventId:event.id,choiceId:option.id},source,option.label);
 }
 return entries.slice(0,16).map((x,i)=>({id:'A'+(i+1),...x}));
}
export async function resolveInput(text,context,remote=null){
 const local=parseLocal(text,context);if(local.disclosure)return local;
 if(!remote){if(local.needsAI&&local.unresolved?.some(commandLike))return {...local,actions:[],clarifications:[...local.clarifications,'这部分还没听明白：'+local.unresolved.filter(commandLike).join('；')+'。请说明具体要办的事；其余已识别内容仍保留。']};return local;}
 // Ordinary talk and questions go straight to a reply. The parser is reserved
 // for unresolved requests to act, rather than asking a model to invent intent.
 if(!local.needsAI||!local.unresolved.some(commandLike))return local;
 try{
  const received=await remote(text),raw=received?.proposals?{segments:received.segments,actions:received.proposals,clarifications:received.clarificationCodes||[]}:received,parsed=validateRemoteParse(raw,{...context,input:text});const segments=[...local.segments,...parsed.segments.filter(x=>['preference','boundary'].includes(x.kind))];
  const seen=new Set();parsed.segments=segments.filter(s=>{if(['chat','query'].includes(s.kind)&&parsed.proposals.some(p=>p.sourceText.includes(s.text)))return false;const key=s.kind+'|'+s.text;if(seen.has(key))return false;seen.add(key);return true;});
  // Local refusal/preference and fully recognized actions survive an incomplete model response.
  const actionIdentity=a=>a.type==='event'?`event:${a.eventId}`:JSON.stringify(a);
  for(const a of local.actions){parsed.actions=parsed.actions.filter(b=>actionIdentity(b)!==actionIdentity(a));parsed.actions.push(a);}
  if(parsed.actions.length>3){parsed.actions=[];parsed.clarifications.push('这句话里的安排太多，请分开说。');}
  parsed.clarifications=[...new Set([...local.clarifications,...parsed.clarifications])];
  if(local.consultation){parsed.actions=[];parsed.consultation=true;}
  else parsed.consultation=false;
  const unknownCommands=local.unresolved.filter(commandLike),covered=parsed.coveredCommands||[];
  if(unknownCommands.some(p=>!covered.includes(p)))parsed.clarifications.push('这部分还没听明白：'+unknownCommands.filter(p=>!covered.includes(p)).join('；')+'。请把做法说具体一些。');
  return validateCandidates(parsed,context);
 }catch(err){return {...local,clarifications:[...local.clarifications,local.recognized?'话里的偏好与分寸会记下；余下的意思还没听清，请换句话说。':err.message||'这句话还没听清，请换句话说。'],actions:[]};}
}
export function validateRemoteParse(value,context){
 if(!value||Object.keys(value).some(k=>!['segments','actions','clarifications'].includes(k))||!Array.isArray(value.actions)||!Array.isArray(value.segments)||!Array.isArray(value.clarifications))throw new RuleError('AI解析结构不完整或夹带状态字段，已保留规则输入。');
 if(value.actions.length>3||value.segments.length>12||value.clarifications.length>6)throw new RuleError('AI解析超出结构长度限制。');
 const local=parseLocal(context.input,context),consultation=local.consultation||value.segments.some(x=>x?.kind==='query'&&x.text===context.input),proposals=[],actions=[];
 const catalog=context.state?inputActionCatalog(context.state,context.actor,context.eventId,context.input):[];
 if(!consultation)for(const a of value.actions){
  if(!context.state||!a||a.type!=='candidate'||Object.keys(a).some(k=>!['type','candidateId','sourceText'].includes(k)))throw new RuleError('AI只能选择带原句来源的程序候选，不能自行指定参数或执行命令。');
  const entry=catalog.find(c=>c.id===a.candidateId&&c.sourceText===a.sourceText);if(!entry)throw new RuleError('这个候选不对应当前原句或人物权限，请重新说明做法。');
  if(proposals.some(p=>p.sourceText===a.sourceText))throw new RuleError('同一句安排被重复或矛盾解析，请分句说明。');
  actions.push(structuredClone(entry.action));proposals.push({type:'candidate',candidateId:entry.id,sourceText:entry.sourceText});
 }
 const segments=value.segments.map(x=>{
  if(!x||Object.keys(x).some(k=>!['kind','text','intent'].includes(k))||!['chat','query','preference','boundary'].includes(x.kind)||typeof x.text!=='string'||!context.input.includes(x.text))throw new RuleError('AI分段缺少原句来源。');
  if(['preference','boundary'].includes(x.kind)){
   const proof=parseLocal(x.text,context).segments.find(p=>p.kind===x.kind&&p.text===x.text&&(x.kind!=='boundary'||p.intent===x.intent));
   if(!proof||!local.segments.some(p=>p.kind===x.kind&&p.text===x.text&&(x.kind!=='boundary'||p.intent===x.intent)))throw new RuleError('AI不能把提问、他人喜好或未表达的拒绝写成玩家偏好与边界。');
  }
  return {kind:x.kind,text:x.text,...(x.kind==='boundary'?{intent:x.intent}:{})};
 });
 const clarificationCodes=value.clarifications.map(x=>typeof x==='string'&&Object.hasOwn(PARSE_CLARIFICATIONS,x)?x:'unsupported');
 const out={segments,actions,proposals,clarificationCodes,clarifications:[...new Set(clarificationCodes.map(x=>PARSE_CLARIFICATIONS[x]))],consultation,recognized:true,coveredCommands:proposals.map(p=>p.sourceText)};
 return validateCandidates(out,context);
}
export function buildAIContext(s,cid,eventId,options={}){const ctx=visibleContext(s,cid,{forRetrieval:true});const e=getEvent(s,eventId),participants=e?({M06:['C08','C09','C10','C21'],M03:['C07','C19']}[e.id]||[e.actor]):[];return fitAIContext({...ctx,event:e&&participants.includes(cid)?{id:e.id,title:e.title,visibleScene:['R03-02','D06'].includes(e.id)?'正在阅信或拟写回信；尚在递送的话不等于对方已收到，不得生成当面互动。':readingText(e.sceneVisible,e.id)||`${e.title}：正在当面商议，细节仅依据已知事实。`,options:e.options.map(o=>({id:o.id,label:o.label})),allowedActions:['candidate(from actionCatalog with identical sourceText; no direct parameters)']}:null},options);}
export function buildReactionContext(s,cid,key){const t=s.transcripts[key];if(!t||t.actor!==cid)throw new RuleError('这段经历尚未发生。');const fact=s.facts.find(f=>f.id==='FACT_'+key);if(!fact||!canReadFact(s,cid,fact)||memorySuppressed(s,'fact',fact.id))throw new RuleError('这段处置尚未向此人说明，保留手写回应。');const ctx=buildAIContext(s,cid,t.eventId);ctx.reaction={choice:t.choice,establishedOutcome:(t.publicDialogue||t.dialogue).replace('没有拿旧梦当检验结果','没有拿未查清的猜测当检验结果')};return ctx;}
export function validateNarrative(value,ctx){
 if(!value||value.speakerId!==ctx.actorId||typeof value.text!=='string'||value.text.length<2||value.text.length>1500||!Array.isArray(value.factIds))throw new RuleError('AI叙述结构不合规，使用固定文本。');
 assertNarrativeAuthority(value,ctx);assertCrossNarrative(value,ctx);
 const permitted=new Set(ctx.facts.map(f=>f.id));if(value.factIds.some(id=>!permitted.has(id)))throw new RuleError('AI引用了不可见的事实。');
 if(!ctx.mandatory.secretDisclosure.length&&/重生|前世|上一世|上辈子|活过一世/.test(value.text))throw new RuleError('AI叙述触及未向此角色披露的信息。');
 if(/已(?:经)?(?:拨款|下旨|任命|赐官|办妥|封王)|国库[增减加]|信任[增减加]|亲密[增减加]/.test(value.text))throw new RuleError('AI聊天不能宣告游戏结算。');
 if(ctx.mandatory.relation&&['仅合作','终止恋爱','暂缓'].includes(ctx.mandatory.relation.playerIntent)&&/亲吻|拥吻|恋人|心上人|以身相许|只爱|侍寝/.test(value.text))throw new RuleError('AI叙述违反当前关系边界。');
 if(ctx.mandatory.extensionRoute?.actor==='C10'&&/(?:已(?:经)?查明|查账已经完成|已追回|已定罪|已经升任|已(?:经)?答应接差)/.test(value.text))throw new RuleError('沈眉庄的疑账尚无核实回执，拒差也不能变成已接任。');
 if(ctx.mandatory.extensionAttitude&&/已(?:经)?(?:相爱|定情|答应相守)|我们是恋人|以身相许|亲吻|拥吻|侍寝|只爱/.test(value.text))throw new RuleError('这段主线尚未建立双方恋爱意愿，保留手写回应。');
 if(ctx.mandatory.secretDisclosure.length&&!ctx.mandatory.secretDisclosure.some(f=>f.scope==='full')&&/你(?:真的|果然|确实)?重生了|已(?:经)?确信.{0,8}前世/.test(value.text))throw new RuleError('听过旧梦不等于知道或确信重生。');
 if(/前世.{0,10}(?:足以证明|可以定罪)|(?:凭|根据).{0,5}前世.{0,12}(?:定罪|证明有罪)|已(?:经)?确信.{0,8}(?:前世|重生)/.test(value.text))throw new RuleError('本世证据不能由前世或听过的叙述代替。');
 if(/(?:已(?:经)?证实|已查明|验出).{0,16}(?:不孕|绝育|致病|害人|害你|下毒)|凶手(?:就是|已定)|前世.{0,10}(?:足以证明|可以定罪)/.test(value.text))throw new RuleError('现有核对未作病因或幕后责任结论，不能拿线索代替本世证据。');
 if(/顾清和|顾清河|乐师允礼/.test(value.text))throw new RuleError('AI叙述使用了错误人物设定。');
 return value.text;
}
export const PARSE_SCHEMA={type:'object',additionalProperties:false,properties:{segments:{type:'array',items:{type:'object',additionalProperties:false,properties:{kind:{type:'string',enum:['chat','query','preference','boundary']},text:{type:'string'},intent:{type:'string',enum:['仅合作','暂缓','终止恋爱','']}},required:['kind','text','intent']}},actions:{type:'array',items:{type:'object',additionalProperties:false,properties:{type:{type:'string',enum:['candidate']},candidateId:{type:'string'},sourceText:{type:'string'}},required:['type','candidateId','sourceText']}},clarifications:{type:'array',items:{type:'string',enum:Object.keys(PARSE_CLARIFICATIONS)}}},required:['segments','actions','clarifications']};
export const CHAT_SCHEMA={type:'object',additionalProperties:false,properties:{speakerId:{type:'string'},text:{type:'string'},factIds:{type:'array',items:{type:'string'}}},required:['speakerId','text','factIds']};
