import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/v2/engine.js';
import {PEOPLE,AGENDA,CORE,STAT_MAP,STATS} from '../src/v2/data.js';
import {REWRITE} from '../src/v2/rewrite.js';
import {SCENES} from '../src/v2/content.js';

test('月历里的每一幕都存在，选项数值都能换算', ()=>{
 for(const ids of Object.values(AGENDA))for(const id of ids){const sc=E.scene(id);assert.ok(sc,id);assert.ok(sc.options.length,id);
  for(const o of sc.options)for(const k of Object.keys(o.effects||{}))assert.ok(STAT_MAP[k]||STATS.some(s=>s.id===k),id+' '+k);}
 for(const id of CORE){assert.ok(E.scene(PEOPLE[id].first),id);assert.ok(E.scene(PEOPLE[id].second),id);}
});
test('改写稿只覆盖已有的场景与选项', ()=>{
 for(const[id,w]of Object.entries(REWRITE)){assert.ok(SCENES[id],id);for(const k of Object.keys(w.options||{}))assert.ok(SCENES[id].options.some(o=>o.id===k),id+' '+k);}
});
test('两年能完整走完，有结局', ()=>{
 const s=E.newGame(7);let n=0;
 while(!s.ended&&n++<30){
  while(s.agenda.length){const sc=E.scene(s.agenda[0]);E.choose(s,sc.id,sc.options.at(-1).id);}
  const met=CORE.filter(id=>E.present(s,id)&&s.people[id].met);
  if(met[0]){const c=E.beginChat(s,met[0]);E.applyChat(s,c,{affection:9});assert.ok(c.gained<=E.CHAT_CAP);}
  if(s.ap)E.rest(s);if(s.ap)E.goOuting(s);
  const night=E.nightChoices(s),sp=night.find(x=>x.special);
  if(sp){const sid=E.queueSpecial(s,sp.id);E.choose(s,sid,E.scene(sid).options[0].id);}else E.spendNight(s,night[0]?.id||null);
  E.endMonth(s);
 }
 assert.ok(s.ended);assert.equal(n,24);
 const e=E.ending(s);assert.ok(e.score>0);
 for(const v of Object.values(s.stats))assert.ok(v>=0&&v<=100);
});
test('心结挡住情分上涨，说开后解除', ()=>{
 const s=E.newGame(1);s.people.C07.knot={source:'K01',text:'七夕两宫'};s.people.C07.met=true;
 assert.equal(E.gain(s,'C07',5),0);
 s.agenda=[];s.year=1;s.month=8;const c=E.beginChat(s,'C07');assert.ok(E.repairKnot(s,c));assert.equal(s.people.C07.knot,null);
});
test('旨意的数值被限幅', ()=>{
 const s=E.newGame(1);s.agenda=[];const r=E.applyEdict(s,'大赦天下',{effects:{treasury:50,people:50,court:50},affection:{C02:40,X:3}});
 assert.ok(Object.values(r.stats).every(v=>v<=8));assert.ok(Object.values(r.stats).reduce((a,b)=>a+Math.max(0,b),0)<=12);assert.ok((r.people.C02||0)<=5);
});
import {ROMANCE,LOVER_ENDING} from '../src/v2/romance.js';
import {MORE_PETITIONS,SMALL_EVENTS} from '../src/v2/events.js';
test('每人都有第三幕和相守结局；随机事件格式正确', ()=>{
 for(const id of CORE){const sc=E.scene(E.thirdOf(id));assert.ok(sc,id);assert.equal(sc.actor,id);assert.deepEqual(sc.options.map(o=>o.id),['confess','slow','restrain']);assert.ok(LOVER_ENDING[id],id);}
 for(const ev of [...MORE_PETITIONS,...SMALL_EVENTS]){assert.ok(ev.options.length>=2,ev.id);for(const o of ev.options){for(const k of Object.keys(o.effects||{}))assert.ok(STATS.some(s=>s.id===k),ev.id+k);for(const k of Object.keys(o.bond||{}))assert.ok(PEOPLE[k],ev.id+k);}}
});
test('专心对一个人，两年内能走到相守', ()=>{
 const s=E.newGame(11);let n=0;
 while(!s.ended&&n++<30){
  while(s.agenda.length){const sc=E.scene(s.agenda[0]);const o=sc.options.find(o=>['warm','confess','develop'].includes(o.id))||sc.options[0];E.choose(s,sc.id,o.id);}
  for(let i=0;i<2&&s.ap;i++){const c=E.beginChat(s,'C02');E.applyChat(s,c,{affection:4});E.applyChat(s,c,{affection:4});}
  if(s.ap)E.rest(s);
  const sp=E.nightChoices(s).find(x=>x.id==='C02');
  if(sp?.special){const sid=E.queueSpecial(s,'C02');E.choose(s,sid,sid.startsWith('L')?'confess':'warm');}else E.spendNight(s,'C02',{affection:3});
  E.endMonth(s);
 }
 const p=s.people.C02;assert.ok(p.third&&p.lover,'苏培盛三幕走完');assert.equal(E.ending(s).people.find(x=>x.id==='C02').tier,3);
});
import {SCENES2,AGENDA2,REPAIR2} from '../src/v2/vol2.js';
test('第二卷：场景齐全，存档延续，四年走完', ()=>{
 for(const ids of Object.values(AGENDA2))for(const id of ids){const sc=E.scene(id);assert.ok(sc,id);for(const o of sc.options){for(const k of Object.keys(o.effects||{}))assert.ok(STATS.some(s=>s.id===k),id+k);if(o.slight)assert.ok(REPAIR2[id]?.[o.slight],id+' repair '+o.slight);}}
 for(const id of CORE)assert.ok(E.scene(E.fourthOf(id)),id);
 for(const pick of ['keep','hangzhou','punish']){
  const s=E.newGame(21);let n=0;
  const play=()=>{while(s.agenda.length){const sc=E.scene(s.agenda[0]);const os=E.optionsFor(s,sc);const o=os.find(o=>o.id===pick)||os.find(o=>['warm','confess','stay','develop'].includes(o.id))||os[0];E.choose(s,sc.id,o.id);}
   if(s.ap&&E.present(s,'C07')){const c=E.beginChat(s,'C07');E.applyChat(s,c,{affection:4});E.applyChat(s,c,{affection:4});}
   const sp=E.nightChoices(s).find(x=>x.special);if(sp){const sid=E.queueSpecial(s,sp.id);const sc=E.scene(sid);const os=E.optionsFor(s,sc);E.choose(s,sid,(os.find(o=>['warm','confess','stay'].includes(o.id))||os[0]).id);}else E.spendNight(s,E.nightChoices(s)[0]?.id||null);
   E.endMonth(s);n++;};
  while(!s.ended&&n<30)play();
  assert.equal(n,24);E.startVolume2(s);assert.equal(s.year,3);assert.ok(!s.ended);
  while(!s.ended&&n<60)play();
  assert.equal(n,48,pick);assert.equal(s.vol,2);
  const e=E.ending(s);if(pick==='punish')assert.ok(e.people.find(p=>p.id==='C03')?.gone);
  if(pick==='keep')assert.ok(s.flags.nian_safe);
 }
});
