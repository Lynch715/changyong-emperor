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
import {VISITS} from '../src/v2/visits.js';
import {ACHIEVEMENTS,updateGallery} from '../src/v2/gallery.js';
test('来访与成就', ()=>{
 for(const id of CORE){assert.equal(VISITS[id].length,3,id);for(const t of VISITS[id]){assert.ok(t.length>=2,id);for(const v of t)for(const k of Object.keys(v.effects||{}))assert.ok(STATS.some(s=>s.id===k),id+k);}}
 const s=E.newGame(3);s.agenda=[];s.people.C02.aff=50;s.visit={id:'C02',tier:0,i:0};const ap=s.ap;const r=E.acceptVisit(s);assert.equal(s.ap,ap);assert.ok(r.people.C02>0);assert.equal(E.visitOf(s),null);
 s.people.C02.aff=44;E.gain(s,'C02',2);assert.ok(s.cele.some(c=>c.k==='stage'&&c.stage==='相知'));
 const mem={d:{},getItem(k){return this.d[k]??null},setItem(k,v){this.d[k]=v}};
 const fresh=updateGallery(s,mem);assert.ok(fresh.some(a=>a.id==='visit'));assert.equal(updateGallery(s,mem).length,0);
 for(const a of ACHIEVEMENTS)assert.doesNotThrow(()=>a.check(E.newGame(1)));
});
import {SURPRISES} from '../src/v2/social.js';
test('吃醋、小惊喜、旨意回报', ()=>{
 const s=E.newGame(4);s.agenda=[];s.year=1;s.month=11;
 for(const id of ['C06','C07','C09','C10'])Object.assign(s.people[id],{met:true,aff:40});
 const r=E.spendNight(s,'C07');assert.ok(r.people.C06<0,'皇后吃醋');assert.ok(r.people.C09<0);
 for(const x of SURPRISES)for(const o of x.options)for(const k of Object.keys(o.effects||{}))assert.ok(STATS.some(t=>t.id===k),x.id+k);
 const s2=E.newGame(8);s2.agenda=[];s2.people.C02.met=true;let got=null;for(let i=0;i<40&&!got;i++){got=E.rollSurprise(s2);}assert.ok(got);assert.equal(s2.agenda[0],got);const sc=E.scene(got);E.choose(s2,got,sc.options[0].id);
 const s3=E.newGame(2);s3.agenda=[];E.applyEdict(s3,'在京城设粥厂',{effects:{people:4,treasury:-3},title:'设粥厂',narration:'粥厂开了'});
 for(let i=0;i<4;i++){s3.agenda=[];s3.night=false;E.spendNight(s3,null);E.endMonth(s3);if(s3.agenda.includes('FU1'))break;}
 assert.ok(s3.agenda.includes('FU1'),'旨意回报到了');const f=E.scene('FU1');assert.ok(f&&f.options.length>=2);
 while(s3.agenda.length){const x=E.scene(s3.agenda[0]);E.choose(s3,x.id,x.options[0].id);}
 E.setDyn(s3,'FU9',{title:'t',body:'b',options:[{id:'a',label:'l',effects:{people:1},reply:'r'}]});assert.equal(E.scene('FU9').title,'t');
});

import {GIFTS,GIFT_LINES} from '../src/v2/data.js';
test('每人有合适的忌口，送错和重复送错都扣三点',()=>{
 for(const id of CORE){const p=PEOPLE[id];assert.ok(p.dislikes.length>=1&&p.dislikes.length<=2);assert.ok(GIFT_LINES[id].disliked);
 for(const g of p.dislikes){assert.ok(GIFTS[g]);assert.ok(!p.likes.includes(g));const s=E.newGame(1);s.agenda=[];s.people[id].aff=40;
 for(let i=0;i<2;i++){const r=E.giveGift(s,id,g);assert.equal(r.disliked,true);assert.equal(r.people[id],-3);}}}
});
test('问喜好有一半机会说出讨厌的东西，并记住真假',()=>{
 const results=new Set();for(let seed=1;seed<=100;seed++){const s=E.newGame(seed);s.seed=seed;const g=E.hintLike(s,'C07');const liked=s.known.C07[g];results.add(liked);assert.ok((liked?PEOPLE.C07.likes:PEOPLE.C07.dislikes).includes(g));}
 assert.deepEqual(results,new Set([false,true]));
});

