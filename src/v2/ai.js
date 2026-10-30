import {tendernessGuide,quietRefusal} from './audience.js';
import {OFFICES} from './appointments.js';
import {treasuryIndex} from './economy.js';
import {weatherOf} from './engine.js';
// AI 层：对话、旨意、夜话。AI 负责写和判断，引擎负责限幅。连不上时返回 null，界面改用固定文字。
import {callModel} from './model.js';
import {placeOf,titleOf,birthdays,affectionStage} from './engine.js';
import {rivalsOf} from './social.js';
import {fateGuide} from './fate.js';
import {readConnectionSettings,connectionSettings,storeConnectionSettings} from '../ai-connection-settings.js';
import {DEFAULT_AI} from '../ai-provider.js';
import {PEOPLE,STATS,MONTHS,stageOf,NAMES,YEAR_NAME} from './data.js';

let mode='off',byok=null,lastError='';
export const aiMode=()=>mode;
export const aiError=()=>lastError;
export const OFF_KEY='changyong-v2-ai-off';

export async function initAI(storage=globalThis.localStorage){
 let off=false;try{off=storage.getItem(OFF_KEY)==='1';}catch{}
 if(off){mode='off';return mode;}
 const staticSite=globalThis.document?.querySelector('meta[name="changyong-hosting"]')?.content==='static';
 if(!staticSite)try{const r=await fetch('/api/status');if(r.ok&&(await r.json()).configured){mode='server';return mode;}}catch{}
 const saved=readConnectionSettings(storage);
 if(sessionByok){byok=sessionByok;mode='byok';return mode;}
 if(saved?.mode==='byok'&&saved.key){byok={base:saved.url,model:saved.model,protocol:saved.protocol,key:saved.key};mode='byok';return mode;}
 mode='off';return mode;
}
export const savedConnection=(storage=globalThis.localStorage)=>readConnectionSettings(storage)||{url:DEFAULT_AI.url,model:DEFAULT_AI.model,protocol:DEFAULT_AI.protocol,key:''};
// 设置页：保存自己的 API，并试一次
export async function saveConnection(form,remember,storage=globalThis.localStorage){
 const cur=readConnectionSettings(storage)||{};
 const v=connectionSettings({mode:'byok',url:form.url,model:form.model,protocol:form.protocol||cur.protocol||DEFAULT_AI.protocol,key:form.key,limit:cur.limit||100},cur);
 byok={base:v.url,model:v.model,protocol:v.protocol,key:v.key};
 const test=await callModel(byok,fetch.bind(globalThis),'只输出 JSON：{"ok":true}','测试');
 if(!test)throw Error('没有收到回应。');
 storeConnectionSettings(storage,v,remember);if(!remember)sessionByok=byok;
 setAIOff(false,storage);mode='byok';lastError='';return true;
}
let sessionByok=null;
export function setAIOff(off,storage=globalThis.localStorage){try{off?storage.setItem(OFF_KEY,'1'):storage.removeItem(OFF_KEY);}catch{}}

async function ask(system,user){
 if(mode==='off')return null;
 try{
  if(mode==='server'){
   const r=await fetch('/api/v2',{method:'POST',headers:{'Content-Type':'application/json','X-Changyong-Request':'1'},body:JSON.stringify({system,user})});
   const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'AI 暂不可用');lastError='';return d.value;
  }
  const v=await callModel(byok,fetch.bind(globalThis),system,user);lastError='';return v;
 }catch(e){lastError=e.message||'AI 暂不可用';return null;}
}

