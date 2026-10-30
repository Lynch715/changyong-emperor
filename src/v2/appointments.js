import {PEOPLE,CAST} from './data.js';
export const RANKS=['答应','常在','贵人','嫔','妃','贵妃','皇贵妃','皇后'];
const rankCap=[Infinity,Infinity,Infinity,6,4,2,1,1];
export const OFFICES={
 ...Object.fromEntries(RANKS.map((title,i)=>['rank'+i,{title,kind:'妃嫔',cap:rankCap[i]}])),
 scholar:{title:'大学士',kind:'官员',cap:2,effect:'court'},hubu:{title:'户部尚书',kind:'官员',cap:1,effect:'treasury'},libu:{title:'吏部尚书',kind:'官员',cap:1,effect:'court'},bingbu:{title:'兵部尚书',kind:'官员',cap:1,effect:'court'},xingbu:{title:'刑部尚书',kind:'官员',cap:1,effect:'court'},
 zhili:{title:'直隶总督',kind:'官员',cap:1,effect:'people'},liangjiang:{title:'两江总督',kind:'官员',cap:1,effect:'people'},chuanshan:{title:'川陕总督',kind:'官员',cap:1,effect:'people'},yungui:{title:'云贵总督',kind:'官员',cap:1,effect:'people'},bujun:{title:'步军统领',kind:'官员',cap:1,effect:'court'},council:{title:'值房行走',kind:'官员',cap:3,effect:'court'},
 chief:{title:'总管太监',kind:'太监',cap:1},deputy:{title:'副总管',kind:'太监',cap:1},yangxin:{title:'御前首领太监',kind:'太监',cap:1},jingren:{title:'景仁宫首领太监',kind:'太监',cap:1,owner:'C06'},yikun:{title:'翊坤宫首领太监',kind:'太监',cap:1,owner:'C07'},suiyu:{title:'碎玉轩首领太监',kind:'太监',cap:1,owner:'C09'},yanxi:{title:'延禧宫首领太监',kind:'太监',cap:1,owner:'C08'},cunjv:{title:'存菊堂首领太监',kind:'太监',cap:1,owner:'C10'}
};
export function originalTitle(s,id){if(id==='C03'&&s.year>=3)return s.flags?.nian_prison?'削爵在狱':s.flags?.nian_away?'杭州将军':s.flags?.nian_safe?'领侍卫内大臣':'抚远大将军';return PEOPLE[id].title;}
const initialOffice=(s,id)=>{const p=PEOPLE[id],title=originalTitle(s,id);if(p.category==='妃嫔'){const i=RANKS.findLastIndex(r=>title.endsWith(r));return i>=0?'rank'+i:null;}if(id==='C02')return 'chief';return Object.keys(OFFICES).find(k=>OFFICES[k].title===title)||null;};
export function initAppointments(s){s.appointments=s.appointments||{};s.appointmentHistory=s.appointmentHistory||{};s.officeMonths=s.officeMonths||{};
 for(const id of CAST){const p=s.people[id];p.ability??=PEOPLE[id].ability||6;p.loyalty??=PEOPLE[id].loyalty||60;p.faction??=PEOPLE[id].faction||'中立';if(PEOPLE[id].public)p.met=true;
  if(!s.appointments[id])s.appointments[id]={office:initialOffice(s,id),title:originalTitle(s,id),since:(s.year-1)*12+s.month};
  s.appointmentHistory[id]=s.appointmentHistory[id]||[{year:s.year,month:s.month,from:'',to:s.appointments[id].title,source:'原有职司'}];
 }return s;}
export const currentTitle=(s,id)=>s.appointments?.[id]?.title||originalTitle(s,id);
export const officeKind=(id,s)=>s?.inPalace?.[id]?.role==='consort'||PEOPLE[id]?.category==='妃嫔'?'妃嫔':PEOPLE[id]?.category==='太监'?'太监':['文官','武官','宗室'].includes(PEOPLE[id]?.category)&&id!=='C21'?'官员':null;
export function appointmentList(value){if(value==null)return [];const list=Array.isArray(value)?value:[value];if(list.length>3||!list.every(v=>v&&typeof v==='object'&&typeof v.id==='string'&&typeof v.office==='string'))throw Error('任命没有写清楚。');return list;}
export function validateAppointments(s,value){const list=appointmentList(value),next=structuredClone(s.appointments),seen=new Set();for(const {id,office}of list){if(!PEOPLE[id]||seen.has(id))throw Error('同一个人不能重复任命。');seen.add(id);const p=PEOPLE[id];if(!s.people[id]||s.flags?.['gone_'+id]||p.from[0]>s.year||(p.from[0]===s.year&&p.from[1]>s.month)||s.freed?.[id]?.destination==='home')throw Error('眼下不能任用这个人。');
 if(office==='dismiss'){if(officeKind(id,s)==='妃嫔'||!next[id]?.office)throw Error('不能这样免职。');next[id]={office:null,title:'候旨'};continue;}
 const o=OFFICES[office];if(!o||o.kind!==officeKind(id,s))throw Error('此人不能担任这个职位。');if(office==='council'&&s.done.W08!=='council')throw Error('值房还没有设。');if(next[id]?.office===office)throw Error('已经在这个职位上。');next[id]={office,title:o.title};
 }
 for(const [key,o]of Object.entries(OFFICES))if(Object.values(next).filter(v=>v.office===key).length>o.cap)throw Error(o.title+'已满，先腾出空位。');return list;}
export function recordAppointment(s,id,office,title,source='任命'){const prev=currentTitle(s,id);s.appointments[id]={office,title,since:(s.year-1)*12+s.month};s.officeMonths[id]=0;s.appointmentHistory[id].push({year:s.year,month:s.month,from:prev,to:title,source});}
export function appointmentOptions(s,id){const kind=officeKind(id,s);if(!kind)return [];const keys=Object.keys(OFFICES).filter(k=>OFFICES[k].kind===kind);if(kind!=='妃嫔'&&s.appointments[id]?.office)keys.push('dismiss');return keys.map(office=>{let reason='';try{validateAppointments(s,[{id,office}]);}catch(e){reason=e.message;}return {office,title:office==='dismiss'?'免去现职':OFFICES[office].title,reason};});}
export function officeMonthly(s,risk=false){const changes={},notes=[];for(const [id,a]of Object.entries(s.appointments)){const o=OFFICES[a.office];if(!o||o.kind!=='官员')continue;const p=s.people[id];s.officeMonths[id]=(s.officeMonths[id]||0)+1;const add=(k,v)=>{changes[k]=(changes[k]||0)+v;};
 if(o.effect==='treasury')add('treasury',Math.round((p.ability*p.loyalty/100*1.8-4)*100)/100);else add(o.effect,(p.ability>=7?1:0)+(p.loyalty>=70?1:-1));
 if(risk&&p.faction==='八爷党'&&s.officeMonths[id]>=3){add('court',-3);notes.push(PEOPLE[id].name+'的旧交又递来了请托，几道折子在朝堂上争了起来。');}}
 return {changes,notes};}
// 调到地方的官员以书信往来；调回京职后，不再沿用旧外任地点。
export const officePlace=(s,id)=>{const o=OFFICES[s.appointments?.[id]?.office];if(!o)return null;if(o.kind==='官员')return {zhili:'直隶',liangjiang:'江南',chuanshan:'西北',yungui:'云贵'}[s.appointments[id].office]||'京城';if(o.kind==='太监')return o.owner?PEOPLE[o.owner].place:'养心殿';return null;};
