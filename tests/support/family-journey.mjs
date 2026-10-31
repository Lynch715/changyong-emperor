import * as E from '../../src/v2/engine.js';
import * as F from '../../src/v2/family.js';
export function resolveAgenda(s,{stopAt=null,onScene=null}={}){
 E.bind(s);let guard=0;
 while(s.agenda.length){
  if(++guard>100)throw Error('要事未能收束');
  const id=E.pendingScene(s),sc=E.scene(id);
  if(onScene)onScene(sc,s);
  if(sc.familyType===stopAt)return sc;
  const opts=E.optionsFor(s,sc),opt=sc.kind==='festival'&&s.children.length?opts.find(o=>o.id==='all'):sc.familyType==='news'?opts.find(o=>o.id==='quiet'):sc.familyType==='threat'?opts.find(o=>o.id==='expose'):opts.find(o=>o.id==='confess')||opts.find(o=>o.id==='warm')||opts.find(o=>!o.slight&&!(o.effects?.treasury<0)&&!(o.cost>0)&&!o.redeem)||opts.find(o=>!o.redeem)||opts[0];
  E.choose(s,id,opt.id);
  if(s.pendingBirth||s.familyArt?.required)return sc;
 }
 return null;
}
export function advance(s){
 if(s.ended){if(s.year===2)E.startVolume2(s);else if(s.year===4)E.startVolume3(s);else E.continueFamily(s);return;}
 if(!s.night)E.spendNight(s,null);E.endMonth(s);
}
// 从真正元年新档按月推进；不改日期、亲密门槛或怀孕概率。
export function journey(seed=431){
 const s=E.newGame(seed),snapshots={start:structuredClone(s)};let months=0;
 while(months++<160){
  const sc=resolveAgenda(s,{stopAt:'birth',onScene:(scene,state)=>{if(['news','threat'].includes(scene.familyType)&&!snapshots[scene.familyType])snapshots[scene.familyType]=structuredClone(state);}});
  if(sc?.familyType==='birth'){snapshots.birth=structuredClone(s);E.choose(s,sc.id,'girl');snapshots.naming=structuredClone(s);E.nameChild(s,'静宁');E.completeBirth(s,'k_infant_04');snapshots.born=structuredClone(s);break;}
  if(s.ended){advance(s);continue;}
  const id='C09';
  if(E.present(s,id)&&s.people[id].met&&!E.away(s,id)&&!E.gone(s,id)){
   if(s.people[id].knot&&E.canAct(s)){const c=E.beginChat(s,id);E.repairKnot(s,c);}
   if(E.canAct(s)&&s.stats.inner>=.1)E.giveGift(s,id,'book');
   if(E.nightChoices(s).some(p=>p.id===id)&&!s.night){
    if(E.hasStory(s,id)){E.queueSpecial(s,id);resolveAgenda(s);}else E.spendNight(s,id);
   }
  }
  advance(s);
 }
 if(!s.children.length)throw Error('未在按月路径中诞育');
 // 保留第一位皇嗣，孕期之后不再选生母留宿，沿原来的卷末入口继续。
 const c=s.children[0];months=0;
 while(F.childAge(s,c)<10&&months++<140){resolveAgenda(s);advance(s);}
 E.bind(s);snapshots.youth=structuredClone(s);
 const sc=resolveAgenda(s,{stopAt:'youth'});if(!sc)throw Error('十岁事件缺失');
 E.choose(s,sc.id,'art');snapshots.youthArt=structuredClone(s);E.changeChildArt(s,c.id,'k_youth_05');resolveAgenda(s);snapshots.grown=structuredClone(s);
 return {s,snapshots};
}