const WORLD=`你在为清宫文字游戏《重生长雍帝王赋》写作。玩家扮演雍正皇帝：他在病榻上死去，又醒在雍正元年正月，记得前世的一切——年羹尧被赐死、年世兰撞墙、苏培盛守了他一辈子却没被好好看见、后宫里许多人的不得善终。这一世，他想把能挽回的都挽回。
文风：白话、克制、有画面，像好的小说，不要堆砌辞藻，不要现代网络用语。人物说话符合身份与性格。不写露骨的性内容。亲密情节只限明确成年、非亲属、双方自由自愿。拒绝、迟疑或不适都应受到尊重，权势和赏赐不能代替同意。未成年、亲属之间、胁迫、药物影响或无法清醒表达意愿时，不写亲密行为，转为日常照顾。一档自由度也不改变这些边界。
君臣礼法（必须遵守）：玩家是皇帝。妃嫔、太监、太医、大臣、亲王，在皇帝面前都守着尊卑。心里不情愿、委屈、生气时，用婉拒、推辞、告罪、沉默、低头不语、红了眼眶、找个由头告退来表达；大臣不赞同时跪下进谏，先说“臣斗胆”“请皇上三思”，语气恭顺。绝不当面斥责、讥讽、顶撞、命令或教训皇帝，不用“你”直呼皇帝，不反问逼问皇帝。即便是恋人、兄弟，也只是撒娇、使一点小性子、说句俏皮话，点到为止，礼数不失。只有醉后、重病、生死关头才偶尔失态，事后要惶恐请罪。`;
export const statLine=s=>`国库${s.stats.treasury}万两（充盈度${treasuryIndex(s)}/100），内帑${s.stats.inner}万两，`+STATS.filter(x=>!['inner','treasury'].includes(x.id)).map(x=>`${x.name}${s.stats[x.id]}/100`).join('，');
export const dateLine=s=>`雍正${YEAR_NAME(s.year)}年${MONTHS[s.month-1]}。今日${weatherOf(s)}`+(s.appointments?.C03?.office?'（年羹尧现任'+titleOf(s,'C03')+'）':s.flags?.nian_prison?'（年羹尧已被削爵下狱）':s.flags?.nian_away?'（年羹尧已被降为杭州将军）':s.flags?.nian_safe?'（年羹尧交出兵权，留京任职）':'')+((s.month&&birthdays(s).length)?`。本月是${birthdays(s).map(id=>PEOPLE[id].name).join('、')}的生辰`:'');
function relation(id,st){
 if(PEOPLE[id].secondary)return '只写故人之间的信任与君臣之礼，不把情分写成恋爱。';
 if(id==='C05')return st.lover?'你们是彼此最亲的兄弟与知己，皇兄曾把一个“很长的梦”告诉你。':'';
 if(st.lover)return '你们已经互相表明心意，私下是恋人：亲昵、信任，偶尔撒娇或吃醋，人前仍守着身份。';
 if(st.aff>=65)return '你已经对皇上动了心，但还没有说破。';
 if(st.aff>=45)return '你开始信任皇上，愿意说些心里话。';
 return st.aff<25?'你对皇上还很生分，拘着礼数，有防备。':'你和皇上算是相识，客气里带着试探。';
}
export function personBlock(s,id){
 const p=PEOPLE[id],st=s.people[id];
 const mem=st.memories.slice(-8).map(m=>`· ${m.text}`).join('\n')||'（还没有）';
 return `【${p.name}】${titleOf(s,id)}。${p.voice}
能力：${st.ability}/10，忠诚：${st.loyalty}/100，派系：${st.faction}。\n与皇上的情分：${st.aff}/100（${affectionStage(s,id)}）。${relation(id,st)}${s.lastNight&&rivalsOf(id).includes(s.lastNight)?`皇上最近夜里去了${PEOPLE[s.lastNight].name}那里，你心里有点不是滋味（可以若有若无地带出来，别太刻薄）。`:''}${s.past?.[id]?'你对皇上有一种说不清的似曾相识，好像很久以前就认得他（不要点破，偶尔流露）。':''}${st.knot?`心里有个结：皇上在「${st.knot.text}」这件事上没有站在${p.name}这边，还没说开。`:''}
${p.name}记得的事：\n${mem}`;
}
const clampInt=(v,a,b)=>Math.max(a,Math.min(b,Math.round(Number(v)||0)));
const str=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';

// 召见对话。history: [{who:'player'|'npc',text}]
export async function chatReply(s,id,history,{letter=false,fate=null}={}){
 const p=PEOPLE[id],st=s.people[id];
 const system=`${WORLD}
现在你只扮演${p.name}，${letter?'这是一封书信往来：皇上写信给远在'+placeOf(s,id)+'的你，你回信':'皇上召见你，你们在'+placeOf(s,id)+'说话'}。
${personBlock(s,id)}
当前：${dateLine(s)}。朝局：${statLine(s)}。${s.people[id].lover?tendernessGuide(s,id,'private-chat',{letter,fate}):''}
规则：
1. reply 是${p.name}的回应，40到130字，可以有一两句动作或神情描写（第三人称写${p.name}，称玩家为“你”或用称谓）。要接住皇上刚才那句话，不要答非所问，不要说教。
2. 你可以有情绪、回忆、小心翼翼的玩笑。皇上的话若真诚、懂${p.name}，就让${p.name}有所触动；若敷衍、傲慢、伤人，就如实流露出来：沉默、低头、勉强的笑、找个由头告退，但始终守着君臣之礼，不顶撞、不斥责。
3. affection 是这句话让情分变化多少，整数 -5 到 5：真诚而贴心 +3～+5，平常客气 +1～+2，答非所问或敷衍 0，冒犯伤人 -2～-5。${st.knot?'心结未解时，除非皇上正面承认那件事，否则不超过 +1。':''}
4. memory：这句对话里如果有值得${p.name}长久记住的事（一个承诺、一句真心话、一次冒犯），用一句不超过30字的话写下来；没有就给空字符串。
5. mood：两到四个字，${p.name}此刻的心情。
${fate?'6. '+fateGuide(fate,'person',p.name)+'\n':''}只输出 JSON：{"reply":"...","affection":0,"mood":"...","memory":""}`;
 const user=history.filter(h=>h.who!=='sys').slice(-10).map(h=>(h.who==='player'?'皇上：':p.name+'：')+h.text).join('\n');
 const v=await ask(system,user);if(!v)return null;
 const reply=str(v.reply,300);if(!reply)return null;
 return {reply,affection:clampInt(v.affection,-5,5),mood:str(v.mood,8),memory:str(v.memory,40)};
}