import {dateLine} from '../src/v2/ai.js';
import {SEASON} from '../src/v2/data.js';
test('每月天气随季节变化，旧存档也能显示天气',()=>{
 const s=E.newGame(7);for(let m=1;m<=12;m++){s.month=m;E.startMonth(s);assert.ok(E.WEATHER[SEASON(m)].includes(s.weather));assert.ok(dateLine(s).includes(s.weather));}
 delete s.weather;const oldSeed=s.seed;assert.equal(E.weatherOf(s),'晴');assert.ok(dateLine(s).includes('今日晴'));assert.equal(s.seed,oldSeed);
 const mem={getItem:()=>JSON.stringify(s)};assert.ok(E.load(mem));assert.doesNotThrow(()=>E.rest({...s,agenda:[]}));
});
test('雪天微服、雨天见太医、闷热休养只有指定的小变化',()=>{
 const make=w=>{const s=E.newGame(1);s.agenda=[];s.weather=w;s.month=12;s.stats.health=50;s.seed=10;return s;};
 const snow=make('雪'),sun=make('晴');E.goOuting(snow);E.goOuting(sun);assert.equal(snow.stats.health,sun.stats.health-2);
 const hot=make('闷热');hot.month=5;E.rest(hot);assert.equal(hot.stats.health,60);
 const rain=make('雨');rain.year=2;rain.month=2;const before=rain.people.C04.aff;const c=E.beginChat(rain,'C04');assert.equal(rain.people.C04.aff,before+1);assert.equal(c.gained,0);
 const dry=make('晴');dry.year=2;dry.month=2;E.beginChat(dry,'C04');assert.equal(dry.people.C04.aff,before);
});

import {BIRTH,FESTIVALS} from '../src/v2/festivals.js';
test('生辰：赏赐、召见、夜里都算记得；整月不去情分掉 3',()=>{
 for(const id of CORE)assert.ok(BIRTH[id]>=1&&BIRTH[id]<=12,id);
 const mk=()=>{const s=E.newGame(5);s.agenda=[];s.year=2;s.month=6;s.bdayDone=[];Object.assign(s.people.C07,{met:true,aff:40});return s;};
 const a=mk();assert.deepEqual(E.birthdays(a),['C07']);const r=E.giveGift(a,'C07','silk');assert.equal(r.birthday,true);assert.equal(r.people.C07,9);assert.ok(E.birthdayDone(a,'C07'));
 assert.equal(E.giveGift(a,'C07','flowers').birthday,false,'一个月只算一次');
 const b=mk();const c=E.beginChat(b,'C07');assert.equal(c.birthday,true);assert.equal(b.people.C07.aff,42);
 const n=mk();n.ap=0;E.spendNight(n,'C07',{affection:0});assert.equal(n.people.C07.aff,42);
 const f=mk();f.ap=0;f.night=true;const rep=E.endMonth(f);assert.deepEqual(rep.forgot,['C07']);assert.equal(f.people.C07.aff,37);assert.ok(f.people.C07.memories.at(-1).text.includes('没有来'));
 const k=E.newGame(1);k.year=4;k.month=8;for(const id of ['C08','C09'])k.people[id].met=true;assert.deepEqual(E.birthdays(k),[],'两场生辰那个月不另算');
 const old=E.newGame(1);delete old.bdayDone;old.year=2;old.month=6;old.agenda=[];old.people.C07.met=true;assert.equal(E.beginChat(old,'C07').birthday,true);
});
test('年节：选人同过、家宴、独自，各有反馈',()=>{
 const s=E.newGame(9);s.year=2;s.month=7;for(const id of ['C02','C06','C07','C09','C10'])Object.assign(s.people[id],{met:true,aff:50});s.people.C07.aff=70;s.people.C09.lover=true;s.people.C09.aff=55;
 s.month=8;E.startMonth(s);const id=s.agenda.find(x=>x.startsWith('FE'));assert.equal(id,'FE2-zhongqiu');
 const sc=E.scene(id),os=E.optionsFor(s,sc);assert.equal(os[0].id,'all');assert.equal(os.at(-1).id,'alone');
 assert.equal(os.filter(o=>o.who).length,3);assert.equal(os.find(o=>o.who)?.who,'C09','两情相悦的排在前面');assert.ok(!os.some(o=>o.label.includes('{n}')));
 s.agenda=[id];const before={...Object.fromEntries(CORE.map(c=>[c,s.people[c].aff]))};const r=E.choose(s,id,'pC07');
 assert.equal(r.people.C07,5);assert.ok(r.people.C06<0&&r.people.C09<0&&r.people.C10<0,'不和的人吃味');assert.ok(r.text);
 const s2=E.newGame(9);s2.year=2;s2.month=12;for(const c of ['C02','C07','C06'])s2.people[c].met=true;E.startMonth(s2);const fe=s2.agenda.find(x=>x.startsWith('FE'));s2.agenda=[fe];const r2=E.choose(s2,fe,'all');assert.ok(r2.stats.palace>0);assert.ok(Object.values(r2.people).every(v=>v>0)&&Object.keys(r2.people).length===3);
 const y1=E.newGame(1);y1.month=7;for(const c of CORE)y1.people[c].met=true;y1.year=1;E.startMonth(y1);assert.ok(!y1.agenda.some(x=>x.startsWith('FE')),'元年七夕已有剧情');
 y1.year=4;y1.month=12;E.startMonth(y1);assert.ok(!y1.agenda.some(x=>x.startsWith('FE')),'四年除夕已有剧情');
 for(const f of FESTIVALS)for(const c of CORE)assert.ok(f.touch[c],f.key+c);
});

