// 政务事实、排期与抽取均由引擎决定，AI 只处理亲笔朱批。
import {PEOPLE} from './data.js';
export const monthIndex=s=>(s.year-1)*12+s.month;
export const PROVINCE_NAMES=['直隶','山东','河南','江南','浙江','湖广','四川','陕甘','云贵','广东'];
const topics=[
 ['河工',[2,3,6,7,8,9],['堤岸渗水','疏浚运河','添筑子堤','修复涵洞','河工冒领','秋汛备料','河员保举'],'先勘河道，按丈核销'],
 ['赈灾',[1,2,4,6,7,10,12],['旱田失收','蝗卵待除','暴雪封路','疫病初起','饥户待赈','粥厂缺粮','流民安置'],'开仓赈济，派员核户'],
 ['钱粮',null,['库银亏空','火耗私派','漕粮短解','盐课拖欠','清丈隐田','仓谷霉变','养廉核支'],'先核账册，再议追缴'],
 ['吏治',null,['知县侵渔','同僚互参','廉员举荐','胥吏勒索','驿站扰民','官员避责','考语失实'],'派员查核，毋许罗织'],
 ['边务',null,['粮道梗阻','边堡待修','军马缺草','营兵冒饷','商道争执','屯田乏种','哨探请赏'],'核实军需，限期回报'],
 ['刑名',null,['命案疑点','久系未决','盗案株连','狱粮短缺','证人翻供','赃物失落','冤狱申诉'],'复核供证，慎勿滥刑'],
 ['文教',null,['学舍漏雨','乡试冒籍','义学缺师','书院田产','寒士赴考','学田侵占','考棚修缮'],'地方筹措，官府稽核'],
 ['民情',null,['米价骤涨','佃户争租','市井械斗','渡口失修','水源争用','粮商囤积','乡约争讼'],'访查民情，平粜调剂']
];
export const MEMORIAL_POOL=topics.flatMap(([type,months,titles,special],t)=>titles.map((title,i)=>({id:`M${t}-${i}`,type,months,province:PROVINCE_NAMES[(t+i)%10],title,special,body:`臣谨奏：本省${title}一事，已据州县禀报逐项查核。乡民生计与钱粮征解皆有牵连，若一概催办，恐滋扰累；若迁延不理，又恐小患日深。现将原册、经费及经办人员清单随折呈览，恳请皇上裁夺。臣不敢以浮词掩饰实情，奉旨后当逐月报明办理情形，并听候部臣复核。`})));
export function initGovernment(s){s.memorials??=[];s.memorialUsed??=[];s.followups??=[];s.govSerial??=0;s.govNotes??=[];return s;}
export function authorOf(s,province){const offices={直隶:'zhili',江南:'liangjiang',四川:'chuanshan',陕甘:'chuanshan',云贵:'yungui',河南:'henan',浙江:'zhejiang'};return Object.keys(s.appointments||{}).find(id=>s.appointments[id].office===offices[province]&&!s.flags?.['gone_'+id])||null;}
export function addMemorial(s,p){const author=authorOf(s,p.province);const m={...p,uid:'mem'+(++s.govSerial),author:author?PEOPLE[author].name:(p.province+'巡抚'),at:monthIndex(s)};s.memorials.push(m);return m;}
export function memorialMonth(s,rng){initGovernment(s);const now=monthIndex(s);if(s.memorialAt===now)return;s.memorialAt=now;s.reviewSession=null;s.govNotes=[];
 for(const f of s.followups.filter(f=>f.at<=now&&f.id==='department')){addMemorial(s,{...f.data,department:true,body:f.data.body+'\n前次朱批“交部议”，户部会同有关衙门核过清册，建议先勘实情、分批给银；请皇上再裁。'});s.govNotes.push('前次朱批交部议：'+f.data.title+'，部议已回。');}
 s.followups=s.followups.filter(f=>!(f.at<=now&&f.id==='department'));
 const n=3+Math.floor(rng(s)*3);for(let i=0;i<n;i++){if(s.memorialUsed.length>=MEMORIAL_POOL.length)s.memorialUsed=[];const eligible=MEMORIAL_POOL.filter(p=>!s.memorialUsed.includes(p.id)&&(!p.months||p.months.includes(s.month)));if(!eligible.length)break;const p=eligible[Math.floor(rng(s)*eligible.length)];s.memorialUsed.push(p.id);addMemorial(s,p);}}
export function beginReview(s,spend){initGovernment(s);if(!s.memorials.length)throw Error('折匣里没有未批奏折。');spend(s);s.reviewSession={at:monthIndex(s),left:s.done?.W08==='council'?5:3,held:[]};return {title:'折匣',text:'展开奏折，逐道朱批。',stats:{},people:{}};}
export function checkReview(s,uid){const r=s.reviewSession,m=s.memorials.find(m=>m.uid===uid);if(!m||!r||r.at!==monthIndex(s)||r.left<=0||s.night||r.held.includes(uid))throw Error('这一时辰不能再批这道折子。');return m;}
export function memorialOptions(m){return [['approve','准'],['reject','驳'],...(!m.department?[['department','交部议']]:[]),['hold','留中'],['inspect',m.special||'派员核实']];}
export function decideMemorial(s,uid,choice,api){const m=checkReview(s,uid);if(!memorialOptions(m).some(([id])=>id===choice))throw Error('没有这道朱批。');if(choice==='approve'&&s.stats.treasury<18)throw Error('国库不足十八万两，宜先核实或驳回。');
 s.reviewSession.left--;if(choice==='hold'){s.reviewSession.held.push(uid);return {title:m.title,text:'朱批留中，原折仍留在折匣。',stats:{},people:{}};}
 s.memorials=s.memorials.filter(x=>x.uid!==uid);if(choice==='department')s.followups.push({at:monthIndex(s)+1,id:'department',data:m});
 const stats=choice==='approve'?{...api.funds(s,{treasury:-18}),...api.applyStats(s,{health:-1})}:choice==='reject'?api.applyStats(s,{court:-1}):choice==='inspect'?api.applyStats(s,{health:-1}):{};
 api.log(s,`${m.province}·${m.title}：${memorialOptions(m).find(x=>x[0]===choice)[1]}`,'政');return {title:m.title,text:choice==='department'?'交有关部臣核议，下月带原折复奏。':'朱批已发，经办衙门须据实回奏。',stats,people:{},memorial:m,choice};}
export function backlog(s,applyStats){const n=s.memorials.length;if(n>6){s.govNotes.push(`折子堆了：尚有${n}道未批。`);applyStats(s,{court:-1,...(n>10?{health:-1}:{})});}}
