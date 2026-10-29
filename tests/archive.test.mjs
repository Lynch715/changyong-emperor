import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/engine.js';
import {exportArchive,saveEnvelope,saveManual,backupBeforeRestore,STORAGE_KEY} from '../src/storage.js';
class Store{m=new Map();getItem(k){return this.m.get(k)??null;}setItem(k,v){this.m.set(k,String(v));}}
test('全部档案只读保留8个存档槽原字串，排除其他本机数据',()=>{
 const storage=new Store(),state=createGame();saveEnvelope(state,null,storage);saveManual(state,4,storage);backupBeforeRestore(storage);
 storage.setItem('unrelated-private-config','NOT_A_GAME_SAVE');
 const before=[...storage.m],archive=JSON.parse(exportArchive(storage,'http://127.0.0.1:5173'));
 assert.equal(archive.format,'changyong-local-archive');assert.equal(archive.records.length,8);assert.equal(archive.origin,'http://127.0.0.1:5173');
 for(const r of archive.records)assert.equal(r.raw,storage.getItem(r.key));
 assert.equal(archive.records.filter(r=>r.raw!==null).length,3);assert.ok(!JSON.stringify(archive).includes('NOT_A_GAME_SAVE'));assert.deepEqual([...storage.m],before);
});
test('损坏档和空档也能无损导出，不覆盖或先修复原字串',()=>{
 const storage=new Store();storage.setItem(STORAGE_KEY,'{ invalid original');const before=[...storage.m];
 const archive=JSON.parse(exportArchive(storage));assert.equal(archive.records.find(r=>r.key===STORAGE_KEY).raw,'{ invalid original');assert.equal(archive.records.filter(r=>r.raw===null).length,7);assert.deepEqual([...storage.m],before);
});
