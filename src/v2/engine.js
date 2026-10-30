// 新版引擎：一月一回合。月初处理要事，白天三个行动，夜里留一人，月末结算。
import {SCENES as RAW,REPAIR} from './content.js';
import {REWRITE} from './rewrite.js';
import {ROMANCE} from './romance.js';
import {MORE_PETITIONS,SMALL_EVENTS} from './events.js';
import {SCENES2,AGENDA2,CRISES2,REPAIR2} from './vol2.js';
import {VISITS} from './visits.js';
import {SURPRISES,rivalsOf,friendsOf,JEALOUS,FRIEND_LINES} from './social.js';
const POOL=[...PETITIONS,...MORE_PETITIONS,...SMALL_EVENTS];
export const thirdOf=id=>'L'+id.slice(1);
export const fourthOf=id=>'Y'+id.slice(1);
const ALL_AGENDA={...AGENDA,...AGENDA2};
export const ALL_CRISES=[...CRISES.map(c=>({vol:1,...c})),...CRISES2];
const ALL_REPAIR={...REPAIR,...REPAIR2};
import {PEOPLE,CORE,START_STATS,STAT_MAP,STATS,AGENDA,CRISES,GIFTS,OUTINGS,PETITIONS,stageOf} from './data.js';

// 用改写稿覆盖原稿的正文与选项文字
const SCENES=Object.fromEntries(Object.entries(RAW).map(([id,sc])=>{const w=REWRITE[id];if(!w)return [id,sc];return [id,{...sc,title:w.title||sc.title,body:w.body||sc.body,dep:w.dep,options:sc.options.map(o=>({...o,...(w.options?.[o.id]||{})}))}];}));
export const SAVE_KEY='changyong-v2-save';
export const AP_PER_MONTH=3;
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Math.round(n)));
const idx=(y,m)=>(y-1)*12+m;
const before=(s,[y,m])=>idx(s.year,s.month)<idx(y,m);
export const monthKey=s=>s.year+'-'+s.month;
export function rand(s){s.seed=(s.seed*1103515245+12345)%2147483648;return s.seed/2147483648;}

export function newGame(seed=Date.now()%2147483647){
 const s={version:1,vol:1,flags:{},seed,crises:{},year:1,month:1,ap:AP_PER_MONTH,stats:{...START_STATS},people:{},agenda:[],done:{},log:[],delta:{stats:{},people:{}},night:false,ended:false,used:{petitions:[],outings:[]},chats:0};
 for(const id of CORE)s.people[id]={aff:PEOPLE[id].start,met:false,knot:null,first:false,second:false,third:false,lover:false,firstAt:null,secondAt:null,memories:[]};
 bind(s);startMonth(s);return s;
}

// ---------- 人物 ----------
export const present=(s,id)=>!before(s,PEOPLE[id].from);
export const away=(s,id)=>!!s.flags?.['away_'+id]||(PEOPLE[id].away||[]).some(([y,m])=>y===s.year&&m===s.month);
export function placeOf(s,id){if(id==='C03'&&s.year>=3)return s.flags?.nian_prison?'刑部大牢':s.flags?.nian_away?'杭州':'年府';return PEOPLE[id].place;}
export function titleOf(s,id){if(id==='C03'&&s.year>=3)return s.flags?.nian_prison?'削爵在狱':s.flags?.nian_away?'杭州将军':s.flags?.nian_safe?'领侍卫内大臣':'抚远大将军';return PEOPLE[id].title;}
export const gone=(s,id)=>!!s.flags?.['gone_'+id];
export const stage=(s,id)=>stageOf(s.people[id].aff);
export function gain(s,id,n,why=''){
 const p=s.people[id];if(!p)return 0;
 if(n>0&&p.knot)n=0;
 const before=p.aff;p.aff=clamp(p.aff+n);const d=p.aff-before;
 if(d)s.delta.people[id]=(s.delta.people[id]||0)+d;
 if(d>0&&stageOf(p.aff)!==stageOf(before))cele(s,{k:'stage',id,stage:stageOf(p.aff)});
 return d;
}
// 值得庆祝的时刻：界面会逐个弹出
export function cele(s,c){(s.cele=s.cele||[]).push(c);}
const count=(s,k)=>{s.count=s.count||{};s.count[k]=(s.count[k]||0)+1;};
export function remember(s,id,text){if(!text)return;const p=s.people[id];p.memories.push({y:s.year,m:s.month,text:String(text).slice(0,60)});if(p.memories.length>12)p.memories.shift();}
export function secondReady(s,id,letter=false){const p=s.people[id];return p.first&&!p.second&&p.aff>=45&&!p.knot&&p.firstAt!==monthKey(s)&&present(s,id)&&(letter||!away(s,id));}
export function thirdReady(s,id,letter=false){const p=s.people[id];return p.second&&!p.third&&p.aff>=65&&!p.knot&&p.secondAt!==monthKey(s)&&present(s,id)&&(letter||!away(s,id));}
export function fourthReady(s,id,letter=false){const p=s.people[id];return s.year>=3&&p.third&&!p.fourth&&p.aff>=75&&!p.knot&&p.thirdAt!==monthKey(s)&&present(s,id)&&!gone(s,id)&&(letter||!away(s,id));}
export const storyOf=(s,id)=>secondReady(s,id)?PEOPLE[id].second:thirdReady(s,id)?thirdOf(id):fourthReady(s,id)?fourthOf(id):null;
export const hasStory=(s,id)=>!!storyOf(s,id);

