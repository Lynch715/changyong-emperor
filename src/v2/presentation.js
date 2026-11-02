import {forecast} from './fiscal.js';
import {silver} from './economy.js';

// 首页只预估已知的月底收支，查看账目不会改变现金或办理安排。
export function budgetDisplay(s) {
  const fiscal = forecast(s);
  const projects = Object.values(s.fiscal.projects);
  const policies = Object.values(s.policies);
  return {
    ...fiscal,
    income: s.ledger.treasury.in,
    outgo: s.ledger.treasury.out,
    expected: silver(s.stats.treasury + fiscal.base + fiscal.province + fiscal.projects -
      fiscal.publicOutgo - fiscal.policy - fiscal.arrears),
    showProjects: s.year > 1 || fiscal.projects !== 0 || projects.some(p => p.level > 0 || p.pending),
    showPolicy: s.year > 1 || fiscal.policy !== 0 || policies.some(p => p.active || p.progress > 0),
  };
}
