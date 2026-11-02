import * as E from '../src/v2/engine.js';
import {CORE, GIFTS, PEOPLE} from '../src/v2/data.js';
import {continueLongCampaign, settleLongAgenda, runLongJourney} from './v044-balance.mjs';
import {mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const SEEDS = [45000, 45097, 45194];
const round = n => Math.round(n * 100) / 100;

// 从元年逐月推进，不改余额、不跳月；三时辰赏赐或休养，夜里随机见可见人物。
export function runBalance(seed, {months = 72, mode = 'passive'} = {}) {
  const s = E.newGame(seed), curve = [], contacts = {};
  let tightAt = null, giftActions = 0;
  for (let step = 0; step < months; step++) {
    continueLongCampaign(s);
    settleLongAgenda(s);
    while (E.canAct(s)) {
      const people = CORE.filter(id => E.present(s, id) && s.people[id].met && !E.gone(s, id));
      const id = mode === 'social' ? people.sort((a, b) => (contacts[a] || 0) - (contacts[b] || 0))[0] :
        people[Math.floor(E.rand(s) * people.length)];
      const gifts = Object.entries(GIFTS).filter(([, gift]) => !gift.inventory &&
        (mode === 'gifts' ? gift.innerCost > 0 : s.stats.inner >= gift.innerCost));
      if (mode === 'social' && id) {
        const chat = E.beginChat(s, id);
        E.applyChat(s, chat, {affection: 4});
        E.applyChat(s, chat, {affection: 4});
        contacts[id] = (contacts[id] || 0) + 1;
      } else if (id && gifts.length && (mode === 'gifts' || E.rand(s) < .6)) {
        const gift = gifts[Math.floor(E.rand(s) * gifts.length)][0];
        if (s.stats.inner < GIFTS[gift].innerCost) {
          tightAt ??= step + 1;
          E.rest(s);
        } else {
          E.giveGift(s, id, gift);
          giftActions++;
        }
      } else {
        if (mode === 'gifts' && !gifts.length && tightAt === null) tightAt = step + 1;
        E.rest(s);
      }
      E.rollSurprise(s);
      settleLongAgenda(s);
    }
    const choices = E.nightChoices(s);
    const person = choices[Math.floor(E.rand(s) * choices.length)];
    if (person?.special) {
      E.queueSpecial(s, person.id);
      settleLongAgenda(s);
    } else E.spendNight(s, person?.id || null);
    const report = E.endMonth(s);
    curve.push({
      month: step + 1, year: report.y, calendarMonth: report.m, treasury: report.balances.treasury,
      inner: report.balances.inner, health: s.stats.health, palace: s.stats.palace,
      income: report.ledger.treasury.in, outgo: report.ledger.treasury.out,
      people: Object.fromEntries(CORE.map(id => [id, s.people[id].aff])),
    });
  }
  return {seed, mode, tightAt, giftActions, curve, final: curve.at(-1),
    social48: Object.values(curve[47]?.people || {}).filter(aff => aff >= 45).length};
}

// 同时保留被动、均匀交往、全时辰赏赐和积极理财四条路线的真实月账。
export function balanceSuite() {
  return {
    passive: SEEDS.map(seed => runBalance(seed)),
    social: SEEDS.map(seed => runBalance(seed, {mode: 'social'})),
    gifts: SEEDS.map(seed => runBalance(seed, {months: 36, mode: 'gifts'})),
    active: SEEDS.map(seed => ({seed, ...runLongJourney(seed, {months: 72}).metrics})),
  };
}

// 控制台只列目标所需摘要，完整的逐月曲线写入文件供复核。
export function balanceSummary(result) {
  return {
    passive: result.passive.map(row => ({seed: row.seed, treasury72: row.final.treasury, inner36: row.curve[35].inner})),
    social: result.social.map(row => ({seed: row.seed, people45At48: row.social48})),
    gifts: result.gifts.map(row => ({seed: row.seed, inner36: row.final.inner, tightAt: row.tightAt})),
    active: result.active.map(row => ({seed: row.seed, treasury72: round(row.final), arrearsMonths: row.arrearsMonths})),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = balanceSuite(), name = process.env.BALANCE_STAGE || 'latest';
  mkdirSync('output/balance-v045', {recursive: true});
  writeFileSync(`output/balance-v045/${name}.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(balanceSummary(result), null, 2));
}
