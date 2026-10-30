import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/v2/engine.js';
import {SUMMON_ROLES} from '../src/v2/outings.js';
const base=()=>{const s=E.newGame(40);s.agenda=[];s.year=2;s.month=5;s.stats.inner=60;for(const id of ['N01','N02'])Object.assign(s.people[id],{met:true,aff:50});return s;};

test('0.40 召宫外人入宫：情分、赎金、身份与性别限制',()=>{
 const s=base();assert.deepEqual(E.summonRoles(s,'N01').map(r=>r.key).sort(),['consort','qi','study']);assert.deepEqual(E.summonRoles(s,'N02').map(r=>r.key).sort(),['consort','music','study']);
 assert.throws(()=>E.summonToPalace(s,'N02','qi'),/不合适/);
 s.people.N01.aff=40;assert.match(E.summonReason(s,'N01'),/48/);s.people.N01.aff=50;
 const inner=s.stats.inner,ap=s.ap,r=E.summonToPalace(s,'N01','study');
 assert.equal(s.ap,ap-1);assert.ok(Math.abs(s.stats.inner-(inner-15))<1e-6,'未赎身要付赎金');assert.ok(r.text);
 assert.equal(E.placeOf(s,'N01'),'养心殿');assert.equal(E.titleOf?E.titleOf(s,'N01'):'养心殿伴读','养心殿伴读');
 assert.ok(E.nightChoices(s).some(x=>x.id==='N01'),'入宫后夜里能去');assert.throws(()=>E.summonToPalace(s,'N01','qi'),/已经在宫里/);
 const t=base();t.freed={N02:{destination:'city',at:'2-4'}};const before=t.stats.inner;t.people.C07.met=true;t.people.C07.aff=60;
 const r2=E.summonToPalace(t,'N02','consort');assert.equal(t.stats.inner,before,'已赎身不再付钱');assert.equal(t.appointments.N02.title,'答应');assert.ok(r2.people.C07<0,'后宫吃味');
 assert.ok(E.appointmentOptions(t,'N02').some(o=>o.title==='常在'),'册为答应后可以晋位');
 const h=base();h.freed={N02:{destination:'home',at:'2-1'}};assert.match(E.summonReason(h,'N02'),/故乡/);
 for(const r of Object.values(SUMMON_ROLES))assert.ok(r.place&&r.name);
});

test('0.40 南风馆留宿：算作当夜，只陪一人，掷骰有风险，旧存档无此字段也能过夜',()=>{
 const s=base();s.freedom=1;s.nanfeng={seen:true,visit:{at:'2-5',done:false,fate:{tier:4,free:true}}};s.people.N02.aff=30;
 assert.throws(()=>E.nanfengStay(s,'N02'),/36/);s.people.N02.aff=40;
 const r=E.nanfengStay(s,'N02');assert.equal(s.ap,0);assert.equal(E.stayOf(s),'N02');assert.deepEqual(E.nightChoices(s).map(x=>x.id),['N02']);
 assert.throws(()=>E.nanfengCompany(s,'N01'));const n=E.spendNight(s,'N02',{affection:3});assert.ok(n.people.N02>0);assert.equal(E.placeOf(s,'N02'),'南风馆');
 assert.throws(()=>E.nanfengStay(s,'N02'));
 let bad=null;for(let seed=1;seed<400&&!bad;seed++){const x=base();x.seed=seed;x.freedom=3;x.nanfeng={seen:true,visit:{at:'2-5',done:false}};x.people.C07.met=true;x.people.C07.aff=60;const rr=E.nanfengStay(x,'N01');if(rr.risk.tier===0)bad=rr;}
 assert.ok(bad,'三档能掷出大凶');assert.ok(bad.stats.court<0&&bad.notes.length&&bad.people.C07<0);
 const old=base();delete old.inPalace;old.nanfeng={seen:true,visit:null};old.people.C02.met=true;assert.ok(E.nightChoices(old).length>=1);
});

test('0.40.1 花妍也能册封，住钟粹宫，可以晋位',()=>{const s=E.newGame(41);s.agenda=[];s.year=2;s.month=5;s.stats.inner=60;Object.assign(s.people.N01,{met:true,aff:50});
 const r=E.summonToPalace(s,'N01','consort');assert.match(r.text,/花妍/);assert.equal(E.placeOf(s,'N01'),'钟粹宫');assert.equal(s.appointments.N01.title,'答应');assert.ok(E.appointmentOptions(s,'N01').some(o=>o.title==='常在'));});