// ---------- 数值 ----------
export function applyStats(s,effects={},scale=1){
 const out={};
 for(const[k,v]of Object.entries(effects||{})){const map=STAT_MAP[k]||(STATS.some(x=>x.id===k)?[k,1]:null);if(!map||!Number.isFinite(v))continue;const [to,f]=map;out[to]=(out[to]||0)+v*f*scale;}
 const applied={};
 for(const[k,v]of Object.entries(out)){const before=s.stats[k];s.stats[k]=clamp(before+v);const d=s.stats[k]-before;if(d){applied[k]=d;s.delta.stats[k]=(s.delta.stats[k]||0)+d;}}
 return applied;
}
export function log(s,text,kind='事'){s.log.push({y:s.year,m:s.month,kind,text});if(s.log.length>300)s.log.shift();}

// ---------- 月 ----------
export function startMonth(s){
 s.ap=AP_PER_MONTH;s.night=false;s.delta={stats:{},people:{}};s.chats=0;
 s.agenda=(ALL_AGENDA[monthKey(s)]||[]).filter(id=>!s.done[id]);
 // 两三个月前的旨意，送回报来了
 for(const e of s.edicts||[])if(e.due===idx(s.year,s.month)&&!s.done['FU'+e.n])s.agenda.push('FU'+e.n);
 // 人在外地的，第二、三幕以书信的形式在月初到来
 for(const id of CORE)if(away(s,id)&&!gone(s,id)){if(secondReady(s,id,true))s.agenda.push(PEOPLE[id].second);else if(thirdReady(s,id,true))s.agenda.push(thirdOf(id));}
 // 要事少的月份，抽一件奏折或宫闱小事
 const last=s.month===12&&(s.year===2||s.year===4);
 if(!last&&(s.agenda.length===0||(s.agenda.length===1&&rand(s)<0.5))){const left=POOL.filter(p=>!s.used.petitions.includes(p.id)&&(!p.months||p.months.includes(s.month))&&(!p.need||(present(s,p.need)&&s.people[p.need].met&&!away(s,p.need))));if(left.length){const p=left[Math.floor(rand(s)*left.length)];s.used.petitions.push(p.id);s.agenda.push(p.id);}}
 for(const id of CORE)if(present(s,id)&&!s.people[id].met&&!SCENES[PEOPLE[id].first]?.id)s.people[id].met=true;
 // 情分够了的人，有时会自己找上门来
 s.visit=null;
 const cand=CORE.filter(id=>{const p=s.people[id];return p.met&&p.aff>=40&&!p.knot&&present(s,id)&&!away(s,id)&&s.lastVisit?.[id]!==monthKey(s)&&!(s.visitedAt?.[id]>=idx(s.year,s.month)-2);});
 if(cand.length&&rand(s)<0.5){const id=cand[Math.floor(rand(s)*cand.length)],p=s.people[id];const tier=p.lover?2:p.aff>=65?1:0;const list=VISITS[id][tier];s.visit={id,tier,i:Math.floor(rand(s)*list.length)};}
}
export function visitOf(s){if(!s.visit)return null;const v=VISITS[s.visit.id][s.visit.tier][s.visit.i];return {id:s.visit.id,...v};}
// 来访：不占时辰，迎进来就有好处
export function acceptVisit(s){const v=visitOf(s);if(!v)throw Error('没有人来。');s.visit=null;s.visitedAt=s.visitedAt||{};s.visitedAt[v.id]=idx(s.year,s.month);const stats=applyStats(s,v.effects||{}),d=gain(s,v.id,3);remember(s,v.id,v.memory||'');log(s,`${PEOPLE[v.id].name}来了：${v.title}`,'情');count(s,'visits');return {title:v.title,text:v.text,stats,people:d?{[v.id]:d}:{},id:v.id};}
// 动态场景（旨意的回报）挂在存档上；bind 让 scene() 能找到当前存档
let CUR=null;export function bind(s){CUR=s;return s;}
function followFallback(s,id){const e=(s?.edicts||[]).find(x=>'FU'+x.n===id);if(!e)return null;const ago=Math.max(1,idx(s.year,s.month)-e.at);const neg=Object.values(e.effects||{}).some(v=>v<0);
 return {id,title:`「${e.title}」的回音`,kind:'edictfollow',actor:'C28',location:'养心殿',body:`${ago}个月前，你下了一道旨意：${e.text}\n\n如今，各地的回报陆续送到了。张廷玉把它们摞在案上，${neg?'说好的有，说难的也有。':'大多是好消息。'}\n\n“皇上，”他问，“这件事，往后怎么办？”`,
  options:[{id:'a',label:'嘉奖经办的官员，接着办',effects:{court:2,treasury:-2},reply:'经办的官员得了赏，干劲更足了。这道旨意，算是真正落了地。'},{id:'b',label:'派人下去看看实情',effects:{people:2,health:-1},reply:'派去的人跑了一个月，回来说：旨意确实落了地，只是有几处被下面的人打了折扣。你让他们一一改了。'},{id:'c',label:'不必再过问',effects:{},reply:'你没有再过问。这件事，就这样过去了。'}]};}
