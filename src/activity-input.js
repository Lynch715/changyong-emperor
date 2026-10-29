// Natural language only builds the same actions used by the activity planner.
// Availability, consent, capacity and money remain the engine's responsibility.
import {CHARACTERS,NAMES} from './content.js';
import {GIFTS,BANQUET_THEMES,BOND_MODES} from './activity-content.js';
import {addDays,validDate} from './calendar.js';
import {itemAvailable} from './activities.js';
export const numberFromText=t=>/^\d+$/.test(t)?Number(t):t==='元'?1:t.includes('十')?(Number(t.split('十')[0].replace('二','2').replace('三','3'))||1)*10+('一二三四五六七八九'.indexOf(t.split('十')[1])+1):({零:0,一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9}[t]);
const num='[零一二两三四五六七八九十\\d]+';
function when(text,s){
 let date,period;
 if(/后天|后日/.test(text))date=addDays(s.date,2);
 else if(/明天|明日|明晚/.test(text))date=addDays(s.date,1);
 else if(/今天|今日|今晚/.test(text))date=structuredClone(s.date);
 else {const m=text.match(new RegExp(`(?:(元|${num})年)?(?:(${num})月)?(${num})日`));if(m)date={year:m[1]?numberFromText(m[1]):s.date.year,month:m[2]?numberFromText(m[2]):s.date.month,day:numberFromText(m[3])};}
 const evening=/晚间|晚上|明晚|今晚|夜间|夜里|夜谈|留宿|看灯/.test(text),day=/日间|白天|上午|午后|下午|早上/.test(text);
 if(evening&&!day)period='evening';if(day&&!evening)period='day';
 return {date,period,conflict:evening&&day};
}
const activityPeople=[...CHARACTERS,{id:'C09',name:'甄嬛'},{id:'C10',name:'沈眉庄'}];
const named=text=>activityPeople.map(c=>({id:c.id,at:Math.min(...[c.name,...(c.id==='C05'?['果郡王']:[])].map(n=>text.indexOf(n)).filter(i=>i>=0))})).filter(c=>c.id!=='C01'&&Number.isFinite(c.at)).sort((a,b)=>a.at-b.at).map(c=>c.id);
const kindOf=text=>/送礼|赠礼|送.{0,12}(?:给|暖手炉|护腕|册页|谱纸|花笺|山茶|灯罩)/.test(text)?'gift':/备制|制作|采买|买一|买个|买份/.test(text)?'craft':/宴请|小宴|家宴|茶席|宴席/.test(text)?'banquet':/牵手|拥抱|相伴夜谈|留宿|恩爱|独处片刻|同游/.test(text)?'bond':/散步|看灯|走走/.test(text)?'walk':/写信|寄信|回信|通信/.test(text)?'letter':/私聊|聊聊|交谈|谈心/.test(text)?'chat':/读书|学习/.test(text)?'study':/习武|骑射|练武/.test(text)?'training':/休养|休息|小憩|静坐/.test(text)?'rest':/见面|会面|赴约/.test(text)?'meet':null;
export function inputFollowup(text,draft){
 if(!draft||text.length>80)return text;
 let rest=text;for(const x of [...activityPeople.map(c=>c.name),...GIFTS.map(g=>g.name),'果郡王'])rest=rest.replaceAll(x,'');
 rest=rest.replace(/后天|后日|明天|明日|明晚|今天|今日|今晚|日间|白天|上午|午后|下午|早上|晚间|晚上|夜间|夜里|[零元一二两三四五六七八九十\d年月日]|[，,、。\s]|(?:和|与|还有|就选|选|在|是|吧|呢)/g,'');
 return rest?'':draft+' '+text;
}
export function parseActivityClause(text,{state:s,actor}){
 if(!s?.weekly)return null;
 const kind=kindOf(text),cancel=/取消|撤销/.test(text),edit=/改期|改到|改至/.test(text);
 if(!kind&&!cancel&&!edit)return null;
 const clarifications=[],people=named(text),who=people.length===1?people[0]:/(?:陪你|与你|和你|给你|同你)/.test(text)?actor:null;
 let target;
 if(cancel||edit){
  const original=when(edit?text.split(/改期|改到|改至/)[0]:text,s);
  if(original.conflict||people.length>1&&kind!=='banquet')return {actions:[],clarifications:['请指明一位人物及原约的单一时段，再更改这份安排。']};
  const matches=s.weekly.plans.filter(p=>['accepted','candidate','draft','needs-reschedule'].includes(p.status)&&(!kind||p.kind===kind)&&(kind==='banquet'?people.every(id=>p.guests?.includes(id)):(!who||p.actor===who)&&(!people.length||people.includes(p.actor)))&&(!original.date||['year','month','day'].every(k=>p.date[k]===original.date[k]))&&(!original.period||p.period===original.period));
  if(matches.length!==1)return {actions:[],clarifications:[matches.length?'有不止一份符合的安排，请指明人物与原约日期。':'没有找到这份尚可更改的约定，请先核对日程。']};
  target=matches[0];if(cancel)return {actions:[{type:'week-cancel',planId:target.id}],clarifications:[]};
 }
 const activity=target?.kind||kind,{date,period,conflict}=when(edit?text.split(/改期|改到|改至/).at(-1):text,s);
 if(!date)clarifications.push('想约在哪一天？请写今日、明日，或具体的月日。');
 else if(!validDate(date))clarifications.push('日期未能对应宫中每月三十日的日历，请重新说明。');
 if(!period)clarifications.push(conflict?'同一句里有日间和晚间，请选一个时段。':'想留日间还是晚间？');
 const solo=['study','training','rest','craft','banquet'].includes(activity);
 if(!target&&!solo&&!who&&!(/独自/.test(text)&&activity==='walk'))clarifications.push(people.length>1?'这项活动只约一人，请分别安排。':'这次想约谁？请写人物姓名，或说“与你”。');
 const a={type:target?'week-edit':'week-plan',...(target?{planId:target.id}:{}),kind:activity,actor:target?.actor||(solo||/独自/.test(text)?'C01':who),date,period,status:/先记|候选/.test(text)?'candidate':'accepted'};
 if(['chat','meet','letter','walk'].includes(activity))Object.assign(a,{topic:/共同|旧事|上回/.test(text)?'shared':/心事/.test(text)?'wish':/差事|政务|工程/.test(text)?'project':'recent',choice:/自己的想法|我也说/.test(text)?'share':'listen',place:/长廊|廊下/.test(text)?'corridor':'garden'});
 if(activity==='banquet'){
  a.actor='C01';a.guests=target?.guests||people;a.seats=target?.activity?.seats||a.guests;a.theme=/清茶|茶席/.test(text)?'tea':/时令|家宴/.test(text)?'season':target?.activity?.theme||'music';
  let listed=text.match(/(?:宴请|邀请)(.+)$/)?.[1];
  if(listed){for(const c of CHARACTERS)listed=listed.replaceAll(c.name,'');listed=listed.replaceAll('果郡王','').replace(/还有|和|与|及|、|清茶|时令|丝竹|小宴|家宴|茶席|宴席|主题|\s|[！？!?]/g,'');if(listed)clarifications.push('宾客名单还有未识别的内容，请逐一写出可邀请的人物姓名。');}
  if(a.guests.length<2||a.guests.length>3)clarifications.push('小宴要请哪两至三位？请逐一写出姓名。');
 }
 if(['craft','gift'].includes(activity)){
  const gifts=GIFTS.filter(g=>text.includes(g.name));
  if(gifts.length!==1)clarifications.push('请说明是哪一件新物，使用新物清单里的名称。');
  else if(activity==='craft')a.giftId=gifts[0].id;
  else {const items=(s.weekly.activities?.inventory||[]).filter(i=>i.giftId===gifts[0].id&&itemAvailable(s,i.id));if(items.length!==1)clarifications.push(items.length?'手中有两件同名新物，请从送礼页面选定具体一件。':`手中没有可送的${gifts[0].name}，可先备制，再另约送礼。`);else a.itemId=items[0].id;}
 }
 if(activity==='bond'){a.mode=/牵手/.test(text)?'hand':/拥抱/.test(text)?'hug':/留宿/.test(text)?'stay':/夜谈/.test(text)?'night':/同游/.test(text)?'outing':'quiet';if(/恩爱/.test(text)&&!/(?:牵手|拥抱|留宿|夜谈|同游|独处)/.test(text))clarifications.push('这一回想怎样相伴？可说独处片刻、牵手、拥抱、同游、夜谈或留宿，仍须双方愿意。');}
 return {actions:clarifications.length?[]:[a],clarifications,draft:clarifications.length?text:null};
}
export function actionInputLabel(a){
 if(!['week-plan','week-edit','week-cancel'].includes(a.type))return '';
 if(a.type==='week-cancel')return '协商取消原约，保留原记录。';
 const kinds={chat:'私聊',meet:'会面',letter:'通信',walk:'散步',study:'学习',training:'习武',rest:'休养',craft:'备制新物',gift:'送礼',banquet:'小宴',bond:'亲近相伴'};
 const extra=a.theme?` · ${BANQUET_THEMES[a.theme].name} · 按所列宾客顺序落座`:a.mode?` · ${BOND_MODES[a.mode].name}`:a.place?` · ${a.place==='corridor'?'避风长廊':'御园小径'} · ${a.topic==='shared'?'说起共同经历':a.topic==='wish'?'听一件心事':a.topic==='project'?'谈眼前差事':'问问近况'} · ${a.choice==='share'?'也说自己的想法':'先听对方说完'}`:'';
 return `${a.date.year}年${a.date.month}月${a.date.day}日${a.period==='evening'?'晚间':'日间'} · ${a.actor==='C01'?'独自或主持':NAMES[a.actor]} · ${kinds[a.kind]}${extra} · ${a.status==='candidate'?'仅记候选':'正式预留'}。`;
}
