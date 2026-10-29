// Real rule actions from native starts; no direct edits to dates, scores, consent, or history.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createWeeklyGame,preview,commit,validateSave,requiredEvents,getEvent,hash,setBoundary} from '../src/engine.js';
import {ordinal,fromOrdinal,addDays,stamp,unstamp} from '../src/calendar.js';
import {currentWeek} from '../src/week.js';
import {activityInbox} from '../src/activities.js';
import {ACTIVITY_VOICES,GIFTS,BOND_MODES,GROWTH} from '../src/activity-content.js';
import {runRelationshipRoute,auditS05} from './check-s05.mjs';
const dir=new URL('../docs/施工/证据/2026-10-24-S06/',import.meta.url),cp=x=>structuredClone(x),d=(year,month,day)=>({year,month,day});
const save=(name,s)=>fs.writeFileSync(new URL(name,dir),JSON.stringify({format:'changyong-save',qaOnly:true,state:s},null,2));
const act=(s,a)=>{const n=commit(s,preview(s,[a])).state;validateSave(n);return n;};
function settle(s){for(let guard=0;guard<50;guard++){const n=s.weekly.notices.find(n=>n.status==='pending'&&!n.suspended&&ordinal(n.date)<=ordinal(s.date));if(n){s=act(s,{type:'week-resolve',noticeId:n.id,choice:n.choices?.[0]});continue;}const e=requiredEvents(s)[0];if(e){s=act(s,{type:'event',eventId:e.id,choiceId:getEvent(s,e.id).options[0].id});continue;}return s;}throw Error('settle');}
function reach(s,target){for(let guard=0;guard<220;guard++){s=settle(s);if(ordinal(s.date)>=ordinal(target))return s;s=act(s,{type:'week-advance',date:target});}throw Error('reach');}
function plan(s,kind,actor,extra={}){
 s=settle(s);for(let round=0;round<2;round++){
  const w=currentWeek(s);if(w)for(let at=s.weekly.clock;at<=stamp(w.end,'evening');at++){const m=unstamp(at);try{return act(s,{type:'week-plan',kind,actor,date:m.date,period:m.period,...extra});}catch(e){if(e.name==='AssertionError')throw e;}}
  const focus=s.weekly.weeks.find(w=>w.type==='focus'&&w.quarter===s.turn);if(s.weekly.weeks.some(w=>w.type==='extension'&&w.quarter===s.turn))break;
  s=act(s,{type:'week-extend',date:addDays(focus.end,1)});s=reach(s,addDays(focus.end,1));
 }throw Error(`${actor} ${kind}未找到合法空时段 ${JSON.stringify(s.date)}`);
}
function perform(s,kind,actor,extra={}){s=plan(s,kind,actor,extra);s=reach(s,s.weekly.plans.at(-1).date);return act(s,{type:'week-fulfill',planId:s.weekly.plans.at(-1).id});}
const targets={C02:d(1,1,2),C03:d(2,4,7),C04:d(2,1,7),C05:d(2,4,2),C06:d(1,1,2),C07:d(1,1,2),C08:d(2,1,2)};
const proofs=[];
for(const [actor,target] of Object.entries(targets)){
 let s=reach(createWeeklyGame(),target);s=perform(s,'chat',actor,{topic:'wish',choice:'share'});s=perform(s,'walk',actor,{topic:'shared',place:'corridor'});
 const gift=GIFTS.find(g=>g.likedBy.includes(actor));s=act(s,{type:'activity-buy',giftId:gift.id});const item=s.weekly.activities.inventory.at(-1);s=act(s,{type:'activity-gift-same',actor,planId:s.weekly.plans.at(-1).id,itemId:item.id});
 s=perform(s,'letter',actor,{topic:'shared'});const sent=s.weekly.plans.at(-1);s=reach(s,addDays(sent.date,14));const sh=s.weekly.activities.shipments.find(sh=>sh.planId===sent.id);assert.ok(sh);s=act(s,{type:'activity-receive',shipmentId:sh.id});
 assert.equal(s.weekly.activities.inventory[0].status,'given');assert.ok(s.weekly.activities.entries.some(e=>e.kind==='letter-reply'&&e.actor===actor));proofs.push({actor,date:s.date,chatWalkGiftLetter:true,replyDays:ordinal(sh.dueDate)-ordinal(sent.date),phaseUnchangedByActivities:s.relations[actor].stage,entries:s.weekly.activities.entries.length,hash:hash(s)});
 save(`${actor}活动完整链_规则样例.json`,s);
}
let s=runRelationshipRoute('C02',{stopAtStage:'相守'}).state;assert.equal(s.relations.C02.stage,'相守');assert.ok(!s.sealed);const focus=s.weekly.weeks.find(w=>w.type==='focus'&&w.quarter===s.turn);s=act(s,{type:'week-extend',date:addDays(focus.end,1)});s=reach(s,addDays(focus.end,1));save('相守六种相伴_施工前规则样例.json',s);
for(const mode of Object.keys(BOND_MODES))s=perform(s,'bond','C02',{mode});assert.equal(s.weekly.activities.entries.filter(e=>e.kind==='bond').length,6);save('相守六种相伴_规则结果.json',s);
const romance={phase:s.relations.C02.stage,modes:Object.keys(BOND_MODES),actualPlans:s.weekly.plans.filter(p=>p.kind==='bond').map(p=>({date:p.date,mode:p.activity.mode,slots:p.slots}))};
const banquet=[];for(const theme of ['tea','music','season']){let b=reach(createWeeklyGame(),d(1,1,2));b=perform(b,'banquet','C01',{guests:['C02','C06','C07'],seats:['C07','C02','C06'],theme});const p=b.weekly.plans.at(-1);b=act(b,{type:'activity-followup',actor:'C06',planId:p.id});banquet.push({theme,money:p.money,slots:p.slots,guests:p.guests,privateLine:true});save(`${theme}三人小宴_规则样例.json`,b);}
const growth=[];for(const kind of Object.keys(GROWTH)){let g=reach(createWeeklyGame(),d(1,1,2));for(const exercise of Object.keys(GROWTH[kind].steps))g=perform(g,kind,'C01',{exercise});assert.equal(g.weekly.activities.entries.filter(e=>e.kind==='growth-result').length,1);growth.push({kind,practices:g.weekly.activities.growth.length,result:g.weekly.activities.entries.find(e=>e.kind==='growth-result').title});}
fs.writeFileSync(new URL('S06人物活动规则验收.json',dir),JSON.stringify({version:'0.7.0',scope:'实际规则行动，从原生起点走到人物登场；不改日期、分数或意愿',proofs,romance,banquet,growth,limits:['非逐屏真人试玩或数值平衡','113条S01大纲不是113张已实现事件卡；当前为组合活动系统','真实API和实体手机未测']},null,2));
if(process.argv.includes('--full'))fs.writeFileSync(new URL('S05七线两年完整回归.json',dir),JSON.stringify({...auditS05(),version:'0.7.0',scope:'S06当前代码重跑S05七条独立、同局并行及全合作两年路径'},null,2));
console.log('S06规则验收完成'+(process.argv.includes('--full')?'，S05两年回归完成':''));