export const scene=id=>SCENES[id]||ROMANCE[id]||SCENES2[id]||POOL.find(p=>p.id===id)||SURPRISES.find(p=>p.id===id)||(id?.startsWith('FU')?(CUR?.dyn?.[id]||followFallback(CUR,id)):null);
export function setDyn(s,id,sc){s.dyn=s.dyn||{};s.dyn[id]={...sc,id,kind:'edictfollow'};}
// 白天做完事，有时会撞见一件小事
export function rollSurprise(s){if(s.agenda.length||s.ended||rand(s)>=0.28)return null;s.used.surprises=s.used.surprises||[];
 const ok=x=>!s.used.surprises.includes(x.id)&&[].concat(x.need||[]).every(n=>s.people[n]?.met&&present(s,n)&&!away(s,n));
 const left=SURPRISES.filter(ok);if(!left.length)return null;const x=left[Math.floor(rand(s)*left.length)];s.used.surprises.push(x.id);s.agenda.unshift(x.id);return x.id;}
// 偏心的后果：不和的人吃醋，亲近的人跟着高兴
function social(s,id,heavy){const out={},notes=[];if(!id)return {people:out,notes};
 for(const r of rivalsOf(id)){const p=s.people[r];if(!p?.met||!present(s,r)||p.aff<25)continue;const n=heavy?-3:-1;const d=gain(s,r,n);if(d){out[r]=d;if(JEALOUS[r]?.[id])notes.push(JEALOUS[r][id]);}}
 for(const f of friendsOf(id)){const p=s.people[f];if(!p?.met||!present(s,f)||p.knot)continue;const d=gain(s,f,1);if(d){out[f]=d;if(FRIEND_LINES[f]?.[id])notes.push(FRIEND_LINES[f][id]);}}
 return {people:out,notes:notes.length?[notes[Math.floor(rand(s)*notes.length)]]:[]};}

export const optionsFor=(s,sc)=>sc.options.filter(o=>!o.need||s.flags?.[o.need]);
export const pendingScene=s=>s.agenda[0]||null;

