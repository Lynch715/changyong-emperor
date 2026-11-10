import { ECONOMY } from './data.js';
export const silver = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const treasuryIndex = (s) =>
  Math.min(100, Math.max(0, Math.round((s.stats.treasury / ECONOMY.fullTreasury) * 100)));
export const moneyText = (n) => {
  const v = Math.abs(silver(n));
  return v === 0
    ? '0 万两'
    : v >= 1
      ? `${v} 万两`
      : v >= 0.1
        ? `${silver(v * 10)} 千两`
        : `${silver(v * 100)} 百两`;
};
export function initEconomy(s) {
  if (!s.economyVersion) {
    s.stats.treasury = silver(s.stats.treasury * ECONOMY.legacyScale);
    s.economyVersion = 1;
  }
  s.stats.inner = Number.isFinite(s.stats.inner) ? s.stats.inner : ECONOMY.startInner;
  s.ledger = s.ledger || { treasury: { in: 0, out: 0 }, inner: { in: 0, out: 0 } };
  return s;
}
export const emptyLedger = () => ({ treasury: { in: 0, out: 0 }, inner: { in: 0, out: 0 } });
// 按实际出库数记去向，只有本月已经发生的支出才入明细。
export function funds(s, changes, purpose = '其他用度') {
  const applied = {};
  s.ledger = s.ledger || emptyLedger();
  for (const k of ['treasury', 'inner']) {
    if (!Number.isFinite(changes[k])) continue;
    const before = s.stats[k];
    const locked = Number(s.freedom) === 1 && s.fiat?.locks?.['stats.' + k];
    const book = (next, use) => {
      const d = silver(next - s.stats[k]);
      s.stats[k] = next;
      if (!d) return;
      s.delta.stats[k] = silver((s.delta.stats[k] || 0) + d);
      const row = s.ledger[k];
      if (d > 0) row.in = silver(row.in + d);
      else {
        row.out = silver(row.out - d);
        if (k === 'treasury') s.expenseUses[use] = silver((s.expenseUses[use] || 0) - d);
      }
    };
    book(Math.max(0, silver(before + changes[k])), purpose);
    // 永久余额仍记真实收支，再把补足或收回的银两记作改写，避免军政已付却没有账目。
    if (locked) book(locked.value, '言出法随');
    const net = silver(s.stats[k] - before);
    if (net) applied[k] = net;
  }
  return applied;
}
