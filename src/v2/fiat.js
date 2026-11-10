import {PEOPLE, STATS} from './data.js';
import {OFFICES} from './appointments.js';
import {KIN, isChildId} from './audience.js';

// 只有一档能提交改写。模型给出声明式变化，不执行模型生成的代码。
export const isFiat = s => Number(s?.freedom) === 1;
const own = (o, k) => Object.hasOwn(o || {}, k);
const safeKey = k => typeof k === 'string' && k.length > 0 && !['__proto__', 'prototype', 'constructor'].includes(k);
const number = v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= Number.MAX_SAFE_INTEGER / 100;
const boolFields = ['met', 'first', 'second', 'third', 'fourth', 'fifth', 'lover', 'available', 'alive'];
const numericFields = ['aff', 'loyalty', 'ability'];
const statIds = STATS.map(x => x.id);
const record = v => v && typeof v === 'object' && !Array.isArray(v);

function field(s, path) {
  const keys = typeof path === 'string' ? path.split('.') : [];
  if (!keys.length || !keys.every(safeKey)) throw Error('改写字段没有写清楚。');
  const [root, id, key] = keys;
  if (root === 'stats' && keys.length === 2 && statIds.includes(id)) return {type: 'number', max: /treasury|inner/.test(id) ? null : 100};
  if (path === 'ap') return {type: 'number'};
  if (path === 'agenda') return {type: 'agenda'};
  if (root === 'people' && keys.length === 3 && own(PEOPLE, id) && own(s.people, id)) {
    if (numericFields.includes(key)) return {type: 'number', max: key === 'ability' ? 10 : 100};
    if (boolFields.includes(key)) return {type: 'boolean'};
    if (key === 'knot') return {type: 'knot'};
    if (['place', 'memory', 'faction'].includes(key)) return {type: 'string'};
  }
  if (root === 'appointments' && keys.length === 2 && own(PEOPLE, id)) return {type: 'appointment'};
  if (root === 'flags' && keys.length === 2) return {type: 'primitive'};
  if (root === 'crises' && keys.length === 2) return {type: 'crisis'};
  if (root === 'provinces' && keys.length === 3 && own(s.provinces, id) && ['livelihood', 'integrity', 'revenue'].includes(key)) {
    return {type: 'number', max: 100};
  }
  if (root === 'policies' && keys.length === 3 && own(s.policies, id)) {
    if (key === 'progress') return {type: 'number', max: 100};
    if (key === 'active') return {type: 'boolean'};
    if (key === 'host') return {type: 'host'};
    if (key === 'pilot') return {type: 'province'};
  }
  throw Error('这项变化需要重新整理：' + path);
}

function checkedChange(s, change) {
  if (!record(change)) throw Error('没有收到完整的改写。');
  const {path, op = 'set', value, lock = false} = change, spec = field(s, path);
  if (!['set', 'add', 'unlock'].includes(op) || (op === 'add' && spec.type !== 'number')) throw Error('改写方式不完整。');
  if (op === 'unlock') return {path, op};
  let valid = false;
  switch (spec.type) {
    case 'number': valid = number(value); break;
    case 'boolean': valid = typeof value === 'boolean'; break;
    case 'string': valid = typeof value === 'string'; break;
    case 'knot': valid = value === null; break;
    case 'agenda': valid = Array.isArray(value) && !value.length; break;
    case 'primitive': valid = value === null || ['boolean', 'string'].includes(typeof value) || number(value); break;
    case 'host': valid = value === null || own(PEOPLE, value); break;
    case 'province': valid = own(s.provinces, value); break;
    case 'crisis': valid = ['solved', 'failed', 'open'].includes(value); break;
    case 'appointment':
      valid = record(value) && (value.office === null || own(OFFICES, value.office)) &&
        (value.title === undefined || typeof value.title === 'string');
      break;
  }
  if (!valid) throw Error('这项变化的数值或对象不完整：' + path);
  const [, id, key] = path.split('.');
  if (key === 'lover' && value && (KIN.has(id) || isChildId(id))) throw Error('亲属关系不能改成恋爱。');
  if ((lock && spec.type === 'agenda') || (lock && key === 'memory')) {
    throw Error('这项安排只需执行一次。');
  }
  return {path, op, value, lock: !!lock, spec};
}

