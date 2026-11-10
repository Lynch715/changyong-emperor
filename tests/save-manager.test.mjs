import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/v2/engine.js';
import * as Saves from '../src/v2/save-manager.js';

class Storage {
 values = new Map();
 writes = [];
 getItem(key) {return this.values.get(key) ?? null;}
 setItem(key, value) {this.values.set(key, value); this.writes.push(key);}
}

test('D01 自动备份与导出往返保留实际进度，API配置始终留在设备上', () => {
 const store = new Storage(), s = E.newGame(711);
 store.setItem('changyong-ai-connection-v1', 'TEST_ONLY_KEY');
 assert.equal(Saves.persistGame(s, store), true);
 assert.equal(Saves.backupInfo(store), null);
 E.choose(s, 'M01', 'steady');
 assert.equal(Saves.persistGame(s, store), true);
 assert.equal(Saves.backupInfo(store).month, 1);
 const text = Saves.exportGame(s), restored = Saves.parseGame(text);
 assert.doesNotMatch(text, /TEST_ONLY_KEY|changyong-ai-connection/);
 assert.deepEqual(restored.stats, s.stats);
 assert.deepEqual(restored.done, s.done);
 assert.deepEqual(restored.people, s.people);
 assert.equal(store.getItem('changyong-ai-connection-v1'), 'TEST_ONLY_KEY');
 const naming = structuredClone(s);
 naming.pendingBirth = {mother: 'C07', sex: '女', born: '1-1', name: ''};
 assert.deepEqual(Saves.parseGame(Saves.exportGame(naming)).pendingBirth, naming.pendingBirth);
});

test('D01 导入先完整验证，坏文件与危险键均不写设备存档', () => {
 const store = new Storage(), s = E.newGame(711);
 Saves.persistGame(s, store);
 const before = store.getItem(E.SAVE_KEY), writes = store.writes.length;
 const broken = structuredClone(s); broken.stats.health = null;
 const noScene = structuredClone(s); noScene.agenda = ['MISSING'];
 const noDelta = structuredClone(s); noDelta.delta = null;
 for (const text of ['{bad', 'null', '{"__proto__":{}}', JSON.stringify(broken), JSON.stringify(noScene),
  JSON.stringify(noDelta), JSON.stringify({...s, apiKey: 'TEST_ONLY_KEY'}), JSON.stringify({...s, month: 13})]) {
  assert.throws(() => Saves.parseGame(text));
 }
 assert.equal(store.getItem(E.SAVE_KEY), before);
 assert.equal(store.writes.length, writes);
 assert.equal(Saves.persistGame(broken, store), false);
 assert.equal(store.getItem(E.SAVE_KEY), before);
});

test('D01 旧版原始JSON导入只换算一次，已有幕次与婴儿选择继续保留', () => {
 const old = E.newGame(711); old.version = 1; delete old.economyVersion;
 old.stats.treasury = 60; delete old.stats.inner;
 old.done.M01 = 'steady';
 old.children = [{id: 'K01', name: '静宁', sex: '女', mother: 'C07', born: '1-1',
  art: {infant: 'k_infant_05'}, traits: [], notes: []}];
 const once = Saves.parseGame(JSON.stringify(old)), twice = Saves.parseGame(Saves.exportGame(once));
 assert.equal(once.stats.treasury, 800);
 assert.equal(twice.stats.treasury, 800);
 assert.equal(twice.done.M01, 'steady');
 assert.equal(twice.children[0].art.infant, 'k_infant_05');
});

test('D01 恢复上一份后仍可恢复回当前进度；存储不足时导入不覆盖原档', () => {
 const store = new Storage(), first = E.newGame(711);
 Saves.persistGame(first, store);
 const second = structuredClone(first); E.choose(second, 'M01', 'steady');
 Saves.installGame(second, store);
 const restored = Saves.restoreBackup(store);
 assert.equal(restored.done.M01, undefined);
 assert.equal(Saves.restoreBackup(store).done.M01, 'steady');
 const before = store.getItem(E.SAVE_KEY), realSet = store.setItem.bind(store);
 store.setItem = (key, value) => {if (key === Saves.BACKUP_KEY) throw Error('quota'); realSet(key, value);};
 assert.throws(() => Saves.installGame(first, store), /未能备份/);
 assert.equal(store.getItem(E.SAVE_KEY), before);
});

test('D01 主档损坏时仍可恢复有效备份，损坏原文单独留存', () => {
 const store = new Storage(), s = E.newGame(711);
 Saves.persistGame(s, store); E.choose(s, 'M01', 'steady'); Saves.persistGame(s, store);
 store.setItem(E.SAVE_KEY, '{broken');
 assert.ok(Saves.backupInfo(store));
 assert.equal(Saves.restoreBackup(store).year, 1);
 assert.equal(store.getItem(Saves.RECOVERY_KEY), '{broken');
 assert.ok(E.load(store));
});

test('D01 自动备份写不进时仍尽力保存当前进度，主档失败如实返回', () => {
 const store = new Storage(), s = E.newGame(711);
 Saves.persistGame(s, store);
 const realSet = store.setItem.bind(store);
 store.setItem = (key, value) => {if (key === Saves.BACKUP_KEY) throw Error('quota'); realSet(key, value);};
 E.choose(s, 'M01', 'steady');
 assert.equal(Saves.persistGame(s, store), true);
 assert.equal(E.load(store).done.M01, 'steady');
 assert.match(Saves.backupError(), /未能更新/);
 store.setItem = () => {throw Error('quota');};
 assert.equal(Saves.persistGame(s, store), false);
});