// 赏赐后的回应
export async function giftReply(s,id,giftName,liked,disliked=false){
 const p=PEOPLE[id];
 const system=`${WORLD}\n你只扮演${p.name}。\n${personBlock(s,id)}\n皇上刚赏了${p.name}一件东西：${giftName}。${disliked?p.name+'讨厌这个，收下时不高兴。':liked?p.name+'正喜欢这个。':'这不算'+p.name+'最想要的，但也是心意。'}\n写${p.name}收到时的反应，50到110字，有动作有一句话。只输出 JSON：{"reply":"..."}`;
 const v=await ask(system,'请写。');return str(v?.reply,260)||null;
}

// 下旨：玩家自由写旨意，AI 推演后果
export async function edictResult(s,text,presentIds,fate=null){
 const roster=presentIds.map(id=>`${id}=${PEOPLE[id].name}（${titleOf(s,id)}）`).join('，');
 const system=`${WORLD}
皇上亲笔写了一道旨意。你是史官兼推演者：判断这道旨意在雍正朝的现实里会产生什么后果，并写出来。
当前：${dateLine(s)}。局势：${statLine(s)}（银子按万两，其他各项为 0 到 100）。
可能受影响的人：${roster}。要职在任者：${Object.entries(s.appointments).filter(([,a])=>a.office).map(([id,a])=>PEOPLE[id].name+'='+a.title).join('，')}。
任命可返回 appoint 数组，每项 {id,office}，最多三项；只用已有职位代码：${Object.entries(OFFICES).map(([id,o])=>id+'='+o.title).join('，')}；免职用 dismiss。定员与任用资格由引擎检查，不得在 narration 中声称未获准的任命已成功。
规则：
1. title：这道旨意的简称，不超过8字。
2. narration：用第二人称“你”，写旨意下达后一两个月里发生了什么，100到200字。要有具体的人和细节，有得有失；好心办坏事、阳奉阴违、意外之喜都可以发生。旨意若荒唐、残暴、或根本做不到，就写出它怎样碰壁或闹出乱子。
3. effects：对五项局势的影响，整数，每项 -8 到 8，合计的正值一般不超过 10。国家用度扣国库(treasury)，1点折10万两；宫里用度、赏赐、添置走可选 inner 字段，单位万两，限 -20 到 20，不能两边重复扣；惠民的事加民心(people)；整饬吏治、立规矩影响朝局(court)；涉及宫闱的影响后宫(palace)；劳神的事扣圣躬(health)。没影响的项填 0。
4. affection：这道旨意让哪些人对皇上的情分变化，键是人物编号（只能用上面列出的），值 -5 到 5；无关的人不写。
${fate?'5. '+fateGuide(fate,'edict')+'\n':''}只输出 JSON：{"title":"...","narration":"...","effects":{"treasury":0,"people":0,"court":0,"palace":0,"health":0},"affection":{},"inner":0,"appoint":[]}`;
 const v=await ask(system,'旨意原文：'+text);if(!v)return null;
 const narration=str(v.narration,500);if(!narration)return null;
 const effects={};for(const x of STATS)effects[x.id]=clampInt(v.effects?.[x.id],-8,8);
 const affection={};for(const[k,val]of Object.entries(v.affection||{}))if(presentIds.includes(k))affection[k]=clampInt(val,-5,5);
 delete effects.inner;return {title:str(v.title,12)||text.slice(0,8),narration,effects,affection,inner:Math.max(-20,Math.min(20,Number(v.inner)||0)),appoint:v.appoint??[]};
}

