import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/v2/engine.js';
import {ECONOMY,GIFTS} from '../src/v2/data.js';
import {moneyText,treasuryIndex} from '../src/v2/economy.js';
import {replay} from '../scripts/v2-economy-replay.mjs';
const ready=()=>{const s=E.newGame(38);s.agenda=[];return s;};
function reload(s){return E.load({getItem:()=>JSON.stringify(s)});}
function finishMonth(s){while(s.agenda.length){const sc=E.scene(s.agenda[0]);E.choose(s,sc.id,E.optionsFor(s,sc)[0].id);}while(s.ap)E.rest(s);E.spendNight(s,null);return E.endMonth(s);}
test('0.38 两本银账与小额银子显示，读旧档只换算一次',()=>{const s=ready();assert.equal(s.stats.treasury,800);assert.equal(s.stats.inner,50);assert.equal(moneyText(.05),'5 百两');assert.equal(moneyText(.2),'2 千两');assert.equal(treasuryIndex({...s,stats:{treasury:6000}}),100);
 delete s.economyVersion;delete s.stats.inner;delete s.ledger;s.stats.treasury=60;const old=reload(s);assert.equal(old.stats.treasury,800);assert.equal(old.stats.inner,50);assert.equal(reload(old).stats.treasury,800);assert.doesNotThrow(()=>finishMonth(old));});
test('0.38 剧情银子按点数换算，送礼走内帑，失败不花时辰',()=>{const s=ready();assert.equal(E.applyStats(s,{treasury:-3}).treasury,-3*ECONOMY.point);const before=s.stats.treasury,inner=s.stats.inner;E.giveGift(s,'C02','tea');assert.equal(s.stats.treasury,before);assert.equal(s.stats.inner,inner-GIFTS.tea.innerCost);s.stats.inner=0;const ap=s.ap;assert.throws(()=>E.giveGift(s,'C02','tea'),/内帑不足/);assert.throws(()=>E.goOuting(s),/内帑不足/);assert.equal(s.ap,ap);});
test('0.38 双向拨银守恒，占一个时辰并影响朝局或民心',()=>{const s=ready();const total=s.stats.treasury+s.stats.inner;E.transferFunds(s,'toInner',10);assert.equal(s.stats.court,53);assert.equal(s.stats.inner,60);E.transferFunds(s,'toTreasury',5);assert.equal(s.stats.people,57);assert.equal(s.stats.treasury+s.stats.inner,total);assert.equal(s.ap,1);assert.throws(()=>E.transferFunds(s,'toInner',1e8));assert.equal(s.ap,1);});
test('0.38 月结逐笔记进出，内帑 AI 变化限幅且大凶没有收益',()=>{const s=ready();E.applyEdict(s,'宫里添置',{inner:100});assert.equal(s.stats.inner,70);E.applyEdict(s,'宫里添置',{inner:100,fate:{tier:0}});assert.equal(s.stats.inner,70);const r=finishMonth(s);assert.equal(r.ledger.inner.in,24);assert.equal(r.balances.inner,74);assert.equal(r.ledger.treasury.in,55);});
test('0.38 家宴走内帑，国库不再付宫宴钱',()=>{const s=ready();s.year=2;s.month=8;s.people.C02.met=true;s.people.C07.met=true;E.startMonth(s);s.agenda=['FE2-zhongqiu'];const before=s.stats.treasury;E.choose(s,'FE2-zhongqiu','all');assert.equal(s.stats.treasury,before);assert.equal(s.stats.inner,50-ECONOMY.banquetCost);});
test('0.38 固定经营策略自动玩满72月，国库存银落在目标区间',()=>{const {state,curve}=replay();assert.equal(curve.length,6);assert.equal(state.year,6);assert.ok(state.ended);assert.ok(state.stats.treasury>=4000&&state.stats.treasury<=6000,JSON.stringify(curve));});