// 处理要事中的一个选项
export function choose(s,id,optId){
 if(s.agenda[0]!==id)throw Error('先处理眼前这件事。');
 const sc=scene(id),opt=optionsFor(s,sc).find(o=>o.id===optId);if(!opt)throw Error('没有这个选项。');
 let effects={...opt.effects};
 if(id==='G03')effects=s.done.G02==='strict'?{people:-3,court:1}:{people:2,court:2};
 if(id==='G06')effects=s.done.G04==='full'?{court:-3}:s.done.G04==='pause'?{court:-2,people:-1}:{court:3};
 const stats=applyStats(s,effects),people={};
 const add=(cid,n)=>{const d=gain(s,cid,n);if(d)people[cid]=(people[cid]||0)+d;};
 if(['relation','extension'].includes(sc.kind)){const n={warm:6,develop:6,work:3,cooperate:3,distance:1,unsure:2}[optId]??3;const cid=sc.actor;s.people[cid].met=true;
  if(PEOPLE[cid].first===id){s.people[cid].first=true;s.people[cid].firstAt=monthKey(s);}if(PEOPLE[cid].second===id){s.people[cid].second=true;s.people[cid].secondAt=monthKey(s);}add(cid,n);}
 else if(sc.kind==='deep'){const cid=sc.actor,p=s.people[cid];p.fourth=true;add(cid,{stay:6,mid:3,hard:-3}[optId]??2);}
 else if(sc.kind==='romance'){const cid=sc.actor,p=s.people[cid];p.third=true;p.thirdAt=monthKey(s);if(optId==='confess'){p.lover=true;cele(s,{k:'lover',id:cid});remember(s,cid,cid==='C05'?'皇兄把那个很长的梦告诉了他':'两人说开了心意');}add(cid,{confess:8,slow:5,restrain:1}[optId]??3);}
  else if(sc.kind==='dilemma'){for(const[cid,b]of Object.entries(opt.bonds||{}))add(cid,(b.trust||0)*2);if(opt.slight){add(opt.slight,-5);s.people[opt.slight].knot={source:id,text:sc.title};remember(s,opt.slight,'你在「'+sc.title+'」里没有选她/他');}}
 else if(PEOPLE[sc.actor]&&!opt.bond)add(sc.actor,2);
 if(opt.bond)for(const[cid,n]of Object.entries(opt.bond))if(s.people[cid])add(cid,n);
 if(opt.flag){s.flags=s.flags||{};s.flags[opt.flag]=true;if(opt.flag==='nian_away')s.flags.away_C03=true;if(opt.flag==='nian_prison'){s.flags.away_C03=true;s.flags.gone_C03=true;}}
 for(const cid of Object.keys(PEOPLE))if(present(s,cid)&&(sc.actor===cid))s.people[cid].met=true;
 const text=(opt.replyBy&&sc.dep&&opt.replyBy[s.done[sc.dep]])||opt.reply||'';
 s.done[id]=optId;s.agenda.shift();
 log(s,`${sc.title}：${opt.label}`,['relation','extension','romance','deep'].includes(sc.kind)?'情':sc.kind==='dilemma'?'难':'政');
 return {title:sc.title,actor:sc.actor,choice:opt.label,text,stats,people,knot:opt.slight||null};
}

// ---------- 白天的行动 ----------
function spend(s){if(s.agenda.length)throw Error('先把本月要事办完。');if(s.ap<=0)throw Error('今日的时辰已经用完了。');s.ap--;}
export function canAct(s){return !s.agenda.length&&s.ap>0&&!s.ended;}

