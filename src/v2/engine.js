import * as G from './government.js';
import {planAllowed,PLAN_NOTICE,restCost} from './plans.js';
import {OFFICES,currentTitle,initAppointments,validateAppointments,recordAppointment,officeMonthly,appointmentOptions,officePlace} from './appointments.js';
export {appointmentOptions} from './appointments.js';
import {PLACES,NANFENG_FIRST,MINOR_STORIES,DESTINATIONS,SUMMON_ROLES} from './outings.js';
import {silver,treasuryIndex,initEconomy,emptyLedger,funds} from './economy.js';
export {treasuryIndex} from './economy.js';
// 新版引擎：一月一回合。月初处理要事，白天三个行动，夜里留一人，月末结算。
import {SCENES as RAW,REPAIR} from './content.js';
import {REWRITE} from './rewrite.js';
import {ROMANCE} from './romance.js';
import {MORE_PETITIONS,SMALL_EVENTS} from './events.js';
import {SCENES2,AGENDA2,CRISES2,REPAIR2} from './vol2.js';
import {SCENES3,AGENDA3,CRISES3,REPAIR3} from './vol3.js';
import {VISITS} from './visits.js';
import {tierOf,fateBonus,boundUp} from './fate.js';
import {BIRTH,BIRTH_SKIP,festivalOf,festId,festivalScene} from './festivals.js';
import {SURPRISES,rivalsOf,friendsOf,JEALOUS,FRIEND_LINES} from './social.js';
const POOL=[...PETITIONS,...MORE_PETITIONS,...SMALL_EVENTS];
export const thirdOf=id=>'L'+id.slice(1);
export const fourthOf=id=>'Y'+id.slice(1);
export const fifthOf=id=>'Z'+id.slice(1);
// 每卷最后一个月：二年、四年、六年腊月
export const LAST_YEARS=[2,4,6];
const ALL_AGENDA={...AGENDA,...AGENDA2,...AGENDA3};
export const ALL_CRISES=[...CRISES.map(c=>({vol:1,...c})),...CRISES2,...CRISES3];
const ALL_REPAIR={...REPAIR,...REPAIR2,...REPAIR3};
import {PEOPLE,CORE,START_STATS,STAT_MAP,STATS,AGENDA,CRISES,GIFTS,OUTINGS,PETITIONS,stageOf,SEASON,ECONOMY,CAST,PRIVATE_SCENES} from './data.js';

// 用改写稿覆盖原稿的正文与选项文字
const SCENES=Object.fromEntries(Object.entries(RAW).map(([id,sc])=>{const w=REWRITE[id];if(!w)return [id,sc];return [id,{...sc,title:w.title||sc.title,body:w.body||sc.body,dep:w.dep,options:sc.options.map(o=>({...o,...(w.options?.[o.id]||{})}))}];}));
export const SAVE_KEY='changyong-v2-save';
export const AP_PER_MONTH=3;
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Math.round(n)));
const idx=(y,m)=>(y-1)*12+m;
const before=(s,[y,m])=>idx(s.year,s.month)<idx(y,m);
export const monthKey=s=>s.year+'-'+s.month;
export function rand(s){s.seed=(s.seed*1103515245+12345)%2147483648;return s.seed/2147483648;}

export const WEATHER={春:['晴','雨','风'],夏:['晴','雨','闷热'],秋:['晴','雨','风'],冬:['晴','雪','风']};
export const weatherOf=s=>WEATHER[SEASON(s.month)].includes(s.weather)?s.weather:WEATHER[SEASON(s.month)][0];

export function newGame(seed=Date.now()%2147483647){
 const s={economyVersion:1,version:1,vol:1,freedom:2,flags:{},seed,crises:{},year:1,month:1,ap:AP_PER_MONTH,stats:{...START_STATS},people:{},agenda:[],done:{},log:[],delta:{stats:{},people:{}},night:false,ended:false,used:{petitions:[],outings:[]},chats:0};
 for(const id of CAST)s.people[id]={aff:PEOPLE[id].start,met:false,knot:null,first:false,second:false,third:false,lover:false,firstAt:null,secondAt:null,memories:[]};
 G.initGovernment(initAppointments(initTravel(s)));bind(s);startMonth(s);return s;
}

// ---------- 人物 ----------
export const present=(s,id)=>!before(s,PEOPLE[id].from);
export const away=(s,id)=>{if(s.freed?.[id]?.destination==='home')return true;const place=officePlace(s,id);if(place)return [...G.PROVINCE_NAMES,'西北'].includes(place);if(PEOPLE[id].public&&['云贵','河南','浙江','四川','北疆','西北'].includes(PEOPLE[id].place))return true;return !!s.flags?.['away_'+id]||(PEOPLE[id].away||[]).some(([y,m])=>y===s.year&&m===s.month);};
export function placeOf(s,id){const office=officePlace(s,id);if(office)return office;if(s.inPalace?.[id]){const r=SUMMON_ROLES[s.inPalace[id].role];return r?.places?.[id]||r?.place||'宫中';}if(s.freed?.[id])return {home:'故乡',city:'京城宅院',palace:'宫中值房'}[s.freed[id].destination];if(id==='C03'&&s.year>=3)return s.flags?.nian_prison?'刑部大牢':s.flags?.nian_away?'杭州':'年府';return PEOPLE[id].place;}
export const titleOf=(s,id)=>currentTitle(s,id);
export const gone=(s,id)=>!!s.flags?.['gone_'+id];
export const affectionStage=(s,id)=>{const n=s.people[id].aff;return PEOPLE[id].secondary?(n>=85?'深信':n>=65?'亲近':n>=45?'信任':n>=25?'相识':'生疏'):stageOf(n);};
export const stage=(s,id)=>affectionStage(s,id);
export function gain(s,id,n,why=''){
 const p=s.people[id];if(!p)return 0;
 if(n>0&&p.knot)n=0;
 const before=p.aff;p.aff=clamp(p.aff+n);const d=p.aff-before;
 if(d)s.delta.people[id]=(s.delta.people[id]||0)+d;
 if(d>0&&stageOf(p.aff)!==stageOf(before))cele(s,{k:'stage',id,stage:affectionStage(s,id)});
 return d;
}
// 值得庆祝的时刻：界面会逐个弹出
export function cele(s,c){(s.cele=s.cele||[]).push(c);}
const count=(s,k)=>{s.count=s.count||{};s.count[k]=(s.count[k]||0)+1;};
export function remember(s,id,text){if(!text)return;const p=s.people[id];p.memories.push({y:s.year,m:s.month,text:String(text).slice(0,60)});if(p.memories.length>12)p.memories.shift();}
export function secondReady(s,id,letter=false){const p=s.people[id];return p.first&&!p.second&&p.aff>=45&&!p.knot&&p.firstAt!==monthKey(s)&&present(s,id)&&(letter||!away(s,id));}
export function thirdReady(s,id,letter=false){const p=s.people[id];return p.second&&!p.third&&p.aff>=65&&!p.knot&&p.secondAt!==monthKey(s)&&present(s,id)&&(letter||!away(s,id));}
export function fourthReady(s,id,letter=false){const p=s.people[id];return s.year>=3&&p.third&&!p.fourth&&p.aff>=75&&!p.knot&&p.thirdAt!==monthKey(s)&&present(s,id)&&!gone(s,id)&&(letter||!away(s,id));}
export function fifthReady(s,id,letter=false){const p=s.people[id];return s.year>=5&&p.fourth&&!p.fifth&&p.aff>=80&&!p.knot&&p.fourthAt!==monthKey(s)&&present(s,id)&&!gone(s,id)&&(letter||!away(s,id));}
export const storyOf=(s,id)=>PEOPLE[id].secondary?null:secondReady(s,id)?PEOPLE[id].second:thirdReady(s,id)?thirdOf(id):fourthReady(s,id)?fourthOf(id):fifthReady(s,id)?fifthOf(id):null;
export const hasStory=(s,id)=>!!storyOf(s,id);

