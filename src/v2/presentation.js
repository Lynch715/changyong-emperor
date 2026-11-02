import {forecast} from './fiscal.js';
import {silver, moneyText} from './economy.js';

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

// 情分变化写清是本月的变化，不让它贴着总数像一道算式。
export function affectionChange(delta) {
  return delta ? `（本月 ${delta > 0 ? '+' : ''}${delta}）` : '';
}

// 月报只列确实入账且已经能用的项目，零值项目不占一行。
export function monthIncomeText(report) {
  const f = report.fiscal;
  if (!f) return '';
  const rows = [['base', '常例'], ['province', '地方浮动'], ['office', '户部浮动'], ['projects', '理财']];
  const items = rows.filter(([key]) => Number(f[key]) !== 0 && Number.isFinite(f[key]) &&
    (key !== 'projects' || f.unlocked?.projects !== false));
  return items.length ? '月底入账：' + items.map(([key, label]) =>
    `${label} ${f[key] < 0 ? '−' : ''}${moneyText(f[key])}`).join(' · ') + '。' : '';
}

// 支出分项必须与总数相符；旧档缺少的历史去向如实标成未分项。
export function treasuryExpenseText(report) {
  const total = report.ledger.treasury.out;
  if (!total) return '';
  const entries = Object.entries(report.expenses || {}).filter(([, amount]) => amount > 0);
  const known = silver(entries.reduce((sum, [, amount]) => sum + amount, 0));
  if (total > known) entries.push(['旧账未分项', silver(total - known)]);
  return '支出去向（万两）：' + entries.map(([label, amount]) => `${label} ${silver(amount)}`).join(' · ') + '。';
}