import {SCENES3,AGENDA3,REPAIR3,ENDING3} from '../src/v2/vol3.js';
test('第三卷：场景齐全，六年走完，年羹尧的去留影响西北用兵',()=>{
 for(const ids of Object.values(AGENDA3))for(const id of ids){const sc=E.scene(id);assert.ok(sc,id);for(const o of sc.options){for(const k of Object.keys(o.effects||{}))assert.ok(STATS.some(s=>s.id===k),id+k);if(o.slight)assert.ok(REPAIR3[id]?.[o.slight],id+' repair '+o.slight);for(const k of Object.keys({...o.bond,...o.bonds}))assert.ok(PEOPLE[k],id+k);}}
 for(const id of CORE){const z=E.scene(E.fifthOf(id));assert.ok(z,id);assert.equal(z.actor,id);assert.deepEqual(z.options.map(o=>o.id),['stay','mid','hard']);assert.equal(ENDING3[id].length,4);}
 const seen={};
 for(const pick of ['keep','hangzhou','punish']){
  const s=E.newGame(31);let n=0;
  const play=()=>{while(s.agenda.length){const sc=E.scene(s.agenda[0]);const os=E.optionsFor(s,sc);const o=os.find(o=>o.id===pick)||os.find(o=>['warm','confess','stay','develop'].includes(o.id))||os[0];if(sc.id==='W07')seen[pick]=os.map(o=>o.id);E.choose(s,sc.id,o.id);}
   if(s.ap&&E.present(s,'C07')){const c=E.beginChat(s,'C07');E.applyChat(s,c,{affection:4});E.applyChat(s,c,{affection:4});}
   const sp=E.nightChoices(s).find(x=>x.special);if(sp){const sid=E.queueSpecial(s,sp.id);const sc=E.scene(sid);const os=E.optionsFor(s,sc);E.choose(s,sid,(os.find(o=>['warm','confess','stay'].includes(o.id))||os[0]).id);}else E.spendNight(s,E.nightChoices(s)[0]?.id||null);
   E.endMonth(s);n++;};
  while(!s.ended&&n<30)play();E.startVolume2(s);while(!s.ended&&n<60)play();
  assert.throws(()=>E.startVolume2(s));E.startVolume3(s);assert.equal(s.year,5);assert.equal(s.vol,3);
  while(!s.ended&&n<90)play();
  assert.equal(n,72,pick);assert.ok(s.ended);for(const v of Object.values(s.stats))assert.ok(v>=0&&v<=100);
  assert.ok(E.ending(s).solved<=3);
 }
 assert.ok(seen.keep.includes('nian')&&!seen.keep.includes('nianhz'));assert.ok(seen.hangzhou.includes('nianhz')&&!seen.hangzhou.includes('nian'));assert.ok(!seen.punish.some(x=>x.startsWith('nian')));
 const s=E.newGame(2);s.year=5;s.month=3;s.agenda=[];Object.assign(s.people.C02,{met:true,first:true,second:true,third:true,fourth:true,aff:82});assert.equal(E.storyOf(s,'C02'),'Z02');
 s.people.C02.fourthAt='5-3';assert.equal(E.storyOf(s,'C02'),null,'第四幕当月不接第五幕');
});
test('再活一世：三种记忆各有效果，似曾相识的人记得',()=>{
 const prev=E.newGame(4);prev.ended=true;prev.vol=3;Object.assign(prev.people.C07,{aff:90,lover:true});prev.people.C02.aff=70;prev.people.C06.aff=40;
 assert.throws(()=>E.newGamePlus(E.newGame(1),'love'));assert.throws(()=>E.newGamePlus(prev,'gold'));
 const a=E.newGamePlus(prev,'love',5);const base=E.newGame(5);
 assert.equal(a.life,2);assert.equal(a.year,1);assert.equal(a.month,1);assert.ok(!a.ended);
 assert.equal(a.people.C07.aff,base.people.C07.aff+12);assert.equal(a.people.C02.aff,base.people.C02.aff+12);assert.equal(a.people.C06.aff,base.people.C06.aff);
 assert.ok(a.people.C07.memories.some(m=>m.text.includes('梦里')));assert.deepEqual(Object.keys(a.past).sort(),['C02','C07']);
 const k=E.newGamePlus(prev,'know',5);for(const id of CORE){for(const g of PEOPLE[id].likes)assert.equal(k.known[id][g],true);for(const g of PEOPLE[id].dislikes)assert.equal(k.known[id][g],false);}
 const p=E.newGamePlus(prev,'purse',5);assert.equal(p.stats.treasury,base.stats.treasury+12);assert.equal(p.stats.health,base.stats.health+5);
 const third=E.newGamePlus({...p,ended:true},'love',6);assert.equal(third.life,3);
 const mem={d:{},getItem(k){return this.d[k]??null},setItem(k,v){this.d[k]=v}};assert.ok(updateGallery(third,mem).some(x=>x.id==='life3'));
});