export function validateFiat(s, result, {allowConversation = false} = {}) {
  if (!isFiat(s)) throw Error('请先在设置选择「言出法随」。');
  if (!record(result) || !Array.isArray(result.changes) || !Array.isArray(result.facts)) throw Error('改写没有返回完整结果，请重试。');
  const changes = result.changes.map(c => checkedChange(s, c));
  for (const fact of result.facts) {
    if (!record(fact) || !safeKey(fact.key) || typeof fact.text !== 'string') throw Error('新设定没有写清楚。');
  }
  if (!changes.length && !result.facts.length && !(allowConversation && result.conversation === true)) {
    throw Error('没有收到可执行的变化，请重试。');
  }
  return changes;
}

const get = (s, path) => path.split('.').reduce((o, k) => o?.[k], s);
function write(s, change, api, stats, people, restoring = false) {
  const {path, op, value, lock, spec} = change;
  s.fiat ??= {facts: {}, locks: {}};
  if (op === 'unlock') { delete s.fiat.locks[path]; return; }
  const [root, id, key] = path.split('.');
  let next = value;
  if (spec.type === 'number') {
    next = op === 'add' ? Number(get(s, path) || 0) + value : value;
    if (!number(next)) throw Error('数值超出了可保存范围。');
    next = Math.max(0, spec.max ? Math.min(spec.max, next) : next);
    if (!['stats.treasury', 'stats.inner'].includes(path)) next = Math.round(next);
  }
  // 后来的同字段命令替代旧的永久设定；add 的锁保存最终绝对值，读档不会重复加。
  delete s.fiat.locks[path];
  if (root === 'stats') {
    if (['treasury', 'inner'].includes(id)) Object.assign(stats, api.funds(s, {[id]: next - s.stats[id]}, '言出法随'));
    else Object.assign(stats, api.applyStats(s, {[id]: next - s.stats[id]}));
  } else if (root === 'people') {
    const p = s.people[id];
    if (key === 'aff') {
      const d = next - p.aff;
      p.aff = next;
      s.delta.people[id] = (s.delta.people[id] || 0) + d;
      people[id] = (people[id] || 0) + d;
    } else if (key === 'memory') api.remember(s, id, next);
    else if (key === 'alive') { p.alive = next; s.flags['gone_' + id] = !next; }
    else p[key] = next;
  } else if (root === 'appointments') {
    const title = value.title || OFFICES[value.office]?.title || '候旨';
    if (s.appointments[id]?.office !== value.office || s.appointments[id]?.title !== title) {
      api.recordAppointment(s, id, value.office, title, '言出法随');
    }
    if (!restoring) {
      s.people[id].met = true;
      s.people[id].available = true;
      s.people[id].alive = true;
      s.flags['gone_' + id] = false;
    }
  } else if (root === 'agenda') {
    for (const scene of s.agenda) s.done[scene] = 'fiat';
    s.agenda = [];
  } else if (root === 'provinces') api.regionChange(s, id, {[key]: next - s.provinces[id][key]}, api);
  else if (path === 'ap') s.ap = next;
  else if (key) s[root][id][key] = next;
  else s[root][id] = next;
  if (lock) s.fiat.locks[path] = {path, op: 'set', value: next};
}

// 在引擎副本中执行全部变化，任何一项无效都不会写入玩家存档。
export function executeFiat(s, text, result, api, options = {}) {
  const changes = validateFiat(s, result, options), beforeStats = {...s.stats}, beforePeople = {...s.delta.people};
  const stats = {}, people = {};
  s.fiat ??= {facts: {}, locks: {}};
  s.fiat.facts ??= {};
  s.fiat.locks ??= {};
  for (const c of changes) write(s, c, api, stats, people);
  for (const {key, text: fact} of result.facts) {
    if (fact) s.fiat.facts[key] = fact;
    else delete s.fiat.facts[key];
  }
  for (const id of Object.keys(stats)) delete stats[id];
  for (const id of Object.keys(people)) delete people[id];
  for (const id of statIds) if (s.stats[id] !== beforeStats[id]) stats[id] = s.stats[id] - beforeStats[id];
  for (const id of Object.keys(s.delta.people)) {
    const d = s.delta.people[id] - (beforePeople[id] || 0);
    if (d) people[id] = d;
  }
  api.log(s, '言出法随：' + text, '旨');
  s.fiat.last = {text, title: result.title || '言出法随', narration: result.narration || text, y: s.year, m: s.month};
  return {title: s.fiat.last.title, text: s.fiat.last.narration, stats, people, facts: result.facts, fiat: true, optional: true};
}

