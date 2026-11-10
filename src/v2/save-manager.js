import * as E from './engine.js';
import {STATS, CORE} from './data.js';
import {mothers, childById, serial} from './family.js';

export const BACKUP_KEY = 'changyong-v2-save-backup';
export const RECOVERY_KEY = 'changyong-v2-unreadable-save';
export const MAX_SAVE_BYTES = 10 * 1024 * 1024;
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const confidential = ['apiKey', 'api_key', 'key', 'byok', 'connection', 'aiConnection', 'secret', 'token'];
let backupFailure = '';
export const backupError = () => backupFailure;

// 只接受游戏数据，危险对象键与连接配置不能混入导入文件。
export function parseGame(text) {
 if (typeof text !== 'string' || text.length > MAX_SAVE_BYTES || new TextEncoder().encode(text).byteLength > MAX_SAVE_BYTES) {
  throw Error('存档文件过大或内容无法读取。');
 }
 let value;
 try {
  value = JSON.parse(text, (key, item) => {
   if (['__proto__', 'prototype', 'constructor'].includes(key)) throw Error('不安全的存档字段');
   return item;
  });
 } catch {throw Error('这不是有效的游戏存档 JSON。');}
 if (value?.format) {
  if (value.format !== 'changyong-save' || value.version !== 1) throw Error('无法识别这份备份的格式。');
  value = value.game;
 }
 if (!record(value) || confidential.some(key => Object.hasOwn(value, key))) throw Error('文件不是纯游戏存档。');
 if (!Number.isSafeInteger(value.year) || value.year < 1 || !Number.isInteger(value.month) || value.month < 1 || value.month > 12) {
  throw Error('存档年月不完整，当前进度没有改变。');
 }
 const state = E.load({getItem: () => JSON.stringify(value)});
 if (!state || !Number.isSafeInteger(state.ap) || state.ap < 0 || !Number.isFinite(state.seed) || state.seed < 0 || state.seed >= 2147483648 ||
  !Array.isArray(state.agenda) || !Array.isArray(state.children)) {
  throw Error('存档内容不完整或版本暂不支持，当前进度没有改变。');
 }
 state.vol ??= state.year <= 2 ? 1 : state.year <= 4 ? 2 : 3;
 if (![1, 2, 3].includes(state.vol)) throw Error('存档卷号不完整，当前进度没有改变。');
 if (['done', 'flags', 'stats', 'delta', 'used'].some(key => !record(state[key])) ||
  !record(state.delta.stats) || !record(state.delta.people) ||
  ['log', 'memorials', 'govReports'].some(key => !Array.isArray(state[key])) ||
  !Array.isArray(state.used.petitions) || !Array.isArray(state.used.outings)) {
  throw Error('存档的行动与记事记录不完整，当前进度没有改变。');
 }
 if (STATS.some(({id}) => !Number.isFinite(state.stats[id]) || state.stats[id] < 0 ||
  !['treasury', 'inner'].includes(id) && state.stats[id] > 100) ||
  CORE.some(id => !record(state.people[id]) || !Number.isFinite(state.people[id].aff) ||
   state.people[id].aff < 0 || state.people[id].aff > 100 || !Array.isArray(state.people[id].memories))) {
  throw Error('存档数值或人物记录损坏，当前进度没有改变。');
 }
 if (state.agenda.some(id => {
  const scene = typeof id === 'string' && E.scene(state, id);
  return !scene || typeof scene.body !== 'string' || !Array.isArray(scene.options) || !scene.options.length;
 }) || state.children.some(c => !record(c) || !['男', '女'].includes(c.sex) || !mothers.includes(c.mother) ||
  typeof c.name !== 'string' || !Number.isFinite(serial(c.born)) || !Array.isArray(c.notes) || !Array.isArray(c.traits)) ||
  state.pendingBirth && (!mothers.includes(state.pendingBirth.mother) || !['男', '女'].includes(state.pendingBirth.sex)) ||
  state.familyArt && !childById(state, state.familyArt.child)) {
  throw Error('存档的剧情或家庭记录不完整，当前进度没有改变。');
 }
 return state;
}

// 复用引擎序列化与永久设定恢复，不在导出时读取设备上的 API 配置。
function serialize(state) {
 let raw;
 if (!E.save(state, {setItem: (_, value) => {raw = value;}})) throw Error('这份进度暂时无法整理为存档。');
 return raw;
}
const read = (storage, key) => {try {return storage.getItem(key);} catch {return null;}};
const usable = raw => {try {return raw ? parseGame(raw) : null;} catch {return null;}};

// 自动存档优先写入；备份空间不足时仍保住当前进度，既有有效备份不被损坏数据覆盖。
export function persistGame(state, storage = globalThis.localStorage) {
 try {
  const next = serialize(state), previous = read(storage, E.SAVE_KEY);
  parseGame(next);
  if (previous && previous !== next) {
   try {
    if (usable(previous)) storage.setItem(BACKUP_KEY, previous);
    else if (!read(storage, RECOVERY_KEY)) storage.setItem(RECOVERY_KEY, previous);
    backupFailure = '';
   } catch {backupFailure = '浏览器未能更新上一份备份。当前进度仍会尝试保存；请及时导出并检查存储空间。';}
  }
  storage.setItem(E.SAVE_KEY, next);
  return true;
 } catch {return false;}
}

export function backupInfo(storage = globalThis.localStorage) {
 const state = usable(read(storage, BACKUP_KEY));
 return state ? {year: state.year, month: state.month, life: state.life || 1, children: state.children.length} : null;
}

export function exportGame(state) {
 const raw = JSON.parse(serialize(state));
 for (const key of confidential) delete raw[key];
 return JSON.stringify({format: 'changyong-save', version: 1, exportedAt: new Date().toISOString(), game: raw}, null, 2);
}

// 导入和恢复必须先确保当前有效进度能备份；失败时不替换当前存档。
export function installGame(candidate, storage = globalThis.localStorage) {
 const next = serialize(candidate), previous = read(storage, E.SAVE_KEY);
 parseGame(next);
 if (previous && previous !== next) {
  const key = usable(previous) ? BACKUP_KEY : RECOVERY_KEY;
  try {storage.setItem(key, previous);} catch {throw Error('未能备份当前进度，本次导入已取消。请先导出或腾出存储空间。');}
 }
 try {storage.setItem(E.SAVE_KEY, next);} catch {throw Error('浏览器未能写入新存档，原进度仍保留。');}
 backupFailure = '';
 return candidate;
}

export function restoreBackup(storage = globalThis.localStorage) {
 const raw = read(storage, BACKUP_KEY);
 if (!raw) throw Error('还没有可恢复的上一份备份。');
 return installGame(parseGame(raw), storage);
}

// 下载动作只由玩家点击触发，临时链接不写入存档。
export function downloadGame(state, doc = globalThis.document) {
 const blob = new Blob([exportGame(state)], {type: 'application/json'}), url = URL.createObjectURL(blob);
 const link = doc.createElement('a');
 link.href = url; link.download = `长雍存档-${state.year}年${state.month}月.json`;
 doc.body.append(link); link.click(); link.remove();
 setTimeout(() => URL.revokeObjectURL(url), 1000);
}