export function beginChat(s,id){if(!present(s,id))throw Error('还见不到这个人。');spend(s);s.people[id].met=true;s.chats++;return {id,letter:away(s,id),gained:0,turns:0};}
// 一次召见最多加 8 点，单句 -5～+4
export const CHAT_CAP=8;
export function applyChat(s,chat,{affection=0,memory=''}={}){
 const room=Math.max(0,CHAT_CAP-chat.gained);let n=Math.max(-5,Math.min(4,Math.round(affection)));if(n>0)n=Math.min(n,room);
 const d=gain(s,chat.id,n);chat.gained+=Math.max(0,d);chat.turns++;count(s,'lines');remember(s,chat.id,memory);return d;
}
export function hintLike(s,id){s.known=s.known&&!Array.isArray(s.known)?s.known:{};const k=s.known[id]=s.known[id]&&!Array.isArray(s.known[id])?s.known[id]:{};const g=PEOPLE[id].likes.find(x=>k[x]!==true);if(g)k[g]=true;return g||null;}
export function repairKnot(s,chat){const p=s.people[chat.id];if(!p.knot)return null;const line=ALL_REPAIR[p.knot.source]?.[chat.id]||'你们把那件事说开了。';log(s,`与${PEOPLE[chat.id].name}说开了「${p.knot.text}」`,'情');p.knot=null;cele(s,{k:'knot',id:chat.id});count(s,'knots');gain(s,chat.id,3);chat.gained+=3;return line;}

export function giveGift(s,id,giftId){
 const g=GIFTS[giftId];if(!g)throw Error('没有这件东西。');if(s.stats.treasury<g.cost)throw Error('国库不够了。');
 spend(s);const stats=applyStats(s,{treasury:-g.cost});const liked=PEOPLE[id].likes.includes(giftId);s.gifted=s.gifted||{};const k=id+':'+giftId,times=s.gifted[k]||0;s.gifted[k]=times+1;const d=gain(s,id,times?1:liked?6:2);s.people[id].met=true;
 const so=g.cost>=5?social(s,id,false):{people:{},notes:[]};
 log(s,`赏${PEOPLE[id].name}${g.name}`,'赏');return {liked,repeat:times>0,stats,people:{...(d?{[id]:d}:{}),...so.people},notes:so.notes,knot:!!s.people[id].knot};
}
// 旨意的后果由 AI 判断，这里只限幅
export function applyEdict(s,text,{effects={},affection={},narration='',title=''}={}){
 spend(s);const bounded={};for(const st of STATS){const v=Number(effects[st.id]);if(Number.isFinite(v))bounded[st.id]=Math.max(-8,Math.min(8,Math.round(v)));}
 const total=Object.values(bounded).reduce((a,b)=>a+Math.max(0,b),0);if(total>12)for(const k in bounded)if(bounded[k]>0)bounded[k]=Math.round(bounded[k]*12/total);
 const stats=applyStats(s,bounded),people={};
 for(const[cid,v]of Object.entries(affection||{}))if(PEOPLE[cid]&&present(s,cid)){const d=gain(s,cid,Math.max(-5,Math.min(5,Math.round(Number(v)||0))));if(d)people[cid]=d;}
 log(s,`下旨：${title||text.slice(0,24)}`,'旨');count(s,'edicts');
 s.edicts=s.edicts||[];const n=s.edicts.length+1;s.edicts.push({n,text:text.slice(0,120),title:title||text.slice(0,8),narration:String(narration).slice(0,400),effects:bounded,at:idx(s.year,s.month),due:idx(s.year,s.month)+2+Math.floor(rand(s)*2)});return {stats,people,text:narration};
}
export function goOuting(s){spend(s);const left=OUTINGS.map((o,i)=>i).filter(i=>!s.used.outings.includes(i));const pool=left.length?left:OUTINGS.map((o,i)=>i);const i=pool[Math.floor(rand(s)*pool.length)];s.used.outings.push(i);const o=OUTINGS[i];const stats=applyStats(s,o.effects);log(s,`微服：${o.title}`,'行');return {title:o.title,text:o.text+(o.note?'\n\n'+o.note:''),stats,people:{}};}
export function rest(s){spend(s);const stats=applyStats(s,{health:8});log(s,'闭门休养了一日','行');return {title:'休养',text:'你推开折子，让苏培盛把门关上。睡了一个整觉，醒来时窗外的光正好。',stats,people:{}};}