export function restoreFiat(s, api) {
  if (!isFiat(s) || !s.fiat?.locks) return;
  for (const c of Object.values({...s.fiat.locks})) {
    const checked = checkedChange(s, {...c, lock: true});
    write(s, checked, api, {}, {}, true);
  }
}

export function fiatContext(s, query = '') {
  // 存档保留全文；提示按相关性选择事实，避免长期游玩后超过服务端上下文上限。
  const entries = Object.entries(s?.fiat?.facts || {}).reverse();
  const terms = String(query).match(/[\u4e00-\u9fff]{2}|[a-z]{3,}/gi) || [];
  entries.sort((a, b) => terms.filter(t => b.join('').includes(t)).length - terms.filter(t => a.join('').includes(t)).length);
  let budget = 1800;
  const facts = entries.flatMap(([key, text]) => {
    if (budget <= 0) return [];
    const line = `${key}：${text}`.slice(0, budget);
    budget -= line.length + 1;
    return [line];
  }).join('\n');
  return facts ? `\n玩家已经改写的世界事实（持续有效，后续叙事须沿用）：\n${facts}\n` : '';
}

// 不连接模型也能执行明确的数值命令；复杂安排交给同一个改写协议。
const digit = {'零': 0, '〇': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9};
export function chineseNumber(text) {
  if (/^\d+(?:\.\d+)?$/.test(text)) return Number(text);
  for (const [unit, n] of [['亿', 1e8], ['万', 1e4]]) {
    const at = text.indexOf(unit);
    if (at >= 0) return chineseNumber(text.slice(0, at) || '一') * n + chineseNumber(text.slice(at + 1) || '零');
  }
  let sum = 0, v = 0;
  for (const ch of text) {
    if (own(digit, ch)) v = digit[ch];
    else if (/\d/.test(ch)) v = v * 10 + Number(ch);
    else if (['十', '百', '千'].includes(ch)) { sum += (v || 1) * ({十: 10, 百: 100, 千: 1000}[ch]); v = 0; }
    else return NaN;
  }
  return sum + v;
}
export function localFiat(s, text) {
  if (!isFiat(s)) return null;
  const aliases = {国库: 'treasury', 内帑: 'inner', 民心: 'people', 朝局: 'court', 后宫: 'palace', 圣躬: 'health', 健康: 'health', 时辰: 'ap'};
  const changes = [], clauses = text.trim().split(/[，,。；;\n]+/).filter(Boolean);
  for (const clause of clauses) {
    const money = /^(?:把|将)?(?:国库|内帑)/.test(clause.trim());
    const unit = money ? clause.match(/两$/)?.[0] : null;
    const source = unit ? clause.slice(0, -unit.length) : clause;
    const match = source.trim().match(
      /^(?:把|将)?(国库|内帑|民心|朝局|后宫|圣躬|健康|时辰)(永久|永远|始终)?(?:设为|设置为|改为|变为|恢复到|恢复至|加到|达到|增加|加|减少|减|为|到|至)([\d.零〇一二两三四五六七八九十百千万亿]+)(?:点|个)?$/,
    );
    if (!match) return null;
    const [, name, permanent, raw] = match, id = aliases[name];
    let value = chineseNumber(raw);
    if (['treasury', 'inner'].includes(id)) value = value / (unit === '两' ? 10000 : 1);
    if (/减少|减/.test(clause)) value = -value;
    if (!number(value)) return null;
    changes.push({path: id === 'ap' ? 'ap' : 'stats.' + id, op: /增加|减少|加(?!到)|减/.test(clause) ? 'add' : 'set', value, lock: !!permanent});
  }
  return changes.length ? {title: '言出法随', narration: '你落笔定下新的局面。' + text, changes, facts: []} : null;
}
