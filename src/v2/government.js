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
export function initGovernment(s){s.memorials??=[];s.memorialUsed??=[];s.followups??=[];s.govSerial??=0;s.govNotes??=[];initProvinces(s);return s;}
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
 scheduleDecision(s,m,choice);
 api.log(s,`${m.province}·${m.title}：${memorialOptions(m).find(x=>x[0]===choice)[1]}`,'政');return {title:m.title,text:choice==='department'?'交有关部臣核议，下月带原折复奏。':'朱批已发，经办衙门须据实回奏。',stats,people:{},memorial:m,choice};}
export function backlog(s,applyStats){const n=s.memorials.length;if(n>6){s.govNotes.push(`折子堆了：尚有${n}道未批。`);applyStats(s,{court:-1,...(n>10?{health:-1}:{})});}}

export const OFFICE_PROVINCES={zhili:['直隶'],liangjiang:['江南'],chuanshan:['四川','陕甘'],yungui:['云贵'],henan:['河南'],zhejiang:['浙江'],shandong:['山东'],huguang:['湖广'],guangdong:['广东']};
const clamp=n=>Math.min(100,Math.max(0,n));
export function initProvinces(s){s.provinces??={};for(const name of PROVINCE_NAMES)s.provinces[name]??={livelihood:55,integrity:50,revenue:55,reports:[]};s.regionCarry??={people:0,court:0};}
export function regionChange(s,name,changes,api){const p=s.provinces[name];if(!p)return;const old={...p};for(const [k,v]of Object.entries(changes))if(['livelihood','integrity','revenue'].includes(k))p[k]=clamp(p[k]+v);
 // 十省等权；小数变化累积，避免每月四舍五入吞掉地方变化。
 for(const [national,key]of [['people','livelihood'],['court','integrity']]){s.regionCarry[national]+=(p[key]-old[key])/10;const d=Math.trunc(Number(s.regionCarry[national].toFixed(6)));if(d){api.applyStats(s,{[national]:d});s.regionCarry[national]-=d;}}}
export function provinceIncome(s){return Math.round(Object.values(s.provinces).reduce((n,p)=>n+(p.revenue-55)*.09,0)*100)/100;}
export function scheduleDecision(s,m,choice){if(['department','hold'].includes(choice)||m.result)return;const delay=m.type==='河工'?3:2;s.followups.push({at:monthIndex(s)+delay,id:'decision',data:{province:m.province,title:m.title,type:m.type,choice,authorId:authorOf(s,m.province),funding:choice==='approve'?18:0,source:choice==='approve'?'准':choice==='reject'?'驳':'派员核实'}});}
function report(s,data,text){const body=`前次朱批“${data.source}”，所办${data.title}一事，今据实回奏：${text}`;s.govNotes.push(body);s.provinces[data.province].reports.unshift(body);s.provinces[data.province].reports=s.provinces[data.province].reports.slice(0,3);addMemorial(s,{title:data.title+'·回报',province:data.province,type:'回报',body,result:true,special:'交地方续办'});}
export function regionalMonth(s,api){initGovernment(s);const now=monthIndex(s);if(s.regionalAt===now)return;s.regionalAt=now;
 for(const f of s.followups.filter(f=>f.at<=now&&f.id==='decision')){const d=f.data,p=s.provinces[d.province],officer=d.authorId&&s.appointments[d.authorId]?.office&&OFFICE_PROVINCES[s.appointments[d.authorId].office]?.includes(d.province)?s.people[d.authorId]:null;const competence=officer?officer.ability*officer.loyalty/100:4;
 if(d.choice==='reject'){regionChange(s,d.province,{livelihood:d.type==='赈灾'?-7:-2,integrity:-1},api);report(s,d,d.type==='赈灾'?'赈项未开，流民入城，地方请求补救。':'原案搁置，积弊仍未消除。');}
 else{const success=api.rand(s)<Math.min(.9,.25+competence*.05+p.integrity*.003+d.funding*.008);regionChange(s,d.province,success?{livelihood:4,integrity:d.choice==='inspect'?5:1,revenue:2}:{livelihood:-5,integrity:-3,revenue:-2},api);report(s,d,success?(d.type==='河工'?'汛期堤岸稳固，拨银均按册销核。':'已见实效，经办清册与乡民回报相符。'):(d.type==='河工'?'汛期堤岸决口，须追查工程与经办人员。':'经办走样，查核未得实效，须重新料理。'));}}
 for(const f of s.followups.filter(f=>f.at<=now&&f.id==='disaster')){const m=s.memorials.find(m=>m.uid===f.data.uid);if(!m)continue;s.memorials=s.memorials.filter(x=>x.uid!==m.uid);const id='DIS'+m.uid;s.dyn??={};s.dyn[id]={id,title:m.province+'灾情加重',kind:'government',actor:authorOf(s,m.province)||'C28',body:'前次灾情折未奉朱批，流民已聚集州城。地方请速开仓，不可再缓。',options:[{id:'relief',label:'开仓急赈（国库二十五万两）',effects:{},reply:'赈粮送到，地方仍须核查受灾户口。'},{id:'deny',label:'令地方自行筹措',effects:{},reply:'州县四处借粮，百姓仍在等待。'}],disaster:m.province};s.agenda.push(id);s.govNotes.push(m.province+'灾情未处理，已升级为要务。');regionChange(s,m.province,{livelihood:-6,revenue:-3},api);}
 s.followups=s.followups.filter(f=>!(f.at<=now&&['decision','disaster'].includes(f.id)));
 if(api.rand(s)<.38){const seasonal=s.month<=3?['春旱',['直隶','山东','河南']]:s.month<=6?['夏汛',['河南','江南']]:s.month<=9?['秋蝗',['山东','直隶']]:['冬雪',['陕甘']];const [title,names]=api.rand(s)<.15?['疫病',PROVINCE_NAMES]:seasonal;const province=names[Math.floor(api.rand(s)*names.length)],m=addMemorial(s,{title:province+title,province,type:'赈灾',body:`臣谨奏：${province}发生${title}，已据州县查报，乡民口粮与田地均受损。恳请速定赈务，若迁延至下月，恐流民聚集、灾情加重。`,disaster:true,special:'先行平粜，核户给赈'});s.followups.push({at:now+1,id:'disaster',data:{uid:m.uid}});}}
export function regionalMonthly(s,api){for(const [name,p]of Object.entries(s.provinces)){const id=authorOf(s,name),officer=id?s.people[id]:null;const v=officer?(officer.ability>=8&&officer.loyalty>=70?1:officer.loyalty<50?-2:0):0;regionChange(s,name,{livelihood:v,integrity:v,revenue:v},api);}return provinceIncome(s);}
export function resolveDisaster(s,sc,choice,api){if(!sc.disaster)return;if(choice==='relief'){api.funds(s,{treasury:-25});regionChange(s,sc.disaster,{livelihood:5},api);}else regionChange(s,sc.disaster,{livelihood:-4,integrity:-2},api);}