test('专心对一个人，六年能走完五幕并相守',()=>{
 const s=E.newGame(13);let n=0;
 const play=()=>{while(s.agenda.length){const sc=E.scene(s.agenda[0]);const os=E.optionsFor(s,sc);const o=os.find(o=>o.who==='C02')||os.find(o=>['warm','confess','develop','stay','both'].includes(o.id))||os[0];E.choose(s,sc.id,o.id);}
  for(let i=0;i<2&&s.ap;i++){const c=E.beginChat(s,'C02');if(s.people.C02.knot)E.repairKnot(s,c);E.applyChat(s,c,{affection:4});E.applyChat(s,c,{affection:4});}
  if(s.ap)E.rest(s);
  const sp=E.nightChoices(s).find(x=>x.id==='C02');
  if(sp?.special){const sid=E.queueSpecial(s,'C02');const os=E.optionsFor(s,E.scene(sid));E.choose(s,sid,(os.find(o=>['confess','warm','stay'].includes(o.id))||os[0]).id);}else E.spendNight(s,'C02',{affection:3});
  E.endMonth(s);n++;};
 while(!s.ended)play();E.startVolume2(s);while(!s.ended)play();E.startVolume3(s);while(!s.ended)play();
 const p=s.people.C02;assert.equal(n,72);assert.ok(p.fourth&&p.fifth&&p.lover,'苏培盛五幕走完');assert.equal(E.ending(s).people.find(x=>x.id==='C02').tier,3);
 assert.ok((s.count.bdays||0)>=5,'每年二月都记得苏培盛的生辰');assert.ok(s.count.festivals>=10);
});
test('批折：朝局 +3、圣躬 −2，设值房后只伤 1 点，占一个时辰',()=>{
 const s=E.newGame(1);s.agenda=[];s.stats.court=50;s.stats.health=50;const ap=s.ap;const r=E.review(s);assert.equal(s.ap,ap-1);assert.deepEqual(r.stats,{court:3,health:-2});assert.ok(r.text);
 s.done.W08='council';assert.deepEqual(E.review(s).stats,{court:3,health:-1});
});

