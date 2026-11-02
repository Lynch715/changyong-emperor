// 三十年改命时间线。卷号仍用于旧经济档位，章节独立计算。
import {LONG_STORIES,openYearStories} from './long-stories.js';
import {YEAR_NAME,MONTHS,CORE,PEOPLE} from './data.js';
export const CHECKPOINTS=[2,4,6,10,15,20,25,30];
export const serial=at=>Array.isArray(at)?(at[0]-1)*12+at[1]:Number(at);
export const at=s=>(s.year-1)*12+s.month;
const key=n=>`${Math.floor((n-1)/12)+1}-${(n-1)%12+1}`;
const INTRODUCTIONS=new Set(CORE.map(id=>PEOPLE[id].first));
// 无时间线字段的旧档仍按旧窗口接入，不能因前移排期而额外跳过未看的故事。
const LEGACY_EARLIEST={K02:[2,3],K10:[4,2],K11:[5,2],K12:[6,3],K14:[7,3],K15:[8,2],K16:[9,3],K17:[10,9]};
export const FLEX_STORIES=[
 ['R02-01',[1,2],[1,2],'M01'],['R07-01',[1,3],[1,5],'M03'],['R06-01',[1,7],[1,10],'M05'],
 ['XR09-01',[1,10],[2,2],'M06'],['XR10-01',[1,11],[2,4],'M06'],['R08-01',[2,1],[2,4],'M07'],
 ['R04-01',[2,2],[2,5],'M08'],['R05-01',[2,4],[2,7],'M09'],['R03-01',[2,5],[2,8],'M10'],
 ['P01',[1,9],[2,3]],['P09',[1,11],[2,6]],['P10',[2,8],[3,4]],['P11',[2,11],[3,8]],
 ['K02',[2,2],[2,10],'R08-01'],['K10',[3,3],[4,6]],['K11',[3,7],[4,10]],
 ['K12',[4,3],[5,8]],['K14',[5,3],[6,4]],['K15',[5,8],[6,11]],['K16',[6,3],[7,10]],['K17',[6,9],[8,6]]
].map(([id,earliest,latest,dep])=>({id,earliest,latest,dep,...(id==='K14'?{months:[3,4]}:{})}));
export const FLEX_IDS=new Set(FLEX_STORIES.map(x=>x.id));
const sources=s=>[...FLEX_STORIES,...LONG_STORIES,...[...new Set([...(s.campaign?.openYears||[]),...(s.year>30?[s.year]:[])])].flatMap(year=>openYearStories({...s,year}))];
export function initCampaign(s,fresh=false){
 if(s.campaign){s.campaign.openYears??=[];if(s.year>30&&!s.campaign.openYears.includes(s.year))s.campaign.openYears.push(s.year);return s;}
 const now=at(s),pending=new Set(s.agenda||[]);
 s.campaign={version:1,adoptedAt:now,skipped:[],deferred:{},shown:{},openYears:s.year>30?[s.year]:[]};
 // 旧档中已经错过的篇章不追播；已经在眼前的事件保留，绝不改写玩家选择。
 if(!fresh){
  const all=sources(s);
  for(const e of all)if(!s.done[e.id]&&!pending.has(e.id)&&serial(LEGACY_EARLIEST[e.id]||e.earliest)<now)s.campaign.skipped.push(e.id);
  // 旧档没有经历的前半段，不虚构成已完成，也不留下永远等待的后半段。
  for(let n=0;n<all.length;n++){let changed=false;for(const e of all)if(e.dep&&s.campaign.skipped.includes(e.dep)&&!s.done[e.id]&&!pending.has(e.id)&&!s.campaign.skipped.includes(e.id)){s.campaign.skipped.push(e.id);changed=true;}if(!changed)break;}
 }
 return s;
}
export function campaignInfo(s){
 const chapters=[[1,2,'初入长雍'],[3,4,'朝局渐深'],[5,6,'旧局新解'],[7,10,'改命成局'],[11,15,'岁久见心'],[16,20,'承前启后'],[21,25,'薪火与人间'],[26,30,'三十年山河']];
 const i=chapters.findIndex(([a,b])=>s.year>=a&&s.year<=b),c=chapters[i]||[31,null,'宫中岁月'];
 return {chapter:i<0?9:i+1,start:c[0],end:c[1],title:c[2]+(c[1]?` · ${c[0]}至${c[1]}年`:' · 无限续玩'),checkpoint:s.month===12&&CHECKPOINTS.includes(s.year),final:s.year===30&&s.month===12,continuing:s.year>30,nextYear:CHECKPOINTS.includes(s.year)?s.year+1:null};
}
const isSkipped=(s,id)=>s.campaign.skipped.includes(id);
export function candidates(s,getScene,eligible){
 initCampaign(s);const now=at(s);
 return sources(s).filter(e=>!s.done[e.id]&&!isSkipped(s,e.id)&&serial(e.earliest)<=now&&(!e.dep||s.done[e.dep])&&(!e.months||e.months.includes(s.month))&&(s.campaign.deferred[e.id]?.until||0)<=now&&eligible(getScene(e.id)))
 .sort((a,b)=>serial(a.latest)-serial(b.latest)||serial(a.earliest)-serial(b.earliest));
}
export function scheduleIntroduction(s,getScene,eligible,dependency=null){
 // 首幕接在相关主线之后，不再等完全空闲的月份；每月至多一位，排在已有事项之后。
 initCampaign(s);
 const now=at(s);if([...INTRODUCTIONS].some(id=>s.campaign.shown[id]===now||s.agenda.includes(id)))return null;
 const e=candidates(s,getScene,eligible).find(e=>INTRODUCTIONS.has(e.id)&&(!dependency||e.dep===dependency));
 if(!e)return null;s.agenda.push(e.id);s.campaign.shown[e.id]=now;return e.id;
}
export function scheduleFlexible(s,getScene,eligible){
 const intro=scheduleIntroduction(s,getScene,eligible);if(intro)return intro;
 // 其余普通故事仍让岁时、急报、已在办的事项先行，空月至多呈上一件。
 if(s.agenda.length)return null;
 const e=candidates(s,getScene,eligible).find(e=>!INTRODUCTIONS.has(e.id));if(!e)return null;
 s.agenda.push(e.id);s.campaign.shown[e.id]=at(s);return e.id;
}
export function canDefer(s,id){
 const e=sources(s).find(e=>e.id===id);if(!e||s.agenda[0]!==id||s.done[id])return false;
 const d=s.campaign?.deferred?.[id];return at(s)<serial(e.latest)&&(d?.count||0)<3;
}
export function defer(s,id,getScene,log){
 initCampaign(s);if(!canDefer(s,id))throw Error('这件事需要及时处置，不能再推迟。');
 const e=sources(s).find(e=>e.id===id),old=s.campaign.deferred[id];s.campaign.deferred[id]={count:(old?.count||0)+1,until:at(s)+1};s.agenda.shift();
 const title=getScene(id).title;log(s,`${title}暂缓，最早下月再呈；原事保留。`,'事');
 const timing=INTRODUCTIONS.has(id)?'最早下月起，接在当月已有事项之后再谈':'最早下月、遇到较空的月份再呈';
 return {title:'暂缓呈报',text:`「${title}」已留在待办册，不占时辰。${timing}；建议在${YEAR_NAME(e.latest[0])}年${MONTHS[e.latest[1]-1]}前处理，逾期优先呈报且不能再主动暂缓，最多主动暂缓三次。原事会保留，不会悄悄消失。`,stats:{},people:{}};
}
export function upcoming(s,getScene,eligible){
 const now=at(s);return sources(s).filter(e=>!s.done[e.id]&&!isSkipped(s,e.id)&&serial(e.earliest)<=now+12).map(e=>({id:e.id,title:getScene(e.id)?.title||e.id,earliest:key(serial(e.earliest)),latest:key(serial(e.latest)),status:e.dep&&!s.done[e.dep]?'等待前事':serial(e.earliest)>now?'尚未到时':!eligible(getScene(e.id))?'等待人物':(s.campaign.deferred[e.id]?.until||0)>now?'已暂缓':'可择月呈报'}));
}
