import {isEighth} from './volume8.js';
import {isSeventh} from './volume7.js';
import {isSixth} from './volume6.js';
import {isFifth} from './volume5.js';
import {isFourth} from './volume4.js';
import {horizonDay} from './longform.js';
import {ordinal,addDays,validDate} from './calendar.js';
import {RELATION_PROFILES} from './relationship-content.js';
const d=(year,month,day)=>({year,month,day});
export function relationshipUnlocked(s,cid){if(['C09','C10'].includes(cid))return !!s.events.M06?.completed;if(!RELATION_PROFILES[cid])return true;if(s.weekly?.migration?.knownActors.includes(cid))return true;const id={C03:'M10',C04:'M08',C05:'M09',C08:'M06'}[cid];return !id||!!s.events[id]?.completed||!!s.sceneDates?.[id]&&ordinal(s.sceneDates[id])===ordinal(s.date);}
export function personPresence(s,cid,date=s.date,period=s.weekly?.clock%2?'evening':'day',{promised=false,scene=false,legacy=false}={}){
 if(!validDate(date)||!['day','evening'].includes(period))return {state:'未知',place:'尚无合法日期',available:false,reason:'请先选定日期与时段。'};
 if(!relationshipUnlocked(s,cid))return {state:'未登场',place:'尚待相见',available:false,reason:'尚未正式相见。'};
 const n=ordinal(date),out=(state,place,available,reason)=>({state,place,available,reason});
 if(cid==='C03'){
  if(isEighth(s)){const b=s.weekly.continuation,a=b.arrival;if(a?.arrived&&n>=ordinal(a.date)&&n<=ordinal(d(27,11,2))&&(!b.departure||n<ordinal(b.departure.date)))return out('在京短驻','京中驿馆／御前',true,'真实抵京已核，十一月实际启程后仍按驿程。');}
  if(isSixth(s)&&date.year===17&&date.month===10&&date.day>=1&&date.day<=8)return out('在京短驻','御前／京中驿馆',true,'十七年十月依核准行程短驻，出京后仍按两程边书。');
  if(isFourth(s)&&date.year===5&&date.month===4&&date.day>=1&&date.day<=8)return out('在京短驻','御前／京中驿馆',true,'五年四月核准短驻，出京后仍按两程边书往来。');
  if(s.weekly?.continuation&&date.year===3&&date.month===10&&date.day>=1&&date.day<=8)return out('在京短驻','御前／京中驿馆',true,'三年十月依核准行程短驻，出京后仍按驿程通信。');
  const v=s.weekly?.migration?.legacyVisit;if(v&&n>=ordinal(v.start)&&n<=ordinal(v.end))return out('在京短驻','京中驿馆／御前',true,'承接旧档在京约期。');
  if(n>=ordinal(d(2,4,7))&&n<=ordinal(d(2,4,9)))return out('在京短驻','京中驿馆／御前',true,'凯旋短驻，可按约会面。');
  if(n>=ordinal(d(2,4,10))&&n<=ordinal(d(2,4,16)))return out('旅行','返营途中',false,'正在返营，改约或写信；信和答复各有驿程。');
  return out('外任','西北军营',false,'外任不能当面交谈；通信送达至少7日，答复再走7日。');
 }
 const oldRest=s.weekly?.plans.find(p=>p.legacyPromiseId&&p.actor===cid&&p.kind==='rest'&&p.status==='completed'&&ordinal(p.date)===n);
 if(cid==='C02'&&oldRest)return out('休养','轮值休息处',false,'旧档已履行的休息安排仍保留。');
 if(cid==='C04'&&date.year===2&&date.month===1&&date.day>=10&&date.day<=12&&!legacy)return out('病休','太医院告假休养',false,'一月十日至十二日告假；十三日恢复值诊，可另约晚间或通信。');
 if(cid==='C05'){
  const v=(isFourth(s)||isFifth(s)||isSeventh(s)||isEighth(s))&&s.weekly.continuation.visit;const visit=promised||v&&n>=ordinal(v.start)&&n<=ordinal(v.end)||date.year===2&&date.month===4&&[2,4].includes(date.day);
  return visit?out('入宫奉事','御园／奉事值房',true,'依差事或已确认的入宫约期往返，不常驻御园。'):out('王府','果郡王府',false,'常住王府；正式预约可安排入宫，或先通信。');
 }
 if(scene||legacy)return out('宫内','御前／'+({C04:'太医院',C06:'景仁宫',C07:'翊坤宫',C08:'练曲处'}[cid]||'值房'),true,'沿已约定的相谈或剧情时段。');
 if(cid==='C02')return out('宫内',period==='day'?'御前值房':'交班后值房',period==='evening'||n%7!==6,'交接轮值每七日一轮；核交接的白日，私话留到晚间。其余可依轮值留短谈。');
 if(cid==='C04')return out('宫内',period==='day'?'太医院值诊':'太医院下值廊下',period==='evening','问诊另依剧情；私人会面避开日间值诊。');
 if(cid==='C06')return out('宫内',period==='day'?'宫务值房':'景仁宫',period==='evening','宫务交清后可留私人时段。');
 if(['C09','C10'].includes(cid))return out('宫内',cid==='C09'?'碎玉轩':'宫中茶室',true,'可另留相谈时辰，未接受的邀约不视为约定。');
 if(cid==='C07')return out('宫内',period==='day'?'翊坤宫／花圃':'翊坤宫',true,'可按约相见，公务与家族意见分别谈。');
 if(cid==='C08')return out('宫内',period==='day'?'练曲处':'住处',period==='evening','日间练曲，晚间可另留交谈；不强迫她唱。');
 return out('宫内','御前',true,'按职责相见。');
}
export function nextPersonalWindows(s,cid,from=s.date){const rows=[];for(let i=0;i<90&&rows.length<3;i++){const date=addDays(from,i);if(ordinal(date)>horizonDay(s))break;for(const period of ['day','evening']){if(i===0&&s.weekly?.clock%2&&period==='day')continue;const p=personPresence(s,cid,date,period,{promised:cid==='C05'});if(p.available)rows.push({date,period,place:p.place});if(rows.length===3)break;}}return rows;}