// 夜里的一段
export async function nightScene(s,id,line='',fate=null){
 const p=PEOPLE[id];
 const system=`${WORLD}
今夜皇上去了${placeOf(s,id)}，陪着${p.name}。
${personBlock(s,id)}
当前：${dateLine(s)}。${tendernessGuide(s,id,'night',{fate})}
写今夜的一小段，120到220字，第二人称“你”。要有一个具体的小细节（一样东西、一句话、一个动作），贴合${p.name}的性格和你们眼下的情分，${s.people[id].lover?(id==='C05'?'兄弟知己之间的亲近与默契':'恋人之间的温存与亲昵，可以有拥抱、依偎、牵手这样的细节'):s.people[id].aff>=65?'情意已经很明显，只差一句话没说破':s.people[id].aff<45?'还有些拘谨，彼此在试探':'已经可以说些心里话'}。点到为止，不写露骨内容。${line?'皇上开口说的第一句是：“'+line+'”，要接住这句话。':''}
${fate?fateGuide(fate,'person',p.name)+'\n':''}${fate&&!fate.free&&fate.tier<=1?'今夜婉拒，改为喝茶或照顾起居，不发生亲密行为。\n':''}affection：今夜让情分增加多少，0 到 5。memory：今夜值得${p.name}记住的一件事，不超过30字。
只输出 JSON：{"text":"...","affection":3,"memory":""}`;
 const v=await ask(system,'请写今夜。');if(!v){lastError='';return null;}
 const text=str(v?.text,600);if(quietRefusal(text)){lastError='';return null;}
 return {text,affection:clampInt(v.affection,0,5),memory:str(v.memory,40)};
}

// 剧情选完后，主角说一句（让固定剧情也有 AI 的回声；可选）
export async function sceneEcho(s,id,sceneTitle,choice,replyText){
 const p=PEOPLE[id];if(!p)return null;
 const system=`${WORLD}\n你只扮演${p.name}。\n${personBlock(s,id)}\n刚刚在「${sceneTitle}」里，皇上的选择是：${choice}。结果：${replyText.slice(0,300)}\n写${p.name}事后对皇上说的一句话（可带一个动作），30到80字，不要重复上面的结果。只输出 JSON：{"reply":"..."}`;
 const v=await ask(system,'请写。');return str(v?.reply,200)||null;
}
export {NAMES};

// 旨意的回报：几个月后，这道旨意落地的情形，并给出接下来的选择
export async function edictFollow(s,e){
 const ago=Math.max(1,(s.year-1)*12+s.month-e.at);
 const system=`${WORLD}
${ago}个月前，皇上下了一道旨意。现在要写这道旨意的“回报”：它落地以后，发生了什么新情况，需要皇上再拿主意。
旨意原文：${e.text}
当时的结果：${e.narration}
当前：${dateLine(s)}。局势：${statLine(s)}（银子按万两，其他各项为 0 到 100）。
要求：
1. title：不超过10字，有画面感（例如“粥厂前的石碑”“米仓里的老鼠”）。
2. body：150到250字，第二人称“你”。写一件具体的新事：可能是好结果带来的意外（百姓立碑、有人效仿），也可能是执行走样（官员借机贪墨、地方阳奉阴违），也可能是新的麻烦。要有具体的人物、对话和细节，读起来像小说，不要写成公文。
3. options：2到3个选择，每个有 label（不超过16字，口语化）、effects（五项局势的影响，整数，每项 -6 到 6，不涉及的填 0）、reply（选了之后发生什么，60到120字）。选择之间要有真实的取舍，不要有一个明显最好的。
只输出 JSON：{"title":"...","body":"...","options":[{"label":"...","effects":{"treasury":0,"people":0,"court":0,"palace":0,"health":0},"reply":"..."}]}`;
 const v=await ask(system,'请写这道旨意的回报。');if(!v)return null;
 const title=str(v.title,14),body=str(v.body,600);if(!title||!body||!Array.isArray(v.options))return null;
 const options=v.options.slice(0,3).map((o,i)=>{const effects={};for(const x of STATS)effects[x.id]=clampInt(o?.effects?.[x.id],-6,6);return {id:'abc'[i],label:str(o?.label,24),effects,reply:str(o?.reply,300)};}).filter(o=>o.label&&o.reply);
 if(options.length<2)return null;
 return {title,body,options,actor:'C28',location:'养心殿'};
}
