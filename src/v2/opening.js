// 正月的一道可选旨意，只复用现有银账、数值和办事记录。
export const OPENING_DECREE = {
  id: 'opening-relief',
  title: '给京畿寒户拨一批赈银',
  text: '京畿几处粥厂缺粮，户部请拨十万两赈济寒户。你可以现在批，也可以先忙别的。',
  effects: {treasury: -1, people: 3},
};

// 过了元年正月便撤下，不补发、不顺延，也不妨碍入夜。
export function openingDecree(s) {
  return s.year === 1 && s.month === 1 && !s.ended && !s.night && !s.done[OPENING_DECREE.id]
    ? OPENING_DECREE : null;
}

// 当场拨银见效，不用时辰；未处理或钱不足时不改变存档。
export function issueOpeningDecree(s, {applyStats, log}) {
  if (!openingDecree(s)) throw Error('这道旨意已经办过，或已过了本月。');
  if (!s.done.M01 || s.agenda.length) throw Error('先把养心惊梦办完。');
  if (s.stats.treasury < 10) throw Error('国库不足十万两。');
  const stats = applyStats(s, OPENING_DECREE.effects);
  s.done[OPENING_DECREE.id] = 'approve';
  log(s, '拨银十万两赈济京畿寒户，民心加三。', '政');
  return {
    title: OPENING_DECREE.title,
    text: '你落笔准了赈银。户部当日拨出十万两，粥厂添了粮，排队的寒户终于喝上热粥。',
    stats,
    people: {},
  };
}