// ---------- 数值 ----------
export function applyStats(s,effects={},scale=1){
 const out={};
 for(const[k,v]of Object.entries(effects||{})){const map=STAT_MAP[k]||(STATS.some(x=>x.id===k)?[k,1]:null);if(!map||!Number.isFinite(v))continue;const [to,f]=map;out[to]=(out[to]||0)+v*f*scale;}
 const applied={};
 for(const[k,v]of Object.entries(out)){if(k==='treasury'||k==='inner'){Object.assign(applied,funds(s,{[k]:v*(k==='treasury'?ECONOMY.point:1)}));continue;}const before=s.stats[k];s.stats[k]=clamp(before+v);const d=s.stats[k]-before;if(d){applied[k]=d;s.delta.stats[k]=(s.delta.stats[k]||0)+d;}}
 return applied;
}
export function log(s,text,kind='事'){s.log.push({y:s.year,m:s.month,kind,text});if(s.log.length>300)s.log.shift();}

// ---------- 月 ----------
export function startMonth(s){
 G.memorialMonth(s,rand);
 s.ledger=emptyLedger();
 s.weather=WEATHER[SEASON(s.month)][Math.floor(rand(s)*3)];
 s.ap=AP_PER_MONTH;s.night=false;s.delta={stats:{},people:{}};s.chats=0;
 s.agenda=(ALL_AGENDA[monthKey(s)]||[]).filter(id=>!s.done[id]);s.bdayDone=[];
 G.regionalMonth(s,{rand,applyStats,funds});
 // 年节：至少有两个人能陪时才过
 const fe=festivalOf(s.year,s.month);if(fe&&!s.done[festId(s.year,fe)]&&festivalPeople(s,true).length>=2)s.agenda.push(festId(s.year,fe));
 // 两三个月前的旨意，送回报来了
 for(const e of s.edicts||[])if(e.due===idx(s.year,s.month)&&!s.done['FU'+e.n])s.agenda.push('FU'+e.n);
 // 人在外地的，第二、三幕以书信的形式在月初到来
 for(const id of CORE)if(away(s,id)&&!gone(s,id)){if(secondReady(s,id,true))s.agenda.push(PEOPLE[id].second);else if(thirdReady(s,id,true))s.agenda.push(thirdOf(id));else if(fourthReady(s,id,true))s.agenda.push(fourthOf(id));else if(fifthReady(s,id,true))s.agenda.push(fifthOf(id));}
 // 要事少的月份，抽一件奏折或宫闱小事
 const last=s.month===12&&LAST_YEARS.includes(s.year);
 if(!last&&(s.agenda.length===0||(s.agenda.length===1&&rand(s)<0.5))){const left=SMALL_EVENTS.filter(p=>!s.used.petitions.includes(p.id)&&(!p.months||p.months.includes(s.month))&&(!p.need||(present(s,p.need)&&s.people[p.need].met&&!away(s,p.need))));if(left.length){const p=left[Math.floor(rand(s)*left.length)];s.used.petitions.push(p.id);s.agenda.push(p.id);}}
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
export const scene=id=>CUR?.dyn?.[id]||SCENES[id]||ROMANCE[id]||SCENES2[id]||SCENES3[id]||POOL.find(p=>p.id===id)||SURPRISES.find(p=>p.id===id)||(id?.startsWith('FU')?(CUR?.dyn?.[id]||followFallback(CUR,id)):null)||(id?.startsWith('FE')?festivalScene(id,CUR?weatherOf(CUR):''):null);
export function setDyn(s,id,sc){s.dyn=s.dyn||{};s.dyn[id]={...sc,id,kind:sc.kind||'edictfollow'};}
// 白天做完事，有时会撞见一件小事
export function rollSurprise(s){if(s.agenda.length||s.ended||rand(s)>=0.28)return null;s.used.surprises=s.used.surprises||[];
 const ok=x=>!s.used.surprises.includes(x.id)&&[].concat(x.need||[]).every(n=>s.people[n]?.met&&present(s,n)&&!away(s,n));
 const left=SURPRISES.filter(ok);if(!left.length)return null;const x=left[Math.floor(rand(s)*left.length)];s.used.surprises.push(x.id);s.agenda.unshift(x.id);return x.id;}
// 偏心的后果：不和的人吃醋，亲近的人跟着高兴
function social(s,id,heavy){const out={},notes=[];if(!id)return {people:out,notes};
 for(const r of rivalsOf(id)){const p=s.people[r];if(!p?.met||!present(s,r)||p.aff<25)continue;const n=heavy?-3:-1;const d=gain(s,r,n);if(d){out[r]=d;if(JEALOUS[r]?.[id])notes.push(JEALOUS[r][id]);}}
 for(const f of friendsOf(id)){const p=s.people[f];if(!p?.met||!present(s,f)||p.knot)continue;const d=gain(s,f,1);if(d){out[f]=d;if(FRIEND_LINES[f]?.[id])notes.push(FRIEND_LINES[f][id]);}}
 return {people:out,notes:notes.length?[notes[Math.floor(rand(s)*notes.length)]]:[]};}

// 年节能陪的人：见过、在宫里、不在外地。只列情分最深的三位（两情相悦的优先）
export function festivalPeople(s,all=false){const ok=CORE.filter(id=>{const p=s.people[id];return p.met&&present(s,id)&&!away(s,id)&&!gone(s,id);});if(all)return ok;const w=id=>(s.people[id].lover?1000:0)+s.people[id].aff;return ok.sort((a,b)=>w(b)-w(a)).slice(0,3);}
export const optionsFor=(s,sc)=>{if(sc.id==='K15'){const valid=sc.options.filter(o=>{try{validateAppointments(s,rankChoice(o.id));return rankChoice(o.id).every(x=>Number(s.appointments[x.id]?.office?.slice(4))<3);}catch{return false;}});return [...valid,{id:'later',label:'先缓一缓，等空出位子再议',effects:{},reply:'你把名帖暂时留下，吩咐内务府先理清各宫的位分。'}];}if(sc.kind==='festival'){const ok=festivalPeople(s);const rank=o=>o.who?1+ok.indexOf(o.who):o.id==='all'?0:9;return sc.options.filter(o=>!o.who||ok.includes(o.who)).sort((a,b)=>rank(a)-rank(b)).map(o=>o.who?{...o,label:o.label.replace('{n}',PEOPLE[o.who].name)}:o);}return sc.options.filter(o=>!o.need||s.flags?.[o.need]);};
// ---------- 生辰 ----------
export const birthdayOf=(s,id)=>(BIRTH[id]||PEOPLE[id]?.birth)===s.month&&!!s.people[id]?.met&&present(s,id)&&!gone(s,id)&&!(BIRTH_SKIP[monthKey(s)]||[]).includes(id);
export const birthdays=s=>CAST.filter(id=>birthdayOf(s,id));
export const birthdayDone=(s,id)=>(s.bdayDone||[]).includes(id);
// 那个月见了、赏了、陪了，就算记得；返回额外的情分
function celebrate(s,id,extra){if(!birthdayOf(s,id)||birthdayDone(s,id))return null;s.bdayDone=[...(s.bdayDone||[]),id];const d=gain(s,id,extra);remember(s,id,'生辰那个月，你记得');log(s,`给${PEOPLE[id].name}过了生辰`,'情');count(s,'bdays');return d;}
export const pendingScene=s=>s.agenda[0]||null;

// 处理要事中的一个选项
export function choose(s,id,optId){
 if(s.agenda[0]!==id)throw Error('先处理眼前这件事。');
 const sc=scene(id),opt=optionsFor(s,sc).find(o=>o.id===optId);if(!opt)throw Error('没有这个选项。');
 if(sc.disaster&&optId==='relief'&&s.stats.treasury<25)throw Error('国库不足二十五万两。');
 G.resolveDisaster(s,sc,optId,{applyStats,funds});
 const promotions=id==='K15'?rankChoice(optId):[];if(promotions.length)validateAppointments(s,promotions);
 let freedStats={};if(opt.redeem)freedStats=redeemPerformer(s,opt.redeem.id,opt.redeem.dest);
 let effects={...opt.effects};
 if(id==='G03')effects=s.done.G02==='strict'?{people:-3,court:1}:{people:2,court:2};
 if(id==='G06')effects=s.done.G04==='full'?{court:-3}:s.done.G04==='pause'?{court:-2,people:-1}:{court:3};
 if(effects.treasury&&(/^(R|XR|Y|Z)/.test(id)||['relation','extension','festival'].includes(sc.kind)||PRIVATE_SCENES.has(id))){effects.inner=sc.kind==='festival'? -ECONOMY.banquetCost:effects.treasury*ECONOMY.privatePoint;delete effects.treasury;}
 const stats={...applyStats(s,effects),...freedStats},people={};if(promotions.length){const r=doAppointments(s,promotions);for(const[k,v]of Object.entries(r.stats))stats[k]=(stats[k]||0)+v;Object.assign(people,r.people);}
 const add=(cid,n)=>{const d=gain(s,cid,n);if(d)people[cid]=(people[cid]||0)+d;};
 if(['relation','extension'].includes(sc.kind)){const n={warm:6,develop:6,work:3,cooperate:3,distance:1,unsure:2}[optId]??3;const cid=sc.actor;s.people[cid].met=true;
  if(PEOPLE[cid].first===id){s.people[cid].first=true;s.people[cid].firstAt=monthKey(s);}if(PEOPLE[cid].second===id){s.people[cid].second=true;s.people[cid].secondAt=monthKey(s);}add(cid,n);}
 else if(sc.kind==='deep'||sc.kind==='deep5'){const cid=sc.actor,p=s.people[cid];if(sc.kind==='deep'){p.fourth=true;p.fourthAt=monthKey(s);}else{p.fifth=true;cele(s,{k:'fifth',id:cid});}add(cid,{stay:6,mid:3,hard:-3}[optId]??2);}
 else if(sc.kind==='romance'){const cid=sc.actor,p=s.people[cid];p.third=true;p.thirdAt=monthKey(s);if(optId==='confess'){p.lover=true;cele(s,{k:'lover',id:cid});remember(s,cid,cid==='C05'?'皇兄把那个很长的梦告诉了他':'两人说开了心意');}add(cid,{confess:8,slow:5,restrain:1}[optId]??3);}
  else if(sc.kind==='dilemma'){for(const[cid,b]of Object.entries(opt.bonds||{}))add(cid,(b.trust||0)*2);if(opt.slight){add(opt.slight,-5);s.people[opt.slight].knot={source:id,text:sc.title};remember(s,opt.slight,'你在「'+sc.title+'」里没有选她/他');}}
 else if(sc.kind==='festival'){if(optId==='all'){for(const cid of festivalPeople(s,true))add(cid,1);}else if(opt.who){add(opt.who,5);remember(s,opt.who,'一起过了'+sc.title);for(const r of rivalsOf(opt.who)){const p=s.people[r];if(p?.met&&present(s,r)&&p.aff>=25)add(r,-2);}}count(s,'festivals');}
 else if(PEOPLE[sc.actor]&&!opt.bond)add(sc.actor,2);
 if(sc.kind!=='festival'&&opt.bond?.[sc.actor]>0)celebrate(s,sc.actor,0);
 if(opt.bond)for(const[cid,n]of Object.entries(opt.bond))if(s.people[cid])add(cid,n);
 if(opt.flag){s.flags=s.flags||{};s.flags[opt.flag]=true;if(opt.flag==='nian_away')s.flags.away_C03=true;if(opt.flag==='nian_prison'){s.flags.away_C03=true;s.flags.gone_C03=true;}if(['nian_away','nian_prison','nian_safe'].includes(opt.flag))recordAppointment(s,'C03',null,opt.flag==='nian_prison'?'削爵在狱':opt.flag==='nian_away'?'杭州将军':'领侍卫内大臣','剧情');}
 for(const cid of Object.keys(PEOPLE))if(present(s,cid)&&(sc.actor===cid))s.people[cid].met=true;
 const text=(opt.replyBy&&sc.dep&&opt.replyBy[s.done[sc.dep]])||opt.reply||'';
 if(sc.kind==='secondary'&&optId!=='wait'){const cid=sc.actor;s.secondaryDone[cid]=(s.secondaryDone[cid]||0)+1;}
 s.done[id]=optId;s.agenda.shift();
 log(s,`${sc.title}：${opt.label}`,['relation','extension','romance','deep','deep5'].includes(sc.kind)?'情':sc.kind==='dilemma'?'难':sc.kind==='festival'?'节':'政');
 return {title:sc.title,actor:sc.actor,choice:opt.label,text,stats,people,knot:opt.slight||null};
}

// ---------- 白天的行动 ----------
function spend(s){if(s.ended)throw Error('这一卷已走完。');if(s.nanfeng?.visit&&!s.nanfeng.visit.done)throw Error('先把馆里的茶喝完。');if(s.agenda.length)throw Error('先把本月要事办完。');if(s.ap<=0)throw Error('今日的时辰已经用完了。');s.ap--;}
export function canAct(s){return !s.agenda.length&&s.ap>0&&!s.ended&&!(s.nanfeng?.visit&&!s.nanfeng.visit.done);}

export function beginChat(s,id){if(PEOPLE[id]?.secondary&&!s.people[id]?.met)throw Error('还没见过这个人。');if(!present(s,id))throw Error('还见不到这个人。');spend(s);s.people[id].met=true;s.chats++;if(id==='C04'&&!away(s,id)&&weatherOf(s)==='雨')gain(s,id,1);const bd=celebrate(s,id,2);return {id,letter:away(s,id),gained:0,turns:0,birthday:bd!==null};}
// 一次召见最多加 8 点，单句 -5～+4
export const CHAT_CAP=8;
export function applyChat(s,chat,{affection=0,memory=''}={}){
 const room=Math.max(0,CHAT_CAP-chat.gained);let n=fateClamp(Math.max(-5,Math.min(4,Math.round(affection))),chat.fate);if(n>0)n=Math.min(n,room);
 const d=gain(s,chat.id,n);chat.gained+=Math.max(0,d);chat.turns++;count(s,'lines');remember(s,chat.id,memory);if(MINOR_STORIES[chat.id])queuePerformerStory(s,chat.id);return d;
}
// ---------- 自由度与掷骰 ----------
export const freedomOf=s=>[1,2,3].includes(s.freedom)?s.freedom:2;
export function setFreedom(s,l){if(![1,2,3].includes(+l))throw Error('没有这一档。');s.freedom=+l;return s.freedom;}
// kind：edict / chat / night。一档不掷，当作大吉
export function rollFate(s,kind,id){
 const level=freedomOf(s);if(level===1)return {tier:4,free:true,level};
 const d=1+Math.floor(rand(s)*20),bonus=fateBonus(s,kind,id),total=d+bonus.reduce((a,[,b])=>a+b,0);
 const f={d,bonus,total,tier:tierOf(level,total),level,kind};count(s,'rolls');if(f.tier===4)count(s,'bigluck');return f;
}
const fateClamp=(n,fate)=>{if(!fate||fate.free)return n;let v=boundUp(n,fate.tier);if(fate.tier===0)v=Math.min(v,0);if(fate.tier===1)v=Math.min(v,1);if(fate.tier===4&&fate.kind!=='edict')v=Math.max(v,2);return v;};
export function hintLike(s,id){
 s.known=s.known&&!Array.isArray(s.known)?s.known:{};
 const k=s.known[id]=s.known[id]&&!Array.isArray(s.known[id])?s.known[id]:{};
 const liked=rand(s)>=0.5,list=liked?PEOPLE[id].likes:PEOPLE[id].dislikes;
 const g=list.find(x=>k[x]!==liked)||list[0];k[g]=liked;return g;
}
export function repairKnot(s,chat){const p=s.people[chat.id];if(!p.knot)return null;const line=ALL_REPAIR[p.knot.source]?.[chat.id]||'你们把那件事说开了。';log(s,`与${PEOPLE[chat.id].name}说开了「${p.knot.text}」`,'情');p.knot=null;cele(s,{k:'knot',id:chat.id});count(s,'knots');gain(s,chat.id,3);chat.gained+=3;return line;}

export function giveGift(s,id,giftId){
 const item=giftId==='antique'?s.inventory?.[0]:null;if(giftId==='antique'&&!item)throw Error('还没有寻到古玩。');
 const g=GIFTS[giftId];if(!g)throw Error('没有这件东西。');if(s.stats.inner<g.innerCost)throw Error('内帑不足。');
 spend(s);const stats=applyStats(s,{inner:-g.innerCost});const liked=item?item.authentic&&PEOPLE[id].likes.includes('book'):PEOPLE[id].likes.includes(giftId),disliked=item?!item.authentic:PEOPLE[id].dislikes.includes(giftId);s.gifted=s.gifted||{};const k=id+':'+giftId,times=s.gifted[k]||0;s.gifted[k]=times+1;if(item)s.inventory.shift();let d=gain(s,id,disliked?-3:item?(liked?10:3):times?1:liked?6:2);s.people[id].met=true;const bd=celebrate(s,id,disliked?0:3);if(bd)d+=bd;
 const so=g.cost>=5?social(s,id,false):{people:{},notes:[]};
 log(s,`赏${PEOPLE[id].name}${g.name}`,'赏');if(MINOR_STORIES[id])queuePerformerStory(s,id);return {liked,disliked,counterfeit:item&&!item.authentic,antique:!!item,birthday:bd!==null,repeat:times>0,stats,people:{...(d?{[id]:d}:{}),...so.people},notes:so.notes,knot:!!s.people[id].knot};
}
// 旨意的后果由 AI 判断，这里只限幅
export function applyEdict(s,text,{effects={},affection={},narration='',title='',fate=null,inner=0,appoint=null}={}){
 if(title==='减膳节用'){inner+=(Number(effects.treasury)||0)*ECONOMY.privatePoint;effects={...effects};delete effects.treasury;}
 const appointments=validateAppointments(s,appoint);if(appointments.length&&fate&&!fate.free&&fate.tier===0)throw Error('旨意受阻，这次任命没有传下去。');spend(s);const bounded={};for(const st of STATS.filter(x=>x.id!=='inner')){const v=Number(effects[st.id]);if(Number.isFinite(v))bounded[st.id]=boundUp(Math.max(-8,Math.min(8,Math.round(v))),fate&&!fate.free?fate.tier:4);}
 const total=Object.values(bounded).reduce((a,b)=>a+Math.max(0,b),0);if(total>12)for(const k in bounded)if(bounded[k]>0)bounded[k]=Math.round(bounded[k]*12/total);
 const stats=applyStats(s,{...bounded,inner:boundUp(Math.max(-20,Math.min(20,Number(inner)||0)),fate&&!fate.free?fate.tier:4)}),people={};
 for(const[cid,v]of Object.entries(affection||{}))if(PEOPLE[cid]&&present(s,cid)){const d=gain(s,cid,boundUp(Math.max(-5,Math.min(5,Math.round(Number(v)||0))),fate&&!fate.free?fate.tier:4));if(d)people[cid]=d;}
 if(appointments.length){const r=doAppointments(s,appointments);for(const[k,v]of Object.entries(r.stats))stats[k]=(stats[k]||0)+v;for(const[k,v]of Object.entries(r.people))people[k]=(people[k]||0)+v;}
 log(s,`下旨：${title||text.slice(0,24)}`,'旨');count(s,'edicts');
 s.edicts=s.edicts||[];const n=s.edicts.length+1;s.edicts.push({n,text:text.slice(0,120),title:title||text.slice(0,8),narration:String(narration).slice(0,400),effects:bounded,at:idx(s.year,s.month),due:idx(s.year,s.month)+2+Math.floor(rand(s)*2)});return {stats,people,text:narration};
}
export function initTravel(s){if(!s.secondaryDone&&s.minorDone)s.secondaryDone=s.minorDone;delete s.minorDone;for(const sc of Object.values(s.dyn||{}))if(sc.kind==='minor')sc.kind='secondary';s.travel=s.travel||{used:{}};s.travel.used=s.travel.used||{};s.inventory=s.inventory||[];s.nanfeng=s.nanfeng||{seen:false,visit:null};s.freed=s.freed||{};s.clues=s.clues||[];s.secondaryDone=s.secondaryDone||{};for(const id of CAST)if(!s.people[id])s.people[id]={aff:PEOPLE[id].start,met:false,knot:null,memories:[]};return s;}
export function goOuting(s,id='river'){
 const p=PLACES[id];if(!p)throw Error('没有这个去处。');if(s.nanfeng.visit&&!s.nanfeng.visit.done)throw Error('先把馆里的茶喝完。');if(s.stats.inner<p.cost)throw Error('内帑不足。');spend(s);
 const key=id+':'+(id==='shicha'?SEASON(s.month):id==='baiyun'&&s.month===1?'正月':'常'),lines=id==='shicha'&&s.month>=10?p.winter:id==='shicha'&&s.month>=4&&s.month<=6?p.summer:id==='baiyun'&&s.month===1?p.newyear:p.lines;
 let used=s.travel.used[key]||[];if(used.length>=lines.length)used=[];const left=lines.map((_,i)=>i).filter(i=>!used.includes(i)),i=left[Math.floor(rand(s)*left.length)];s.travel.used[key]=[...used,i];
 const stats={...funds(s,{inner:-p.cost}),...applyStats(s,{...p.effects,health:(p.effects.health||0)+(weatherOf(s)==='雪'?-2:0)})},people={};let text=lines[i],fate=null;
 if(p.actor&&present(s,p.actor)&&s.people[p.actor].met){people[p.actor]=gain(s,p.actor,2);text+='\n\n'+PEOPLE[p.actor].name+'也在这里。认出你时，先恭敬行了礼，才在一旁陪你坐下。';}
 if(id==='temple'){const authentic=rand(s)>=.3;s.inventory.push({authentic,name:'庙市古玩',at:monthKey(s)});text+='\n\n随从把它收进了匣子，真伪还要细看。';}
 if(id==='nanfeng'){
  const first=!s.nanfeng.seen;s.nanfeng.seen=true;for(const cid of ['N01','N02'])s.people[cid].met=true;fate=rollFate(s,'outing');s.nanfeng.visit={at:monthKey(s),done:false,fate};if(first)text=NANFENG_FIRST;
  if(fate.tier===1){Object.assign(stats,applyStats(s,{court:-2}));text+='\n\n门外有人多看了你两眼。次日，朝中已有些风声。';}
  if(fate.tier===0){Object.assign(stats,applyStats(s,{court:-3,palace:-3}));for(const cid of CORE)if(s.people[cid].met&&s.people[cid].aff>=45&&['C06','C07','C08','C09','C10'].includes(cid))people[cid]=gain(s,cid,-2);
   const sid='NFwind'+idx(s.year,s.month)+'-'+(s.count?.rolls||0);setDyn(s,sid,{title:'巷里的风声',actor:'C02',body:'御史的折子递到了案上。宫里也传开了消息，苏培盛捧着茶，一句话也不敢多说。你得给这件事一个交代。',options:[{id:'stop',label:'往后不再冒险，给宫里赔个不是',effects:{palace:2},reply:'你让人关了那条路上的耳目，往后不再轻易出宫。宫里的灯，那夜晚些才灭。'},{id:'quiet',label:'先查清是谁传的话',effects:{court:1,health:-1},reply:'随从去查那夜的来客。你坐在灯下，知道有些事，终究瞒不住。'}]});s.agenda.push(sid);
  }
  if(fate.tier===4){const clue='有位管河工的官员常来，花银子从不还价。';s.clues.push({at:monthKey(s),text:clue});text+='\n\n隔帘听见一句闲话：'+clue;}
 }
 log(s,`微服去了${p.name}`,'行');return {title:p.name,text,stats,people,fate,nanfeng:id==='nanfeng'};
}
export function nanfengCompany(s,choice){const v=s.nanfeng.visit;if(!v||v.done)throw Error('这回已经坐过了。');if(!['N01','N02','tea'].includes(choice))throw Error('请选一处坐。');v.done=true;let text='',people={};
 if(choice==='tea')text='你隔着帘子喝了半盏茶。照水唱了一曲，闻笙收了琴，青禾替你掀开门帘。你点头谢过，没有留下姓名。';
 else{const d=gain(s,choice,4);people[choice]=d;remember(s,choice,choice==='N01'?'在灯下陪皇上弈了一局棋':'为皇上弹过一支故乡的曲');text=choice==='N01'?'花妍摆好棋，待你落子才轻轻应了一手。他只说棋局，偶尔低声提醒，始终恭敬。':'雨汐调好琵琶，俯身行礼后才坐下。曲子很轻，窗外的雨声渐渐听不见了。';queuePerformerStory(s,choice);}
 log(s,choice==='tea'?'在南风馆只喝茶听曲':'在南风馆陪了'+PEOPLE[choice].name,'行');return {title:'灯下片刻',text,stats:{},people};
}
function queuePerformerStory(s,id){const done=s.secondaryDone[id]||0;if(done>=3||s.agenda.includes('NF'+id+'-'+done)||s.people[id].aff<[24,36,48][done]||s.freed[id])return;const [title,body]=MINOR_STORIES[id][done],sid='NF'+id+'-'+done;
 const options=done<2?[{id:'listen',label:'让对方慢慢说',effects:{},reply:'你没有催。那盏茶凉了，又换了一盏。',bond:{[id]:3}}]:[...Object.entries(DESTINATIONS).map(([dest,label])=>({id:dest,label:label+'（内帑 15 万两）',redeem:{id,dest},effects:{},reply:dest==='palace'?'内务府递了几道折子，说宫门有宫门的规矩。你只准其在外值房做差，出入登记，不能留宿内廷。':dest==='home'?'你备了盘缠和路引。临走那日，车前的人跪下谢恩，许久才肯起身。':'京城的小院收拾好了。窗下摆了一张桌，从此教棋教曲，也能安稳度日。'})),{id:'wait',label:'先留些银子，往后再想办法',effects:{},reply:'你让人先照应着。那人俯身谢恩，没有再催。'}];setDyn(s,sid,{title,body,actor:id,kind:'secondary',options});s.agenda.push(sid);
}
// ---------- 召宫外人入宫 ----------
export const summonRoles=(s,id)=>Object.entries(SUMMON_ROLES).filter(([,r])=>r.who.includes(id)).map(([k,r])=>({key:k,...r}));
export function summonReason(s,id){if(!['N01','N02'].includes(id))return '这个人不能召入宫。';const p=s.people[id];if(!p?.met)return '还没见过。';if(s.inPalace?.[id])return '已经在宫里了。';if(s.freed?.[id]?.destination==='home')return '已经回了故乡。';if(p.aff<48)return '情分还不够（要 48）。';if(!s.freed?.[id]&&s.stats.inner<15)return '要先赎身，内帑不足 15 万两。';return '';}
export function summonToPalace(s,id,role){const r=SUMMON_ROLES[role];if(!r||!r.who.includes(id))throw Error('这个身份不合适。');const why=summonReason(s,id);if(why)throw Error(why);spend(s);
 let stats={};if(!s.freed?.[id])stats=funds(s,{inner:-15});s.freed=s.freed||{};s.freed[id]={destination:'palace',at:monthKey(s)};s.inPalace=s.inPalace||{};s.inPalace[id]={role,at:monthKey(s)};
 Object.assign(stats,applyStats(s,r.effects));const d=gain(s,id,role==='consort'?10:6);recordAppointment(s,id,role==='consort'?'rank0':null,r.name,'召入宫');remember(s,id,'被皇上召入宫中，做了'+r.name);
 const people={[id]:d};if(role==='consort')for(const cid of ['C06','C07','C08','C09','C10']){const p=s.people[cid];if(p?.met&&p.aff>=40&&present(s,cid)){const x=gain(s,cid,-2);if(x)people[cid]=x;}}
 log(s,`召${PEOPLE[id].name}入宫，做了${r.name}`,'情');count(s,'summons');
 const text={study:`${PEOPLE[id].name}换了宫里的衣裳，第一回跟在你身后进养心殿，脚步放得很轻。张廷玉看了一眼，什么也没说；第二天，言官的折子就递上来了。`,qi:'懋勤殿收拾出一间小屋，摆了一副新棋。花妍在棋盘前跪下谢恩，抬头时，眼里有光。',music:'雨汐抱着那把旧琵琶进了南府。教习们起初不肯认她，听完一曲，都不说话了。',consort:id==='N01'?'钟粹宫打扫出来，花妍被册为答应。宗人府的折子一道接一道，说祖宗家法里从无此例；后宫里有人摔了茶盏。他来谢恩时跪得很低，把那副旧棋盘也带进了宫，说往后只同一个人下。':'景阳宫打扫出来，雨汐被册为答应。宗人府递了几道折子，后宫里有人整整三天没出门。她来谢恩时跪得很低，说这辈子没想过还能有个家。'}[role];
 return {title:'召入宫中',text,stats,people};}
export function nanfengStay(s,id){const v=s.nanfeng?.visit;if(!v||v.done)throw Error('今天没在馆里。');if(!['N01','N02'].includes(id)||s.freed?.[id])throw Error('今夜留不了。');if(s.agenda.length)throw Error('先把本月要事办完。');if(s.night)throw Error('今夜已经安排过了。');if(s.people[id].aff<36)throw Error('还没熟到能留宿的地步（情分要 36）。');if(s.stats.inner<1)throw Error('内帑不足。');
 v.done=true;s.ap=0;const stats=funds(s,{inner:-1});s.nanfeng.stay={id,at:monthKey(s)};const risk=rollFate(s,'outing'),people={},notes=[];
 if(!risk.free&&risk.tier===0){Object.assign(stats,applyStats(s,{court:-3,palace:-3}));for(const cid of ['C06','C07','C08','C09','C10']){const p=s.people[cid];if(p?.met&&p.aff>=40){const x=gain(s,cid,-2);if(x)people[cid]=x;}}notes.push('天没亮，宫里就传开了：皇上昨夜没有回宫。御史已经在拟折子。');}
 else if(!risk.free&&risk.tier===1){Object.assign(stats,applyStats(s,{court:-2}));notes.push('回宫时，神武门的侍卫多看了你一眼。');}
 log(s,'在南风馆留宿，陪着'+PEOPLE[id].name,'夜');return {stats,people,notes,risk};}
export function redeemPerformer(s,id,dest){if(!['N01','N02'].includes(id)||!DESTINATIONS[dest]||s.freed[id]||!s.people[id]?.met||s.people[id].aff<48||(s.secondaryDone[id]||0)<2)throw Error('不能这样安置。');if(s.stats.inner<15)throw Error('内帑不足。');const stats=funds(s,{inner:-15});s.freed[id]={destination:dest,at:monthKey(s)};remember(s,id,'皇上为其赎身，'+DESTINATIONS[dest]);gain(s,id,10);if(dest==='palace')Object.assign(stats,applyStats(s,{court:-2,palace:-2}));log(s,'为'+PEOPLE[id].name+'赎身，'+DESTINATIONS[dest],'情');return stats;}
// 拨银与下旨一样占一个时辰，两边的银子不会凭空增减。
export function transferFunds(s,direction,amount){
 amount=silver(Number(amount));if(!['toInner','toTreasury'].includes(direction)||!Number.isFinite(amount)||amount<=0)throw Error('请写清拨多少银子。');
 const from=direction==='toInner'?'treasury':'inner',to=from==='treasury'?'inner':'treasury';if(s.stats[from]<amount)throw Error(from==='inner'?'内帑不足。':'国库不足。');spend(s);
 const stats={...funds(s,{[from]:-amount,[to]:amount}),...applyStats(s,direction==='toInner'?{court:-2}:{people:2})};
 log(s,direction==='toInner'?'从户部拨银进内务府':'从内务府拨银充国库','银');return {title:'拨银',text:direction==='toInner'?'户部把银子送进了内务府。第二天，言官的折子也跟着到了。':'内务府的银车出了宫门。户部的人接了银，先去补了欠下的赈粮。',stats,people:{}};
}
// 批折：朝局 +3，圣躬 −2；设了值房之后只伤 1 点
const REVIEWS=['你把积压的折子一本本看完。有一本说某县修桥，银子报了三遍，你朱批：查。','山东巡抚报了今年的雨水，字写得工整，事也办得明白。你在折尾批了一句：好，照此办。','两道折子说的是同一件事，口径却对不上。你把两本并排摆着看了半个时辰，批了四个字：据实再奏。','有个知县在折子里絮絮叨叨讲了半页县里的庄稼。你本想批“知道了”，想了想，改成：朕都看了，你辛苦。'];
export function review(s){return G.beginReview(s,spend);}
export const memorialOptions=G.memorialOptions;
export function judgeMemorial(s,uid,choice){return G.decideMemorial(s,uid,choice,{funds,applyStats,log});}
// 亲笔批复复用下旨限幅与骰面，只消耗折匣已付的时辰。
export function writeMemorial(s,uid,text,result){const m=G.checkReview(s,uid);if(!String(text).trim())throw Error('请写下朱批。');const prior=s.ap;s.ap=1;let r;try{r=applyEdict(s,`就${m.province}「${m.title}」朱批：${text}`,result);}finally{s.ap=prior;}s.reviewSession.left--;s.memorials=s.memorials.filter(x=>x.uid!==uid);return {...r,title:m.title,text:result.narration};}

export function rest(s){spend(s);const stats=applyStats(s,{health:8+(weatherOf(s)==='闷热'?2:0)});log(s,'闭门休养了一日','行');return {title:'休养',text:'你推开折子，让苏培盛把门关上。睡了一个整觉，醒来时窗外的光正好。',stats,people:{}};}

// 自拟休养：先检查人选和银子，成功后才用时辰。普通休养仍走上面的原流程。
export const restCompanions=s=>Object.keys(s.people).filter(id=>present(s,id)&&!away(s,id)&&s.people[id].met&&PEOPLE[id]?.adult===true);
const finite=(n,fallback)=>Number.isFinite(Number(n))?Number(n):fallback;
export function plannedRest(s,plan,{text='',health=8,inner,memory='',companion=null,fate=null}={}){
 plan=String(plan||'').trim().slice(0,200);if(!plan)return rest(s);
 if(!planAllowed(plan,companion,s))throw Error(PLAN_NOTICE);
 if(companion&&!restCompanions(s).includes(companion))throw Error('这会儿请不到这个人。');
 const cost=Math.round(Math.max(0,Math.min(3,finite(inner,restCost(plan))))*100)/100;
 if(s.stats.inner<cost)throw Error('内帑不够，换个省些银子的安排吧。');
 const tier=fate?.free?4:fate?.tier;
 let h=tier===0?4:tier===1?6:tier===4?10:Math.max(4,Math.min(10,Math.round(finite(health,8))+(weatherOf(s)==='闷热'?2:0)));
 spend(s);const stats=applyStats(s,{health:h,inner:-cost}),people={};
 if(companion){people[companion]=gain(s,companion,tier===0?0:tier===1?1:2);remember(s,companion,memory||'陪皇上歇了一日：'+plan);}
 log(s,'歇了一日：'+plan,'行');return {title:'休养',text:String(text||'你暂且放下折子，留了一日给自己。').slice(0,800),stats,people,fate};
}

// ---------- 夜 ----------
export const stayOf=s=>s.nanfeng?.stay?.at===monthKey(s)?s.nanfeng.stay.id:null;
// 召入宫的人也能夜里去看；在南风馆留宿的那一夜只陪那一位
export function nightChoices(s){const stay=stayOf(s);if(stay)return [{id:stay,special:null,knot:!!s.people[stay].knot}];return [...CORE,...Object.keys(s.inPalace||{})].filter(id=>present(s,id)&&!away(s,id)&&s.people[id].met).map(id=>({id,special:storyOf(s,id),knot:!!s.people[id].knot}));}
export function spendNight(s,id,{affection=4,health=0,memory='',fate=null}={}){
 if(id&&!nightChoices(s).some(p=>p.id===id))throw Error('今夜去不了这里。');
 if(s.nanfeng?.visit&&!s.nanfeng.visit.done)throw Error('先把馆里的茶喝完。');if(s.night)throw Error('今夜已经安排过了。');if(s.agenda.length)throw Error('先把本月要事办完。');s.night=true;
 if(!id){const stats=applyStats(s,{health:3});log(s,'独寝','夜');return {stats,people:{}};}
 let d=gain(s,id,Math.max(0,Math.min(4,fateClamp(Math.round(finite(affection,3)),fate&&{...fate,kind:'night'}))));remember(s,id,memory);const bd=celebrate(s,id,2);if(bd)d+=bd;
 const heavy=s.lastNight===id;s.lastNight=id;const so=social(s,id,heavy);log(s,`夜里在${placeOf(s,id)}，陪着${PEOPLE[id].name}`,'夜');const stats=applyStats(s,{health:fate&&!fate.free&&fate.tier<=1?0:Math.max(-2,Math.min(3,Math.round(finite(health,0))))});return {stats,people:{...so.people,...(d?{[id]:d}:{})},notes:so.notes,birthday:bd!==null};
}
// 夜里遇到第二幕剧情时，作为要事插入
export function queueSpecial(s,id){if(s.night)throw Error('今夜已经安排过了。');const sid=storyOf(s,id);if(!sid)throw Error('今夜没有新的剧情。');s.night=true;celebrate(s,id,2);s.agenda.unshift(sid);return sid;}

// 任命先把所有人选与空位看清，再花时辰，失败不改存档。
const rankChoice=choice=>choice==='huan'?[{id:'C09',office:'rank3'}]:choice==='mei'?[{id:'C10',office:'rank3'}]:choice==='both'?[{id:'C09',office:'rank3'},{id:'C10',office:'rank3'}]:[];
function doAppointments(s,list){const people={},stats={},notes=[];const add=(id,n)=>{const d=gain(s,id,n);if(d)people[id]=(people[id]||0)+d;};const addStats=e=>{for(const[k,v]of Object.entries(applyStats(s,e)))stats[k]=(stats[k]||0)+v;};
 for(const {id,office}of list){const old=s.appointments[id],o=OFFICES[office],p=s.people[id];recordAppointment(s,id,office==='dismiss'?null:office,o?.title||'候旨');remember(s,id,'皇上将其由'+old.title+'调为'+titleOf(s,id));
  if(o?.kind==='妃嫔'){const prev=Number(old.office?.slice(4)),next=Number(office.slice(4));if(next>prev){add(id,8);addStats({palace:1});const so=social(s,id,false);for(const[k,v]of Object.entries(so.people))people[k]=(people[k]||0)+v;notes.push(...so.notes);}else{add(id,-10);p.knot={source:'appointment',text:'被降了位分'};addStats({palace:-1});}}
  else if(office==='dismiss'){add(id,-6);if(p.ability>=8)addStats({court:-3});p.loyalty=clamp(p.loyalty-5);}
  else{add(id,3);p.loyalty=clamp(p.loyalty+2);if(p.faction==='八爷党')addStats({court:2});if(o?.owner)add(o.owner,2);}
  log(s,PEOPLE[id].name+'：'+old.title+' → '+titleOf(s,id),'任');
 }return {title:'任命',text:'旨意传了下去。接旨的人俯身谢恩，新的差事，从今日开始。',stats,people,notes};}
export function appointPerson(s,id,office){const list=validateAppointments(s,[{id,office}]);spend(s);return doAppointments(s,list);}

// ---------- 月末 ----------
export function crisisStatus(s,c){
 if(s.crises?.[c.id])return s.crises[c.id];
 if(before(s,c.start))return 'later';
 const allDone=c.scenes.every(id=>s.done[id]);
 return allDone&&(!c.goal||c.goal(s))?'solved':'open';
}
function settleCrises(s){s.crises=s.crises||{};for(const c of ALL_CRISES){if(s.crises[c.id]||before(s,c.start))continue;const allDone=c.scenes.every(id=>s.done[id]),ok=allDone&&(!c.goal||c.goal(s));const due=s.year===c.deadline[0]&&s.month===c.deadline[1];if(ok&&!c.goal){s.crises[c.id]='solved';cele(s,{k:'crisis',name:c.name});}else if(due){s.crises[c.id]=ok?'solved':'failed';cele(s,{k:ok?'crisis':'crisisFail',name:c.name});log(s,`要务「${c.name}」${ok?'已了结':'没能办好'}`,'政');}}}
export function endMonth(s){
 if(s.nanfeng?.visit&&!s.nanfeng.visit.done)throw Error('先把馆里的茶喝完。');
 if(s.agenda.length)throw Error('本月还有要事没办。');
 const report={y:s.year,m:s.month,stats:{...s.delta.stats},people:{...s.delta.people}};
 G.backlog(s,applyStats);
 const provincialIncome=G.regionalMonthly(s,{applyStats,funds});
 const beforeDuties={...s.delta.stats};const duties=officeMonthly(s,rand(s)<.25);const {treasury:extraSilver=0,...extraStats}=duties.changes;for(const text of duties.notes)log(s,text,'任');
 const tick={...applyStats(s,extraStats),...applyStats(s,s.year>=5?{health:-2,palace:-1}:s.year>=3?{health:-1,court:-1,people:-1}:{health:-1}),...funds(s,{treasury:ECONOMY.income[(s.vol||1)-1]+extraSilver+provincialIncome,inner:ECONOMY.innerIncome})};for(const k of Object.keys(tick))tick[k]=silver((s.delta.stats[k]||0)-(beforeDuties[k]||0));report.income=tick;
 for(const[k,v]of Object.entries(tick))report.stats[k]=(report.stats[k]||0)+v;
 // 生辰那个月一次也没去的，情分掉 3
 report.forgot=[];for(const id of birthdays(s)){const p=s.people[id];if(birthdayDone(s,id)||p.aff<25)continue;p.aff=clamp(p.aff-3);report.people[id]=(report.people[id]||0)-3;remember(s,id,'生辰那个月，你没有来');log(s,`${PEOPLE[id].name}的生辰，你没有去`,'情');report.forgot.push(id);}
 // 久不相见，情分会慢慢淡
 report.cooled=[];for(const id of CORE){const p=s.people[id];if(p.met&&!s.delta.people[id]&&!report.forgot.includes(id)&&p.aff>30&&present(s,id)&&!away(s,id)){p.aff=clamp(p.aff-(p.aff>=45?2:1));report.cooled.push(id);}}
 report.govNotes=[...s.govNotes];report.stats={...s.delta.stats};
 report.ledger=structuredClone(s.ledger);report.balances={treasury:s.stats.treasury,inner:s.stats.inner};
 settleCrises(s);
 report.crises=ALL_CRISES.filter(c=>c.vol===(s.vol||1)).map(c=>({id:c.id,name:c.name,status:crisisStatus(s,c)}));
 if(s.month===12&&LAST_YEARS.includes(s.year)){s.ended=true;return report;}
 s.month++;if(s.month>12){s.month=1;s.year++;}
 startMonth(s);return report;
}

// 第一卷结束后接着玩第二卷：存档、情分、记忆全部延续
export function startVolume2(s){if(!(s.ended&&s.year===2))throw Error('第一卷还没结束。');s.ended=false;s.vol=2;s.flags=s.flags||{};s.year=3;s.month=1;log(s,'第二卷：雍正三年','卷');startMonth(s);return s;}
export function startVolume3(s){if(!(s.ended&&s.year===4))throw Error('第二卷还没结束。');s.ended=false;s.vol=3;s.flags=s.flags||{};s.year=5;s.month=1;log(s,'第三卷：雍正五年','卷');startMonth(s);return s;}

// ---------- 再活一世 ----------
export const BOONS={
 love:{name:'旧情',desc:'上一世动了心的人（情分 65 以上），这一世开局情分 +12。'},
 know:{name:'旧识',desc:'记得每个人喜欢什么、讨厌什么，赏赐不用再猜。'},
 purse:{name:'旧账',desc:'记得哪里藏着银子：开局国库多 120 万两，圣躬 +5。'}
};
// 上一世走到哪一卷都可以重来；动过心的人会“似曾相识”
export const pastHearts=prev=>CORE.filter(id=>(prev?.people?.[id]?.aff||0)>=65);
export function newGamePlus(prev,boon,seed=Date.now()%2147483647){
 if(!prev?.ended)throw Error('这一世还没走完。');if(!BOONS[boon])throw Error('没有这样的记忆。');
 const s=newGame(seed);s.freedom=freedomOf(prev);s.life=(prev.life||1)+1;s.boon=boon;
 const past=pastHearts(prev);s.past=Object.fromEntries(past.map(id=>[id,{lover:!!prev.people[id].lover}]));
 for(const id of past)remember(s,id,prev.people[id].lover?'梦里见过皇上，醒来却想不起梦见了什么':'总觉得很久以前，见过皇上');
 if(boon==='love')for(const id of past)s.people[id].aff=clamp(s.people[id].aff+12);
 if(boon==='know')s.known=Object.fromEntries(CORE.map(id=>[id,{...Object.fromEntries(PEOPLE[id].likes.map(g=>[g,true])),...Object.fromEntries(PEOPLE[id].dislikes.map(g=>[g,false]))}]));
 if(boon==='purse'){s.stats.treasury=silver(s.stats.treasury+12*ECONOMY.point);s.stats.health=clamp(s.stats.health+5);}
 s.log=[];log(s,`第${s.life}世：带着「${BOONS[boon].name}」醒来`,'卷');return s;
}
export function ending(s){
 const sum=treasuryIndex(s)+['people','court','palace','health'].reduce((a,k)=>a+s.stats[k],0),solved=ALL_CRISES.filter(c=>c.vol===(s.vol||1)&&crisisStatus(s,c)==='solved').length;
 const score=sum+solved*15;
 const people=CORE.filter(id=>s.people[id].met).map(id=>{const p=s.people[id];return {id,aff:p.aff,lover:!!p.lover,gone:gone(s,id),tier:p.lover&&p.aff>=85?3:p.aff>=65?2:p.aff>=45?1:0};});
 return {score,solved,people};
}

export function save(s,storage=globalThis.localStorage){try{storage.setItem(SAVE_KEY,JSON.stringify(s));return true;}catch{return false;}}
export function load(storage=globalThis.localStorage){try{const s=JSON.parse(storage.getItem(SAVE_KEY)||'null');return s?.version===1?bind(G.initGovernment(initAppointments(initTravel(initEconomy(s))))):null;}catch{return null;}}