// ---------- 夜 ----------
export function nightChoices(s){return CORE.filter(id=>present(s,id)&&!away(s,id)&&s.people[id].met).map(id=>({id,special:storyOf(s,id),knot:!!s.people[id].knot}));}
export function spendNight(s,id,{affection=4,memory=''}={}){
 if(s.night)throw Error('今夜已经安排过了。');if(s.agenda.length)throw Error('先把本月要事办完。');s.night=true;
 if(!id){const stats=applyStats(s,{health:3});log(s,'独寝','夜');return {stats,people:{}};}
 const d=gain(s,id,Math.max(0,Math.min(4,Math.round(affection))));remember(s,id,memory);
 const heavy=s.lastNight===id;s.lastNight=id;const so=social(s,id,heavy);log(s,`夜里在${placeOf(s,id)}，陪着${PEOPLE[id].name}`,'夜');return {stats:{},people:{...(d?{[id]:d}:{}),...so.people},notes:so.notes};
}
// 夜里遇到第二幕剧情时，作为要事插入
export function queueSpecial(s,id){if(s.night)throw Error('今夜已经安排过了。');const sid=storyOf(s,id);if(!sid)throw Error('今夜没有新的剧情。');s.night=true;s.agenda.unshift(sid);return sid;}

// ---------- 月末 ----------
export function crisisStatus(s,c){
 if(s.crises?.[c.id])return s.crises[c.id];
 if(before(s,c.start))return 'later';
 const allDone=c.scenes.every(id=>s.done[id]);
 return allDone&&(!c.goal||c.goal(s))?'solved':'open';
}
function settleCrises(s){s.crises=s.crises||{};for(const c of ALL_CRISES){if(s.crises[c.id]||before(s,c.start))continue;const allDone=c.scenes.every(id=>s.done[id]),ok=allDone&&(!c.goal||c.goal(s));const due=s.year===c.deadline[0]&&s.month===c.deadline[1];if(ok&&!c.goal){s.crises[c.id]='solved';cele(s,{k:'crisis',name:c.name});}else if(due){s.crises[c.id]=ok?'solved':'failed';cele(s,{k:ok?'crisis':'crisisFail',name:c.name});log(s,`要务「${c.name}」${ok?'已了结':'没能办好'}`,'政');}}}
export function endMonth(s){
 if(s.agenda.length)throw Error('本月还有要事没办。');
 const report={y:s.year,m:s.month,stats:{...s.delta.stats},people:{...s.delta.people}};
 const tick=applyStats(s,s.year>=3?{treasury:3,health:-1,court:-1,people:-1}:{treasury:5,health:-1});report.income=tick;
 for(const[k,v]of Object.entries(tick))report.stats[k]=(report.stats[k]||0)+v;
 // 久不相见，情分会慢慢淡
 report.cooled=[];for(const id of CORE){const p=s.people[id];if(p.met&&!s.delta.people[id]&&p.aff>30&&present(s,id)&&!away(s,id)){p.aff=clamp(p.aff-(p.aff>=45?2:1));report.cooled.push(id);}}
 settleCrises(s);
 report.crises=ALL_CRISES.filter(c=>c.vol===(s.vol||1)).map(c=>({id:c.id,name:c.name,status:crisisStatus(s,c)}));
 if(s.month===12&&(s.year===2||s.year===4)){s.ended=true;return report;}
 s.month++;if(s.month>12){s.month=1;s.year++;}
 startMonth(s);return report;
}

// 第一卷结束后接着玩第二卷：存档、情分、记忆全部延续
export function startVolume2(s){if(!(s.ended&&s.year===2))throw Error('第一卷还没结束。');s.ended=false;s.vol=2;s.flags=s.flags||{};s.year=3;s.month=1;log(s,'第二卷：雍正三年','卷');startMonth(s);return s;}
export function ending(s){
 const sum=Object.values(s.stats).reduce((a,b)=>a+b,0),solved=ALL_CRISES.filter(c=>c.vol===(s.vol||1)&&crisisStatus(s,c)==='solved').length;
 const score=sum+solved*15;
 const people=CORE.filter(id=>s.people[id].met).map(id=>{const p=s.people[id];return {id,aff:p.aff,lover:!!p.lover,gone:gone(s,id),tier:p.lover&&p.aff>=85?3:p.aff>=65?2:p.aff>=45?1:0};});
 return {score,solved,people};
}

export function save(s,storage=globalThis.localStorage){try{storage.setItem(SAVE_KEY,JSON.stringify(s));return true;}catch{return false;}}
export function load(storage=globalThis.localStorage){try{const s=JSON.parse(storage.getItem(SAVE_KEY)||'null');return s?.version===1?bind(s):null;}catch{return null;}}