import {tierOf,TIERS} from '../src/v2/fate.js';
test('自由度：一档不掷骰；三档比二档难；朝局和情分会加减点',()=>{
 const s=E.newGame(3);assert.equal(E.freedomOf(s),2);assert.equal(E.freedomOf({}),2,'旧存档默认二档');assert.throws(()=>E.setFreedom(s,4));
 E.setFreedom(s,1);const f=E.rollFate(s,'edict');assert.equal(f.free,true);assert.equal(f.tier,4);
 const rate=l=>{const x=E.newGame(7);E.setFreedom(x,l);let big=0,bad=0;for(let i=0;i<2000;i++){const r=E.rollFate(x,'edict');if(r.tier===4)big++;if(r.tier===0)bad++;}return {big,bad};};
 const r2=rate(2),r3=rate(3);assert.ok(r2.big>r3.big*1.5&&r3.bad>r2.bad*2,JSON.stringify([r2,r3]));
 for(let t=-1;t<=24;t++){assert.ok(tierOf(3,t)<=tierOf(2,t));}assert.equal(TIERS[tierOf(2,20)],'大吉');assert.equal(TIERS[tierOf(3,1)],'大凶');
 s.freedom=2;s.stats.court=80;assert.deepEqual(E.rollFate(s,'edict').bonus,[['朝局 80',2]]);
 s.people.C07.aff=70;s.people.C07.knot={source:'K01',text:'x'};assert.equal(E.rollFate(s,'chat','C07').bonus.reduce((a,[,b])=>a+b,0),0);
});
test('掷骰兜底：大凶没有好处，凶减半，召见大吉至少 +2',()=>{
 const f=t=>({d:10,bonus:[],total:10,tier:t,level:2});
 const e=t=>{const s=E.newGame(1);s.agenda=[];s.stats.treasury=50;s.stats.people=50;s.people.C02.met=true;s.people.C02.aff=40;return [s,E.applyEdict(s,'x',{effects:{people:6,treasury:-4},affection:{C02:4},fate:f(t)})];};
 let [,r]=e(0);assert.equal(r.stats.people,undefined);assert.equal(r.stats.treasury,-4);assert.equal(r.people.C02,undefined);
 [,r]=e(1);assert.equal(r.stats.people,3);assert.equal(r.people.C02,2);
 [,r]=e(4);assert.equal(r.stats.people,6);
 const c=t=>{const s=E.newGame(1);s.agenda=[];s.people.C02.aff=40;const ch=E.beginChat(s,'C02');ch.fate={...f(t),kind:'chat'};return [s,ch];};
 let [s,ch]=c(0);assert.equal(E.applyChat(s,ch,{affection:4}),0);assert.equal(E.applyChat(s,ch,{affection:-3}),-3);
 [s,ch]=c(1);assert.equal(E.applyChat(s,ch,{affection:4}),1);
 [s,ch]=c(4);assert.equal(E.applyChat(s,ch,{affection:0}),2);
 const n=E.newGame(1);n.agenda=[];n.ap=0;n.people.C02.met=true;n.people.C02.aff=40;const rn=E.spendNight(n,'C02',{affection:4,fate:f(0)});assert.equal(rn.people.C02,undefined);
 const prev=E.newGame(2);prev.ended=true;E.setFreedom(prev,3);assert.equal(E.newGamePlus(prev,'purse',3).freedom,3);
});
